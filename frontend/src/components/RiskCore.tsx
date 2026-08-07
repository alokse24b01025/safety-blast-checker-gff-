import { useMemo } from 'react';
import { riskTheme } from '../lib/riskTheme';

interface RiskCoreProps {
  level: string | null | undefined;
  score?: number | null;
  submissionsToday?: number;
  onFormulaClick?: () => void;
}

/**
 * Command Core — an animated, color-reactive centerpiece for the dashboard.
 * Two counter-rotating rings + a pulsing core represent the rule engine
 * "processing" live site data; flowing stream lines represent data
 * (weather, checklist, worker count...) feeding into the score; the
 * core's color is the semantic risk color (see lib/riskTheme.ts) so it
 * always matches the same meaning used everywhere else in the app.
 */
export default function RiskCore({ level, score, submissionsToday = 0, onFormulaClick }: RiskCoreProps) {
  const theme = riskTheme(level);

  // Fixed random-looking but deterministic particle positions (no Math.random
  // on every render, avoids layout thrash / hydration mismatch).
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i * 0.6) % 6}s`,
        duration: `${5 + (i % 4)}s`,
        driftX: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 3) * 8)}px`,
      })),
    []
  );

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--border-radius-large)',
        border: '1px solid var(--border)',
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(255,90,31,0.06), transparent 60%), var(--panel)',
        overflow: 'hidden',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
        minHeight: 220,
      }}
    >
      {/* Drifting ambient particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              position: 'absolute',
              left: p.left,
              bottom: '-10px',
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: theme.color,
              ['--drift-x' as any]: p.driftX,
              animation: `particle-drift ${p.duration} ease-in infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Scan sweep highlight */}
      <div
        className="scan-sweep"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${theme.dim}, transparent)`,
          animation: 'scan-sweep 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* The Core */}
      <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
        <svg
          viewBox="0 0 160 160"
          width="160"
          height="160"
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Data streams flowing into the core */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 80 + Math.cos(rad) * 78;
            const y1 = 80 + Math.sin(rad) * 78;
            const x2 = 80 + Math.cos(rad) * 46;
            const y2 = 80 + Math.sin(rad) * 46;
            return (
              <line
                key={angle}
                className="stream-line"
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={theme.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                strokeLinecap="round"
                style={{
                  animation: `stream-flow 2.4s linear infinite`,
                  animationDelay: `${angle / 300}s`,
                }}
              />
            );
          })}

          {/* Outer rotating ring */}
          <circle
            className="core-ring"
            cx="80" cy="80" r="70"
            fill="none"
            stroke={theme.color}
            strokeWidth="1"
            strokeDasharray="2 10"
            opacity={0.5}
            style={{
              transformOrigin: '80px 80px',
              animation: 'core-ring-spin 18s linear infinite',
            }}
          />
          {/* Inner counter-rotating ring */}
          <circle
            className="core-ring-reverse"
            cx="80" cy="80" r="58"
            fill="none"
            stroke={theme.color}
            strokeWidth="1"
            strokeDasharray="1 8"
            opacity={0.35}
            style={{
              transformOrigin: '80px 80px',
              animation: 'core-ring-spin-reverse 12s linear infinite',
            }}
          />

          {/* Glow */}
          <circle cx="80" cy="80" r="34" fill={theme.color} opacity={0.18} filter="blur(8px)" />

          {/* Pulsing core */}
          <circle
            className="core-pulse"
            cx="80" cy="80" r="26"
            fill={theme.dim}
            stroke={theme.color}
            strokeWidth="2"
            style={{
              transformOrigin: '80px 80px',
              animation: 'core-pulse 2.4s ease-in-out infinite',
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ fontSize: '1.4rem', color: theme.color, fontWeight: 700, lineHeight: 1 }}>
            {score ?? '—'}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-faint)', marginTop: 2 }}>SCORE</span>
        </div>
      </div>

      {/* Status readout */}
      <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          System Status — Live
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            color: theme.color,
            marginTop: '0.25rem',
            letterSpacing: '0.02em',
          }}
        >
          {theme.label}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: 380 }}>
          {theme.meaning}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--text)' }}>{submissionsToday}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Checked Today
            </div>
          </div>
          {onFormulaClick && (
            <button
              onClick={onFormulaClick}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              className="hover:border-mining-gold hover:text-white transition-all"
            >
              <span>ℹ️</span>
              <span>How is this calculated?</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}