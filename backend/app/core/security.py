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
from app.models.admin import Admin

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_admin_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

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
        # Do not verify audience here so we can distinguish between invalid signature vs wrong audience
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    if payload.get("aud") != expected_aud:
        msg = "Admin access required" if expected_aud == "admin" else "Farmer access required"
        raise HTTPException(status_code=403, detail=msg)

    if payload.get("type") != expected_type:
        raise HTTPException(status_code=401, detail="Invalid token type")
        
    return payload

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

def create_admin_access_token(subject: Union[str, Any]) -> str:
    return create_access_token(subject, aud="admin")

def create_admin_refresh_token(subject: Union[str, Any]) -> str:
    return create_refresh_token(subject, aud="admin")

def get_current_admin(token: str = Depends(oauth2_admin_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token, expected_type="access", expected_aud="admin")
    admin_id = payload.get("sub")
    if admin_id is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    admin = db.query(Admin).filter(Admin.admin_id == admin_id).first()
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin
