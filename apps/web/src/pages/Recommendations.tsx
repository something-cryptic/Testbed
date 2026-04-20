import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import type { AnalysisResult, Recommendation } from '@analyzer/types'
import InsightCard from '../components/InsightCard.tsx'

interface Props {
  userId: string
}

type PlatformFilter = 'all' | 'youtube' | 'instagram'

const PLATFORM_CATEGORIES: Record<string, PlatformFilter> = {
  titles: 'youtube',
  length: 'youtube',
  thumbnails: 'youtube',
  timing: 'all',
  tags: 'all',
  content: 'all',
}

const ANALYSIS_LABELS: Record<string, string> = {
  youtube: 'YouTube Analysis',
  instagram: 'Instagram Analysis',
  all: 'Holistic Analysis — All Platforms',
}

export default function Recommendations({ userId }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const platformContext = (location.state as { platform?: string } | null)?.platform ?? 'all'

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  useEffect(() => {
    axios
      .get(`/analyze/${userId}/latest?platform=${platformContext}`)
      .then(({ data }) => {
        const result = (data as { analysis: AnalysisResult | null }).analysis
        if (!result) navigate('/dashboard')
        else setAnalysis(result)
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [userId, platformContext])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-violet-400/50">
        Loading…
      </div>
    )
  }

  if (!analysis) return null

  function matchesFilter(rec: Recommendation): boolean {
    if (platformFilter === 'all') return true
    const mapped = PLATFORM_CATEGORIES[rec.category] ?? 'all'
    return mapped === 'all' || mapped === platformFilter
  }

  const filtered = analysis.recommendations.filter(matchesFilter)
  const highImpact = filtered.filter((r) => r.expectedImpact === 'high')
  const rest = filtered.filter((r) => r.expectedImpact !== 'high')
  const hasCrossPlatform = analysis.crossPlatformOpportunities.length > 0
  const analysisLabel = ANALYSIS_LABELS[platformContext] ?? 'Analysis'

  return (
    <div>
      {/* Page title row */}
      <div className="border-b border-violet-900/40 px-6 h-12 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-violet-300 hover:text-violet-100 transition-colors flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <span className="font-semibold text-sm bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          {analysisLabel}
        </span>
        <span className="text-xs text-violet-300/70">
          {new Date(analysis.generatedAt).toLocaleDateString()}
        </span>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-10">

        {/* Cross-platform opportunities */}
        {hasCrossPlatform && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-violet-100">
              <span className="text-fuchsia-400">⟳</span> Cross-Platform Opportunities
            </h2>
            <ul className="flex flex-col gap-2">
              {analysis.crossPlatformOpportunities.map((opp, i) => (
                <li
                  key={i}
                  className="bg-fuchsia-900/15 border border-fuchsia-700/25 rounded-xl px-4 py-3 text-sm text-fuchsia-100"
                >
                  {opp}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Platform filter tabs — only show for holistic analyses */}
        {platformContext === 'all' && (
          <div className="flex items-center gap-2">
            {(['all', 'youtube', 'instagram'] as PlatformFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPlatformFilter(f)}
                className={`text-sm px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  platformFilter === f
                    ? 'bg-violet-800/60 text-violet-100 font-medium border border-violet-600/50'
                    : 'text-violet-300 hover:text-violet-100 border border-transparent'
                }`}
              >
                {f === 'all' ? 'All' : f === 'youtube' ? 'YouTube' : 'Instagram'}
              </button>
            ))}
          </div>
        )}

        {/* Quick wins */}
        {analysis.quickWins.length > 0 && platformFilter === 'all' && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-100">⚡ Quick Wins</h2>
            <ul className="flex flex-col gap-2">
              {analysis.quickWins.map((w, i) => (
                <li key={i} className="bg-[#1a1625]/80 border border-violet-800/25 rounded-xl px-4 py-3 text-sm text-violet-100">
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* High-impact recommendations */}
        {highImpact.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-100">High Impact</h2>
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
            <h2 className="text-lg font-semibold mb-4 text-violet-100">All Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((rec, i) => (
                <InsightCard key={i} rec={rec} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <p className="text-violet-300 text-sm">No recommendations for this filter.</p>
        )}

        {/* Content gaps */}
        {analysis.contentGaps.length > 0 && platformFilter === 'all' && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-100">Content Gaps</h2>
            <ul className="flex flex-col gap-2">
              {analysis.contentGaps.map((gap, i) => (
                <li key={i} className="bg-[#1a1625]/80 border border-violet-800/25 rounded-xl px-4 py-3 text-sm text-violet-100">
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Best performing patterns */}
        {analysis.bestPerformingPatterns.length > 0 && platformFilter === 'all' && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-100">What's Working</h2>
            <ul className="flex flex-col gap-2">
              {analysis.bestPerformingPatterns.map((pattern, i) => (
                <li key={i} className="bg-[#1a1625]/80 border border-violet-800/25 rounded-xl px-4 py-3 text-sm text-violet-100">
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

