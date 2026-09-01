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

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the most recent disease scan, soil analysis, and weather record
    for the authenticated farmer's farm. Returns null for any that don't exist.
    Never fabricates placeholder values.
    """
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    farm_id = farm.farm_id if farm else None

    # Latest disease scan
    latest_disease = None
    if farm_id is not None:
        row = (
            db.query(DiseaseScan)
            .filter(DiseaseScan.farm_id == farm_id)
            .order_by(desc(DiseaseScan.scan_date))
            .first()
        )
        if row:
            latest_disease = {
                "scan_id": row.scan_id,
                "predicted_disease": row.predicted_disease,
                "confidence": float(row.confidence) if row.confidence is not None else None,
                "scan_date": row.scan_date.isoformat() if row.scan_date else None,
                "image_path": row.image_path,
            }

    # Latest soil analysis
    latest_soil = None
    if farm_id is not None:
        row = (
            db.query(SoilAnalysis)
            .filter(SoilAnalysis.farm_id == farm_id)
            .order_by(desc(SoilAnalysis.analysis_date))
            .first()
        )
        if row:
            latest_soil = {
                "analysis_id": row.analysis_id,
                "predicted_soil_condition": row.predicted_soil_condition,
                "fertilizer_recommendation": row.fertilizer_recommendation,
                "irrigation_recommendation": row.irrigation_recommendation,
                "analysis_date": row.analysis_date.isoformat() if row.analysis_date else None,
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

    return {
        "latest_disease_scan": latest_disease,
        "latest_soil_analysis": latest_soil,
        "latest_weather": latest_weather,
    }
