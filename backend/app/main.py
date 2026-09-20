from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, admin_auth, admin_diseases, admin_farmers, dashboard, disease, soil, weather

import os

app = FastAPI(title="TomatoGuard AI API")

# Default to localhost for dev, but allow comma-separated Vercel URLs in production
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin_auth.router, prefix="/admin", tags=["admin_auth"])
app.include_router(admin_diseases.router, prefix="/admin/diseases", tags=["admin_diseases"])
app.include_router(admin_farmers.router, prefix="/admin/farmers", tags=["admin_farmers"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(disease.router, prefix="/disease", tags=["disease"])
app.include_router(soil.router, prefix="/soil", tags=["soil"])
app.include_router(weather.router, prefix="/weather", tags=["weather"])
from app.api import history
app.include_router(history.router, prefix="/history", tags=["history"])
from app.api import recommendations
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
