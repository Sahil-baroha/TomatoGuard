from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DiseaseSection(BaseModel):
    predicted_disease: str
    severity: Optional[str] = None
    recommendation: Optional[str] = None


class SoilSection(BaseModel):
    predicted_soil_condition: Optional[str] = None
    fertilizer_advice: Optional[str] = None
    irrigation_advice: Optional[str] = None


# ── data_used passthrough models (Bug 5) ──────────────────────────────────────

class DataUsedDisease(BaseModel):
    predicted_disease: str
    confidence: Optional[float] = None
    severity: Optional[str] = None
    scan_date: Optional[datetime] = None


class DataUsedSoil(BaseModel):
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    moisture: Optional[float] = None
    organic_matter: Optional[float] = None
    predicted_soil_condition: Optional[str] = None
    analysis_date: Optional[datetime] = None


class DataUsedWeather(BaseModel):
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    rainfall_mm: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    weather_condition: Optional[str] = None
    recorded_at: Optional[datetime] = None


class DataUsed(BaseModel):
    """Raw source figures that fed the recommendation computation — straight passthrough."""
    disease: Optional[DataUsedDisease] = None
    soil: Optional[DataUsedSoil] = None
    weather: Optional[DataUsedWeather] = None


class RecommendationsResponse(BaseModel):
    # None/absent means all relevant data is missing — not fabricated "good"
    health_status: Optional[str] = None  # "good" | "at-risk" | "critical"
    disease_treatment: Optional[DiseaseSection] = None
    fertilizer_advice: Optional[str] = None
    irrigation_advice: Optional[str] = None
    pest_prevention: Optional[str] = None
    general_crop_management: str  # always present — static text
    data_used: Optional[DataUsed] = None  # Bug 5: source figures transparency
