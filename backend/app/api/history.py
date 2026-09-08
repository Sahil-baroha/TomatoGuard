from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.farm import Farm
from app.models.disease_scan import DiseaseScan
from app.models.soil_analysis import SoilAnalysis
from app.models.weather_record import WeatherRecord
from app.schemas.history import HistoryItem

router = APIRouter()

@router.get("", response_model=List[HistoryItem])
def get_history(
    type: Optional[str] = None,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    if not farm:
        return []

    items = []

    # Disease Scans
    if type in (None, 'scan'):
        q = db.query(DiseaseScan).filter(DiseaseScan.user_id == current_user.user_id)
        if from_date:
            q = q.filter(DiseaseScan.scan_date >= from_date)
        if to_date:
            q = q.filter(DiseaseScan.scan_date <= to_date)
        
        for s in q.all():
            status = f"{s.predicted_disease}"
            if s.confidence is not None:
                status += f" ({int(s.confidence)}%)"
            
            items.append(HistoryItem(
                id=s.scan_id,
                normalized_date=s.scan_date,
                type='scan',
                quick_status=status,
                details={
                    "severity": s.severity,
                    "confidence": float(s.confidence) if s.confidence is not None else None,
                    "image_path": s.image_path
                }
            ))

    # Soil Analyses
    if type in (None, 'soil'):
        q = db.query(SoilAnalysis).filter(SoilAnalysis.user_id == current_user.user_id)
        if from_date:
            q = q.filter(SoilAnalysis.analysis_date >= from_date)
        if to_date:
            q = q.filter(SoilAnalysis.analysis_date <= to_date)
        
        for s in q.all():
            status = s.predicted_soil_condition or "Unknown Condition"
            
            items.append(HistoryItem(
                id=s.analysis_id,
                normalized_date=s.analysis_date,
                type='soil',
                quick_status=status,
                details={
                    "ph": float(s.ph) if s.ph is not None else None,
                    "nitrogen": float(s.nitrogen) if s.nitrogen is not None else None,
                    "phosphorus": float(s.phosphorus) if s.phosphorus is not None else None,
                    "potassium": float(s.potassium) if s.potassium is not None else None,
                }
            ))

    # Weather Records
    if type in (None, 'weather'):
        q = db.query(WeatherRecord).filter(WeatherRecord.farm_id == farm.farm_id)
        if from_date:
            q = q.filter(WeatherRecord.recorded_at >= from_date)
        if to_date:
            q = q.filter(WeatherRecord.recorded_at <= to_date)
        
        for w in q.all():
            temp = f"{float(w.temperature_c):.1f}" if w.temperature_c is not None else "-"
            status = f"{w.weather_condition or 'Unknown'} {temp}°C"
            
            items.append(HistoryItem(
                id=w.weather_id,
                normalized_date=w.recorded_at,
                type='weather',
                quick_status=status,
                details={
                    "humidity": float(w.humidity_percent) if w.humidity_percent is not None else None,
                    "rainfall": float(w.rainfall_mm) if w.rainfall_mm is not None else None,
                    "wind_speed": float(w.wind_speed_kmh) if w.wind_speed_kmh is not None else None
                }
            ))

    # Sort descending
    items.sort(key=lambda x: x.normalized_date, reverse=True)
    return items
