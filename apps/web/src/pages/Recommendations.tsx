import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import type { AnalysisResult } from '@analyzer/types'
import InsightCard from '../components/InsightCard.tsx'

interface Props {
  userId: string
}

export default function Recommendations({ userId }: Props) {
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get(`/analyze/${userId}/latest`)
      .then(({ data }) => setAnalysis(data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!analysis) return null

  const highImpact = analysis.recommendations.filter((r) => r.expectedImpact === 'high')
  const rest = analysis.recommendations.filter((r) => r.expectedImpact !== 'high')

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-950/80 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <span className="font-semibold">Recommendations</span>
          <span className="text-xs text-gray-600">
            {new Date(analysis.generatedAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-10">
        {/* Quick wins */}
        {analysis.quickWins.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚡ Quick Wins
            </h2>
            <ul className="flex flex-col gap-2">
              {analysis.quickWins.map((w, i) => (
                <li key={i} className="bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-300">
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* High-impact recommendations */}
        {highImpact.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">High Impact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highImpact.map((rec, i) => (
                <InsightCard key={i} rec={rec} />
              ))}
            </div>
          </section>
        )}

        {/* Other recommendations */}
        {rest.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">All Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((rec, i) => (
                <InsightCard key={i} rec={rec} />
              ))}
            </div>
          </section>
        )}

        {/* Content gaps */}
        {analysis.contentGaps.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Content Gaps</h2>
            <ul className="flex flex-col gap-2">
              {analysis.contentGaps.map((gap, i) => (
                <li key={i} className="bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-300">
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Best performing patterns */}
        {analysis.bestPerformingPatterns.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">What's Working</h2>
            <ul className="flex flex-col gap-2">
              {analysis.bestPerformingPatterns.map((pattern, i) => (
                <li key={i} className="bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-300">
                  {pattern}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
