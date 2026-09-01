from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import verify_password, create_admin_access_token, create_admin_refresh_token
from app.models.admin import Admin
from app.schemas.admin import AdminLoginRequest, TokenResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(req: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == req.email).first()
    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_admin_access_token(subject=admin.admin_id)
    refresh_token = create_admin_refresh_token(subject=admin.admin_id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
