import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database_sql import get_db
from models_sql import BlastPlan
from schemas import BlastPlanCreate, BlastPlanResponse

router = APIRouter(prefix="/api/blast-plan", tags=["Blast Design Optimisation"])

def calculate_simulation_and_opt(plan_data: dict) -> dict:
    """
    Computes industry standard empirical blast calculations:
    - Bench volume, rock mass (using rock density = 2.6 t/m3)
    - Powder factor (kg/m3)
    - Kuz-Ram fragmentation mean size (cm)
    - Throw distance (m) using powder factor heuristics
    - Scaled distance ground vibration (PPV in mm/s at 150m distance)
    - Air blast (dB at 150m distance)
    - Heuristics-based AI optimization recommendations.
    """
    bench_h = plan_data["bench_height"]
    burden = plan_data["burden"]
    spacing = plan_data["spacing"]
    dia_mm = plan_data["hole_diameter"]
    subdrill = plan_data["subdrill"]
    stemming = plan_data["stemming_height"]
    qty = plan_data["explosive_qty"]
    exp_type = plan_data["explosive_type"]
    
    # Standard physics calculations
    hole_depth = bench_h + subdrill
    charge_len = max(0.1, hole_depth - stemming)
    dia_m = dia_mm / 1000.0
    
    # Volume and mass broken per hole
    v_rock_per_hole = burden * spacing * bench_h
    if v_rock_per_hole <= 0:
        v_rock_per_hole = 1.0
        
    powder_factor = qty / v_rock_per_hole  # kg/m3
    
    # 1. Kuz-Ram fragmentation mean size X50 (in cm)
    # X50 = A * (V/Q)^0.8 * Q^(1/6)
    # A = Rock factor (typically 8 for medium rock)
    rock_factor = 8.0
    if exp_type == "EMULSION":
        rock_factor = 9.0  # harder rock usually calls for emulsion
    
    x50 = rock_factor * math.pow(v_rock_per_hole / max(0.1, qty), 0.8) * math.pow(max(0.1, qty), 0.167)
    
    # 2. Throw distance (m)
    throw = 15.0 * powder_factor + 3.0 * burden
    
    # 3. Flyrock risk assessment
    if powder_factor > 0.7:
        flyrock = "HIGH"
    elif powder_factor > 0.4:
        flyrock = "MEDIUM"
    else:
        flyrock = "LOW"
        
    # 4. Ground vibration PPV (mm/s) at D = 150m
    # PPV = K * (D / sqrt(Q))^-B
    # K = 1140, B = 1.6 (standard parameters)
    distance = 150.0
    scaled_dist = distance / math.sqrt(max(0.1, qty))
    ppv = 1140.0 * math.pow(scaled_dist, -1.6)
    
    # 5. Air blast (dB) at D = 150m
    # dB = 165 - 24 * log10(D / Q^1/3)
    air_db = 165.0 - 24.0 * math.log10(distance / math.pow(max(0.1, qty), 0.333))

    # --- Heuristics-based AI Optimisation ---
    # Rule of thumb for optimal burden is 30 * hole_diameter (in meters)
    opt_burden = round(30.0 * dia_m, 2)
    # Optimal spacing is 1.25 * burden
    opt_spacing = round(1.25 * opt_burden, 2)
    # Optimal hole depth includes subdrill
    opt_hole_depth = round(bench_h + (0.3 * opt_burden), 2)
    # Powder factor should target 0.45 kg/m3 for optimal fragmentation and low flyrock
    opt_powder_factor = 0.45
    
    # Recommendations
    opt_exp_type = "EMULSION" if rock_factor > 8.0 else "ANFO"
    opt_delay = "17 ms (between holes) / 42 ms (between rows)"
    
    return {
        "fragmentation_size": round(x50, 2),
        "throw_distance": round(throw, 2),
        "flyrock_risk": flyrock,
        "ground_vibration": round(ppv, 2),
        "air_blast": round(air_db, 1),
        
        "opt_burden": opt_burden,
        "opt_spacing": opt_spacing,
        "opt_hole_depth": opt_hole_depth,
        "opt_explosive_type": opt_exp_type,
        "opt_delay_pattern": opt_delay,
        "opt_powder_factor": opt_powder_factor
    }

