import React from 'react'
import { formatIssue, formatStatus } from '../utils/format'

export default function RankingsTable({ rankings, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <section className="panel-card rankings-table-panel">
        <div className="panel-card-header">
          <h2>Worst 10 Routers</h2>
        </div>
        <div className="loading-state">
          <div className="scanning-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <span className="mono">ACQUIRING FLEET DIAGNOSTICS...</span>
        </div>
      </section>
    )
  }

  // Helper to determine status style
  const getStatusClass = (status) => {
    if (status === 'healthy') return 'good'
    if (status === 'degraded') return 'warn'
    return 'critical'
  }

  return (
    <section className="panel-card rankings-table-panel">
      <div className="panel-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
        <h2>Worst 10 Routers</h2>
        <span className="panel-card-subtitle">Ranked by calculated health score (worst-first)</span>
      </div>
      <div className="table-scroller">
        <table className="diagnostic-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Router ID</th>
              <th>Location</th>
              <th>Model</th>
              <th>Score</th>
              <th>Status</th>
              <th>Top Issue</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((router, index) => {
              const sClass = getStatusClass(router.status)
              return (
                <tr
                  key={router.router_id}
                  className={selectedId === router.router_id ? 'selected' : ''}
                  onClick={() => onSelect(router.router_id)}
                >
                  <td className="mono text-secondary" style={{ width: '40px' }}>{(index + 1).toString().padStart(2, '0')}</td>
                  <td className="mono" style={{ color: 'var(--accent)' }}>{router.router_id}</td>
                  <td>{router.building} · rm {router.room}</td>
                  <td className="text-secondary">{router.model}</td>
                  <td>
                    <span className={`score-badge ${sClass}`}>
                      {router.health_score.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${sClass}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                      <span className="indicator-dot"></span>
                      {formatStatus(router.status)}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: '0.75rem', color: sClass === 'good' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {formatIssue(router.top_issue)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
