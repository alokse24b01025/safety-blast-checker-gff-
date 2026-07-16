import './HistoryTable.css'

export default function HistoryTable({ history, loading, onRefresh, onSelect }) {
  return (
    <div className="history-block">
      <div className="history-header">
        <h3>Submission History</h3>
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          {loading ? 'REFRESHING…' : 'REFRESH'}
        </button>
      </div>
      {history.length === 0 ? (
        <p className="history-empty">No submissions yet. Run an evaluation to see it appear here.</p>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Blast ID</th>
                <th>Date</th>
                <th>Score</th>
                <th>Risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.site_name}</td>
                  <td className="mono">{row.blast_id}</td>
                  <td className="mono">{row.blast_date}</td>
                  <td className="mono">{row.total_score}</td>
                  <td>
                    <span className={`risk-pill ${row.risk_level.toLowerCase()}`}>{row.risk_level}</span>
                  </td>
                  <td>
                    <button className="view-btn" onClick={() => onSelect(row.id)}>VIEW</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
