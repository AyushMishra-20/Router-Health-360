import React from 'react'
import MetricCard from './MetricCard'
import SignalCore from './SignalCore'
import { formatIssue, formatStatus, formatTimestamp } from '../utils/format'

export default function RouterDetail({ detail, loading }) {
  if (loading) {
    return (
      <section className="panel-card detail-inspector-panel">
        <div className="loading-state">
          <div className="scanning-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <span className="mono">ESTABLISHING INTERROGATION LINK...</span>
        </div>
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="panel-card detail-inspector-panel">
        <div className="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)' }}>NO ACTIVE ROUTER LINK</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Select a network router from the worst-10 rankings table to start diagnostics, review timeseries records, and consult the AI Copilot.</p>
        </div>
      </section>
    )
  }

  const { metrics_summary: s, metrics_timeseries: ts } = detail

  // Helper to determine status style
  const getStatusClass = (status) => {
    if (status === 'healthy') return 'good'
    if (status === 'degraded') return 'warn'
    return 'critical'
  }

  const statusClass = getStatusClass(detail.status)

  // Radial Gauge Calculations
  const radius = 68
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (detail.health_score / 100) * circumference

  // Extract timeseries arrays for sparklines
  const speedData = ts ? ts.map(item => item.speed) : []
  const latencyData = ts ? ts.map(item => item.latency) : []
  const lossData = ts ? ts.map(item => item.packet_loss) : []
  const discData = ts ? ts.map(item => item.disconnects) : []
  const signalData = ts ? ts.map(item => item.signal) : []

  return (
    <section className="panel-card detail-inspector-panel">
      <div className="detail-inspector-grid">
        
        {/* Header Metadata */}
        <div className="detail-inspector-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
              Device {detail.router_id}
            </h2>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span>LOC:</span>
                <strong>{detail.building} · rm {detail.room}</strong>
              </div>
              <div className="detail-meta-item">
                <span>HW:</span>
                <strong>{detail.model}</strong>
              </div>
              <div className="detail-meta-item">
                <span>FW:</span>
                <strong>{detail.firmware}</strong>
              </div>
              <div className="detail-meta-item">
                <span>ROLE:</span>
                <strong>{detail.user_type}</strong>
              </div>
            </div>
          </div>
          <span className={`status-pill ${statusClass}`}>
            <span className="indicator-dot"></span>
            {formatStatus(detail.status)}
          </span>
        </div>

        {/* Hero Diagnostic Zone */}
        <div className="hero-diagnostic-zone">
          <div className="health-score-radial-wrapper">
            <div className="radial-gauge">
              <svg className="radial-gauge-svg">
                <circle
                  className="radial-gauge-bg"
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth={strokeWidth}
                />
                <circle
                  className={`radial-gauge-fill ${statusClass}`}
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="radial-gauge-center">
                <span className="radial-gauge-value">{detail.health_score.toFixed(1)}</span>
                <span className="radial-gauge-label">Score</span>
              </div>
            </div>
            <p className="radial-status-text" style={{ color: `var(--status-${statusClass})` }}>
              Network health is {formatStatus(detail.status)}
            </p>
          </div>

          {/* Holographic 3D core visualizer */}
          <SignalCore status={detail.status} />
        </div>

        {/* Dynamic Metric Grid */}
        <div className="metrics-grid">
          <MetricCard
            label="Signal Strength"
            value={`${s.avg_signal} dBm`}
            explanation={s.avg_signal >= -55 ? "Excellent coverage - low noise" : s.avg_signal >= -68 ? "Good signal - minor attenuation" : "Weak signal - high RF path loss"}
            tooltip="Average received signal power. Ideal: > -60 dBm."
            status={s.avg_signal >= -60 ? 'good' : s.avg_signal >= -72 ? 'warn' : 'critical'}
            sparklineData={signalData}
          />
          <MetricCard
            label="Response Latency"
            value={`${s.avg_latency} ms`}
            explanation={s.avg_latency < 35 ? "Ultra-fast delay - optimal for voice/video" : s.avg_latency < 80 ? "Moderate delay - standard use" : "High delay - packet queue bottleneck"}
            tooltip="Average network round-trip delay. Ideal: < 40 ms."
            status={s.avg_latency < 40 ? 'good' : s.avg_latency < 100 ? 'warn' : 'critical'}
            sparklineData={latencyData}
          />
          <MetricCard
            label="Link Packet Loss"
            value={`${s.avg_packet_loss}%`}
            explanation={s.avg_packet_loss < 1.0 ? "Perfect transit - zero dropped packets" : s.avg_packet_loss < 3.0 ? "Moderate drops - potential channel noise" : "Critical drop rate - severely degraded link"}
            tooltip="Percentage of data packets lost in transit. Ideal: < 1.0%."
            status={s.avg_packet_loss < 1.0 ? 'good' : s.avg_packet_loss < 3.0 ? 'warn' : 'critical'}
            sparklineData={lossData}
          />
          <MetricCard
            label="Hardware Disconnects"
            value={`${s.total_disconnects}`}
            explanation={s.total_disconnects <= 10 ? "Stable uptime - continuous power" : s.total_disconnects <= 25 ? "Intermittent restarts - check connection" : "Frequent dropouts - hardware failure detected"}
            tooltip="Total times the router disconnected. Ideal: <= 10."
            status={s.total_disconnects <= 10 ? 'good' : s.total_disconnects <= 25 ? 'warn' : 'critical'}
            sparklineData={discData}
          />
          <MetricCard
            label="Bandwidth Speed"
            value={`${s.avg_speed} Mbps`}
            explanation={s.avg_speed >= 40.0 ? "Excellent throughput - high capacity" : s.avg_speed >= 20.0 ? "Satisfactory speed for web browsing" : "Throttled speed - check local link"}
            tooltip="Average download speed. Fleet target: 45.0 Mbps."
            status={s.avg_speed >= 40.0 ? 'good' : s.avg_speed >= 20.0 ? 'warn' : 'critical'}
            sparklineData={speedData}
          />
          <MetricCard
            label="Diagnosed Botttleneck"
            value={formatIssue(detail.top_issue)}
            explanation={detail.status === 'healthy' ? "All performance parameters nominal" : "Primary metrics constraint identified"}
            tooltip="Determined performance bottleneck of this router."
            status={detail.status === 'healthy' ? 'good' : detail.status === 'degraded' ? 'warn' : 'critical'}
            sparklineData={[]}
          />
        </div>

        {/* Complaints Section */}
        <div className="complaints-section">
          <h3 className="complaints-title">User Complaints Logs</h3>
          {detail.complaints.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No complaints recorded for this device.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {detail.complaints.map((c, i) => (
                <div key={i} className="complaint-item">
                  <span className="complaint-date">{formatTimestamp(c.timestamp)}</span>
                  <p className="complaint-txt">"{c.text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
