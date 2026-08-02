import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { fetchDashboardSummary } from '../api/client';
import { riskTheme } from '../lib/riskTheme';
import { useCountUp } from '../lib/useCountUp';
import RiskCore from './RiskCore';

interface DashboardSummary {
  total_submissions: number;
  avg_score_overall: number;
  risk_level_breakdown: { GREEN: number; YELLOW: number; ORANGE: number; RED: number };
  decision_breakdown: { APPROVED: number; REJECTED: number; PENDING: number };
  critical_trigger_count: number;
  critical_trigger_rate_pct: number;
  score_trend_14d: { date: string; avg_score: number; submissions: number }[];
  top_flagged_issues: { issue: string; count: number }[];
  total_incidents: number;
  incident_severity_breakdown: Record<string, number>;
  total_blast_plans: number;
}

const SEVERITY_ORDER: (keyof DashboardSummary['risk_level_breakdown'])[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];

function KpiCard({
  label, value, sub, accent, delay = 0,
}: { label: string; value: number; sub?: string; accent?: string; delay?: number }) {
  const animated = useCountUp(value);
  return (
    <div
      className="reveal-on-mount"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--border-radius-medium)',
        padding: '1.1rem 1.25rem',
        borderLeft: accent ? `3px solid ${accent}` : '1px solid var(--border)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--text)', marginTop: '0.25rem', lineHeight: 1.1 }}>
        {animated}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function KpiCardPct({
  label, pct, sub, accent, delay = 0,
}: { label: string; pct: number; sub?: string; accent?: string; delay?: number }) {
  const animated = useCountUp(pct);
  return (
    <div
      className="reveal-on-mount"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--border-radius-medium)',
        padding: '1.1rem 1.25rem',
        borderLeft: accent ? `3px solid ${accent}` : '1px solid var(--border)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--text)', marginTop: '0.25rem', lineHeight: 1.1 }}>
        {animated}%
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="reveal-on-mount"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--border-radius-medium)',
        padding: '1.25rem',
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '1rem', letterSpacing: '0.02em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardSummary()
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
        Could not load dashboard: {error}
      </div>
    );
  }

  const riskBars = ['GREEN', 'YELLOW', 'ORANGE', 'RED'].map((k) => ({
    level: k,
    count: data.risk_level_breakdown[k as keyof typeof data.risk_level_breakdown],
  }));

  const approvalRate = data.total_submissions
    ? Math.round((100 * data.decision_breakdown.APPROVED) / data.total_submissions)
    : 0;

  // Dominant (worst-active) risk level, shown on the live Core --
  // a safety dashboard should surface the worst current status, not
  // an average, so nothing critical gets buried.
  const dominantLevel = data.total_submissions === 0
    ? null
    : SEVERITY_ORDER.find((lvl) => data.risk_level_breakdown[lvl] > 0) || 'GREEN';

  const todaySubmissions = data.score_trend_14d.length
    ? data.score_trend_14d[data.score_trend_14d.length - 1].submissions
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      <div className="reveal-on-mount" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text)' }}>
        Executive Dashboard
      </div>

      {/* LIVE COMMAND CORE */}
      <div className="reveal-on-mount">
        <RiskCore level={dominantLevel} score={data.avg_score_overall} submissionsToday={todaySubmissions} />
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
        <KpiCard label="Total Submissions" value={data.total_submissions} accent="var(--orange)" delay={0} />
        <KpiCardPct
          label="Critical Trigger Rate"
          pct={data.critical_trigger_rate_pct}
          sub={`${data.critical_trigger_count} of ${data.total_submissions} blasts`}
          accent="var(--red)"
          delay={60}
        />
        <KpiCardPct label="Approval Rate" pct={approvalRate} sub={`${data.decision_breakdown.PENDING} pending review`} accent="var(--green)" delay={120} />
        <KpiCard label="Incidents Logged" value={data.total_incidents} accent="var(--yellow)" delay={180} />
        <KpiCard label="Blast Plans Designed" value={data.total_blast_plans} delay={240} />
      </div>

      {/* RISK BREAKDOWN + TREND */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 2fr)', gap: '1.25rem' }}>
        <SectionCard title="Risk Level Breakdown" delay={80}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="level" stroke="var(--text-muted)" fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--panel-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                {riskBars.map((entry) => (
                  <Cell key={entry.level} fill={riskTheme(entry.level).color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Average Risk Score — Last 14 Days" delay={140}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.score_trend_14d}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={10}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'var(--panel-raised)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
              />
              <Line type="monotone" dataKey="avg_score" stroke="var(--orange)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* TOP ISSUES + INCIDENT SEVERITY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 2fr) minmax(220px, 1fr)', gap: '1.25rem' }}>
        <SectionCard title="Most Frequently Flagged Issues" delay={200}>
          {data.top_flagged_issues.length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
              No issues flagged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {data.top_flagged_issues.map((item) => {
                const max = data.top_flagged_issues[0].count;
                const pct = Math.max(8, Math.round((item.count / max) * 100));
                return (
                  <div key={item.issue}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                      <span>{item.issue}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--panel-raised)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--orange)',
                          transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Incident Severity" delay={260}>
          {Object.keys(data.incident_severity_breakdown).length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
              No incidents logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(data.incident_severity_breakdown).map(([sev, count]) => (
                <div key={sev} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text)' }}>
                  <span>{sev}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}