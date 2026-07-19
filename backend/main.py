import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from database_sql import engine, Base
from database_mongo import connect_to_mongo, close_mongo_connection
from routes import auth, checklist, blast_design, incidents

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQL database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mining Intelligence Platform - Alok's Modules",
    description="Python FastAPI REST API for Blast Safety Checklists & Blast Design Optimisation.",
    version="1.0.0"
)

# CORS middleware configuration
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup & Shutdown handlers
@app.on_event("startup")
def startup_db_client():
    connect_to_mongo()

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
