from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database_sql import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "OFFICER" or "SUPERVISOR"
    full_name = Column(String, nullable=False)

class BlastPlan(Base):
    __tablename__ = "blast_plans"

    id = Column(Integer, primary_key=True, index=True)
    blast_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Pattern Designer Parameters
    bench_height = Column(Float, nullable=False)
    burden = Column(Float, nullable=False)
    spacing = Column(Float, nullable=False)
    hole_diameter = Column(Float, nullable=False)  # in mm
    subdrill = Column(Float, nullable=False)
    stemming_height = Column(Float, nullable=False)
    hole_layout = Column(String, nullable=False)  # "GRID" or "STAGGERED"

    # Charge Calculation Parameters
    explosive_type = Column(String, nullable=False)  # "ANFO" or "EMULSION"
    explosive_qty = Column(Float, nullable=False)  # in kg
    charge_distribution = Column(String, nullable=False)  # "CONTINUOUS" or "DECKED"
    delay_timing = Column(Integer, nullable=False)  # in ms
    primer_position = Column(String, nullable=False)  # "BOTTOM", "MIDDLE", "TOP"
    deck_charging = Column(Boolean, default=False)

    # Blast Simulation Predictions
    fragmentation_size = Column(Float, nullable=True)  # Mean fragmentation size in cm
    throw_distance = Column(Float, nullable=True)  # in meters
    flyrock_risk = Column(String, nullable=True)  # "LOW", "MEDIUM", "HIGH"
    ground_vibration = Column(Float, nullable=True)  # peak particle velocity mm/s
    air_blast = Column(Float, nullable=True)  # in dB

    # AI Optimisation Recommendations
    opt_burden = Column(Float, nullable=True)
    opt_spacing = Column(Float, nullable=True)
    opt_hole_depth = Column(Float, nullable=True)
    opt_explosive_type = Column(String, nullable=True)
    opt_delay_pattern = Column(String, nullable=True)
    opt_powder_factor = Column(Float, nullable=True)  # kg/m3

class IncidentLog(Base):
    __tablename__ = "incident_logs"

    id = Column(Integer, primary_key=True, index=True)
    blast_id = Column(String, index=True, nullable=False)
    incident_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    logged_by = Column(String, nullable=False)
    logged_at = Column(DateTime(timezone=True), server_default=func.now())
