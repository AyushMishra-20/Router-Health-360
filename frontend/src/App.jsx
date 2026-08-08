import { useEffect, useState } from 'react'
import { fetchRankings, fetchRouterDetail } from './api/client'
import CopilotPanel from './components/CopilotPanel'
import RankingsTable from './components/RankingsTable'
import RouterDetail from './components/RouterDetail'

export default function App() {
  const [rankings, setRankings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  
  // Loading & interactive states
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanningStep, setScanningStep] = useState('')
  const [toasts, setToasts] = useState([])
  const [lastScanTime, setLastScanTime] = useState(new Date().toLocaleTimeString())
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    return prefersLight ? 'light' : 'dark'
  })

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Fetch rankings on mount
  useEffect(() => {
    fetchRankings(10)
      .then((data) => {
        setRankings(data)
        if (data.length > 0) setSelectedId(data[0].router_id)
      })
      .finally(() => setRankingsLoading(false))
  }, [])

  // Fetch detail when selected router changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }

    setDetailLoading(true)
    fetchRouterDetail(selectedId)
      .then((data) => {
        setDetail(data)
        // Show status warning toast if router is unhealthy or degraded
        if (data.status !== 'healthy') {
          addToast(
            `Device ${data.router_id} is ${data.status.toUpperCase()}`,
            `Diagnostics: ${data.metrics_summary.avg_packet_loss}% packet loss, ${data.metrics_summary.total_disconnects} disconnects.`,
            data.status
          )
        }
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  // Live fluctuating metric values simulation
  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const interval = setInterval(() => {
      if (!detail || isScanning) return

      // Fluctuate metrics slightly (e.g. speed +/- 0.4 Mbps, latency +/- 1 ms)
      setDetail(prev => {
        if (!prev) return null
        
        const speedDelta = (Math.random() - 0.5) * 0.8
        const latencyDelta = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0
        const signalDelta = Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0

        const newSpeed = Math.max(1, prev.metrics_summary.avg_speed + speedDelta)
        const newLatency = Math.max(1, prev.metrics_summary.avg_latency + latencyDelta)
        const newSignal = Math.min(-30, Math.max(-95, prev.metrics_summary.avg_signal + signalDelta))

        return {
          ...prev,
          metrics_summary: {
            ...prev.metrics_summary,
            avg_speed: parseFloat(newSpeed.toFixed(1)),
            avg_latency: parseFloat(newLatency.toFixed(1)),
            avg_signal: parseInt(newSignal)
          }
        }
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [detail, isScanning])

  // Toast adder helper
  const addToast = (title, desc, status = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, title, desc, status }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  // Scanning sequence simulation
  const handleScan = () => {
    if (isScanning) return
    setIsScanning(true)
    
    const steps = [
      'INTERROGATING RF SPECTRAL INTERFERENCE...',
      'MEASURING INTER-NODE LATENCY & JITTER...',
      'MAPPING CONNECTED STATION TOPOLOGY...',
      'SYNCHRONIZING FLEET METRICS...'
    ]
    
    let currentStep = 0
    setScanningStep(steps[currentStep])

    const interval = setInterval(() => {
      currentStep++
      if (currentStep < steps.length) {
        setScanningStep(steps[currentStep])
      } else {
        clearInterval(interval)
        setIsScanning(false)
        setLastScanTime(new Date().toLocaleTimeString())
        addToast('Scan Synchronization Complete', 'All 10,000 campus router nodes synced successfully.', 'good')
      }
    }, 800)
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Determine aggregate fleet status pill
  const getFleetStatus = () => {
    if (rankingsLoading) return { label: 'SYNCHRONIZING...', type: 'warn' }
    const unhealthyCount = rankings.filter(r => r.status === 'unhealthy').length
    if (unhealthyCount > 5) return { label: 'CRITICAL FLEET INTRUSION', type: 'critical' }
    if (unhealthyCount > 0) return { label: 'DEGRADED FLEET CAPACITY', type: 'warn' }
    return { label: 'FLEET SYSTEM NOMINAL', type: 'good' }
  }

  const fleetStatus = getFleetStatus()

  return (
    <div className="app">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-message ${toast.status}`}>
            <span className="toast-title">{toast.title}</span>
            <span className="toast-desc">{toast.desc}</span>
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <header className="app-header">
        <div className="header-title-area">
          <div className="wordmark">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.3 12.3a1.5 1.5 0 000 2.2m5.4-2.2a1.5 1.5 0 010 2.2M4.9 7.9a6.75 6.75 0 000 9.2m14.2-9.2a6.75 6.75 0 010 9.2M2.7 5.7a10.5 10.5 0 000 13.6m18.6-13.6a10.5 10.5 0 010 13.6M12 12.75v.008h-.008v-.008H12z" />
            </svg>
            <span>ROUTER HEALTH 360</span>
          </div>
          <span className="network-subtitle">DIGIPLUS CAMPUS FLEET DIAGNOSTICS</span>
        </div>
        
        <div className="header-actions">
          <span className={`status-pill ${fleetStatus.type}`}>
            <span className="indicator-dot"></span>
            {fleetStatus.label}
          </span>
          
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle visual theme">
            {theme === 'dark' ? (
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="dashboard-layout">
        
        {/* Left Side: Rankings Table */}
        <div className="left-panel-stack">
          <RankingsTable
            rankings={rankings}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={rankingsLoading}
          />
        </div>

        {/* Right Side: Router Details and Copilot Interrogations */}
        <div className="right-panel-stack" style={{ position: 'relative' }}>
          {isScanning && (
            <div className="scanning-overlay">
              <div className="scanning-spinner"></div>
              <span className="scanning-text">{scanningStep}</span>
            </div>
          )}
          
          <RouterDetail detail={detail} loading={detailLoading} />
          <CopilotPanel routerId={selectedId} key={selectedId} />
        </div>
      </main>

      {/* Footer Section */}
      <footer className="app-footer">
        <div>
          <span>Last sync: <span className="mono">{lastScanTime}</span></span>
        </div>
        <div>
          <button className="footer-btn" onClick={handleScan} disabled={isScanning}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {isScanning ? 'SCANNING...' : 'RUN DIAGNOSTICS SCAN'}
          </button>
        </div>
      </footer>
    </div>
  )
}
