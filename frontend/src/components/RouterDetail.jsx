import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatIssue, formatStatus, formatTimestamp, scoreClass, statusClass } from '../utils/format'

function formatChartTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function MetricChart({ title, data, lines, yLabel }) {
  return (
    <div className="chart-card">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatChartTime}
            stroke="#94a3b8"
            fontSize={11}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#94a3b8" fontSize={11} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelFormatter={formatChartTime}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SummaryRow({ label, value, fleet, unit, invert = false }) {
  const worse = invert ? value < fleet : value > fleet
  return (
    <div className="summary-row">
      <span>{label}</span>
      <span className={worse ? 'metric-bad' : 'metric-good'}>
        {value}{unit}
        <small> (fleet {fleet}{unit})</small>
      </span>
    </div>
  )
}

export default function RouterDetail({ detail, loading }) {
  if (loading) {
    return (
      <section className="panel detail-panel">
        <div className="loading-state">Loading router details…</div>
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="panel detail-panel">
        <div className="empty-state">
          <p>Select a router from the rankings table to view metrics, complaints, and ask the AI copilot.</p>
        </div>
      </section>
    )
  }

  const { metrics_summary: s, metrics_timeseries: ts } = detail

  return (
    <section className="panel detail-panel">
      <div className="detail-header">
        <div>
          <h2>{detail.router_id}</h2>
          <p>{detail.building} · Room {detail.room} · {detail.model} · FW {detail.firmware}</p>
        </div>
        <div className="detail-badges">
          <span className={`score-badge large ${scoreClass(detail.health_score)}`}>
            {detail.health_score.toFixed(1)}
          </span>
          <span className={`status-badge ${statusClass(detail.status)}`}>
            {formatStatus(detail.status)}
          </span>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryRow label="Avg Speed" value={s.avg_speed} fleet={s.fleet_avg_speed} unit=" Mbps" invert />
        <SummaryRow label="Avg Latency" value={s.avg_latency} fleet={s.fleet_avg_latency} unit=" ms" />
        <SummaryRow label="Packet Loss" value={s.avg_packet_loss} fleet={s.fleet_avg_packet_loss} unit="%" />
        <SummaryRow label="Disconnects" value={s.total_disconnects} fleet={s.fleet_avg_disconnects} unit="" />
        <SummaryRow label="Signal" value={s.avg_signal} fleet={-65} unit=" dBm" invert />
        <div className="summary-row">
          <span>Top Issue</span>
          <span>{formatIssue(detail.top_issue)}</span>
        </div>
      </div>

      <div className="charts-grid">
        <MetricChart
          title="Speed & Latency (24h)"
          data={ts}
          yLabel=""
          lines={[
            { key: 'speed', name: 'Speed (Mbps)', color: '#38bdf8' },
            { key: 'latency', name: 'Latency (ms)', color: '#fbbf24' },
          ]}
        />
        <MetricChart
          title="Packet Loss & Disconnects (24h)"
          data={ts}
          yLabel=""
          lines={[
            { key: 'packet_loss', name: 'Packet Loss (%)', color: '#f87171' },
            { key: 'disconnects', name: 'Disconnects', color: '#a78bfa' },
          ]}
        />
      </div>

      <div className="complaints-section">
        <h3>User Complaints</h3>
        {detail.complaints.length === 0 ? (
          <p className="muted">No complaints recorded for this router.</p>
        ) : (
          <ul className="complaints-list">
            {detail.complaints.map((c, i) => (
              <li key={i}>
                <time>{formatTimestamp(c.timestamp)}</time>
                <p>{c.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
