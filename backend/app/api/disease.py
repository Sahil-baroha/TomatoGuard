"""
Disease detection endpoints.

POST /disease/analyze  — multipart image upload → guardrail → Cloudinary → model → DB insert
GET  /disease/history  — this farmer's past scans, newest first

Server-side logic for /analyze (in order):
  1. Validate image type/size (400 on bad type or >8 MB).
  2. Run HSV guardrail — reject with 422 if insufficient foliage (NO DB row, NO Cloudinary upload).
  3. Upload to Cloudinary → secure_url + public_id.
  4. Run DiseaseModel.predict() → (display_name, confidence).
  5. Reject with 422 if confidence < 70% (NO DB row).
  6. Calculate OpenCV severity + DSS treatment tier.
  7. Look up disease_id by matching diseases.disease_name == display_name.
  8. Insert disease_scans row with severity and recommendation populated.
  9. Return enriched response.
"""

import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.cloudinary_client import upload_image
from app.services.disease_model import disease_model, MODEL_FILENAME, CONFIDENCE_THRESHOLD
from app.services.leaf_analysis import (
    is_valid_plant_leaf,
    calculate_severity,
    get_treatment_tier,
    get_knowledge,
)
from app.models.user import User
from app.models.farm import Farm
from app.models.disease import Disease
from app.models.disease_scan import DiseaseScan
from app.schemas.disease import DiseaseAnalyzeResponse, DiseaseHistoryItem

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


@router.post("/analyze", response_model=DiseaseAnalyzeResponse)
async def analyze_disease(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Step 1: Validate image type and size ─────────────────────────────────
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{image.content_type}'. Accepted: JPEG, PNG, WEBP.",
        )

    file_bytes = await image.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image exceeds the 8 MB limit. Please upload a smaller file.",
        )

    # ── Step 2: HSV guardrail — reject non-plant images BEFORE Cloudinary ────
    is_plant, plant_ratio = is_valid_plant_leaf(file_bytes)
    if not is_plant:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Image does not appear to contain sufficient plant foliage "
                f"({plant_ratio:.1f}% green area detected, minimum 8% required). "
                "Please upload a clear photo of a tomato leaf."
            ),
        )

    # ── Step 3: Upload to Cloudinary ─────────────────────────────────────────
    try:
        cdn = upload_image(file_bytes, folder="disease_scans")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {exc}")

    secure_url = cdn["secure_url"]
    public_id = cdn["public_id"]

    # ── Step 4: Run model inference ───────────────────────────────────────────
    display_name, confidence = disease_model.predict(file_bytes)

    # ── Step 5: Reject low-confidence predictions — NO DB row ────────────────
    if confidence is None or confidence < CONFIDENCE_THRESHOLD:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Model confidence is too low ({confidence or 0:.1f}% < {CONFIDENCE_THRESHOLD}%). "
                "Please retake the photo under good lighting with the leaf filling the frame."
            ),
        )

    # ── Step 6: Severity + DSS treatment tier ────────────────────────────────
    is_healthy = display_name == "Healthy"
    severity_pct = calculate_severity(file_bytes, is_healthy)
    tier = get_treatment_tier(display_name, severity_pct)
    kb = get_knowledge(display_name)

    # ── Step 7: Look up disease_id ────────────────────────────────────────────
    disease_row: Optional[Disease] = (
        db.query(Disease)
        .filter(Disease.disease_name == display_name)
        .first()
    )
    disease_id = disease_row.disease_id if disease_row else None

    # ── Step 8: Get farm_id ───────────────────────────────────────────────────
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    farm_id = farm.farm_id if farm else None

    # ── Step 9: Insert disease_scans row ─────────────────────────────────────
    scan = DiseaseScan(
        user_id=current_user.user_id,
        farm_id=farm_id,
        disease_id=disease_id,
        image_path=secure_url,
        image_public_id=public_id,
        predicted_disease=display_name,
        confidence=confidence,
        severity=tier["severity_label"],
        recommendation=tier["recommendation"],
        model_name="EfficientNetB0",
        model_version=MODEL_FILENAME,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # ── Step 10: Build response ───────────────────────────────────────────────
    return DiseaseAnalyzeResponse(
        scan_id=scan.scan_id,
        predicted_disease=display_name,
        confidence=confidence,
        description=kb.get("description"),
        immediate_action=tier["recommendation"],
        severity=tier["severity_label"],
        treatment_plan=tier["recommendation"],
        prevention_tips=kb.get("prevention_tips"),
        low_confidence_warning=False,  # Passed the 70% gate — no warning needed
    )


@router.get("/history", response_model=list[DiseaseHistoryItem])
def disease_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(DiseaseScan)
        .filter(DiseaseScan.user_id == current_user.user_id)
        .order_by(DiseaseScan.scan_date.desc())
        .all()
    )
    return [
        DiseaseHistoryItem(
            scan_id=r.scan_id,
            predicted_disease=r.predicted_disease,
            confidence=float(r.confidence) if r.confidence is not None else None,
            scan_date=r.scan_date,
            image_path=r.image_path,
            severity=r.severity,
            recommendation=r.recommendation,
        )
        for r in rows
    ]