@router.post("/generate", response_model=BlastPlanResponse)
def generate_blast_plan(plan_in: BlastPlanCreate, db: Session = Depends(get_db)):
    # Check if duplicate blast_id
    existing = db.query(BlastPlan).filter(BlastPlan.blast_id == plan_in.blast_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Blast plan with ID {plan_in.blast_id} already exists."
        )
        
    data = plan_in.model_dump()
    calc = calculate_simulation_and_opt(data)
    
    db_plan = BlastPlan(
        blast_id=plan_in.blast_id,
        bench_height=plan_in.bench_height,
        burden=plan_in.burden,
        spacing=plan_in.spacing,
        hole_diameter=plan_in.hole_diameter,
        subdrill=plan_in.subdrill,
        stemming_height=plan_in.stemming_height,
        hole_layout=plan_in.hole_layout,
        explosive_type=plan_in.explosive_type,
        explosive_qty=plan_in.explosive_qty,
        charge_distribution=plan_in.charge_distribution,
        delay_timing=plan_in.delay_timing,
        primer_position=plan_in.primer_position,
        deck_charging=plan_in.deck_charging,
        
        # Calculations
        fragmentation_size=calc["fragmentation_size"],
        throw_distance=calc["throw_distance"],
        flyrock_risk=calc["flyrock_risk"],
        ground_vibration=calc["ground_vibration"],
        air_blast=calc["air_blast"],
        
        # Recommendations
        opt_burden=calc["opt_burden"],
        opt_spacing=calc["opt_spacing"],
        opt_hole_depth=calc["opt_hole_depth"],
        opt_explosive_type=calc["opt_explosive_type"],
        opt_delay_pattern=calc["opt_delay_pattern"],
        opt_powder_factor=calc["opt_powder_factor"]
    )
    
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/list", response_model=List[BlastPlanResponse])
def list_blast_plans(db: Session = Depends(get_db)):
    return db.query(BlastPlan).order_by(BlastPlan.created_at.desc()).all()

@router.get("/{blast_id}", response_model=BlastPlanResponse)
def get_blast_plan(blast_id: str, db: Session = Depends(get_db)):
    plan = db.query(BlastPlan).filter(BlastPlan.blast_id == blast_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blast plan not found"
        )
    return plan

@router.post("/optimise")
def optimise_blast(params: dict):
    """
    Dynamic endpoint to suggest optimal pattern parameters on the fly
    without saving. Requires: bench_height, hole_diameter (in mm).
    """
    bench_h = params.get("bench_height")
    dia_mm = params.get("hole_diameter")
    
    if not bench_h or not dia_mm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bench_height and hole_diameter are required for optimization."
        )
        
    dia_m = dia_mm / 1000.0
    opt_burden = round(30.0 * dia_m, 2)
    opt_spacing = round(1.25 * opt_burden, 2)
    opt_hole_depth = round(bench_h + (0.3 * opt_burden), 2)
    opt_subdrill = round(0.3 * opt_burden, 2)
    opt_stemming = round(opt_burden, 2)
    opt_powder_factor = 0.45
    
    return {
        "opt_burden": opt_burden,
        "opt_spacing": opt_spacing,
        "opt_hole_depth": opt_hole_depth,
        "opt_subdrill": opt_subdrill,
        "opt_stemming": opt_stemming,
        "opt_powder_factor": opt_powder_factor,
        "recommended_delay": "17 ms between holes, 42 ms between rows",
        "recommended_explosive": "ANFO for dry holes, EMULSION for wet holes"
    }
