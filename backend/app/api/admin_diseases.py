from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.disease import Disease
from app.schemas.admin import DiseaseResponse, DiseaseCreate, DiseaseUpdate

router = APIRouter()

@router.get("/", response_model=List[DiseaseResponse])
def get_diseases(db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    diseases = db.query(Disease).all()
    return diseases

@router.post("/", response_model=DiseaseResponse)
def create_disease(disease_in: DiseaseCreate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    existing = db.query(Disease).filter(Disease.disease_name == disease_in.disease_name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Disease name already exists")
    
    new_disease = Disease(**disease_in.model_dump())
    db.add(new_disease)
    db.commit()
    db.refresh(new_disease)
    return new_disease

@router.patch("/{disease_id}", response_model=DiseaseResponse)
def update_disease(disease_id: int, disease_in: DiseaseUpdate, db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    disease = db.query(Disease).filter(Disease.disease_id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")
    
    update_data = disease_in.model_dump(exclude_unset=True)
    if "disease_name" in update_data and update_data["disease_name"] != disease.disease_name:
        existing = db.query(Disease).filter(Disease.disease_name == update_data["disease_name"]).first()
        if existing:
            raise HTTPException(status_code=409, detail="Disease name already exists")
            
    for field, value in update_data.items():
        setattr(disease, field, value)
        
    db.commit()
    db.refresh(disease)
    return disease
