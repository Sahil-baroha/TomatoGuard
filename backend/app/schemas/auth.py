from pydantic import BaseModel
from typing import Optional

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    farm_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class MeResponse(BaseModel):
    user_id: int
    name: str
    email: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    farm_id: int
    farm_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    farm_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

