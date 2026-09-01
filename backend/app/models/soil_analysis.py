from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class SoilAnalysis(Base):
    __tablename__ = "soil_analyses"
    analysis_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=True)
    soil_report_id = Column(BigInteger, nullable=True) # avoiding fk setup since report table not defined yet
    questionnaire_id = Column(BigInteger, nullable=True)
    ph = Column(Numeric, nullable=True)
    nitrogen = Column(Numeric, nullable=True)
    phosphorus = Column(Numeric, nullable=True)
    potassium = Column(Numeric, nullable=True)
    moisture = Column(Numeric, nullable=True)
    organic_matter = Column(Numeric, nullable=True)
    predicted_soil_condition = Column(String(150), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    fertilizer_recommendation = Column(Text, nullable=True)
    irrigation_recommendation = Column(Text, nullable=True)
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
