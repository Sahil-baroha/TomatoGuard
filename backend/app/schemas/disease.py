from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class DiseaseAnalyzeResponse(BaseModel):
    """Response from POST /disease/analyze — exact field names per spec."""
    scan_id: int
    predicted_disease: str
    confidence: Optional[float]           # 0-100, null if model stub/no model
    description: Optional[str]            # 1-2 sentence disease overview
    immediate_action: Optional[str]       # from diseases.treatment if matched
    # ── Enriched fields (computed from knowledge base, not stored in DB) ─────
    severity: Optional[str]               # "Low" | "Moderate" | "High"
    treatment_plan: Optional[str]         # Biological/chemical/organic steps
    prevention_tips: Optional[str]        # Long-term recurrence prevention
    low_confidence_warning: bool = False  # True when confidence < 60%


class DiseaseHistoryItem(BaseModel):
    """One item in the GET /disease/history array."""
    scan_id: int
    predicted_disease: str
    confidence: Optional[float]
    scan_date: datetime
    # Added for clickable detail modal — already stored in disease_scans
    image_path: Optional[str] = None
    severity: Optional[str] = None
    recommendation: Optional[str] = None
