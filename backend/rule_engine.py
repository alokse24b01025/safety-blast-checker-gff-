"""
Blast Site Risk Scoring Engine
-------------------------------
Implements a Weighted Checklist Risk Index, adapted from the standard
ISO 31000 formulation:  Risk = Likelihood x Severity (Consequence)

Since this is a real-time site checklist (not a probabilistic future event),
Likelihood collapses to a binary Occurrence value:

    Risk Score = sum( Severity(k) * Occurrence(k) )   for k = 1..n

    Severity(k)   -> fixed weight of condition k (10-40), see WEIGHTS
    Occurrence(k) -> 1 if condition k is observed on site, else 0

Four conditions are modelled as a separate override layer, Critical(x):
if any one of them is true, Risk Level = RED immediately and the score
is not used to determine the level (matches how real risk matrices treat
catastrophic-severity events -- they override rather than get averaged in).
"""

class RiskLevel:
    GREEN = 'GREEN'
    YELLOW = 'YELLOW'
    ORANGE = 'ORANGE'
    RED = 'RED'

GREEN_MAX = 15
YELLOW_MAX = 40
ORANGE_MAX = 70

# --- Severity(k): fixed weight table for every weighted condition ---------
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

# --- Occurrence(k): each rule returns 1 (condition present) or 0 (absent) -
# Boolean rules are simple field checks. Numeric rules compare against a
# safe-limit constant. Every rule is (code, description, occurrence_fn).
WEIGHTED_RULES = [
    ('BLAST_DESIGN_NOT_APPROVED', 'Blast design has not been approved.',
        lambda s: s.get('blast_design_approved') is False),
    ('EXCLUSION_ZONE_NOT_ESTABLISHED', 'Exclusion zone has not been established.',
        lambda s: s.get('exclusion_zone_established') is False),
    ('SIREN_NOT_WORKING', 'Warning siren is not working.',
        lambda s: s.get('siren_working') is False),
    ('COMMUNICATION_NOT_WORKING', 'Communication equipment is not functioning.',
        lambda s: s.get('communication_working') is False),
    ('BARRICADES_NOT_IN_PLACE', 'Barricades are not in place.',
        lambda s: s.get('barricades_in_place') is False),
    ('SAFETY_BRIEFING_INCOMPLETE', 'Safety briefing has not been completed.',
        lambda s: s.get('safety_briefing_completed') is False),
    ('EMERGENCY_VEHICLE_UNAVAILABLE', 'Emergency vehicle is not available on site.',
        lambda s: s.get('emergency_vehicle_available') is False),
    ('ESCAPE_ROUTE_NOT_CLEAR', 'Escape route is not clear.',
        lambda s: s.get('escape_route_clear') is False),
    ('SUPERVISOR_UNAVAILABLE', 'Shift supervisor is not available.',
        lambda s: s.get('supervisor_available') is False),
    ('HIGH_WIND_SPEED', f'Wind speed exceeds safe limit of {MAX_SAFE_WIND_SPEED_KMH} km/h.',
        lambda s: s.get('wind_speed_kmh') is not None and s['wind_speed_kmh'] > MAX_SAFE_WIND_SPEED_KMH),
    ('HEAVY_RAINFALL', f'Rainfall exceeds safe limit of {MAX_SAFE_RAINFALL_MM} mm.',
        lambda s: s.get('rainfall_mm') is not None and s['rainfall_mm'] > MAX_SAFE_RAINFALL_MM),
    ('WORKER_COUNT_EXCEEDS_LIMIT', 'Worker count exceeds site safe limit.',
        lambda s: s.get('worker_count') is not None and
                  s['worker_count'] > (s.get('max_safe_worker_count') or DEFAULT_MAX_SAFE_WORKER_COUNT)),
    ('EXTREME_TEMPERATURE', f'Temperature is outside the safe operating range ({MIN_SAFE_TEMP_C}-{MAX_SAFE_TEMP_C}C).',
        lambda s: s.get('temperature_c') is not None and
                  (s['temperature_c'] < MIN_SAFE_TEMP_C or s['temperature_c'] > MAX_SAFE_TEMP_C)),
]

# --- Critical(x): conditions that override the score entirely -------------
CRITICAL_RULES = [
    ('LIGHTNING_WARNING', 'Lightning warning detected in the area.',
        lambda s: s.get('lightning_warning') is True),
    ('WORKERS_IN_EXCLUSION_ZONE', 'Workers reported inside the exclusion zone.',
        lambda s: s.get('workers_in_exclusion_zone') is True),
    ('OFFICER_UNAVAILABLE', 'No authorised blasting officer available to approve the blast.',
        lambda s: s.get('blasting_officer_available') is False),
    ('DETONATORS_NOT_SECURE', 'Detonators reported as not secure / faulty.',
        lambda s: s.get('detonators_secure') is False),
]


def evaluate_blast_site(submission: dict) -> dict:
    """
    Runs Critical(x) first, then computes
    Risk Score = sum( Severity(k) * Occurrence(k) ) over WEIGHTED_RULES.
    """
    issues = []

    # --- Critical(x) override layer ---------------------------------
    # Occurrence(k) in {0, 1} per critical rule; if any Occurrence(k) = 1,
    # Critical(x) = 1 and the weighted score is not used for the level.
    critical_triggered = False
    for code, desc, occurrence_fn in CRITICAL_RULES:
        if occurrence_fn(submission):
            issues.append({'code': code, 'description': desc, 'weight': 40, 'critical': True})
            critical_triggered = True

    # --- Risk Score = sum( Severity(k) * Occurrence(k) ) -------------
    total_score = 0
    for code, desc, occurrence_fn in WEIGHTED_RULES:
        occurrence = 1 if occurrence_fn(submission) else 0   # Occurrence(k)
        severity = WEIGHTS[code]                             # Severity(k)
        contribution = severity * occurrence                 # Severity(k) x Occurrence(k)
        if contribution > 0:
            issues.append({'code': code, 'description': desc, 'weight': contribution, 'critical': False})
        total_score += contribution                          # running sum (Sigma)

    # --- Risk level classification ------------------------------------
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
