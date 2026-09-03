import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from database_sql import engine, Base
from database_mongo import connect_to_mongo, close_mongo_connection
from routes import auth, checklist, blast_design, incidents, dashboard, vision_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQL database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mining Intelligence Platform",
    description="Python FastAPI REST API for Blast Safety Checklists & Blast Design Optimisation.",
    version="1.0.0"
)

# CORS middleware configuration
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex="https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.on_event("startup")
def startup_db_client():
    connect_to_mongo()
    missing_vars = []
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        missing_vars.append("SMTP (SMTP_USER, SMTP_PASSWORD) - Required for Email OTP")
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_PHONE_NUMBER:
        missing_vars.append("Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) - Required for Phone OTP")
        
    if missing_vars:
        print("\n" + "="*80)
        print("[CONFIGURATION WARNING] Missing Third-Party Credentials:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\n  To receive actual OTP codes, please add these keys to backend/.env.")
        print("="*80 + "\n")

@app.on_event("shutdown")
def shutdown_db_client():
    close_mongo_connection()

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "fastapi-backend"}

# Register Routers
app.include_router(auth.router)
app.include_router(checklist.router)
app.include_router(blast_design.router)
app.include_router(incidents.router)
app.include_router(dashboard.router)
app.include_router(vision_routes.router, prefix="/api/vision", tags=["Live Vision Camera"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)