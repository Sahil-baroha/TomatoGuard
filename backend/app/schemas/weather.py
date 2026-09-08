from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WeatherCurrentResponse(BaseModel):
    weather_id: int
    farm_id: int
    temperature_c: Optional[float]
    humidity_percent: Optional[float]
    rainfall_mm: Optional[float]
    wind_speed_kmh: Optional[float]
    pressure_hpa: Optional[float]
    weather_condition: Optional[str]
    recorded_at: datetime


class WeatherForecastDay(BaseModel):
    date: Optional[str]
    weather_condition: Optional[str]
    weather_code: Optional[int]
    temperature_max_c: Optional[float]
    temperature_min_c: Optional[float]
    precipitation_mm: Optional[float]
    wind_speed_max_kmh: Optional[float]


class WeatherForecastResponse(BaseModel):
    farm_id: int
    forecast: list[WeatherForecastDay]
