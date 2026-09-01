from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.user import User
from app.models.farm import Farm
from app.models.disease_scan import DiseaseScan
from app.models.soil_analysis import SoilAnalysis
from app.models.weather_record import WeatherRecord
from app.schemas.admin import FarmerListResponse, FarmerStatusUpdate

router = APIRouter()

@router.get("/", response_model=List[FarmerListResponse])
def get_farmers(
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(User, Farm).join(Farm, User.user_id == Farm.user_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                User.village.ilike(search_term)
            )
        )
    
    results = query.offset(offset).limit(limit).all()
    
    response = []
    for user, farm in results:
        response.append({
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "village": user.village,
            "district": user.district,
            "is_active": user.is_active,
            "farm_name": farm.farm_name,
            "created_at": user.created_at
        })
    return response

@router.get("/{user_id}")
def get_farmer_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    farm = db.query(Farm).filter(Farm.user_id == user_id).first()
    
    disease_scans = db.query(DiseaseScan).filter(DiseaseScan.user_id == user_id).order_by(DiseaseScan.scan_date.desc()).limit(5).all()
    soil_analyses = db.query(SoilAnalysis).filter(SoilAnalysis.user_id == user_id).order_by(SoilAnalysis.analysis_date.desc()).limit(5).all()
    
    weather_records = []
    if farm:
        weather_records = db.query(WeatherRecord).filter(WeatherRecord.farm_id == farm.farm_id).order_by(WeatherRecord.recorded_at.desc()).limit(5).all()
        
    return {
        "profile": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
            "village": user.village,
            "district": user.district,
            "state": user.state,
            "is_active": user.is_active,
            "created_at": user.created_at
        },
        "farm": {
            "farm_id": farm.farm_id,
            "farm_name": farm.farm_name,
            "location": farm.location,
            "area_acres": farm.area_acres,
            "soil_type": farm.soil_type,
            "latitude": farm.latitude,
            "longitude": farm.longitude
        } if farm else None,
        "recent_disease_scans": disease_scans,
        "recent_soil_analyses": soil_analyses,
        "recent_weather_records": weather_records
    }

@router.patch("/{user_id}/status")
def update_farmer_status(
    user_id: int,
    status_update: FarmerStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    user.is_active = status_update.is_active
    db.commit()
    
    return {"user_id": user.user_id, "is_active": user.is_active}
