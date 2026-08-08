import React from 'react'

export default function SignalCore({ status }) {
  // Map standard status values to semantic styles
  let statusClass = 'good'
  if (status === 'degraded') statusClass = 'warn'
  if (status === 'unhealthy') statusClass = 'critical'

  return (
    <div className="signal-core-container">
      {/* 3D Rotating Cuboid Core */}
      <div className="signal-core-3d">
        <div className={`signal-face signal-face-front ${statusClass}`}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856a9.75 9.75 0 0113.788 0M1.924 8.674a14.25 14.25 0 0120.152 0M12 19.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className={`signal-face signal-face-back ${statusClass}`}></div>
        <div className={`signal-face signal-face-left ${statusClass}`}></div>
        <div className={`signal-face signal-face-right ${statusClass}`}></div>
        <div className={`signal-face signal-face-top ${statusClass}`}></div>
        <div className={`signal-face signal-face-bottom ${statusClass}`}></div>
      </div>

      {/* Internal Pulsing Glow Orb */}
      <div className={`signal-orb-inner ${statusClass}`}></div>

      {/* Concentric Signal Rings */}
      <div className="signal-pulse-rings">
        <div className={`signal-ring ${statusClass}`}></div>
        <div className={`signal-ring ${statusClass}`}></div>
        <div className={`signal-ring ${statusClass}`}></div>
      </div>
    </div>
  )
}
