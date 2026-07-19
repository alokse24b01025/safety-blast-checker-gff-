from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

# --- Authentication Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # "OFFICER" or "SUPERVISOR"
    full_name: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    full_name: str

# --- Checklist Schemas ---
class ChecklistPayload(BaseModel):
    site_name: str = Field(..., min_length=2)
    blast_id: str = Field(..., min_length=1)
    blast_date: str
    blast_time: str
    
    temperature_c: float = Field(..., ge=-50, le=70)
    rainfall_mm: float = Field(..., ge=0, le=1000)
    wind_speed_kmh: float = Field(..., ge=0, le=300)
    worker_count: int = Field(..., ge=0, le=5000)
    max_safe_worker_count: Optional[int] = Field(default=50, ge=1, le=5000)
    
    lightning_warning: bool
    supervisor_available: bool
    blasting_officer_available: bool
    workers_in_exclusion_zone: bool
    safety_briefing_completed: bool
    detonators_secure: bool
    siren_working: bool
    communication_working: bool
    emergency_vehicle_available: bool
    exclusion_zone_established: bool
    barricades_in_place: bool
    blast_design_approved: bool
    escape_route_clear: bool

class FlaggedIssue(BaseModel):
    code: str
    description: str
    weight: int
    critical: bool

class SubmissionCreate(ChecklistPayload):
    pass

class SubmissionResponse(BaseModel):
    id: str
    site_name: str
    blast_id: str
    blast_date: str
    total_score: int
    risk_level: str
    critical_triggered: bool
    issues: List[FlaggedIssue]
    ai_recommendation: Optional[str] = None
    ai_generated: Optional[bool] = False
    ai_provider: Optional[str] = None
    officer_decision: Optional[str] = None
    officer_name: Optional[str] = None
    officer_comments: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str
    payload: dict

class OfficerReviewInput(BaseModel):
    decision: str  # "APPROVED", "REJECTED", "HOLD"
    officer_name: str = Field(..., min_length=2)
    comments: Optional[str] = ""
    digital_signature: Optional[str] = None  # Base64 string representing signature

    @field_validator('decision')
    def validate_decision(cls, v):
        if v not in ('APPROVED', 'REJECTED', 'HOLD'):
            raise ValueError('decision must be APPROVED, REJECTED, or HOLD')
        return v

# --- Blast Design Optimisation (Module 2) Schemas ---
class BlastPlanCreate(BaseModel):
    blast_id: str = Field(..., min_length=1)
    bench_height: float = Field(..., gt=0)
    burden: float = Field(..., gt=0)
    spacing: float = Field(..., gt=0)
    hole_diameter: float = Field(..., gt=0)  # in mm
    subdrill: float = Field(..., ge=0)
    stemming_height: float = Field(..., ge=0)
    hole_layout: str  # "GRID" or "STAGGERED"
    
    explosive_type: str  # "ANFO" or "EMULSION"
    explosive_qty: float = Field(..., gt=0)  # in kg
    charge_distribution: str  # "CONTINUOUS" or "DECKED"
    delay_timing: int = Field(..., ge=0)  # ms
    primer_position: str  # "BOTTOM", "MIDDLE", "TOP"
    deck_charging: bool = False

    @field_validator('hole_layout')
    def validate_layout(cls, v):
        if v not in ('GRID', 'STAGGERED'):
            raise ValueError('hole_layout must be GRID or STAGGERED')
        return v

    @field_validator('explosive_type')
    def validate_exp_type(cls, v):
        if v not in ('ANFO', 'EMULSION'):
            raise ValueError('explosive_type must be ANFO or EMULSION')
        return v

    @field_validator('primer_position')
    def validate_primer(cls, v):
        if v not in ('BOTTOM', 'MIDDLE', 'TOP'):
            raise ValueError('primer_position must be BOTTOM, MIDDLE, or TOP')
        return v

class BlastPlanResponse(BlastPlanCreate):
    id: int
    created_at: datetime
    
    # Simulation
    fragmentation_size: Optional[float] = None
    throw_distance: Optional[float] = None
    flyrock_risk: Optional[str] = None
    ground_vibration: Optional[float] = None
    air_blast: Optional[float] = None
    
    # AI Optimisation
    opt_burden: Optional[float] = None
    opt_spacing: Optional[float] = None
    opt_hole_depth: Optional[float] = None
    opt_explosive_type: Optional[str] = None
    opt_delay_pattern: Optional[str] = None
    opt_powder_factor: Optional[float] = None

    class Config:
        from_attributes = True

# --- Incident Logging Schemas ---
class IncidentLogCreate(BaseModel):
    blast_id: str = Field(..., min_length=1)
    incident_type: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"

    @field_validator('severity')
    def validate_severity(cls, v):
        if v not in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'):
            raise ValueError('severity must be LOW, MEDIUM, or HIGH or CRITICAL')
        return v

class IncidentLogResponse(IncidentLogCreate):
    id: int
    logged_by: str
    logged_at: datetime

    class Config:
        from_attributes = True
