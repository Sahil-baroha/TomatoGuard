from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


# ── POST /soil/report ─────────────────────────────────────────────────────────

class SoilReportResponse(BaseModel):
    """Response from POST /soil/report — OCR result, not yet an analysis."""
    soil_report_id: int
    raw_ocr_text: str
    # Parsed numeric fields from OCR — all optional, null if OCR could not find them
    ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    moisture: Optional[float]
    organic_matter: Optional[float]


# ── POST /soil/report/confirm ─────────────────────────────────────────────────

class SoilReportConfirmRequest(BaseModel):
    """Body for POST /soil/report/confirm — farmer reviews OCR and confirms/corrects values."""
    soil_report_id: int
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    moisture: Optional[float] = None
    organic_matter: Optional[float] = None


class SoilAnalysisResponse(BaseModel):
    """Response from POST /soil/report/confirm and POST /soil/questionnaire — analysis result."""
    analysis_id: int
    predicted_soil_condition: Optional[str]
    fertilizer_recommendation: Optional[str]
    irrigation_recommendation: Optional[str]
    # Numeric fields — null for questionnaire path, present for report path
    ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    moisture: Optional[float] = None
    organic_matter: Optional[float] = None
    analysis_date: datetime


# ── POST /soil/questionnaire ──────────────────────────────────────────────────

class SoilQuestionnaireRequest(BaseModel):
    """Body for POST /soil/questionnaire — the 6 questionnaire fields per spec."""
    crop_stage: Optional[str] = None
    previous_crop: Optional[str] = None
    irrigation_type: Optional[str] = None
    fertilizer_used: Optional[str] = None
    soil_color: Optional[str] = None
    drainage_condition: Optional[str] = None
    additional_answers: Optional[Any] = None  # arbitrary JSON / dict


# ── GET /soil/latest ──────────────────────────────────────────────────────────

class SoilLatestResponse(BaseModel):
    """Response from GET /soil/latest — the most recent soil_analyses row."""
    analysis_id: int
    predicted_soil_condition: Optional[str]
    fertilizer_recommendation: Optional[str]
    irrigation_recommendation: Optional[str]
    ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    moisture: Optional[float]
    organic_matter: Optional[float]
    soil_report_id: Optional[int]
    questionnaire_id: Optional[int]
    analysis_date: datetime
