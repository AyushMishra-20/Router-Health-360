const generateTimeseries = (baseSpeed, baseLatency, baseLoss, baseDisconnects, hours = 24) => {
  const points = []
  const start = new Date('2025-01-01T00:00:00')
  for (let i = 0; i < hours; i++) {
    const ts = new Date(start.getTime() + i * 3600000)
    const isPeak = ts.getHours() >= 18 && ts.getHours() <= 22
    points.push({
      timestamp: ts.toISOString().slice(0, 19),
      speed: +(baseSpeed * (isPeak ? 0.6 : 1) + Math.random() * 3).toFixed(1),
      latency: Math.round(baseLatency * (isPeak ? 1.4 : 1) + Math.random() * 10),
      packet_loss: +(baseLoss * (isPeak ? 1.5 : 0.8) + Math.random() * 0.5).toFixed(1),
      disconnects: Math.max(0, Math.round(baseDisconnects * (isPeak ? 2 : 0.5) + Math.random())),
      signal: Math.round(-65 - Math.random() * 12),
    })
  }
  return points
}

export const mockRankings = [
  { router_id: 'R-1042', building: 'Hostel-B', room: '204', model: 'TP-Link AX3000', health_score: 34.2, status: 'unhealthy', top_issue: 'high_packet_loss' },
  { router_id: 'R-0891', building: 'Hostel-A', room: '112', model: 'Netgear RAX50', health_score: 38.7, status: 'unhealthy', top_issue: 'frequent_disconnects' },
  { router_id: 'R-2201', building: 'Library', room: '3F-12', model: 'TP-Link AX3000', health_score: 41.5, status: 'unhealthy', top_issue: 'low_speed' },
  { router_id: 'R-1567', building: 'Hostel-C', room: '305', model: 'D-Link DIR-X5460', health_score: 45.8, status: 'degraded', top_issue: 'high_latency' },
  { router_id: 'R-0334', building: 'Admin Block', room: '201', model: 'Netgear RAX50', health_score: 48.1, status: 'degraded', top_issue: 'weak_signal' },
  { router_id: 'R-1902', building: 'Hostel-B', room: '118', model: 'TP-Link AX3000', health_score: 51.3, status: 'degraded', top_issue: 'high_packet_loss' },
  { router_id: 'R-0778', building: 'Lab-2', room: '104', model: 'D-Link DIR-X5460', health_score: 54.6, status: 'degraded', top_issue: 'frequent_disconnects' },
  { router_id: 'R-2455', building: 'Hostel-A', room: '401', model: 'TP-Link AX3000', health_score: 57.9, status: 'degraded', top_issue: 'low_speed' },
  { router_id: 'R-1123', building: 'Canteen', room: 'Main', model: 'Netgear RAX50', health_score: 61.2, status: 'degraded', top_issue: 'high_latency' },
  { router_id: 'R-0089', building: 'Hostel-C', room: '210', model: 'D-Link DIR-X5460', health_score: 63.5, status: 'degraded', top_issue: 'weak_signal' },
]

const routerDetails = {
  'R-1042': {
    router_id: 'R-1042',
    building: 'Hostel-B',
    room: '204',
    model: 'TP-Link AX3000',
    firmware: '1.2.3',
    user_type: 'student',
    health_score: 34.2,
    status: 'unhealthy',
    metrics_timeseries: generateTimeseries(15, 92, 8.4, 1),
    metrics_summary: {
      avg_speed: 15.2,
      avg_latency: 92,
      avg_packet_loss: 8.4,
      total_disconnects: 14,
      avg_signal: -70,
      fleet_avg_speed: 45.0,
      fleet_avg_latency: 30,
      fleet_avg_packet_loss: 1.2,
      fleet_avg_disconnects: 2,
    },
    complaints: [
      { timestamp: '2025-01-03T20:15:00', text: 'WiFi keeps dropping every night around 8 PM' },
      { timestamp: '2025-01-02T19:40:00', text: 'Cannot join video calls — constant disconnects' },
      { timestamp: '2025-01-01T21:05:00', text: 'Speed is unusable during evening hours' },
    ],
  },
}

