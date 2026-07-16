import './RiskBeacon.css'

const LEVELS = [
  { key: 'RED', label: 'RED', color: 'var(--red)', dim: 'var(--red-dim)' },
  { key: 'ORANGE', label: 'ORANGE', color: 'var(--orange)', dim: 'var(--orange-dim)' },
  { key: 'YELLOW', label: 'YELLOW', color: 'var(--yellow)', dim: 'var(--yellow-dim)' },
  { key: 'GREEN', label: 'GREEN', color: 'var(--green)', dim: 'var(--green-dim)' },
]

const MEANING = {
  GREEN: 'All checks complete — proceed to authorised review',
  YELLOW: 'Non-critical issues — correct before approval',
  ORANGE: 'Important conditions incomplete — do not proceed',
  RED: 'Critical failure — suspend operation immediately',
}

export default function RiskBeacon({ level, score }) {
  return (
    <div className="beacon-panel">
      <div className="beacon-stack" role="img" aria-label={`Risk level: ${level || 'not evaluated'}`}>
        {LEVELS.map(({ key, color, dim }) => {
          const active = level === key
          return (
            <div
              key={key}
              className={`beacon-light ${active ? 'active' : ''}`}
              style={{
                '--light-color': color,
                '--light-dim': dim,
              }}
            >
              <span className="beacon-core" />
            </div>
          )
        })}
      </div>
      <div className="beacon-readout">
        <div className="beacon-score-label">RISK SCORE</div>
        <div className="beacon-score">{score !== undefined && score !== null ? score : '—'}</div>
        <div className={`beacon-level-tag ${level ? level.toLowerCase() : ''}`}>
          {level || 'AWAITING SUBMISSION'}
        </div>
        {level && <div className="beacon-meaning">{MEANING[level]}</div>}
      </div>
    </div>
  )
}
