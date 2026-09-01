from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class WeatherRecord(Base):
    __tablename__ = "weather_records"
    weather_id = Column(BigInteger, primary_key=True, index=True)
    farm_id = Column(BigInteger, ForeignKey("farms.farm_id"), nullable=False, index=True)
    temperature_c = Column(Numeric(6, 2), nullable=True)
    humidity_percent = Column(Numeric(5, 2), nullable=True)
    rainfall_mm = Column(Numeric(8, 2), nullable=True)
    wind_speed_kmh = Column(Numeric(8, 2), nullable=True)
    pressure_hpa = Column(Numeric(8, 2), nullable=True)
    weather_condition = Column(String(100), nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
