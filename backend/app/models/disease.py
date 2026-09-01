from sqlalchemy import Column, BigInteger, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.db import Base

class Disease(Base):
    __tablename__ = "diseases"
    disease_id = Column(BigInteger, primary_key=True, index=True)
    disease_name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    causes = Column(Text, nullable=True)
    prevention = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
