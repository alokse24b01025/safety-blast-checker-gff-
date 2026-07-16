import { evaluateBlastSite, RiskLevel } from '../model/rule_engine.js';

function baseSubmission(overrides = {}) {
  const data = {
    temperature_c: 25,
    rainfall_mm: 0,
    wind_speed_kmh: 10,
    lightning_warning: false,
    supervisor_available: true,
    blasting_officer_available: true,
    worker_count: 10,
    max_safe_worker_count: 50,
    workers_in_exclusion_zone: false,
    safety_briefing_completed: true,
    detonators_secure: true,
    siren_working: true,
    communication_working: true,
    emergency_vehicle_available: true,
    exclusion_zone_established: true,
    barricades_in_place: true,
    blast_design_approved: true,
    escape_route_clear: true,
  };
  return { ...data, ...overrides };
}

describe('Rule Engine Tests', () => {
  test('fully compliant submission is green', () => {
    const result = evaluateBlastSite(baseSubmission());
    expect(result.risk_level).toBe(RiskLevel.GREEN);
    expect(result.total_score).toBe(0);
    expect(result.critical_triggered).toBe(false);
    expect(result.issues).toEqual([]);
  });

  test('lightning warning forces red regardless of other fields', () => {
    const result = evaluateBlastSite(baseSubmission({ lightning_warning: true }));
    expect(result.risk_level).toBe(RiskLevel.RED);
    expect(result.critical_triggered).toBe(true);
    expect(result.issues.some(i => i.code === 'LIGHTNING_WARNING')).toBe(true);
  });

  test('workers in exclusion zone forces red', () => {
    const result = evaluateBlastSite(baseSubmission({ workers_in_exclusion_zone: true }));
    expect(result.risk_level).toBe(RiskLevel.RED);
    expect(result.critical_triggered).toBe(true);
    expect(result.issues.some(i => i.code === 'WORKERS_IN_EXCLUSION_ZONE')).toBe(true);
  });

  test('officer unavailable forces red', () => {
    const result = evaluateBlastSite(baseSubmission({ blasting_officer_available: false }));
    expect(result.risk_level).toBe(RiskLevel.RED);
    expect(result.critical_triggered).toBe(true);
    expect(result.issues.some(i => i.code === 'OFFICER_UNAVAILABLE')).toBe(true);
  });

  test('detonators not secure forces red', () => {
    const result = evaluateBlastSite(baseSubmission({ detonators_secure: false }));
    expect(result.risk_level).toBe(RiskLevel.RED);
    expect(result.critical_triggered).toBe(true);
    expect(result.issues.some(i => i.code === 'DETONATORS_NOT_SECURE')).toBe(true);
  });

  test('single minor weighted issue stays low risk', () => {
    const result = evaluateBlastSite(baseSubmission({ supervisor_available: false }));
    expect(result.total_score).toBe(15);
    expect(result.risk_level).toBe(RiskLevel.GREEN);
    expect(result.critical_triggered).toBe(false);
  });

  test('siren not working pushes into yellow', () => {
    const result = evaluateBlastSite(baseSubmission({ siren_working: false }));
    expect(result.total_score).toBe(30);
    expect(result.risk_level).toBe(RiskLevel.YELLOW);
  });

  test('blast design not approved pushes into yellow (40 is at the edge)', () => {
    const result = evaluateBlastSite(baseSubmission({ blast_design_approved: false }));
    expect(result.total_score).toBe(40);
    expect(result.risk_level).toBe(RiskLevel.YELLOW);
  });

  test('multiple weighted issues accumulate into orange', () => {
    const result = evaluateBlastSite(baseSubmission({
      blast_design_approved: false,
      siren_working: false,
    }));
    expect(result.total_score).toBe(70);
    expect(result.risk_level).toBe(RiskLevel.ORANGE);
  });

  test('enough accumulated score without critical still reaches red', () => {
    const result = evaluateBlastSite(baseSubmission({
      blast_design_approved: false,
      exclusion_zone_established: false,
      siren_working: false,
    }));
    expect(result.total_score).toBe(100);
    expect(result.risk_level).toBe(RiskLevel.RED);
    expect(result.critical_triggered).toBe(false);
  });

  test('high wind speed flagged', () => {
    const result = evaluateBlastSite(baseSubmission({ wind_speed_kmh: 45 }));
    expect(result.issues.some(i => i.code === 'HIGH_WIND_SPEED')).toBe(true);
  });

  test('heavy rainfall flagged', () => {
    const result = evaluateBlastSite(baseSubmission({ rainfall_mm: 25 }));
    expect(result.issues.some(i => i.code === 'HEAVY_RAINFALL')).toBe(true);
  });

  test('extreme temperature flagged', () => {
    const result = evaluateBlastSite(baseSubmission({ temperature_c: 50 }));
    expect(result.issues.some(i => i.code === 'EXTREME_TEMPERATURE')).toBe(true);
  });

  test('worker count exceeds limit flagged', () => {
    const result = evaluateBlastSite(baseSubmission({ worker_count: 60, max_safe_worker_count: 50 }));
    expect(result.issues.some(i => i.code === 'WORKER_COUNT_EXCEEDS_LIMIT')).toBe(true);
  });

  test('missing optional max worker count uses default limit', () => {
    const data = baseSubmission({ worker_count: 60 });
    delete data.max_safe_worker_count;
    const result = evaluateBlastSite(data);
    expect(result.issues.some(i => i.code === 'WORKER_COUNT_EXCEEDS_LIMIT')).toBe(true);
  });

  test('two critical issues only flag once each and still red', () => {
    const result = evaluateBlastSite(baseSubmission({
      lightning_warning: true,
      workers_in_exclusion_zone: true,
    }));
    const criticalCodes = result.issues.filter(i => i.critical).map(i => i.code);
    expect(criticalCodes).toContain('LIGHTNING_WARNING');
    expect(criticalCodes).toContain('WORKERS_IN_EXCLUSION_ZONE');
    expect(result.risk_level).toBe(RiskLevel.RED);
  });
});
