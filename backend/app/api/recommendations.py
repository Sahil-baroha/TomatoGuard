"""
GET /recommendations/latest — farmer auth.

Computed fresh on every call from:
  - latest disease_scans row (by scan_date DESC)
  - latest soil_analyses row (by analysis_date DESC)
  - latest weather_records row (by recorded_at DESC) for the farmer's farm

NOT persisted. No recommendations table exists or is created here.
404 if all three are missing (brand-new account).
Partial result returned if 1 or 2 of the three exist.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.farm import Farm
from app.models.disease_scan import DiseaseScan
from app.models.soil_analysis import SoilAnalysis
from app.models.weather_record import WeatherRecord
from app.schemas.recommendations import (
    RecommendationsResponse, DiseaseSection,
    DataUsed, DataUsedDisease, DataUsedSoil, DataUsedWeather,
)

router = APIRouter()

# ── Agronomic bounds used for health_status "at-risk" nutrient check ──────────
# Source: widely cited PlantVillage / FAO tomato production guidelines.
# These are intentionally broad — they flag clear deficiencies, not marginal ones.
# Flagged for agronomist review before asserting as precise thresholds.
#   Nitrogen: <100 kg/ha equivalent (mapped to ppm proxy)
#   Phosphorus: <20 kg/ha equivalent
#   Potassium: <100 kg/ha equivalent
# The soil model stores values as numeric — units depend on input source.
# We apply these as lower-bound checks: if value is non-null and below
# these bounds, we flag at-risk. If value is null we treat it as neutral.
_N_LOW_BOUND  = 100   # below this → at-risk (nitrogen)
_P_LOW_BOUND  = 20    # below this → at-risk (phosphorus)
_K_LOW_BOUND  = 100   # below this → at-risk (potassium)

# Rainfall threshold for irrigation weather-note (mm).
# If weather_records.rainfall_mm >= this value, we append a note to
# irrigation_advice. 2.5 mm is a common "non-trivial rain" threshold
# in irrigation scheduling literature. Flagged for agronomic review.
_RAIN_NOTE_THRESHOLD_MM = 2.5

# Static text — not personalised (no data source available for personalisation).
# Flagged in summary to decide if dynamic version is worth building later.
_GENERAL_CROP_MGMT = (
    "Maintain consistent watering schedule — tomatoes need deep, even moisture. "
    "Stake or cage plants early to prevent stem stress. "
    "Prune suckers from indeterminate varieties to improve airflow and yield. "
    "Ensure plant spacing of at least 45–60 cm to reduce humidity and disease spread."
)

# Pest prevention notes keyed by disease category (non-personalized)
_PEST_BY_CATEGORY = {
    # Viral diseases spread by insects — emphasise vector control
    "Yellow Leaf Curl Virus": (
        "Viral disease detected: control whitefly populations using yellow sticky traps "
        "and reflective mulches. Remove and destroy infected plants promptly."
    ),
    "Mosaic Virus": (
        "Viral disease detected: control aphid vectors with neem oil spray or insecticidal soap. "
        "Disinfect tools with 10% bleach solution. Avoid tobacco near plants."
    ),
    # Fungal / bacterial — emphasise sanitation and spray schedule
    "Bacterial Spot": (
        "Bacterial disease detected: avoid working with wet plants to prevent spread. "
        "Apply copper-based bactericide preventively. Practice strict crop rotation."
    ),
    "Early Blight": (
        "Fungal disease detected: remove lower infected leaves, apply fungicide on a 7-day cycle. "
        "Mulch to prevent soil splash."
    ),
    "Late Blight": (
        "High-risk fungal disease detected: scout surrounding plants immediately. "
        "Apply preventive copper spray on healthy plants. Avoid cool, wet conditions near crop."
    ),
    "Leaf Mold": (
        "Fungal disease detected: reduce humidity by improving ventilation. "
        "Avoid overhead watering. Apply copper oxychloride if spread continues."
    ),
    "Septoria Leaf Spot": (
        "Fungal disease detected: remove spotted lower leaves. Water at root zone only. "
        "Apply chlorothalonil or copper-based fungicide on a 7–10 day schedule."
    ),
    "Target Spot": (
        "Fungal disease detected: thin canopy to improve airflow. "
        "Apply azoxystrobin on a 10–14 day cycle."
    ),
    # Pest (mite)
    "Spider Mites (Two-Spotted)": (
        "Pest detected — spider mites: apply neem oil or insecticidal soap, covering leaf undersides. "
        "For severe infestation, use abamectin miticide. Keep plants well-watered — stressed plants are more vulnerable."
    ),
    # Healthy — general seasonal tip
    "Healthy": (
        "No disease detected. General pest prevention: scout plants twice weekly, "
        "check leaf undersides for early mite or aphid colonies. Install sticky traps as early warning."
    ),
}

_PEST_GENERAL = (
    "General tomato pest prevention: scout plants twice weekly and check leaf undersides. "
    "Install yellow sticky traps to monitor whitefly and aphid levels. "
    "Keep the area around plants free of weeds that harbour pests."
)


def _compute_health_status(
    scan: Optional[DiseaseScan],
    soil: Optional[SoilAnalysis],
) -> Optional[str]:
    """
    Deterministic rule (documented in endpoint spec):
    - "critical" if severity == "Severe" OR soil pH outside [5.5, 7.5]
    - "at-risk"  if severity == "Moderate" OR any nutrient clearly below agronomic bound
    - "good"     otherwise when data exists
    - None       if ALL relevant data is absent (don't fabricate optimism)
    """
    if scan is None and soil is None:
        return None

    # Critical: Severe scan or bad pH
    if scan and scan.severity == "Severe":
        return "critical"
    if soil and soil.ph is not None:
        ph = float(soil.ph)
        if ph < 5.5 or ph > 7.5:
            return "critical"

    # At-risk: Moderate scan or low nutrient
    if scan and scan.severity == "Moderate":
        return "at-risk"
    if soil:
        low_nutrients = (
            (soil.nitrogen   is not None and float(soil.nitrogen)   < _N_LOW_BOUND) or
            (soil.phosphorus is not None and float(soil.phosphorus) < _P_LOW_BOUND) or
            (soil.potassium  is not None and float(soil.potassium)  < _K_LOW_BOUND)
        )
        if low_nutrients:
            return "at-risk"

    return "good"


@router.get("/latest", response_model=RecommendationsResponse)
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Fetch the farmer's farm ───────────────────────────────────────────────
    farm = db.query(Farm).filter(Farm.user_id == current_user.user_id).first()
    farm_id = farm.farm_id if farm else None

    # ── Fetch latest rows ────────────────────────────────────────────────────
    scan: Optional[DiseaseScan] = (
        db.query(DiseaseScan)
        .filter(DiseaseScan.user_id == current_user.user_id)
        .order_by(DiseaseScan.scan_date.desc())
        .first()
    )

    soil: Optional[SoilAnalysis] = (
        db.query(SoilAnalysis)
        .filter(SoilAnalysis.user_id == current_user.user_id)
        .order_by(SoilAnalysis.analysis_date.desc())
        .first()
    )

    weather: Optional[WeatherRecord] = None
    if farm_id:
        weather = (
            db.query(WeatherRecord)
            .filter(WeatherRecord.farm_id == farm_id)
            .order_by(WeatherRecord.recorded_at.desc())
            .first()
        )

    # ── 404 if all three missing ──────────────────────────────────────────────
    if scan is None and soil is None and weather is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No data found yet. Please run a Disease Scan, a Soil Analysis, "
                "and check Weather at least once to generate recommendations."
            ),
        )

    # ── Build sections ────────────────────────────────────────────────────────

    # 1. health_status
    health_status = _compute_health_status(scan, soil)

    # 2. disease_treatment — surface exactly what Phase 3 stored, no recompute
    disease_treatment = None
    if scan:
        disease_treatment = DiseaseSection(
            predicted_disease=scan.predicted_disease,
            severity=scan.severity,
            recommendation=scan.recommendation,
        )

    # 3. fertilizer_advice / irrigation_advice — directly from soil row
    fertilizer_advice = soil.fertilizer_recommendation if soil else None
    irrigation_advice = soil.irrigation_recommendation if soil else None

    # Irrigation weather refinement: if rainfall is non-trivial, append note
    if (
        irrigation_advice is not None
        and weather is not None
        and weather.rainfall_mm is not None
        and float(weather.rainfall_mm) >= _RAIN_NOTE_THRESHOLD_MM
    ):
        rain_mm = float(weather.rainfall_mm)
        irrigation_advice = (
            f"{irrigation_advice} "
            f"[Note: recent rainfall recorded — {rain_mm:.1f} mm. "
            "Consider reducing irrigation accordingly.]"
        )

    # 4. pest_prevention — category-based on detected disease, else general
    pest_prevention = None
    if scan and scan.predicted_disease:
        pest_prevention = _PEST_BY_CATEGORY.get(
            scan.predicted_disease, _PEST_GENERAL
        )
    else:
        pest_prevention = _PEST_GENERAL

    # 5. general_crop_management — static (see comment at top of file)
    # Build data_used passthrough — straight read of already-loaded rows, no new queries
    data_used = DataUsed(
        disease=DataUsedDisease(
            predicted_disease=scan.predicted_disease,
            confidence=float(scan.confidence) if scan.confidence is not None else None,
            severity=scan.severity,
            scan_date=scan.scan_date,
        ) if scan else None,
        soil=DataUsedSoil(
            ph=float(soil.ph) if soil.ph is not None else None,
            nitrogen=float(soil.nitrogen) if soil.nitrogen is not None else None,
            phosphorus=float(soil.phosphorus) if soil.phosphorus is not None else None,
            potassium=float(soil.potassium) if soil.potassium is not None else None,
            moisture=float(soil.moisture) if soil.moisture is not None else None,
            organic_matter=float(soil.organic_matter) if soil.organic_matter is not None else None,
            predicted_soil_condition=soil.predicted_soil_condition,
            analysis_date=soil.analysis_date,
        ) if soil else None,
        weather=DataUsedWeather(
            temperature_c=float(weather.temperature_c) if weather and weather.temperature_c is not None else None,
            humidity_percent=float(weather.humidity_percent) if weather and weather.humidity_percent is not None else None,
            rainfall_mm=float(weather.rainfall_mm) if weather and weather.rainfall_mm is not None else None,
            wind_speed_kmh=float(weather.wind_speed_kmh) if weather and weather.wind_speed_kmh is not None else None,
            weather_condition=weather.weather_condition if weather else None,
            recorded_at=weather.recorded_at if weather else None,
        ) if weather else None,
    )

    return RecommendationsResponse(
        health_status=health_status,
        disease_treatment=disease_treatment,
        fertilizer_advice=fertilizer_advice,
        irrigation_advice=irrigation_advice,
        pest_prevention=pest_prevention,
        general_crop_management=_GENERAL_CROP_MGMT,
        data_used=data_used,
    )
