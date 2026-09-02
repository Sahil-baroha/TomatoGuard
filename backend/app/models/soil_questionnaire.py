from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.db import Base


class SoilQuestionnaire(Base):
    __tablename__ = "soil_questionnaires"
    questionnaire_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=True)
    # The 6 questionnaire fields per spec (PROJECT_REFERENCE.md)
    crop_stage = Column(String(100), nullable=True)
    previous_crop = Column(String(100), nullable=True)
    irrigation_type = Column(String(100), nullable=True)
    fertilizer_used = Column(String(200), nullable=True)
    soil_color = Column(String(100), nullable=True)
    drainage_condition = Column(String(100), nullable=True)
    additional_answers = Column(JSONB, nullable=True)  # any extra key-value pairs
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
