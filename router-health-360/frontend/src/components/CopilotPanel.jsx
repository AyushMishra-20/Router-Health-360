import { useState } from 'react'
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
      setError('Could not reach the copilot. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!routerId) {
    return (
      <section className="panel copilot-panel">
        <h3>AI Copilot</h3>
        <p className="muted">Select a router to ask the copilot why it is performing badly.</p>
      </section>
    )
  }

  return (
    <section className="panel copilot-panel">
      <div className="panel-header">
        <h3>AI Copilot</h3>
        <span className="panel-subtitle">Cause · Evidence · Recommended fix</span>
      </div>

      <form className="copilot-form" onSubmit={handleAsk}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this router…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Analyzing…' : 'Ask Copilot'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {response && (
        <div className="copilot-response">
          <div className="response-block">
            <label>Diagnosis</label>
            <p>{response.cause}</p>
          </div>

          <div className="response-block">
            <label>Evidence</label>
            <ul>
              {response.evidence.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="response-block">
            <label>Recommended Fix</label>
            {response.recommended_fix ? (
              <span className="fix-badge">{formatFix(response.recommended_fix)}</span>
            ) : (
              <p className="muted">No action needed — router is healthy.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
