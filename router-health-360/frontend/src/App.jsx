import { useEffect, useState } from 'react'
import { fetchRankings, fetchRouterDetail } from './api/client'
import CopilotPanel from './components/CopilotPanel'
import RankingsTable from './components/RankingsTable'
import RouterDetail from './components/RouterDetail'

export default function App() {
  const [rankings, setRankings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchRankings(10)
      .then((data) => {
        setRankings(data)
        if (data.length > 0) setSelectedId(data[0].router_id)
      })
      .finally(() => setRankingsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }

    setDetailLoading(true)
    fetchRouterDetail(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">DigiPlus IT Agentic AI Hackathon</p>
          <h1>Campus Router Health 360</h1>
          <p className="subtitle">
            Monitor 10,000 campus routers — rank worst performers, inspect metrics, and diagnose with AI.
          </p>
        </div>
        <div className="header-stat">
          <span className="stat-value">{rankings.length || 10}</span>
          <span className="stat-label">Worst routers shown</span>
        </div>
      </header>

      <main className="dashboard">
        <RankingsTable
          rankings={rankings}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={rankingsLoading}
        />

        <div className="right-column">
          <RouterDetail detail={detail} loading={detailLoading} />
          <CopilotPanel routerId={selectedId} key={selectedId} />
        </div>
      </main>
    </div>
  )
}
