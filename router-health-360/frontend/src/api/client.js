import { getMockCopilotResponse, getMockRouterDetail, mockRankings } from '../data/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

async function fetchJson(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchRankings(limit = 10) {
  if (USE_MOCK) {
    await delay(300)
    return mockRankings.slice(0, limit)
  }
  try {
    return await fetchJson(`/api/rankings?limit=${limit}`)
  } catch {
    await delay(300)
    return mockRankings.slice(0, limit)
  }
}

export async function fetchRouterDetail(routerId) {
  if (USE_MOCK) {
    await delay(400)
    const detail = getMockRouterDetail(routerId)
    if (!detail) throw new Error('Router not found')
    return detail
  }
  try {
    return await fetchJson(`/api/router/${routerId}`)
  } catch {
    await delay(400)
    const detail = getMockRouterDetail(routerId)
    if (!detail) throw new Error('Router not found')
    return detail
  }
}

export async function askCopilot(routerId, question) {
  if (USE_MOCK) {
    await delay(800)
    return getMockCopilotResponse(routerId, question)
  }
  try {
    return await fetchJson('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ router_id: routerId, question }),
    })
  } catch {
    await delay(800)
    return getMockCopilotResponse(routerId, question)
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
