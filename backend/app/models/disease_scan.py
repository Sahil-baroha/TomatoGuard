from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class DiseaseScan(Base):
    __tablename__ = "disease_scans"
    scan_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=True, index=True)
    disease_id = Column(BigInteger, ForeignKey("diseases.disease_id"), nullable=True)
    image_path = Column(Text, nullable=False)
    image_public_id = Column(Text, nullable=True)
    predicted_disease = Column(String(150), nullable=False)
    confidence = Column(Numeric(5, 2), nullable=True)
    severity = Column(String(30), nullable=True)
    model_name = Column(String(100), default="EfficientNetB0")
    model_version = Column(String(50), nullable=True)
    recommendation = Column(Text, nullable=True)
    scan_date = Column(DateTime(timezone=True), server_default=func.now())
