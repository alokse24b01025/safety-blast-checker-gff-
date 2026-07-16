import { useState } from 'react'
import RiskBeacon from './RiskBeacon.jsx'
import { pdfDownloadUrl, submitOfficerReview } from '../api/client.js'
import './ResultPanel.css'

export default function ResultPanel({ result, onReviewed }) {
  const [officerName, setOfficerName] = useState('')
  const [comments, setComments] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  if (!result) {
    return (
      <div className="result-panel empty">
        <RiskBeacon level={null} score={null} />
        <p className="empty-hint">Submit the checklist to see the risk evaluation here.</p>
      </div>
    )
  }

  async function handleReview(decision) {
    if (!officerName.trim()) {
      setReviewError('Officer name is required to record a decision.')
      return
    }
    setReviewError(null)
    setSubmittingReview(true)
    try {
      const res = await submitOfficerReview(result.submission_id, {
        decision,
        officer_name: officerName.trim(),
        comments: comments.trim() || null,
      })
      onReviewed(res)
    } catch (err) {
      setReviewError(err.message || 'Failed to record officer decision.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="result-panel">
      <RiskBeacon level={result.risk_level} score={result.total_score} />

      <div className="issues-block">
        <h3>Flagged Issues</h3>
        {result.issues.length === 0 ? (
          <p className="no-issues">No issues flagged by the rule engine.</p>
        ) : (
          <ul className="issues-list">
            {result.issues
              .slice()
              .sort((a, b) => b.weight - a.weight)
              .map((issue) => (
                <li key={issue.code} className={issue.critical ? 'critical' : ''}>
                  <span className="issue-weight">{issue.weight}</span>
                  <span className="issue-desc">
                    {issue.critical && <strong className="critical-tag">CRITICAL — </strong>}
                    {issue.description}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="ai-block">
        <h3>AI-Generated Recommendation <span className="advisory-tag">ADVISORY ONLY</span></h3>
        <p className="ai-text">{result.ai_recommendation}</p>
      </div>

      <div className="review-block">
        <h3>Authorised Blasting Officer Sign-Off</h3>
        
        {result.officer_decision ? (
          <div className={`status-banner ${result.officer_decision.toLowerCase()}`}>
            <div className="status-header">
              <span className="status-icon">
                {result.officer_decision === 'APPROVED' && '▲'}
                {result.officer_decision === 'HOLD' && '⧗'}
                {result.officer_decision === 'REJECTED' && '⚠'}
              </span>
              <h4>BLAST STATUS: {result.officer_decision}</h4>
            </div>
            <p className="status-desc">
              {result.officer_decision === 'APPROVED' && 'This pre-blast checklist has been reviewed and APPROVED. Operations are authorized to proceed in accordance with site safety rules under qualified supervision.'}
              {result.officer_decision === 'HOLD' && 'This pre-blast checklist has been placed ON HOLD. Blasting operations are suspended. Remedial actions must be completed before re-evaluation.'}
              {result.officer_decision === 'REJECTED' && 'This pre-blast checklist has been REJECTED. Blasting operations are strictly prohibited. Corrective safety actions must be taken immediately.'}
            </p>
            <div className="status-meta">
              <div><strong>Officer Name:</strong> {result.officer_name}</div>
              {result.officer_comments && <div><strong>Comments:</strong> "{result.officer_comments}"</div>}
              <div className="status-lock-tag">🔒 RECORDED & LOCKED — IRREVERSIBLE ACTION</div>
            </div>
          </div>
        ) : (
          <>
            <p className="review-hint">
              The AI cannot approve or deny this blast. Only an authorised blasting officer's
              decision below is recorded as the final outcome.
            </p>
            {result.risk_level === 'RED' && (
              <div className="review-warning">
                ⚠ APPROVAL BLOCKED: The risk level is RED. Safety issues must be corrected and re-submitted before this blast can be approved.
              </div>
            )}
            <div className="review-form">
              <label className="field">
                <span>Officer Name</span>
                <input value={officerName} onChange={(e) => setOfficerName(e.target.value)} placeholder="Full name" />
              </label>
              <label className="field field-wide">
                <span>Comments (optional)</span>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
              </label>
            </div>
            {reviewError && <div className="form-error" role="alert">{reviewError}</div>}
            <div className="review-actions">
              <button 
                className="review-btn approve" 
                disabled={submittingReview || result.risk_level === 'RED'} 
                onClick={() => handleReview('APPROVED')}
                title={result.risk_level === 'RED' ? "Approval blocked due to RED risk" : "Approve blast checklist"}
              >
                APPROVE
              </button>
              <button className="review-btn hold" disabled={submittingReview} onClick={() => handleReview('HOLD')}>HOLD</button>
              <button className="review-btn reject" disabled={submittingReview} onClick={() => handleReview('REJECTED')}>REJECT</button>
            </div>
          </>
        )}
      </div>

      <a
        className="pdf-btn"
        href={pdfDownloadUrl(result.submission_id)}
        target="_blank"
        rel="noreferrer"
      >
        DOWNLOAD PDF CHECKLIST
      </a>
    </div>
  )
}
