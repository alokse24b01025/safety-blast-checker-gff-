from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database_sql import get_db
from models_sql import IncidentLog
from schemas import IncidentLogCreate, IncidentLogResponse
from routes.auth import get_current_user, User

router = APIRouter(prefix="/api/incidents", tags=["Incident Logs"])

@router.post("", response_model=IncidentLogResponse)
def log_incident(
    incident_in: IncidentLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_incident = IncidentLog(
        blast_id=incident_in.blast_id,
        incident_type=incident_in.incident_type,
        description=incident_in.description,
        severity=incident_in.severity,
        logged_by=current_user.full_name
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@router.get("/list", response_model=List[IncidentLogResponse])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(IncidentLog).order_by(IncidentLog.logged_at.desc()).all()

@router.get("/{blast_id}", response_model=List[IncidentLogResponse])
def list_incidents_by_blast(blast_id: str, db: Session = Depends(get_db)):
    return db.query(IncidentLog).filter(IncidentLog.blast_id == blast_id).order_by(IncidentLog.logged_at.desc()).all()
