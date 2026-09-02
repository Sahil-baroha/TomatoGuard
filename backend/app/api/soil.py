"""
Soil Health endpoints — Phase 4.

POST /soil/report          — upload report image → Cloudinary → server OCR → return parsed fields (no analysis saved yet)
POST /soil/report/confirm  — farmer confirms OCR fields → rule-based analysis → soil_analyses row
POST /soil/questionnaire   — qualitative answers → rule-based analysis → soil_analyses row (nutrient fields null)
GET  /soil/latest          — this farmer's most recent soil_analyses row

Both input paths produce one soil_analyses row with the same response shape.
Exactly one of soil_report_id / questionnaire_id is set per row (enforced in code, not DB).
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.cloudinary_client import upload_image
from app.services.ocr import run_ocr
from app.services.soil_analysis import classify_from_values, classify_from_questionnaire
from app.models.user import User
from app.models.farm import Farm
from app.models.soil_report import SoilReport
from app.models.soil_questionnaire import SoilQuestionnaire
from app.models.soil_analysis import SoilAnalysis
from app.schemas.soil import (
    SoilReportResponse,
    SoilReportConfirmRequest,
    SoilAnalysisResponse,
    SoilQuestionnaireRequest,
    SoilLatestResponse,
)

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _get_farm_id(db: Session, user_id: int) -> Optional[int]:
    farm = db.query(Farm).filter(Farm.user_id == user_id).first()
    return farm.farm_id if farm else None


# ── POST /soil/report ────────────────────────────────────────────────────────

@router.post("/report", response_model=SoilReportResponse)
async def upload_soil_report(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a soil-test report image.
    1. Validate type/size.
    2. Upload to Cloudinary (folder: soil_reports).
    3. Run server-side OCR via pytesseract.
    4. Insert soil_reports row.
    5. Return soil_report_id, raw_ocr_text, and parsed numeric fields.
    Does NOT insert a soil_analyses row yet — that happens on /report/confirm.
    """
    # Step 1: Validate
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{image.content_type}'. Accepted: JPEG, PNG, WEBP.",
        )
    file_bytes = await image.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 8 MB limit.")

    # Step 2: Upload to Cloudinary
    try:
        cdn = upload_image(file_bytes, folder="soil_reports")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {exc}")

    # Step 3: OCR — graceful fallback if Tesseract is not installed
    ocr_result = {
        "raw_ocr_text": "",
        "ph": None, "nitrogen": None, "phosphorus": None,
        "potassium": None, "moisture": None, "organic_matter": None,
    }
    try:
        ocr_result = run_ocr(file_bytes)
    except RuntimeError as exc:
        # Tesseract not installed — return empty OCR text, user can fill in manually
        ocr_result["raw_ocr_text"] = f"[OCR unavailable: {exc}]"

    # Step 4: Insert soil_reports row
    farm_id = _get_farm_id(db, current_user.user_id)
    report = SoilReport(
        user_id=current_user.user_id,
        farm_id=farm_id,
        report_file_path=cdn["secure_url"],
        report_file_public_id=cdn["public_id"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return SoilReportResponse(
        soil_report_id=report.soil_report_id,
        raw_ocr_text=ocr_result["raw_ocr_text"],
        ph=ocr_result["ph"],
        nitrogen=ocr_result["nitrogen"],
        phosphorus=ocr_result["phosphorus"],
        potassium=ocr_result["potassium"],
        moisture=ocr_result["moisture"],
        organic_matter=ocr_result["organic_matter"],
    )


# ── POST /soil/report/confirm ────────────────────────────────────────────────

@router.post("/report/confirm", response_model=SoilAnalysisResponse)
def confirm_soil_report(
    body: SoilReportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Farmer confirms (possibly corrects) the OCR-parsed values.
    Runs rule-based analysis and inserts a soil_analyses row linked to the report.
    """
    # Verify the soil_report belongs to this user
    report = db.query(SoilReport).filter(
        SoilReport.soil_report_id == body.soil_report_id,
        SoilReport.user_id == current_user.user_id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Soil report not found or does not belong to you.")

    # Rule-based classification
    classification = classify_from_values(
        ph=body.ph,
        nitrogen=body.nitrogen,
        phosphorus=body.phosphorus,
        potassium=body.potassium,
        moisture=body.moisture,
        organic_matter=body.organic_matter,
    )

    farm_id = _get_farm_id(db, current_user.user_id)
    analysis = SoilAnalysis(
        user_id=current_user.user_id,
        farm_id=farm_id,
        soil_report_id=body.soil_report_id,
        questionnaire_id=None,
        ph=body.ph,
        nitrogen=body.nitrogen,
        phosphorus=body.phosphorus,
        potassium=body.potassium,
        moisture=body.moisture,
        organic_matter=body.organic_matter,
        predicted_soil_condition=classification["predicted_soil_condition"],
        fertilizer_recommendation=classification["fertilizer_recommendation"],
        irrigation_recommendation=classification["irrigation_recommendation"],
        model_name="rule-based-v1",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return SoilAnalysisResponse(
        analysis_id=analysis.analysis_id,
        predicted_soil_condition=analysis.predicted_soil_condition,
        fertilizer_recommendation=analysis.fertilizer_recommendation,
        irrigation_recommendation=analysis.irrigation_recommendation,
        ph=float(analysis.ph) if analysis.ph is not None else None,
        nitrogen=float(analysis.nitrogen) if analysis.nitrogen is not None else None,
        phosphorus=float(analysis.phosphorus) if analysis.phosphorus is not None else None,
        potassium=float(analysis.potassium) if analysis.potassium is not None else None,
        moisture=float(analysis.moisture) if analysis.moisture is not None else None,
        organic_matter=float(analysis.organic_matter) if analysis.organic_matter is not None else None,
        analysis_date=analysis.analysis_date,
    )


# ── POST /soil/questionnaire ──────────────────────────────────────────────────

@router.post("/questionnaire", response_model=SoilAnalysisResponse)
def submit_soil_questionnaire(
    body: SoilQuestionnaireRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Qualitative questionnaire path.
    Inserts a soil_questionnaires row, runs rule-based classification (no numeric nutrients),
    inserts a soil_analyses row with questionnaire_id set and all nutrient fields null.
    """
    farm_id = _get_farm_id(db, current_user.user_id)

    # Insert questionnaire row
    questionnaire = SoilQuestionnaire(
        user_id=current_user.user_id,
        farm_id=farm_id,
        crop_stage=body.crop_stage,
        previous_crop=body.previous_crop,
        irrigation_type=body.irrigation_type,
        fertilizer_used=body.fertilizer_used,
        soil_color=body.soil_color,
        drainage_condition=body.drainage_condition,
        additional_answers=body.additional_answers,
    )
    db.add(questionnaire)
    db.commit()
    db.refresh(questionnaire)

    # Rule-based classification — nutrient fields null per spec
    classification = classify_from_questionnaire(
        crop_stage=body.crop_stage,
        previous_crop=body.previous_crop,
        irrigation_type=body.irrigation_type,
        fertilizer_used=body.fertilizer_used,
        soil_color=body.soil_color,
        drainage_condition=body.drainage_condition,
    )

    analysis = SoilAnalysis(
        user_id=current_user.user_id,
        farm_id=farm_id,
        soil_report_id=None,
        questionnaire_id=questionnaire.questionnaire_id,
        # All nutrient fields intentionally null for questionnaire path
        predicted_soil_condition=classification["predicted_soil_condition"],
        fertilizer_recommendation=classification["fertilizer_recommendation"],
        irrigation_recommendation=classification["irrigation_recommendation"],
        model_name="rule-based-v1",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return SoilAnalysisResponse(
        analysis_id=analysis.analysis_id,
        predicted_soil_condition=analysis.predicted_soil_condition,
        fertilizer_recommendation=analysis.fertilizer_recommendation,
        irrigation_recommendation=analysis.irrigation_recommendation,
        # Nutrient fields are null for questionnaire path
        ph=None,
        nitrogen=None,
        phosphorus=None,
        potassium=None,
        moisture=None,
        organic_matter=None,
        analysis_date=analysis.analysis_date,
    )


# ── GET /soil/latest ──────────────────────────────────────────────────────────

@router.get("/latest", response_model=SoilLatestResponse)
def get_soil_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return this farmer's most recent soil_analyses row.
    Returns 404 (not null) when no analysis exists yet.
    """
    row = (
        db.query(SoilAnalysis)
        .filter(SoilAnalysis.user_id == current_user.user_id)
        .order_by(SoilAnalysis.analysis_date.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No soil analysis found for this farmer.")

    return SoilLatestResponse(
        analysis_id=row.analysis_id,
        predicted_soil_condition=row.predicted_soil_condition,
        fertilizer_recommendation=row.fertilizer_recommendation,
        irrigation_recommendation=row.irrigation_recommendation,
        ph=float(row.ph) if row.ph is not None else None,
        nitrogen=float(row.nitrogen) if row.nitrogen is not None else None,
        phosphorus=float(row.phosphorus) if row.phosphorus is not None else None,
        potassium=float(row.potassium) if row.potassium is not None else None,
        moisture=float(row.moisture) if row.moisture is not None else None,
        organic_matter=float(row.organic_matter) if row.organic_matter is not None else None,
        soil_report_id=row.soil_report_id,
        questionnaire_id=row.questionnaire_id,
        analysis_date=row.analysis_date,
    )
