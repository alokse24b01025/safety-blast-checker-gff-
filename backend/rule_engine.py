"""
Blast Site Risk Scoring Engine — Data-Driven Rule Version
-------------------------------------------------------------
Risk Score = sum( Severity(k) * Occurrence(k) )   for k = 1..n

Rules are defined as plain data (dictionaries), NOT as lambda functions.
This means:
  - Rules can be stored in a database / JSON file / admin UI later
  - Adding a new rule never requires touching the evaluation logic
  - A single generic evaluator handles ALL rules, no matter how many

Every rule carries:
  - reason  -> the actual safety hazard explanation (shown on screen)
  - source  -> "Verified" (real regulation, cited) or
               "Engineering judgment" (reasoned, not directly regulated)
"""

class RiskLevel:
    GREEN = 'GREEN'
    YELLOW = 'YELLOW'
    ORANGE = 'ORANGE'
    RED = 'RED'

GREEN_MAX = 15
YELLOW_MAX = 40
ORANGE_MAX = 70

MAX_SAFE_WIND_SPEED_KMH = 30
CRITICAL_WIND_SPEED_KMH = 40
MAX_SAFE_RAINFALL_MM = 10
MIN_SAFE_TEMP_C = 0
MAX_SAFE_TEMP_C = 45
DEFAULT_MAX_SAFE_WORKER_COUNT = 50

