import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertOctagon, History, ShieldAlert as LogIcon, Calendar, User as UserIcon, RefreshCcw } from 'lucide-react';
import { submitIncidentLog, fetchIncidents, fetchHistory, pdfDownloadUrl } from '../api/client.ts';

export default function IncidentLogsTab() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Form states
  const [blastId, setBlastId] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

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
      // Clear form
      setBlastId('');
      setIncidentType('');
      setDescription('');
      // Reload lists
      await loadData();
    } catch (err: any) {
      setLogError(err.message || 'Failed to submit incident log. Make sure you are logged in.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-950/40 text-red-400 border border-red-800';
      case 'HIGH': return 'bg-orange-950/40 text-orange-400 border border-orange-800';
      case 'MEDIUM': return 'bg-yellow-950/40 text-yellow-400 border border-yellow-800';
      default: return 'bg-blue-950/40 text-blue-400 border border-blue-800';
    }
  };

  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'RED': return 'bg-red-950/40 text-red-400 border border-red-800';
      case 'ORANGE': return 'bg-orange-950/40 text-orange-400 border border-orange-800';
      case 'YELLOW': return 'bg-yellow-950/40 text-yellow-400 border border-yellow-800';
      default: return 'bg-green-950/40 text-green-400 border border-green-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Log Form Intake */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <form onSubmit={handleLogSubmit} className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-mining-accent" /> Log Safety Incident
            </h2>
            <p className="text-xs text-gray-400">Record a safety violation or active site incident</p>
          </div>

          <div className="border-t border-mining-border pt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Blast ID Correlation</label>
              <input
                type="text" required value={blastId}
                onChange={(e) => setBlastId(e.target.value)}
                placeholder="e.g. BLAST-001"
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-mining-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Incident Category</label>
              <input
                type="text" required value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                placeholder="e.g. Geofence Intrusion, Misfire"
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Incident Severity</label>
              <select
                value={severity} onChange={(e) => setSeverity(e.target.value)}
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="LOW">LOW RISK</option>
                <option value="MEDIUM">MEDIUM RISK</option>
                <option value="HIGH">HIGH RISK</option>
                <option value="CRITICAL">CRITICAL BREACH</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Detailed Description</label>
              <textarea
                required value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4} placeholder="Describe the safety violation details..."
                className="bg-mining-dark border border-mining-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {logError && (
            <div className="bg-red-950/20 border border-red-800 text-red-400 p-2.5 rounded-lg text-xs">
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

      {/* History and Logs list */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Incident Logs List */}
        <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-mining-accent">Logged Safety Incidents</h3>
              <p className="text-xs text-gray-400">Real-time incident registers with operator logging identities</p>
            </div>
             <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-mining-dark hover:bg-zinc-800 border border-gray-500 rounded-lg text-gray-300 transition-colors"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="bg-mining-dark/40 border border-mining-border text-gray-400 py-8 px-4 rounded-xl text-center text-xs">
              No incidents logged on site.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-mining-border text-gray-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Blast ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Logged By</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mining-border/40 text-gray-300">
                  {incidents.map((log) => (
                    <tr key={log.id} className="hover:bg-mining-dark/20">
                      <td className="py-3 px-3 text-gray-400 whitespace-nowrap">{new Date(log.logged_at).toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-mining-gold">{log.blast_id}</td>
                      <td className="py-3 px-3 font-semibold text-white">{log.incident_type}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityStyle(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">{log.logged_by}</td>
                      <td className="py-3 px-3 max-w-[200px] truncate" title={log.description}>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Log Submission History */}
        <div className="bg-mining-card border border-mining-border p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-mining-accent">Tamper-Evident Checklist Audit Logs</h3>
            <p className="text-xs text-gray-400">Secured cryptographic SHA-256 hashes verifying audit records</p>
          </div>

          {historyList.length === 0 ? (
            <div className="bg-mining-dark/40 border border-mining-border text-gray-400 py-8 px-4 rounded-xl text-center text-xs">
              No checklist history records available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-mining-border text-gray-400">
                    <th className="py-2.5 px-3">Site</th>
                    <th className="py-2.5 px-3">Blast ID</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Integrity ID (SHA-256)</th>
                    <th className="py-2.5 px-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mining-border/40 text-gray-300">
                  {historyList.map((row) => (
                    <tr key={row.id} className="hover:bg-mining-dark/20">
                      <td className="py-3 px-3 font-semibold text-white">{row.site_name}</td>
                      <td className="py-3 px-3 font-mono text-gray-400">{row.blast_id}</td>
                      <td className="py-3 px-3 font-mono">{row.total_score}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskLevelStyle(row.risk_level)}`}>
                          {row.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-mining-gold select-all truncate max-w-[150px]" title={row.id}>
                        {row.id}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href={pdfDownloadUrl(row.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-mining-dark hover:bg-mining-border border border-mining-border text-white text-[10px] font-medium rounded transition-colors"
                        >
                          PDF
                        </a>
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
