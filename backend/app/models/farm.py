from sqlalchemy import Column, BigInteger, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class Farm(Base):
    __tablename__ = "farms"
    farm_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), unique=True, nullable=False)
    farm_name = Column(String(150), nullable=False)
    location = Column(Text, nullable=True)
    area_acres = Column(Numeric(10, 2), nullable=True)
    soil_type = Column(String(100), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
