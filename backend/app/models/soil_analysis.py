from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base


class SoilAnalysis(Base):
    __tablename__ = "soil_analyses"
    analysis_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=True)
    # Exactly one of these should be set (enforced in application code, not DB constraint)
    soil_report_id = Column(BigInteger, ForeignKey("soil_reports.soil_report_id"), nullable=True)
    questionnaire_id = Column(BigInteger, ForeignKey("soil_questionnaires.questionnaire_id"), nullable=True)
    # Nutrient readings — all nullable (null when input was questionnaire-only)
    ph = Column(Numeric, nullable=True)
    nitrogen = Column(Numeric, nullable=True)
    phosphorus = Column(Numeric, nullable=True)
    potassium = Column(Numeric, nullable=True)
    moisture = Column(Numeric, nullable=True)
    organic_matter = Column(Numeric, nullable=True)
    # Rule-based / model outputs
    predicted_soil_condition = Column(String(150), nullable=True)  # NOT "fertility_rating"
    confidence = Column(Numeric(5, 2), nullable=True)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    fertilizer_recommendation = Column(Text, nullable=True)
    irrigation_recommendation = Column(Text, nullable=True)
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