# ---------------------------------------------------------------------------
# RULES: every condition (critical AND weighted) is one plain dict.
# `condition` describes HOW to check it, as data -- not as code.
#
# condition types supported by evaluate_condition():
#   is_true / is_false      -> boolean field check
#   gt                      -> field > value
#   range                   -> low < field <= high
#   outside_range           -> field < min OR field > max
#   gt_field_or_default     -> field > (data[compare_field] or default)
# ---------------------------------------------------------------------------
RULES = [
    # ---- Critical rules (override the score entirely) ---------------
    {
        'code': 'LIGHTNING_WARNING', 'critical': True, 'weight': 0,
        'description': 'Lightning warning detected in the area.',
        'reason': 'Lightning can induce stray current in blast wiring, risking premature '
                   'detonation.',
        'source': 'Verified \u2014 OSHA 30/30 Rule; MSHA guidance to halt blasting during storms.',
        'condition': {'type': 'is_true', 'field': 'lightning_warning'},
    },
    {
        'code': 'WORKERS_IN_EXCLUSION_ZONE', 'critical': True, 'weight': 0,
        'description': 'Workers reported inside the exclusion zone.',
        'reason': 'A worker inside the exclusion zone during detonation is in direct danger '
                   'from flyrock and blast overpressure.',
        'source': 'Verified \u2014 MSHA: blast area must be cleared of miners before detonation.',
        'condition': {'type': 'is_true', 'field': 'workers_in_exclusion_zone'},
    },
    {
        'code': 'OFFICER_UNAVAILABLE', 'critical': True, 'weight': 0,
        'description': 'No authorised blasting officer available to approve the blast.',
        'reason': 'The blasting officer is the accountable person confirming the site is safe '
                   'to fire.',
        'source': 'Verified \u2014 OSHA 1926.909/1926.900(a); state licensing codes '
                   '(CA/OH/KY) require a certified blaster-in-charge.',
        'condition': {'type': 'is_false', 'field': 'blasting_officer_available'},
    },
    {
        'code': 'DETONATORS_NOT_SECURE', 'critical': True, 'weight': 0,
        'description': 'Detonators reported as not secure / faulty.',
        'reason': 'An insecure detonator can cause premature detonation or a dangerous, '
                   'undetected misfire.',
        'source': 'Verified \u2014 MSHA: misfires must only be handled by a trained, '
                   'experienced blaster.',
        'condition': {'type': 'is_false', 'field': 'detonators_secure'},
    },
    {
        'code': 'CRITICAL_WIND_SPEED', 'critical': True, 'weight': 0,
        'description': f'Wind speed exceeds the critical limit of {CRITICAL_WIND_SPEED_KMH} km/h.',
        'reason': 'Beyond this point, flyrock and fume drift become unpredictable, reliably '
                   'exceeding the calculated exclusion zone.',
        'source': 'Engineering judgment \u2014 anchored to Beaufort Wind Scale force transitions '
                   '(no single universal regulatory number exists).',
        'condition': {'type': 'gt', 'field': 'wind_speed_kmh', 'value': CRITICAL_WIND_SPEED_KMH},
    },

    # ---- Weighted rules (contribute to the score) --------------------
    {
        'code': 'BLAST_DESIGN_NOT_APPROVED', 'critical': False, 'weight': 40,
        'description': 'Blast design has not been approved.',
        'reason': 'An unapproved design has not been checked for correct burden/spacing/charge '
                   'calculations, risking excessive flyrock or vibration.',
        'source': 'Partially verified \u2014 industry guidance requires blast plans approved by '
                   'a qualified engineer (not a primary government regulation).',
        'condition': {'type': 'is_false', 'field': 'blast_design_approved'},
    },
    {
        'code': 'EXCLUSION_ZONE_NOT_ESTABLISHED', 'critical': False, 'weight': 30,
        'description': 'Exclusion zone has not been established.',
        'reason': 'Without a marked safe perimeter, personnel may unknowingly be within range '
                   'of flying debris.',
        'source': 'Verified \u2014 MSHA: blast area must be cleared and guarded before detonation.',
        'condition': {'type': 'is_false', 'field': 'exclusion_zone_established'},
    },
    {
        'code': 'SIREN_NOT_WORKING', 'critical': False, 'weight': 30,
        'description': 'Warning siren is not working.',
        'reason': 'The siren is the primary alert warning people to evacuate before detonation.',
        'source': 'Verified \u2014 OSHA 1926.909; CA Title 8 \u00a75291; Ohio/Kentucky codes all '
                   'mandate an audible warning signal before firing.',
        'condition': {'type': 'is_false', 'field': 'siren_working'},
    },
    {
        'code': 'COMMUNICATION_NOT_WORKING', 'critical': False, 'weight': 25,
        'description': 'Communication equipment is not functioning.',
        'reason': 'Without working communication, a last-minute hazard cannot be reported in '
                   'time to abort the blast.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'is_false', 'field': 'communication_working'},
    },
    {
        'code': 'BARRICADES_NOT_IN_PLACE', 'critical': False, 'weight': 25,
        'description': 'Barricades are not in place.',
        'reason': 'Barricades physically prevent unauthorised entry into the danger zone during '
                   'blasting.',
        'source': 'Verified \u2014 CA Title 8 \u00a75291 requires barricades/flaggers to prevent '
                   'unauthorised entry.',
        'condition': {'type': 'is_false', 'field': 'barricades_in_place'},
    },
    {
        'code': 'SAFETY_BRIEFING_INCOMPLETE', 'critical': False, 'weight': 20,
        'description': 'Safety briefing has not been completed.',
        'reason': 'Without a briefing, workers may not know the blast timing or their assigned '
                   'safe position.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'is_false', 'field': 'safety_briefing_completed'},
    },
    {
        'code': 'EMERGENCY_VEHICLE_UNAVAILABLE', 'critical': False, 'weight': 20,
        'description': 'Emergency vehicle is not available on site.',
        'reason': 'Rapid evacuation to medical care depends on an emergency vehicle being '
                   'present on site.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'is_false', 'field': 'emergency_vehicle_available'},
    },
    {
        'code': 'ESCAPE_ROUTE_NOT_CLEAR', 'critical': False, 'weight': 20,
        'description': 'Escape route is not clear.',
        'reason': 'A blocked escape route can trap personnel inside the danger radius during '
                   'detonation.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'is_false', 'field': 'escape_route_clear'},
    },
    {
        'code': 'SUPERVISOR_UNAVAILABLE', 'critical': False, 'weight': 15,
        'description': 'Shift supervisor is not available.',
        'reason': 'The supervisor performs the final on-ground go/no-go check before firing.',
        'source': 'Verified \u2014 same licensing requirement as blasting officer '
                   '(OSHA/CA/OH/KY blaster-in-charge codes).',
        'condition': {'type': 'is_false', 'field': 'supervisor_available'},
    },
    {
        'code': 'HIGH_WIND_SPEED', 'critical': False, 'weight': 15,
        'description': f'Wind speed exceeds the safe warning limit of {MAX_SAFE_WIND_SPEED_KMH} km/h.',
        'reason': 'Wind above this level starts making dust/fragment drift direction harder to '
                   'predict.',
        'source': 'Engineering judgment \u2014 anchored to Beaufort Wind Scale.',
        'condition': {'type': 'range', 'field': 'wind_speed_kmh',
                      'low': MAX_SAFE_WIND_SPEED_KMH, 'high': CRITICAL_WIND_SPEED_KMH},
    },
    {
        'code': 'HEAVY_RAINFALL', 'critical': False, 'weight': 15,
        'description': f'Rainfall exceeds the safe limit of {MAX_SAFE_RAINFALL_MM} mm.',
        'reason': 'Water near electrical detonators risks short-circuiting; saturated ground '
                   'raises slope-failure risk.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'gt', 'field': 'rainfall_mm', 'value': MAX_SAFE_RAINFALL_MM},
    },
    {
        'code': 'WORKER_COUNT_EXCEEDS_LIMIT', 'critical': False, 'weight': 10,
        'description': 'Worker count exceeds the site safe limit.',
        'reason': 'More workers than the safe limit makes a full, timely evacuation harder to '
                   'confirm.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'gt_field_or_default', 'field': 'worker_count',
                      'compare_field': 'max_safe_worker_count',
                      'default': DEFAULT_MAX_SAFE_WORKER_COUNT},
    },
    {
        'code': 'EXTREME_TEMPERATURE', 'critical': False, 'weight': 10,
        'description': f'Temperature is outside the safe operating range '
                        f'({MIN_SAFE_TEMP_C}-{MAX_SAFE_TEMP_C} C).',
        'reason': 'Extreme temperatures can affect explosive stability and detonator '
                   'reliability.',
        'source': 'Engineering judgment \u2014 no blasting-specific regulation found.',
        'condition': {'type': 'outside_range', 'field': 'temperature_c',
                      'min': MIN_SAFE_TEMP_C, 'max': MAX_SAFE_TEMP_C},
    },
]


