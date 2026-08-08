export function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function formatIssue(issue) {
  if (!issue) return '—'
  return issue
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatFix(fix) {
  const labels = {
    firmware_update: 'Firmware Update',
    relocate: 'Relocate Router',
    replace_hardware: 'Replace Hardware',
    user_education: 'User Education',
  }
  return labels[fix] ?? fix ?? 'None'
}

export function formatTimestamp(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusClass(status) {
  return `status-${status ?? 'unknown'}`
}

export function scoreClass(score) {
  if (score < 45) return 'score-critical'
  if (score < 65) return 'score-warning'
  return 'score-ok'
}
