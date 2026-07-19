class RiskLevel:
    GREEN = 'GREEN'
    YELLOW = 'YELLOW'
    ORANGE = 'ORANGE'
    RED = 'RED'

GREEN_MAX = 15
YELLOW_MAX = 40
ORANGE_MAX = 70

WEIGHTS = {
    'BLAST_DESIGN_NOT_APPROVED': 40,
    'EXCLUSION_ZONE_NOT_ESTABLISHED': 30,
    'SIREN_NOT_WORKING': 30,
    'COMMUNICATION_NOT_WORKING': 25,
    'BARRICADES_NOT_IN_PLACE': 25,
    'SAFETY_BRIEFING_INCOMPLETE': 20,
    'EMERGENCY_VEHICLE_UNAVAILABLE': 20,
    'ESCAPE_ROUTE_NOT_CLEAR': 20,
    'SUPERVISOR_UNAVAILABLE': 15,
    'HIGH_WIND_SPEED': 15,
    'HEAVY_RAINFALL': 15,
    'WORKER_COUNT_EXCEEDS_LIMIT': 10,
    'EXTREME_TEMPERATURE': 10,
}

MAX_SAFE_WIND_SPEED_KMH = 30
MAX_SAFE_RAINFALL_MM = 10
MIN_SAFE_TEMP_C = 0
MAX_SAFE_TEMP_C = 45
DEFAULT_MAX_SAFE_WORKER_COUNT = 50

def evaluate_blast_site(submission: dict) -> dict:
    issues = []
    critical_triggered = False

    def flag(code, description, weight, critical=False):
        nonlocal critical_triggered
        issues.append({
            'code': code,
            'description': description,
            'weight': weight,
            'critical': critical
        })
        if critical:
            critical_triggered = True

    # --- CRITICAL RULES -----------------------------------------------
    if submission.get('lightning_warning') is True:
        flag('LIGHTNING_WARNING', 'Lightning warning detected in the area.', 40, True)

    if submission.get('workers_in_exclusion_zone') is True:
        flag('WORKERS_IN_EXCLUSION_ZONE', 'Workers reported inside the exclusion zone.', 40, True)

    if submission.get('blasting_officer_available') is False:
        flag('OFFICER_UNAVAILABLE', 'No authorised blasting officer available to approve the blast.', 40, True)

    if submission.get('detonators_secure') is False:
        flag('DETONATORS_NOT_SECURE', 'Detonators reported as not secure / faulty.', 40, True)

    # --- WEIGHTED RULES --------------------------------------------------
    if submission.get('blast_design_approved') is False:
        flag('BLAST_DESIGN_NOT_APPROVED', 'Blast design has not been approved.', WEIGHTS['BLAST_DESIGN_NOT_APPROVED'])

    if submission.get('exclusion_zone_established') is False:
        flag('EXCLUSION_ZONE_NOT_ESTABLISHED', 'Exclusion zone has not been established.', WEIGHTS['EXCLUSION_ZONE_NOT_ESTABLISHED'])

    if submission.get('siren_working') is False:
        flag('SIREN_NOT_WORKING', 'Warning siren is not working.', WEIGHTS['SIREN_NOT_WORKING'])

    if submission.get('communication_working') is False:
        flag('COMMUNICATION_NOT_WORKING', 'Communication equipment is not functioning.', WEIGHTS['COMMUNICATION_NOT_WORKING'])

    if submission.get('barricades_in_place') is False:
        flag('BARRICADES_NOT_IN_PLACE', 'Barricades are not in place.', WEIGHTS['BARRICADES_NOT_IN_PLACE'])

    if submission.get('safety_briefing_completed') is False:
        flag('SAFETY_BRIEFING_INCOMPLETE', 'Safety briefing has not been completed.', WEIGHTS['SAFETY_BRIEFING_INCOMPLETE'])

    if submission.get('emergency_vehicle_available') is False:
        flag('EMERGENCY_VEHICLE_UNAVAILABLE', 'Emergency vehicle is not available on site.', WEIGHTS['EMERGENCY_VEHICLE_UNAVAILABLE'])

    if submission.get('escape_route_clear') is False:
        flag('ESCAPE_ROUTE_NOT_CLEAR', 'Escape route is not clear.', WEIGHTS['ESCAPE_ROUTE_NOT_CLEAR'])

    if submission.get('supervisor_available') is False:
        flag('SUPERVISOR_UNAVAILABLE', 'Shift supervisor is not available.', WEIGHTS['SUPERVISOR_UNAVAILABLE'])

    wind_speed = submission.get('wind_speed_kmh')
    if wind_speed is not None and wind_speed > MAX_SAFE_WIND_SPEED_KMH:
        flag('HIGH_WIND_SPEED', f'Wind speed {wind_speed} km/h exceeds safe limit of {MAX_SAFE_WIND_SPEED_KMH} km/h.', WEIGHTS['HIGH_WIND_SPEED'])

    rainfall = submission.get('rainfall_mm')
    if rainfall is not None and rainfall > MAX_SAFE_RAINFALL_MM:
        flag('HEAVY_RAINFALL', f'Rainfall {rainfall} mm exceeds safe limit of {MAX_SAFE_RAINFALL_MM} mm.', WEIGHTS['HEAVY_RAINFALL'])

    worker_count = submission.get('worker_count')
    max_safe_workers = submission.get('max_safe_worker_count') or DEFAULT_MAX_SAFE_WORKER_COUNT
    if worker_count is not None and worker_count > max_safe_workers:
        flag('WORKER_COUNT_EXCEEDS_LIMIT', f'Worker count {worker_count} exceeds site safe limit of {max_safe_workers}.', WEIGHTS['WORKER_COUNT_EXCEEDS_LIMIT'])

    temperature = submission.get('temperature_c')
    if temperature is not None and (temperature < MIN_SAFE_TEMP_C or temperature > MAX_SAFE_TEMP_C):
        flag('EXTREME_TEMPERATURE', f'Temperature {temperature}°C is outside the safe operating range ({MIN_SAFE_TEMP_C}–{MAX_SAFE_TEMP_C}°C).', WEIGHTS['EXTREME_TEMPERATURE'])

    # --- AGGREGATE ---------------------------------------------------
    total_score = sum(issue['weight'] for issue in issues)
    
    if critical_triggered:
        risk_level = RiskLevel.RED
    elif total_score <= GREEN_MAX:
        risk_level = RiskLevel.GREEN
    elif total_score <= YELLOW_MAX:
        risk_level = RiskLevel.YELLOW
    elif total_score <= ORANGE_MAX:
        risk_level = RiskLevel.ORANGE
    else:
        risk_level = RiskLevel.RED

    return {
        'total_score': total_score,
        'risk_level': risk_level,
        'critical_triggered': critical_triggered,
        'issues': issues,
    }
