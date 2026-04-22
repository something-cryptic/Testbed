import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import type { AnalysisResult, Recommendation } from '@analyzer/types'
import InsightCard from '../components/InsightCard.tsx'
import { useUser } from '../context/UserContext.tsx'
import { glassCardLight, glassButton, transparent } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

type PlatformFilter = 'all' | 'youtube' | 'instagram' | 'twitch'

const PLATFORM_CATEGORIES: Record<string, PlatformFilter> = {
  titles:     'youtube',
  length:     'youtube',
  thumbnails: 'youtube',
  timing:     'all',
  tags:       'all',
  content:    'all',
}

const ANALYSIS_LABELS: Record<string, string> = {
  youtube:   'YouTube Analysis',
  instagram: 'Instagram Analysis',
  twitch:    'Twitch Analysis',
  all:       'Holistic Analysis — All Platforms',
}

const FILTER_LABELS: Record<PlatformFilter, string> = {
  all:       'All',
  youtube:   'YouTube',
  instagram: 'Instagram',
  twitch:    'Twitch',
}

export default function Recommendations({ userId }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useUser()
  const { isMobile } = useBreakpoint()

  const initialPlatform = ((location.state as { platform?: string } | null)?.platform ?? 'all') as PlatformFilter

  const [currentPlatform, setCurrentPlatform] = useState<PlatformFilter>(initialPlatform)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllRecs, setShowAllRecs] = useState(false)
  const [showAllWins, setShowAllWins] = useState(false)
  const [showAllGaps, setShowAllGaps] = useState(false)
  const [showAllPatterns, setShowAllPatterns] = useState(false)

  const fetchAnalysis = useCallback(
    async (platform: string) => {
      setLoading(true)
      setAnalysis(null)
      try {
        const { data } = await axios.get<{ analysis: AnalysisResult | null }>(
          `/analyze/${userId}/latest?platform=${platform}`,
        )
        if (!data.analysis) {
          navigate('/dashboard')
        } else {
          setAnalysis(data.analysis)
        }
      } catch {
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    },
    [userId, navigate],
  )

  useEffect(() => {
    fetchAnalysis(currentPlatform)
  }, [currentPlatform, fetchAnalysis])

  function handleTabClick(tab: PlatformFilter) {
    if (tab === currentPlatform) return
    setShowAllRecs(false)
    setShowAllWins(false)
    setShowAllGaps(false)
    setShowAllPatterns(false)
    setCurrentPlatform(tab)
  }

  if (loading) {
    return (
      <div
        style={{
          ...transparent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '128px 0',
          color: 'rgba(200, 185, 235, 0.4)',
          fontSize: '14px',
        }}
      >
        Loading…
      </div>
    )
  }

  if (!analysis) return null

  // Build the list of filter tabs: always include 'all', then only platforms
  // the user actually has connected (so we never show a dead filter).
  const connectedPlatformIds = new Set(
    (profile?.connectedPlatforms ?? []).map((p) => p.platform),
  )
  const filterTabs: PlatformFilter[] = [
    'all',
    ...(['youtube', 'instagram', 'twitch'] as PlatformFilter[]).filter((p) =>
      connectedPlatformIds.has(p),
    ),
  ]

  function matchesFilter(rec: Recommendation): boolean {
    if (currentPlatform === 'all') return true
    const mapped = PLATFORM_CATEGORIES[rec.category] ?? 'all'
    return mapped === 'all' || mapped === currentPlatform
  }

  const filtered = analysis.recommendations.filter(matchesFilter)
  const highImpact = filtered.filter((r) => r.expectedImpact === 'high')
  const rest = filtered.filter((r) => r.expectedImpact !== 'high')
  const hasCrossPlatform = analysis.crossPlatformOpportunities.length > 0
  const analysisLabel = ANALYSIS_LABELS[currentPlatform] ?? 'Analysis'

  return (
    <div style={transparent}>
      {/* Page title row */}
      <div
        style={{
          ...transparent,
          padding: '0 24px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(200, 150, 255, 0.1)',
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            fontSize: '14px',
            color: 'rgba(200, 185, 235, 0.65)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease',
          }}
        >
          ← Dashboard
        </button>
        <span
          style={{
            fontWeight: 600,
            fontSize: '14px',
            background: 'linear-gradient(90deg, #c4b5fd, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {analysisLabel}
        </span>
        <span style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.5)' }}>
          {new Date(analysis.generatedAt).toLocaleDateString()}
        </span>
      </div>

      <main
        style={{
          ...transparent,
          maxWidth: '1152px',
          margin: '0 auto',
          padding: isMobile ? '16px' : '32px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '24px' : '40px',
        }}
      >
        {/* Cross-platform opportunities */}
        {hasCrossPlatform && (
          <section style={transparent}>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'rgba(240, 235, 255, 0.95)',
                marginBottom: '16px',
              }}
            >
              Cross-Platform Opportunities
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', contain: 'layout style' }}>
              {analysis.crossPlatformOpportunities.map((opp, i) => (
                <li
                  key={i}
                  style={{
                    ...glassCardLight,
                    background: 'rgba(196, 181, 253, 0.06)',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgba(235, 228, 255, 0.85)',
                  }}
                >
                  {opp}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Platform filter tabs — only show when 2+ tabs exist */}
        {filterTabs.length > 1 && (
          <div className="tab-strip" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
            {filterTabs.map((f) => (
              <button
                key={f}
                onClick={() => handleTabClick(f)}
                style={
                  currentPlatform === f
                    ? {
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: '1px solid rgba(200, 150, 255, 0.35)',
                        borderRight: '1px solid rgba(200, 150, 255, 0.35)',
                        color: 'rgba(240, 235, 255, 1)',
                        fontWeight: 500,
                        fontSize: '14px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap' as const,
                        minHeight: '44px',
                      }
                    : {
                        background: 'transparent',
                        borderRadius: '8px',
                        border: '1px solid transparent',
                        color: 'rgba(200, 185, 235, 0.55)',
                        fontSize: '14px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap' as const,
                        minHeight: '44px',
                      }
                }
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        )}

        {/* General Tips */}
        {analysis.quickWins.length > 0 && currentPlatform === 'all' && (
          <section style={transparent}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', marginBottom: '16px' }}>
              General Tips
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', contain: 'layout style' }}>
              {(showAllWins ? analysis.quickWins : analysis.quickWins.slice(0, 10)).map((w, i) => (
                <li
                  key={i}
                  style={{ ...glassCardLight, padding: '12px 16px', fontSize: '14px', color: 'rgba(235, 228, 255, 0.85)' }}
                >
                  {w}
                </li>
              ))}
            </ul>
            {analysis.quickWins.length > 10 && !showAllWins && (
              <button
                onClick={() => setShowAllWins(true)}
                className="glow-hover"
                style={{ ...glassButton, padding: '8px 20px', fontSize: '13px', marginTop: '8px', width: isMobile ? '100%' : undefined }}
              >
                Show all {analysis.quickWins.length} items
              </button>
            )}
          </section>
        )}

        {/* High-impact recommendations */}
        {highImpact.length > 0 && (
          <section style={transparent}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', marginBottom: '16px' }}>
              High Impact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ contain: 'layout style' }}>
              {highImpact.map((rec, i) => (
                <InsightCard key={i} rec={rec} />
              ))}
            </div>
          </section>
        )}

        {/* Other recommendations */}
        {rest.length > 0 && (
          <section style={transparent}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', marginBottom: '16px' }}>
              All Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ contain: 'layout style' }}>
              {(showAllRecs ? rest : rest.slice(0, 10)).map((rec, i) => (
                <InsightCard key={i} rec={rec} />
              ))}
            </div>
            {rest.length > 10 && !showAllRecs && (
              <button
                onClick={() => setShowAllRecs(true)}
                className="glow-hover"
                style={{ ...glassButton, padding: '8px 20px', fontSize: '13px', marginTop: '12px', width: isMobile ? '100%' : undefined }}
              >
                Show all {rest.length} recommendations
              </button>
            )}
          </section>
        )}

        {filtered.length === 0 && (
          <p style={{ ...transparent, fontSize: '14px', color: 'rgba(200, 185, 235, 0.5)' }}>
            No recommendations for this filter.
          </p>
        )}

        {/* Content gaps */}
        {analysis.contentGaps.length > 0 && currentPlatform === 'all' && (
          <section style={transparent}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', marginBottom: '16px' }}>
              Content Gaps
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', contain: 'layout style' }}>
              {(showAllGaps ? analysis.contentGaps : analysis.contentGaps.slice(0, 10)).map((gap, i) => (
                <li
                  key={i}
                  style={{ ...glassCardLight, padding: '12px 16px', fontSize: '14px', color: 'rgba(235, 228, 255, 0.85)' }}
                >
                  {gap}
                </li>
              ))}
            </ul>
            {analysis.contentGaps.length > 10 && !showAllGaps && (
              <button
                onClick={() => setShowAllGaps(true)}
                className="glow-hover"
                style={{ ...glassButton, padding: '8px 20px', fontSize: '13px', marginTop: '8px', width: isMobile ? '100%' : undefined }}
              >
                Show all {analysis.contentGaps.length} items
              </button>
            )}
          </section>
        )}

        {/* Best performing patterns */}
        {analysis.bestPerformingPatterns.length > 0 && currentPlatform === 'all' && (
          <section style={transparent}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', marginBottom: '16px' }}>
              What's Working
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', contain: 'layout style' }}>
              {(showAllPatterns ? analysis.bestPerformingPatterns : analysis.bestPerformingPatterns.slice(0, 10)).map((pattern, i) => (
                <li
                  key={i}
                  style={{ ...glassCardLight, padding: '12px 16px', fontSize: '14px', color: 'rgba(235, 228, 255, 0.85)' }}
                >
                  {pattern}
                </li>
              ))}
            </ul>
            {analysis.bestPerformingPatterns.length > 10 && !showAllPatterns && (
              <button
                onClick={() => setShowAllPatterns(true)}
                className="glow-hover"
                style={{ ...glassButton, padding: '8px 20px', fontSize: '13px', marginTop: '8px', width: isMobile ? '100%' : undefined }}
              >
                Show all {analysis.bestPerformingPatterns.length} items
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
