import os

files = {
    "backend/app/__init__.py": "",
    "backend/app/core/__init__.py": "",
    "backend/app/models/__init__.py": "",
    "backend/app/schemas/__init__.py": "",
    "backend/app/api/__init__.py": "",
    "backend/app/core/config.py": """\
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "supersecret-placeholder-for-dev"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"

settings = Settings()
""",
    "backend/app/core/db.py": """\
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    "backend/app/models/user.py": """\
from sqlalchemy import Column, BigInteger, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    village = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    admin_id = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
""",
    "backend/app/models/farm.py": """\
from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class Farm(Base):
    __tablename__ = "farms"
    farm_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), unique=True, nullable=False)
    farm_name = Column(String(150), nullable=False)
    location = Column(Text, nullable=True)
    area_acres = Column(Numeric(10, 2), nullable=True)
    soil_type = Column(String(100), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
""",
    "backend/app/schemas/auth.py": """\
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
""",
    "backend/app/core/security.py": """\
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: Union[str, Any], aud: str = "farmer") -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "aud": aud, "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], aud: str = "farmer") -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "aud": aud, "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str, expected_type: str = "access", expected_aud: str = "farmer") -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], audience=expected_aud)
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token, expected_type="access", expected_aud="farmer")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    return user
""",
    "backend/app/api/auth.py": """\
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user, decode_token
from app.models.user import User
from app.models.farm import Farm
from app.schemas.auth import SignupRequest, LoginRequest, RefreshRequest, TokenResponse, MeResponse

router = APIRouter()

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    hashed_pwd = hash_password(req.password)
    new_user = User(
        name=req.name,
        email=req.email,
        password_hash=hashed_pwd,
        phone=req.phone,
        address=req.address,
        village=req.village,
        district=req.district,
        state=req.state
    )
    db.add(new_user)
    try:
        db.flush()
        new_farm = Farm(
            user_id=new_user.user_id,
            farm_name=req.farm_name,
            latitude=req.latitude,
            longitude=req.longitude
        )
        db.add(new_farm)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed")
    
    access_token = create_access_token(subject=new_user.user_id, aud="farmer")
    refresh_token = create_refresh_token(subject=new_user.user_id, aud="farmer")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    
    access_token = create_access_token(subject=user.user_id, aud="farmer")
    refresh_token = create_refresh_token(subject=user.user_id, aud="farmer")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshRequest):
    payload = decode_token(req.refresh_token, expected_type="refresh", expected_aud="farmer")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    new_access = create_access_token(subject=user_id, aud="farmer")
    new_refresh = create_refresh_token(subject=user_id, aud="farmer")
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    if not farm:
        raise HTTPException(status_code=500, detail="Farm not found for user")
    
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "village": current_user.village,
        "district": current_user.district,
        "state": current_user.state,
        "farm_id": farm.farm_id,
        "farm_name": farm.farm_name,
        "latitude": farm.latitude,
        "longitude": farm.longitude
    }
""",
    "backend/app/main.py": """\
from fastapi import FastAPI
from app.api import auth

app = FastAPI(title="TomatoGuard AI API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
print("Backend files generated.")
