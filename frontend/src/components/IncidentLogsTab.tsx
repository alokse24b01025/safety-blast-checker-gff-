import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';
import { submitIncidentLog, fetchIncidents, fetchHistory, pdfDownloadUrl } from '../api/client.ts';

export default function IncidentLogsTab() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [blastId, setBlastId] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  // Frontend-only deletion filters saved in local storage
  const [hiddenIncidentIds, setHiddenIncidentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hidden_incidents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hidden_checklists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hidden_incidents', JSON.stringify(hiddenIncidentIds));
    } catch (e) {
      console.error(e);
    }
  }, [hiddenIncidentIds]);

  useEffect(() => {
    try {
      localStorage.setItem('hidden_checklists', JSON.stringify(hiddenHistoryIds));
    } catch (e) {
      console.error(e);
    }
  }, [hiddenHistoryIds]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incRes, histRes] = await Promise.all([
        fetchIncidents(),
        fetchHistory()
      ]);
      setIncidents(incRes);
      setHistoryList(histRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);
    setSubmittingLog(true);
    try {
      await submitIncidentLog({
        blast_id: blastId,
        incident_type: incidentType,
        description,
        severity
      });
      setBlastId('');
      setIncidentType('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setLogError(err.message || 'Failed to submit incident log. Make sure you are logged in.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]';
      case 'HIGH': return 'bg-[var(--orange-dim)] text-[var(--orange)] border border-[var(--orange)]';
      case 'MEDIUM': return 'bg-[var(--yellow-dim)] text-[var(--yellow)] border border-[var(--yellow)]';
      default: return 'bg-[var(--panel-raised)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'RED': return 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]';
      case 'ORANGE': return 'bg-[var(--orange-dim)] text-[var(--orange)] border border-[var(--orange)]';
      case 'YELLOW': return 'bg-[var(--yellow-dim)] text-[var(--yellow)] border border-[var(--yellow)]';
      default: return 'bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]';
    }
  };

  const visibleIncidents = incidents.filter(log => !hiddenIncidentIds.includes(log.id));
  const visibleHistoryList = historyList.filter(row => !hiddenHistoryIds.includes(row.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <form onSubmit={handleLogSubmit} className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <ShieldAlert className="text-mining-accent" /> Log Safety Incident
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Record a safety violation or active site incident</p>
          </div>

          <div className="border-t border-mining-border pt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)] font-semibold">Blast ID Correlation</label>
              <input
                type="text" required value={blastId}
                onChange={(e) => setBlastId(e.target.value)}
                placeholder="e.g. BLAST-001"
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-mining-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)] font-semibold">Incident Category</label>
              <input
                type="text" required value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                placeholder="e.g. Geofence Intrusion, Misfire"
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-mining-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)] font-semibold">Incident Severity</label>
              <select
                value={severity} onChange={(e) => setSeverity(e.target.value)}
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-mining-accent"
              >
                <option value="LOW">LOW RISK</option>
                <option value="MEDIUM">MEDIUM RISK</option>
                <option value="HIGH">HIGH RISK</option>
                <option value="CRITICAL">CRITICAL BREACH</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)] font-semibold">Detailed Description</label>
              <textarea
                required value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4} placeholder="Describe the safety violation details..."
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-mining-accent resize-none"
              />
            </div>
          </div>

          {logError && (
            <div className="bg-[var(--red-dim)] border border-[var(--red)] text-[var(--red)] p-2.5 rounded-lg text-xs">
              {logError}
            </div>
          )}

          <button
            type="submit"
            disabled={submittingLog}
            className="w-full btn-neon-yellow py-2 rounded-xl text-xs font-bold mt-1"
          >
            {submittingLog ? 'RECORDING LOG...' : 'SUBMIT INCIDENT RECORD'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Incident Logs Card */}
        <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4 min-h-[350px]">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider text-mining-accent">Logged Safety Incidents</h3>
              <p className="text-xs text-[var(--text-muted)]">Real-time incident registers with operator logging identities</p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-mining-dark hover:bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] transition-colors"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {visibleIncidents.length === 0 ? (
            <div className="bg-[var(--panel-raised)] border border-mining-border text-[var(--text-muted)] rounded-xl text-center text-xs flex-1 flex items-center justify-center min-h-[220px]">
              No incidents logged on site (or all have been dismissed).
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[260px] pr-1 flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-mining-border text-[var(--text-muted)] sticky top-0 bg-[#0e0c0b] z-10">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Blast ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Logged By</th>
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mining-border/40 text-[var(--text-muted)]">
                  {visibleIncidents.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--panel-raised)]">
                      <td className="py-3 px-3 text-[var(--text-muted)] whitespace-nowrap">{new Date(log.logged_at).toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-mining-gold">{log.blast_id}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--text)]">{log.incident_type}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityStyle(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{log.logged_by}</td>
                      <td className="py-3 px-3 max-w-[120px] truncate" title={log.description}>{log.description}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setHiddenIncidentIds(prev => [...prev, log.id])}
                          className="px-2.5 py-1 text-[10px] bg-red-950/20 hover:bg-red-950/60 border border-red-900/30 hover:border-red-500 rounded text-red-400 font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Logs Card */}
        <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4 min-h-[350px]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider text-mining-accent">Tamper-Evident Checklist Audit Logs</h3>
            <p className="text-xs text-[var(--text-muted)]">Secured cryptographic SHA-256 hashes verifying audit records</p>
          </div>

          {visibleHistoryList.length === 0 ? (
            <div className="bg-[var(--panel-raised)] border border-mining-border text-[var(--text-muted)] rounded-xl text-center text-xs flex-1 flex items-center justify-center min-h-[220px]">
              No checklist history records available (or all have been dismissed).
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[260px] pr-1 flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-mining-border text-[var(--text-muted)] sticky top-0 bg-[#0e0c0b] z-10">
                    <th className="py-2.5 px-3">Site</th>
                    <th className="py-2.5 px-3">Blast ID</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Integrity ID (SHA-256)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mining-border/40 text-[var(--text-muted)]">
                  {visibleHistoryList.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--panel-raised)]">
                      <td className="py-3 px-3 font-semibold text-[var(--text)]">{row.site_name}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{row.blast_id}</td>
                      <td className="py-3 px-3 font-mono">{row.total_score}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskLevelStyle(row.risk_level)}`}>
                          {row.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-mining-gold select-all truncate max-w-[150px]" title={row.id}>
                        {row.id}
                      </td>
                      <td className="py-3 px-3 text-right flex justify-end gap-1.5 items-center">
                        <a
                          href={pdfDownloadUrl(row.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-mining-dark hover:bg-[var(--panel)] border border-mining-border text-[var(--text)] text-[10px] font-medium rounded transition-colors"
                        >
                          PDF
                        </a>
                        <button
                          onClick={() => setHiddenHistoryIds(prev => [...prev, row.id])}
                          className="px-2.5 py-1 bg-red-950/20 hover:bg-red-950/60 border border-red-900/30 hover:border-red-500 rounded text-red-400 font-bold transition-all text-[10px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}