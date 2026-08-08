import { formatIssue, formatStatus, scoreClass, statusClass } from '../utils/format'

export default function RankingsTable({ rankings, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <section className="panel rankings-panel">
        <h2>Worst 10 Routers</h2>
        <div className="loading-state">Loading rankings…</div>
      </section>
    )
  }

  return (
    <section className="panel rankings-panel">
      <div className="panel-header">
        <h2>Worst 10 Routers</h2>
        <span className="panel-subtitle">Ranked by health score</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Router</th>
              <th>Location</th>
              <th>Model</th>
              <th>Score</th>
              <th>Status</th>
              <th>Top Issue</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((router, index) => (
              <tr
                key={router.router_id}
                className={selectedId === router.router_id ? 'selected' : ''}
                onClick={() => onSelect(router.router_id)}
              >
                <td>{index + 1}</td>
                <td className="mono">{router.router_id}</td>
                <td>{router.building} · {router.room}</td>
                <td>{router.model}</td>
                <td>
                  <span className={`score-badge ${scoreClass(router.health_score)}`}>
                    {router.health_score.toFixed(1)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${statusClass(router.status)}`}>
                    {formatStatus(router.status)}
                  </span>
                </td>
                <td>{formatIssue(router.top_issue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
