from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DiseaseAnalyzeResponse(BaseModel):
    """Response from POST /disease/analyze — exact field names per spec."""
    scan_id: int
    predicted_disease: str
    confidence: Optional[float]       # 0-100, null if model stub/no model
    description: Optional[str]        # from diseases table if disease_id matched
    immediate_action: Optional[str]   # from diseases.treatment if matched


class DiseaseHistoryItem(BaseModel):
    """One item in the GET /disease/history array — exact field names per spec."""
    scan_id: int
    predicted_disease: str
    confidence: Optional[float]
    scan_date: datetime
