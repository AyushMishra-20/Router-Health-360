import React, { useRef, useState, useEffect } from 'react'

export default function MetricCard({ label, value, explanation, tooltip, status, sparklineData = [] }) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  // Status mappings
  let statusClass = 'good'
  if (status === 'warn' || status === 'degraded') statusClass = 'warn'
  if (status === 'critical' || status === 'unhealthy') statusClass = 'critical'

  // SVG Sparkline calculation
  const generateSparklinePoints = () => {
    if (!sparklineData || sparklineData.length < 2) return ''
    const minVal = Math.min(...sparklineData)
    const maxVal = Math.max(...sparklineData)
    const range = maxVal - minVal || 1
    const width = 80
    const height = 20
    const padding = 2

    return sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width
        const y = height - ((val - minVal) / range) * (height - 2 * padding) - padding
        return `${x},${y}`
      })
      .join(' ')
  }

  // Pointer hover tilt effect
  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left // x position within element
    const y = e.clientY - rect.top  // y position within element
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Max rotation 5 degrees
    const rotateY = ((x - centerX) / centerX) * 5
    const rotateX = -((y - centerY) / centerY) * 5
    
    setTilt({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setTilt({ x: 0, y: 0 })
  }

  // Check if user prefers reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const listener = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  const cardStyle = (isHovered && !prefersReducedMotion)
    ? {
        transform: `perspective(400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-2px)`,
        transition: 'none'
      }
    : {}

  return (
    <div
      ref={cardRef}
      className="metric-card"
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="metric-card-header">
        <div className="tooltip-container">
          <span className="metric-card-label tooltip-trigger">{label} ℹ️</span>
          <span className="tooltip-box">{tooltip}</span>
        </div>
        <span className={`status-pill ${statusClass}`}>
          <span className="indicator-dot"></span>
          {statusClass}
        </span>
      </div>

      <div className="metric-card-val-row">
        <span className="metric-card-value">{value}</span>
        {sparklineData.length > 0 && (
          <svg className="sparkline-svg">
            <polyline
              className={`sparkline-path ${statusClass}`}
              points={generateSparklinePoints()}
            />
          </svg>
        )}
      </div>

      <div className="metric-card-explanation">{explanation}</div>
    </div>
  )
}
