import React, { useState } from 'react'
import { askCopilot } from '../api/client'
import { formatFix } from '../utils/format'

const DEFAULT_QUESTION = 'Why is this router performing badly?'

export default function CopilotPanel({ routerId }) {
  const [question, setQuestion] = useState(DEFAULT_QUESTION)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAsk(e) {
    e.preventDefault()
    if (!routerId || !question.trim()) return

    setLoading(true)
    setError(null)
    try {
      const result = await askCopilot(routerId, question.trim())
      setResponse(result)
    } catch {
      setError('Could not reach the AI copilot service. Ensure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  if (!routerId) {
    return (
      <section className="panel-card copilot-panel">
        <div className="panel-card-header">
          <h2>AI Copilot Interrogation</h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Select a router to initiate AI diagnostics.
        </p>
      </section>
    )
  }

  return (
    <section className="panel-card copilot-panel">
      <div className="panel-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
        <h2>AI Copilot Interrogation</h2>
        <span className="panel-card-subtitle">Real-time root cause analysis & evidence grounding</span>
      </div>

      <form className="copilot-chat-form" onSubmit={handleAsk}>
        <input
          type="text"
          className="copilot-chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a diagnostic question about this router..."
          disabled={loading}
        />
        <button type="submit" className="copilot-submit-btn" disabled={loading || !question.trim()}>
          {loading ? 'ANALYZING...' : 'INTERROGATE'}
        </button>
      </form>

      {error && <p className="error-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '0.5rem' }}>SYSTEM_ERR: {error}</p>}

      {response && (
        <div className="copilot-log" style={{ marginTop: '0.5rem' }}>
          <div className="copilot-log-card">
            <div className="copilot-log-card-header">CORE_DIAGNOSIS</div>
            <p className="copilot-log-text">{response.cause}</p>
          </div>

          <div className="copilot-log-card">
            <div className="copilot-log-card-header">GROUNDED_EVIDENCE</div>
            <ul className="copilot-evidence-list">
              {response.evidence.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="copilot-log-card">
            <div className="copilot-log-card-header">RECOMMENDED_FIX_ACTION</div>
            {response.recommended_fix ? (
              <span className="copilot-fix-box">
                {formatFix(response.recommended_fix).toUpperCase()}
              </span>
            ) : (
              <p className="copilot-log-text" style={{ color: 'var(--status-good)' }}>
                NO HARDWARE REMEDIATION REQUIRED — UNIT HEALED
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
