from sqlalchemy import Column, BigInteger, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base


class SoilReport(Base):
    __tablename__ = "soil_reports"
    soil_report_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=True)
    report_file_path = Column(Text, nullable=False)       # Cloudinary secure_url
    report_file_public_id = Column(Text, nullable=True)   # Cloudinary public_id
    report_date = Column(DateTime(timezone=True), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
