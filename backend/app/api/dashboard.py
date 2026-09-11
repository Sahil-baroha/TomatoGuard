from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.farm import Farm
from app.models.disease_scan import DiseaseScan
from app.models.soil_analysis import SoilAnalysis
from app.models.weather_record import WeatherRecord
# Reuse the EXACT same deterministic health_status function from Phase 6 —
# do not reimplement the rule here.
from app.api.recommendations import _compute_health_status

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the most recent disease scan, soil analysis, weather record,
    and a lightweight recommendation_preview for the authenticated farmer's farm.
    Returns null for any that don't exist. Never fabricates placeholder values.
    """
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    farm_id = farm.farm_id if farm else None

    # Latest disease scan
    latest_disease = None
    scan_row = None
    if farm_id is not None:
        scan_row = (
            db.query(DiseaseScan)
            .filter(DiseaseScan.farm_id == farm_id)
            .order_by(desc(DiseaseScan.scan_date))
            .first()
        )
        if scan_row:
            latest_disease = {
                "scan_id": scan_row.scan_id,
                "predicted_disease": scan_row.predicted_disease,
                "confidence": float(scan_row.confidence) if scan_row.confidence is not None else None,
                "scan_date": scan_row.scan_date.isoformat() if scan_row.scan_date else None,
                "image_path": scan_row.image_path,
                "severity": scan_row.severity,
            }

    # Latest soil analysis
    latest_soil = None
    soil_row = None
    if farm_id is not None:
        soil_row = (
            db.query(SoilAnalysis)
            .filter(SoilAnalysis.farm_id == farm_id)
            .order_by(desc(SoilAnalysis.analysis_date))
            .first()
        )
        if soil_row:
            latest_soil = {
                "analysis_id": soil_row.analysis_id,
                "predicted_soil_condition": soil_row.predicted_soil_condition,
                "fertilizer_recommendation": soil_row.fertilizer_recommendation,
                "irrigation_recommendation": soil_row.irrigation_recommendation,
                "analysis_date": soil_row.analysis_date.isoformat() if soil_row.analysis_date else None,
            }

    # Latest weather record
    latest_weather = None
    if farm_id is not None:
        row = (
            db.query(WeatherRecord)
            .filter(WeatherRecord.farm_id == farm_id)
            .order_by(desc(WeatherRecord.recorded_at))
            .first()
        )
        if row:
            latest_weather = {
                "weather_id": row.weather_id,
                "temperature_c": float(row.temperature_c) if row.temperature_c is not None else None,
                "humidity_percent": float(row.humidity_percent) if row.humidity_percent is not None else None,
                "weather_condition": row.weather_condition,
                "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
            }

    # recommendation_preview — reuses exact same function from /recommendations/latest.
    # null if ALL three are absent (brand-new account — don't fabricate).
    recommendation_preview = None
    if scan_row is not None or soil_row is not None:
        health_status = _compute_health_status(scan_row, soil_row)
        # Build a one-line summary
        if scan_row and scan_row.predicted_disease:
            if scan_row.predicted_disease == "Healthy":
                summary_line = "No disease detected"
            else:
                tier = scan_row.severity or "Unknown severity"
                summary_line = f"{scan_row.predicted_disease} — {tier}"
        elif soil_row and soil_row.predicted_soil_condition:
            summary_line = f"Soil: {soil_row.predicted_soil_condition}"
        else:
            summary_line = "Tap to view full recommendations"

        recommendation_preview = {
            "health_status": health_status,
            "summary": summary_line,
        }

    return {
        "latest_disease_scan": latest_disease,
        "latest_soil_analysis": latest_soil,
        "latest_weather": latest_weather,
        "recommendation_preview": recommendation_preview,
    }