def evaluate_condition(condition: dict, data: dict) -> bool:
    """
    Single generic evaluator for ALL rule types.
    Adding a new rule NEVER requires touching this function --
    only a new dict needs to be added to RULES above.
    """
    ctype = condition['type']
    field = condition.get('field')
    value = data.get(field)

    if ctype == 'is_true':
        return value is True

    if ctype == 'is_false':
        return value is False

    if value is None:
        # numeric checks below all need a real value to compare against
        return False

    if ctype == 'gt':
        return value > condition['value']

    if ctype == 'range':
        return condition['low'] < value <= condition['high']

    if ctype == 'outside_range':
        return value < condition['min'] or value > condition['max']

    if ctype == 'gt_field_or_default':
        limit = data.get(condition['compare_field']) or condition['default']
        return value > limit

    raise ValueError(f"Unknown condition type: {ctype}")


def evaluate_blast_site(submission: dict) -> dict:
    """
    Runs every rule in RULES through the single generic evaluator, then:
      - Critical(x): if any critical rule fires, Risk Level = RED immediately
      - Risk Score = sum( Severity(k) * Occurrence(k) ) over weighted rules
    """
    issues = []
    critical_triggered = False
    total_score = 0

    for rule in RULES:
        occurrence = evaluate_condition(rule['condition'], submission)  # Occurrence(k)
        if not occurrence:
            continue

        contribution = rule['weight'] if not rule['critical'] else 0    # Severity(k) x Occurrence(k)
        total_score += contribution

        if rule['critical']:
            critical_triggered = True

        issues.append({
            'code': rule['code'],
            'description': rule['description'],
            'reason': rule['reason'],
            'source': rule['source'],
            'weight': contribution,
            'critical': rule['critical'],
        })

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

    issues.sort(key=lambda i: (not i['critical'], -i['weight']))

    return {
        'total_score': total_score,
        'risk_level': risk_level,
        'critical_triggered': critical_triggered,
        'issues': issues,
    }