export function getMockRouterDetail(routerId) {
  if (routerDetails[routerId]) return routerDetails[routerId]

  const ranking = mockRankings.find((r) => r.router_id === routerId)
  if (!ranking) return null

  const scoreFactor = ranking.health_score / 100
  return {
    ...ranking,
    firmware: '1.2.3',
    user_type: 'student',
    metrics_timeseries: generateTimeseries(20 + scoreFactor * 30, 40 + (1 - scoreFactor) * 60, 2 + (1 - scoreFactor) * 6, 0.5),
    metrics_summary: {
      avg_speed: +(20 + scoreFactor * 25).toFixed(1),
      avg_latency: Math.round(40 + (1 - scoreFactor) * 50),
      avg_packet_loss: +((1 - scoreFactor) * 5 + 1).toFixed(1),
      total_disconnects: Math.round((1 - scoreFactor) * 12 + 2),
      avg_signal: Math.round(-68 - (1 - scoreFactor) * 10),
      fleet_avg_speed: 45.0,
      fleet_avg_latency: 30,
      fleet_avg_packet_loss: 1.2,
      fleet_avg_disconnects: 2,
    },
    complaints: ranking.health_score < 50
      ? [{ timestamp: '2025-01-02T18:30:00', text: `Slow connection reported in ${ranking.building} room ${ranking.room}` }]
      : [],
  }
}

export function getMockCopilotResponse(routerId, question) {
  const detail = getMockRouterDetail(routerId)
  if (!detail) return null

  if (detail.status === 'healthy') {
    return {
      router_id: routerId,
      status: 'healthy',
      cause: 'This router is performing within normal fleet parameters.',
      evidence: [
        `Avg speed ${detail.metrics_summary.avg_speed} Mbps vs fleet avg ${detail.metrics_summary.fleet_avg_speed} Mbps`,
        `Avg packet loss ${detail.metrics_summary.avg_packet_loss}% vs fleet avg ${detail.metrics_summary.fleet_avg_packet_loss}%`,
      ],
      recommended_fix: null,
      fix_options: ['firmware_update', 'relocate', 'replace_hardware', 'user_education'],
    }
  }

  if (detail.metrics_summary.avg_packet_loss > detail.metrics_summary.fleet_avg_packet_loss * 2) {
    return {
      router_id: routerId,
      status: detail.status,
      cause: 'Sustained high packet loss during evening peak hours',
      evidence: [
        `Avg packet loss ${detail.metrics_summary.avg_packet_loss}% vs fleet avg ${detail.metrics_summary.fleet_avg_packet_loss}%`,
        `${detail.metrics_summary.total_disconnects} disconnects in the past week vs fleet avg ${detail.metrics_summary.fleet_avg_disconnects}`,
        `${detail.complaints.length} complaints in the past 5 days mention dropped connections`,
      ],
      recommended_fix: 'firmware_update',
      fix_options: ['firmware_update', 'relocate', 'replace_hardware', 'user_education'],
    }
  }

  return {
    router_id: routerId,
    status: detail.status,
    cause: `${detail.top_issue.replace(/_/g, ' ')} detected across recent metrics`,
    evidence: [
      `Avg speed ${detail.metrics_summary.avg_speed} Mbps vs fleet avg ${detail.metrics_summary.fleet_avg_speed} Mbps`,
      `Avg latency ${detail.metrics_summary.avg_latency} ms vs fleet avg ${detail.metrics_summary.fleet_avg_latency} ms`,
      detail.complaints.length
        ? `${detail.complaints.length} user complaint(s) on record`
        : 'No recent complaints on record',
    ],
    recommended_fix: detail.complaints.length && detail.health_score > 60 ? 'user_education' : 'relocate',
    fix_options: ['firmware_update', 'relocate', 'replace_hardware', 'user_education'],
  }
}
