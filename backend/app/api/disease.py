"""
Disease detection endpoints.

POST /disease/analyze  — multipart image upload → Cloudinary → model → DB insert
GET  /disease/history  — this farmer's past scans, newest first

Server-side logic per spec (in exact order for /analyze):
  1. Validate image type/size (400 on bad type or >8 MB).
  2. Upload to Cloudinary → secure_url + public_id.
  3. Run DiseaseModel.predict() → (label, confidence).
  4. Look up disease_id by matching disease_name == label (null if no match).
  5. Insert disease_scans row.
  6. If disease_id matched, pull description/treatment for the response.
"""

import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.cloudinary_client import upload_image
from app.services.disease_model import disease_model
from app.models.user import User
from app.models.farm import Farm
from app.models.disease import Disease
from app.models.disease_scan import DiseaseScan
from app.schemas.disease import DiseaseAnalyzeResponse, DiseaseHistoryItem

router = APIRouter()

# Allowed MIME types for uploaded leaf images
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

    # ── Step 2: Upload to Cloudinary ─────────────────────────────────────────
    try:
        cdn = upload_image(file_bytes, folder="disease_scans")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {exc}")

    secure_url = cdn["secure_url"]
    public_id = cdn["public_id"]

    # ── Step 3: Run model inference ───────────────────────────────────────────
    label, confidence = disease_model.predict(file_bytes)

    # ── Step 4: Look up disease_id by matching disease_name ──────────────────
    disease_row: Optional[Disease] = (
        db.query(Disease)
        .filter(Disease.disease_name == label)
        .first()
    )
    disease_id = disease_row.disease_id if disease_row else None

    # ── Step 5: Get the farmer's farm ────────────────────────────────────────
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    farm_id = farm.farm_id if farm else None

    # ── Step 5 (cont.): Insert disease_scans row ─────────────────────────────
    scan = DiseaseScan(
        user_id=current_user.user_id,
        farm_id=farm_id,
        disease_id=disease_id,
        image_path=secure_url,
        image_public_id=public_id,
        predicted_disease=label,
        confidence=confidence,
        model_name="EfficientNetB0",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # ── Step 6: Build response ────────────────────────────────────────────────
    description: Optional[str] = None
    immediate_action: Optional[str] = None
    if disease_row:
        description = disease_row.description
        immediate_action = disease_row.treatment

    return DiseaseAnalyzeResponse(
        scan_id=scan.scan_id,
        predicted_disease=scan.predicted_disease,
        confidence=float(scan.confidence) if scan.confidence is not None else None,
        description=description,
        immediate_action=immediate_action,
    )


@router.get("/history", response_model=list[DiseaseHistoryItem])
def disease_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Spec: filtered by user_id, ordered scan_date DESC
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
        )
        for r in rows
    ]
