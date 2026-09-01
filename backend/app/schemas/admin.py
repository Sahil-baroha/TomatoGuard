from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class DiseaseBase(BaseModel):
    disease_name: str
    description: Optional[str] = None
    symptoms: Optional[str] = None
    causes: Optional[str] = None
    prevention: Optional[str] = None
    treatment: Optional[str] = None

class DiseaseCreate(DiseaseBase):
    pass

class DiseaseUpdate(BaseModel):
    disease_name: Optional[str] = None
    description: Optional[str] = None
    symptoms: Optional[str] = None
    causes: Optional[str] = None
    prevention: Optional[str] = None
    treatment: Optional[str] = None

class DiseaseResponse(DiseaseBase):
    disease_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FarmerStatusUpdate(BaseModel):
    is_active: bool

class FarmerListResponse(BaseModel):
    user_id: int
    name: str
    email: str
    village: Optional[str] = None
    district: Optional[str] = None
    is_active: bool
    farm_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
