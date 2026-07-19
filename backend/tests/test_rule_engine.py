import pytest
from rule_engine import evaluate_blast_site, RiskLevel

def test_critical_lightning_forces_red():
    # Base submission with lightning warning active
    submission = {
        "site_name": "Test Site",
        "blast_id": "BL-001",
        "lightning_warning": True,
        "workers_in_exclusion_zone": False,
        "blasting_officer_available": True,
        "detonators_secure": True,
        "blast_design_approved": True,
        "exclusion_zone_established": True,
        "siren_working": True,
        "communication_working": True,
        "barricades_in_place": True,
        "safety_briefing_completed": True,
        "emergency_vehicle_available": True,
        "escape_route_clear": True,
        "supervisor_available": True,
        "wind_speed_kmh": 10,
        "rainfall_mm": 0,
        "worker_count": 5,
        "temperature_c": 25
    }
    result = evaluate_blast_site(submission)
    assert result["risk_level"] == RiskLevel.RED
    assert result["critical_triggered"] is True

def test_all_ok_is_green():
    submission = {
        "site_name": "Test Site",
        "blast_id": "BL-001",
        "lightning_warning": False,
        "workers_in_exclusion_zone": False,
        "blasting_officer_available": True,
        "detonators_secure": True,
        "blast_design_approved": True,
        "exclusion_zone_established": True,
        "siren_working": True,
        "communication_working": True,
        "barricades_in_place": True,
        "safety_briefing_completed": True,
        "emergency_vehicle_available": True,
        "escape_route_clear": True,
        "supervisor_available": True,
        "wind_speed_kmh": 10,
        "rainfall_mm": 0,
        "worker_count": 5,
        "temperature_c": 25
    }
    result = evaluate_blast_site(submission)
    assert result["risk_level"] == RiskLevel.GREEN
    assert result["total_score"] == 0
    assert result["critical_triggered"] is False

def test_weighted_accumulation():
    # Missing supervisor (15) and safety briefing (20) -> Score 35 (YELLOW)
    submission = {
        "site_name": "Test Site",
        "blast_id": "BL-001",
        "lightning_warning": False,
        "workers_in_exclusion_zone": False,
        "blasting_officer_available": True,
        "detonators_secure": True,
        "blast_design_approved": True,
        "exclusion_zone_established": True,
        "siren_working": True,
        "communication_working": True,
        "barricades_in_place": True,
        "safety_briefing_completed": False,  # +20
        "emergency_vehicle_available": True,
        "escape_route_clear": True,
        "supervisor_available": False,      # +15
        "wind_speed_kmh": 10,
        "rainfall_mm": 0,
        "worker_count": 5,
        "temperature_c": 25
    }
    result = evaluate_blast_site(submission)
    assert result["total_score"] == 35
    assert result["risk_level"] == RiskLevel.YELLOW
