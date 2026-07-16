export const RiskLevel = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
};

export const GREEN_MAX = 15;
export const YELLOW_MAX = 40;
export const ORANGE_MAX = 70;

export const WEIGHTS = {
  BLAST_DESIGN_NOT_APPROVED: 40,
  EXCLUSION_ZONE_NOT_ESTABLISHED: 30,
  SIREN_NOT_WORKING: 30,
  COMMUNICATION_NOT_WORKING: 25,
  BARRICADES_NOT_IN_PLACE: 25,
  SAFETY_BRIEFING_INCOMPLETE: 20,
  EMERGENCY_VEHICLE_UNAVAILABLE: 20,
  ESCAPE_ROUTE_NOT_CLEAR: 20,
  SUPERVISOR_UNAVAILABLE: 15,
  HIGH_WIND_SPEED: 15,
  HEAVY_RAINFALL: 15,
  WORKER_COUNT_EXCEEDS_LIMIT: 10,
  EXTREME_TEMPERATURE: 10,
};

export const MAX_SAFE_WIND_SPEED_KMH = 30;
export const MAX_SAFE_RAINFALL_MM = 10;
export const MIN_SAFE_TEMP_C = 0;
export const MAX_SAFE_TEMP_C = 45;
export const DEFAULT_MAX_SAFE_WORKER_COUNT = 50;

export function evaluateBlastSite(submission) {
  const issues = [];
  let criticalTriggered = false;

  function flag(code, description, weight, critical = false) {
    issues.push({ code, description, weight, critical });
    if (critical) {
      criticalTriggered = true;
    }
  }

  // --- CRITICAL RULES -----------------------------------------------
  if (submission.lightning_warning === true) {
    flag('LIGHTNING_WARNING', 'Lightning warning detected in the area.', 40, true);
  }

  if (submission.workers_in_exclusion_zone === true) {
    flag('WORKERS_IN_EXCLUSION_ZONE', 'Workers reported inside the exclusion zone.', 40, true);
  }

  if (submission.blasting_officer_available === false) {
    flag('OFFICER_UNAVAILABLE', 'No authorised blasting officer available to approve the blast.', 40, true);
  }

  if (submission.detonators_secure === false) {
    flag('DETONATORS_NOT_SECURE', 'Detonators reported as not secure / faulty.', 40, true);
  }

  // --- WEIGHTED RULES --------------------------------------------------
  if (submission.blast_design_approved === false) {
    flag('BLAST_DESIGN_NOT_APPROVED', 'Blast design has not been approved.', WEIGHTS.BLAST_DESIGN_NOT_APPROVED);
  }

  if (submission.exclusion_zone_established === false) {
    flag('EXCLUSION_ZONE_NOT_ESTABLISHED', 'Exclusion zone has not been established.', WEIGHTS.EXCLUSION_ZONE_NOT_ESTABLISHED);
  }

  if (submission.siren_working === false) {
    flag('SIREN_NOT_WORKING', 'Warning siren is not working.', WEIGHTS.SIREN_NOT_WORKING);
  }

  if (submission.communication_working === false) {
    flag('COMMUNICATION_NOT_WORKING', 'Communication equipment is not functioning.', WEIGHTS.COMMUNICATION_NOT_WORKING);
  }

  if (submission.barricades_in_place === false) {
    flag('BARRICADES_NOT_IN_PLACE', 'Barricades are not in place.', WEIGHTS.BARRICADES_NOT_IN_PLACE);
  }

  if (submission.safety_briefing_completed === false) {
    flag('SAFETY_BRIEFING_INCOMPLETE', 'Safety briefing has not been completed.', WEIGHTS.SAFETY_BRIEFING_INCOMPLETE);
  }

  if (submission.emergency_vehicle_available === false) {
    flag('EMERGENCY_VEHICLE_UNAVAILABLE', 'Emergency vehicle is not available on site.', WEIGHTS.EMERGENCY_VEHICLE_UNAVAILABLE);
  }

  if (submission.escape_route_clear === false) {
    flag('ESCAPE_ROUTE_NOT_CLEAR', 'Escape route is not clear.', WEIGHTS.ESCAPE_ROUTE_NOT_CLEAR);
  }

  if (submission.supervisor_available === false) {
    flag('SUPERVISOR_UNAVAILABLE', 'Shift supervisor is not available.', WEIGHTS.SUPERVISOR_UNAVAILABLE);
  }

  const windSpeed = submission.wind_speed_kmh;
  if (windSpeed !== undefined && windSpeed !== null && windSpeed > MAX_SAFE_WIND_SPEED_KMH) {
    flag('HIGH_WIND_SPEED', `Wind speed ${windSpeed} km/h exceeds safe limit of ${MAX_SAFE_WIND_SPEED_KMH} km/h.`, WEIGHTS.HIGH_WIND_SPEED);
  }

  const rainfall = submission.rainfall_mm;
  if (rainfall !== undefined && rainfall !== null && rainfall > MAX_SAFE_RAINFALL_MM) {
    flag('HEAVY_RAINFALL', `Rainfall ${rainfall} mm exceeds safe limit of ${MAX_SAFE_RAINFALL_MM} mm.`, WEIGHTS.HEAVY_RAINFALL);
  }

  const workerCount = submission.worker_count;
  const maxSafeWorkers = submission.max_safe_worker_count || DEFAULT_MAX_SAFE_WORKER_COUNT;
  if (workerCount !== undefined && workerCount !== null && workerCount > maxSafeWorkers) {
    flag('WORKER_COUNT_EXCEEDS_LIMIT', `Worker count ${workerCount} exceeds site safe limit of ${maxSafeWorkers}.`, WEIGHTS.WORKER_COUNT_EXCEEDS_LIMIT);
  }

  const temperature = submission.temperature_c;
  if (temperature !== undefined && temperature !== null && (temperature < MIN_SAFE_TEMP_C || temperature > MAX_SAFE_TEMP_C)) {
    flag('EXTREME_TEMPERATURE', `Temperature ${temperature}°C is outside the safe operating range (${MIN_SAFE_TEMP_C}–${MAX_SAFE_TEMP_C}°C).`, WEIGHTS.EXTREME_TEMPERATURE);
  }

  // --- AGGREGATE ---------------------------------------------------
  const totalScore = issues.reduce((acc, issue) => acc + issue.weight, 0);
  let riskLevel = RiskLevel.GREEN;

  if (criticalTriggered) {
    riskLevel = RiskLevel.RED;
  } else if (totalScore <= GREEN_MAX) {
    riskLevel = RiskLevel.GREEN;
  } else if (totalScore <= YELLOW_MAX) {
    riskLevel = RiskLevel.YELLOW;
  } else if (totalScore <= ORANGE_MAX) {
    riskLevel = RiskLevel.ORANGE;
  } else {
    riskLevel = RiskLevel.RED;
  }

  return {
    total_score: totalScore,
    risk_level: riskLevel,
    critical_triggered: criticalTriggered,
    issues,
  };
}
