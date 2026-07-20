import React, { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle, AlertTriangle, FileText, Download, Check, X, ShieldAlert as AlertIcon, AlertOctagon } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas.tsx';
import RiskBeacon from './RiskBeacon.tsx';
import { submitChecklist, submitOfficerReview, pdfDownloadUrl } from '../api/client.ts';

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const initialState = {
  site_name: '',
  blast_id: '',
  temperature_c: '',
  rainfall_mm: '',
  wind_speed_kmh: '',
  lightning_warning: false,
  blast_date: getTodayDateString(),
  blast_time: '',
  supervisor_available: true,
  blasting_officer_available: true,
  worker_count: '',
  max_safe_worker_count: '',
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
  additional_notes: '',
};

interface ChecklistTabProps {
  onSubmissionSuccess: () => void;
  userRole: string;
}

export default function ChecklistTab({ onSubmissionSuccess, userRole }: ChecklistTabProps) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Officer signoff states
  const [officerName, setOfficerName] = useState('');
  const [comments, setComments] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleToggle = (name: string, value: boolean) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        temperature_c: Number(form.temperature_c),
        rainfall_mm: Number(form.rainfall_mm),
        wind_speed_kmh: Number(form.wind_speed_kmh),
        worker_count: Number(form.worker_count),
        max_safe_worker_count: form.max_safe_worker_count ? Number(form.max_safe_worker_count) : 50,
        additional_notes: form.additional_notes || null,
      };

      const res = await submitChecklist(payload);
      setResult(res);
      onSubmissionSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit checklist safety assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (decision: 'APPROVED' | 'HOLD' | 'REJECTED') => {
    if (!officerName.trim()) {
      setReviewError('Officer name is required to record a decision.');
      return;
    }
    if (!digitalSignature) {
      setReviewError('Blasting officer digital signature is required for authorization.');
      return;
    }
    setReviewError(null);
    setSubmittingReview(true);
    try {
      const res = await submitOfficerReview(result.id, {
        decision,
        officer_name: officerName.trim(),
        comments: comments.trim() || null,
        digital_signature: digitalSignature,
      });

      setResult((prev: any) => ({
        ...prev,
        officer_decision: res.officer_decision,
        officer_name: res.officer_name,
        officer_comments: res.officer_comments,
        reviewed_at: res.reviewed_at,
      }));
      onSubmissionSuccess();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit officer decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getBeaconStyle = (level: string) => {
    switch (level) {
      case 'GREEN': return { bg: 'bg-green-950/40', text: 'text-green-400', border: 'border-green-800' };
      case 'YELLOW': return { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-800' };
      case 'ORANGE': return { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800' };
      case 'RED': return { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800' };
      default: return { bg: 'bg-gray-950/40', text: 'text-gray-400', border: 'border-gray-800' };
    }
  };

  // Helper to generate premium, high-contrast toggle styles
  const getToggleButtonClass = (isActive: boolean, isAlertColor: boolean) => {
    if (isActive) {
      return isAlertColor
        ? "px-4 py-1.5 text-xs rounded-lg font-bold bg-red-600 border border-red-500 text-white shadow-[0_0_10px_rgba(248,113,113,0.4)] transition-all duration-150"
        : "px-4 py-1.5 text-xs rounded-lg font-bold bg-green-600 border border-green-500 text-white shadow-[0_0_10px_rgba(74,222,128,0.4)] transition-all duration-150";
    } else {
      return "px-4 py-1.5 text-xs rounded-lg font-semibold bg-mining-card border border-mining-border text-gray-400 hover:text-white hover:bg-[#26282b] transition-all duration-150";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Intake Form Column */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="text-mining-accent" /> Pre-Blast Safety Checklist Intake
          </h2>
          <p className="text-xs text-gray-400">Complete pre-operation validation checklist prior to blast scheduling</p>
        </div>

        {/* Site Details */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Site Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Site Name</label>
              <input
                type="text"
                name="site_name"
                value={form.site_name}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Blast ID</label>
              <input
                type="text"
                name="blast_id"
                value={form.blast_id}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Weather Conditions */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Weather Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperature_c"
                value={form.temperature_c}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Rainfall (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="rainfall_mm"
                value={form.rainfall_mm}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Wind Speed (km/h)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="wind_speed_kmh"
                value={form.wind_speed_kmh}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
            <span className="text-xs text-gray-300">Lightning Warning Active in Area</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleToggle('lightning_warning', true)}
                className={getToggleButtonClass(form.lightning_warning, true)}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => handleToggle('lightning_warning', false)}
                className={getToggleButtonClass(!form.lightning_warning, false)}
              >
                NO
              </button>
            </div>
          </div>
        </div>

        {/* Shift Details */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Shift &amp; Logistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Blast Date</label>
              <input
                type="date"
                name="blast_date"
                value={form.blast_date}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Blast Time</label>
              <input
                type="time"
                name="blast_time"
                value={form.blast_time}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Supervisor Available</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('supervisor_available', true)}
                  className={getToggleButtonClass(form.supervisor_available, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('supervisor_available', false)}
                  className={getToggleButtonClass(!form.supervisor_available, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Blasting Officer Available</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('blasting_officer_available', true)}
                  className={getToggleButtonClass(form.blasting_officer_available, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('blasting_officer_available', false)}
                  className={getToggleButtonClass(!form.blasting_officer_available, true)}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workforce */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Workforce Safety</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Active Worker Count</label>
              <input
                type="number"
                name="worker_count"
                value={form.worker_count}
                onChange={handleInputChange}
                required
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Max Safe Workers Limit</label>
              <input
                type="number"
                name="max_safe_worker_count"
                value={form.max_safe_worker_count}
                onChange={handleInputChange}
                placeholder="50"
                className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Workers Inside Exclusion Zone</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('workers_in_exclusion_zone', true)}
                  className={getToggleButtonClass(form.workers_in_exclusion_zone, true)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('workers_in_exclusion_zone', false)}
                  className={getToggleButtonClass(!form.workers_in_exclusion_zone, false)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Safety Briefing Completed</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('safety_briefing_completed', true)}
                  className={getToggleButtonClass(form.safety_briefing_completed, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('safety_briefing_completed', false)}
                  className={getToggleButtonClass(!form.safety_briefing_completed, true)}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Status */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Equipment Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Detonators Secure</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('detonators_secure', true)}
                  className={getToggleButtonClass(form.detonators_secure, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('detonators_secure', false)}
                  className={getToggleButtonClass(!form.detonators_secure, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Warning Siren Functioning</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('siren_working', true)}
                  className={getToggleButtonClass(form.siren_working, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('siren_working', false)}
                  className={getToggleButtonClass(!form.siren_working, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Communication Network OK</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('communication_working', true)}
                  className={getToggleButtonClass(form.communication_working, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('communication_working', false)}
                  className={getToggleButtonClass(!form.communication_working, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Emergency Vehicles Ready</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('emergency_vehicle_available', true)}
                  className={getToggleButtonClass(form.emergency_vehicle_available, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('emergency_vehicle_available', false)}
                  className={getToggleButtonClass(!form.emergency_vehicle_available, true)}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Site Conditions */}
        <div className="border-t border-mining-border pt-4">
          <h3 className="text-xs font-semibold text-mining-accent uppercase mb-3">Site Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Exclusion Zone Clear</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('exclusion_zone_established', true)}
                  className={getToggleButtonClass(form.exclusion_zone_established, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('exclusion_zone_established', false)}
                  className={getToggleButtonClass(!form.exclusion_zone_established, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Barricades Posted</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('barricades_in_place', true)}
                  className={getToggleButtonClass(form.barricades_in_place, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('barricades_in_place', false)}
                  className={getToggleButtonClass(!form.barricades_in_place, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Blast Design Pre-Approved</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('blast_design_approved', true)}
                  className={getToggleButtonClass(form.blast_design_approved, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('blast_design_approved', false)}
                  className={getToggleButtonClass(!form.blast_design_approved, true)}
                >
                  NO
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center bg-mining-dark border border-mining-border p-3 rounded-lg">
              <span className="text-xs text-gray-300">Escape Routes Clear</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle('escape_route_clear', true)}
                  className={getToggleButtonClass(form.escape_route_clear, false)}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle('escape_route_clear', false)}
                  className={getToggleButtonClass(!form.escape_route_clear, true)}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t border-mining-border pt-4">
          <label className="text-xs text-gray-400 mb-1.5 block">Additional Shift Comments</label>
          <textarea
            name="additional_notes"
            value={form.additional_notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full bg-mining-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent resize-none"
            placeholder="Log specific anomalies or operations delays..."
          />
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-neon-yellow py-3 rounded-xl font-bold"
        >
          {submitting ? 'EVALUATING RISK CRITERIA...' : 'SUBMIT PRE-BLAST SAFETY EVALUATION'}
        </button>
      </form>

      {/* Results Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {!result ? (
          <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px] h-full">
            <ShieldAlert size={48} className="text-gray-600 mb-3" />
            <h3 className="text-white font-semibold text-sm">Awaiting Intake Submission</h3>
            <p className="text-xs text-gray-400 max-w-[250px] mt-1">Submit the safety checklist to evaluate risk scoring and generate AI advisory report</p>
          </div>
        ) : (
          <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-5">
            {/* Risk Beacon Light Stack */}
            <RiskBeacon level={result.risk_level} score={result.total_score} />

            {/* Tamper Evidence Hash */}
            <div className="px-3 py-1.5 bg-mining-dark rounded-lg border border-mining-border text-[9px] font-mono text-gray-400 flex items-center justify-between">
              <span>SHA-256 INTEGRITY HASH:</span>
              <span className="text-mining-gold truncate max-w-[180px] font-bold">{result.id}</span>
            </div>

            {/* Issues Block */}
            <div className="border-t border-mining-border pt-4">
              <h4 className="text-xs font-bold text-white mb-2">Flagged Checklist Issues</h4>
              {result.issues.length === 0 ? (
                <div className="bg-green-950/20 border border-green-900 text-green-400 p-3 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle size={14} /> All checks verified. Pre-conditions are acceptable.
                </div>
              ) : (
                <ul className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {result.issues
                    .slice()
                    .sort((a: any, b: any) => b.weight - a.weight)
                    .map((issue: any) => (
                      <li
                        key={issue.code}
                        className={`flex gap-3 items-start p-2.5 rounded-lg border text-xs ${
                          issue.critical
                            ? 'bg-red-950/20 border-red-900/60 text-red-300'
                            : 'bg-mining-dark/50 border-mining-border text-gray-300'
                        }`}
                      >
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${issue.critical ? 'bg-red-900/50 text-red-200' : 'bg-gray-800'}`}>
                          {issue.weight}
                        </span>
                        <div>
                          {issue.critical && <strong className="text-red-400">CRITICAL: </strong>}
                          {issue.description}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* AI Advisory */}
            <div className="border-t border-mining-border pt-4">
              <h4 className="text-xs font-bold text-white mb-2 flex flex-wrap items-center gap-1.5">
                AI Assistant Recommendation 
                <span className="px-1.5 py-0.5 text-[8px] bg-yellow-950/50 text-yellow-500 rounded border border-yellow-800">ADVISORY ONLY</span>
                {result.ai_generated ? (
                  <span className="px-1.5 py-0.5 text-[8px] bg-green-950/50 text-green-400 rounded border border-green-800">AI PREDICTED ({result.ai_provider || 'GEMINI 3.1'})</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[8px] bg-blue-950/50 text-blue-400 rounded border border-blue-800">RULE ENGINE CONSTANTS (DEFAULT FALLBACK)</span>
                )}
              </h4>
              <div className="bg-mining-dark/60 border border-mining-border p-3.5 rounded-xl text-xs text-gray-300 leading-relaxed font-sans italic whitespace-pre-line">
                "{result.ai_recommendation}"
              </div>
            </div>

            {/* Signoff block */}
            <div className="border-t border-mining-border pt-4">
              <h4 className="text-xs font-bold text-white mb-3">Authorised Blasting Officer Sign-Off</h4>

              {userRole !== 'OFFICER' ? (
                <div className="bg-mining-dark/40 border border-mining-border p-4 rounded-xl text-center">
                  <ShieldAlert size={20} className="text-mining-accent mx-auto mb-2" />
                  <p className="text-xs text-gray-300">
                    Your session is logged in as a <strong className="text-mining-accent">{userRole || 'SUPERVISOR'}</strong>.
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Sign-off, approval, and rejection features are restricted to Blasting Officers only.
                  </p>
                </div>
              ) : result.officer_decision ? (
                <div className={`p-4 rounded-xl border ${
                  result.officer_decision === 'APPROVED' ? 'bg-green-950/30 border-green-900 text-green-300' :
                  result.officer_decision === 'HOLD' ? 'bg-yellow-950/30 border-yellow-900 text-yellow-300' :
                  'bg-red-950/30 border-red-900 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1 rounded bg-black/40">
                      {result.officer_decision === 'APPROVED' && <Check size={16} />}
                      {result.officer_decision === 'HOLD' && <AlertOctagon size={16} />}
                      {result.officer_decision === 'REJECTED' && <X size={16} />}
                    </span>
                    <h5 className="font-bold text-sm">BLAST STATUS: {result.officer_decision}</h5>
                  </div>
                  <p className="text-xs text-gray-300 mb-3">
                    {result.officer_decision === 'APPROVED' && 'Pre-blast checklist is APPROVED. Detonation sequence is authorized.'}
                    {result.officer_decision === 'HOLD' && 'Blasting placed on HOLD. Remedial safety actions must be taken.'}
                    {result.officer_decision === 'REJECTED' && 'Blasting REJECTED. Blasting operations are strictly prohibited.'}
                  </p>
                  <div className="text-[11px] flex flex-col gap-1 border-t border-mining-border pt-3 mt-1 text-gray-400 font-sans">
                    <div><strong>Blasting Officer:</strong> {result.officer_name}</div>
                    {result.officer_comments && <div><strong>Comments:</strong> "{result.officer_comments}"</div>}
                    <div className="text-[9px] text-mining-gold flex items-center gap-1.5 mt-2">
                      🔒 DIGITALLY SIGNED &amp; RECORDED (IRREVERSIBLE AUDIT TRAIL)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] text-gray-400">
                    The AI advises but cannot approve. Final operation release requires an authorised blasting officer's digital signature and submission lock.
                  </p>

                  {result.risk_level === 'RED' && (
                    <div className="bg-red-950/40 border border-red-800 text-red-400 p-3 rounded-lg text-[11px] flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>APPROVAL BLOCKED: The risk level is RED. Safety checks must be corrected before this blast can be approved.</span>
                    </div>
                  )}

                  {/* Review inputs */}
                  <div className="flex flex-col gap-3 bg-mining-dark/50 border border-mining-border p-4 rounded-xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Officer Full Name</label>
                      <input
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        placeholder="Authorized signatory name"
                        className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Review Comments</label>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={2}
                        placeholder="Log any instructions..."
                        className="bg-mining-dark border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    {/* Canvas signature pad */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400">Digital Signature Capture</label>
                      <SignatureCanvas
                        onSave={(b64) => setDigitalSignature(b64)}
                        onClear={() => setDigitalSignature('')}
                      />
                    </div>
                  </div>

                  {reviewError && (
                    <div className="bg-red-950/20 border border-red-800 text-red-400 p-2.5 rounded-lg text-[10px]">
                      {reviewError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={submittingReview || result.risk_level === 'RED'}
                      className="flex-1 btn-neon-green disabled:opacity-50 font-bold py-2 rounded-lg text-xs"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => handleReview('HOLD')}
                      disabled={submittingReview}
                      className="flex-1 btn-neon-yellow font-bold py-2 rounded-lg text-xs"
                    >
                      HOLD
                    </button>
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={submittingReview}
                      className="flex-1 btn-neon-red font-bold py-2 rounded-lg text-xs"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Download PDF button */}
            <a
              href={pdfDownloadUrl(result.id)}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-gray-600 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <Download size={14} /> DOWNLOAD TAMPER-EVIDENT PDF REPORT
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
