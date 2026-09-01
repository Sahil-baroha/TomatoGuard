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
