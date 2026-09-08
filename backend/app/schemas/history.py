from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class HistoryItem(BaseModel):
    id: int
    normalized_date: datetime
    type: str  # 'scan', 'soil', 'weather'
    quick_status: str
    details: Optional[Dict[str, Any]] = None
