from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.farm import Farm
from app.models.weather_record import WeatherRecord
from app.schemas.weather import WeatherCurrentResponse, WeatherForecastResponse, WeatherForecastDay
from app.services import weather_client
import httpx

router = APIRouter()


def _get_farm_with_coords(current_user: User, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    if not farm:
        raise HTTPException(status_code=500, detail="Farm not found for user")
    if farm.latitude is None or farm.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Your farm has no location set. Add latitude and longitude via your Profile page to enable weather."
        )
    return farm


@router.get("/current", response_model=WeatherCurrentResponse)
def get_current_weather(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = _get_farm_with_coords(current_user, db)

    try:
        conditions = weather_client.get_current(float(farm.latitude), float(farm.longitude))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {str(e)}")

    record = WeatherRecord(
        farm_id=farm.farm_id,
        temperature_c=conditions.get("temperature_c"),
        humidity_percent=conditions.get("humidity_percent"),
        rainfall_mm=conditions.get("rainfall_mm"),
        wind_speed_kmh=conditions.get("wind_speed_kmh"),
        pressure_hpa=conditions.get("pressure_hpa"),
        weather_condition=conditions.get("weather_condition"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get("/forecast", response_model=WeatherForecastResponse)
def get_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = _get_farm_with_coords(current_user, db)

    try:
        days = weather_client.get_forecast(float(farm.latitude), float(farm.longitude))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {str(e)}")

    # Forecast does NOT write to weather_records — spec is explicit on this.
    return {
        "farm_id": farm.farm_id,
        "forecast": [WeatherForecastDay(**d) for d in days],
    }
