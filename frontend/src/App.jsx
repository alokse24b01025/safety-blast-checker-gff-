import { useEffect, useState, useRef } from 'react'
import ChecklistForm from './components/ChecklistForm.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import HistoryTable from './components/HistoryTable.jsx'
import { submitChecklist, fetchHistory, fetchSubmission } from './api/client.js'
import './App.css'

export default function App() {
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const resultRef = useRef(null)

  async function refreshHistory() {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await fetchHistory()
      setHistory(data)
    } catch (err) {
      setHistoryError(err.message || 'Failed to load submission history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  async function handleResult(newResult) {
    setResult(newResult)
    refreshHistory()
    // Wait for DOM update, then smooth scroll to result panel
    setTimeout(() => {
      if (resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  async function handleSelectHistoryItem(id) {
    try {
      const data = await fetchSubmission(id)
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setHistoryError(err.message || 'Failed to load submission.')
    }
  }

  function handleReviewed(reviewData) {
    setResult((prev) => prev ? {
      ...prev,
      officer_decision: reviewData.officer_decision,
      officer_name: reviewData.officer_name,
      officer_comments: reviewData.officer_comments,
    } : prev)
    refreshHistory()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">▲</span>
            <div>
              <h1>AI Blast Safety Assistant</h1>
              <p>Pre-blast risk evaluation &amp; checklist generation</p>
            </div>
          </div>

          <div className="disclaimer-banner">
            AI provides recommendations only. Final blast approval always rests with an
            authorised blasting officer.
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="form-column">
          <h2 className="column-title">Pre-Blast Checklist Intake</h2>
          <ChecklistForm onResult={handleResult} apiSubmit={submitChecklist} />
        </section>

        <section className="result-column" ref={resultRef}>
          <h2 className="column-title">Risk Evaluation</h2>
          <ResultPanel result={result} onReviewed={handleReviewed} />
        </section>
      </main>

      <div className="app-main-full">
        {historyError && <div className="form-error">{historyError}</div>}
        <HistoryTable
          history={history}
          loading={historyLoading}
          onRefresh={refreshHistory}
          onSelect={handleSelectHistoryItem}
        />
      </div>

      <footer className="app-footer">
        Student prototype for learning and demonstration only. Not a substitute for
        qualified blasting professional judgement or compliance review.
      </footer>
    </div>
  )
}
