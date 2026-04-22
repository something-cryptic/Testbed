import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import PlatformCard from '../components/PlatformCard.tsx'
import { useUser } from '../context/UserContext.tsx'
import { glassCard, glassHolisticCard, glassButton, transparent } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

export default function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useUser()
  const { isMobile } = useBreakpoint()
  const [analyzingPlatform, setAnalyzingPlatform] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runAnalysis(platform: string) {
    setAnalyzingPlatform(platform)
    setError(null)
    try {
      await axios.post(`/analyze/${userId}?platform=${platform}`)
      navigate('/recommendations', { state: { platform } })
    } catch {
      setError(`Analysis failed for ${platform}. Please try again.`)
    } finally {
      setAnalyzingPlatform(null)
      refreshProfile()
    }
  }

  const connectedPlatforms = profile?.connectedPlatforms ?? []
  const isMultiPlatform = connectedPlatforms.length > 1
  const lastHolisticStr = profile?.lastHolisticAnalysis
    ? new Date(profile.lastHolisticAnalysis).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <div
      style={{
        ...transparent,
        maxWidth: '768px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '12px' : '24px',
        overflow: 'visible',
      }}
    >
      {error && (
        <div
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            color: 'rgba(248, 113, 113, 0.9)',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {error}
        </div>
      )}

      {/* Skeleton while loading */}
      {!profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ ...glassCard, height: '96px', opacity: 0.4 }}
            />
          ))}
        </div>
      )}

      {/* No platforms connected */}
      {profile && connectedPlatforms.length === 0 && (
        <div
          style={{
            ...glassCard,
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px' }}>
            No platforms connected
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.5 }}>
            Go to the Platforms tab to connect your accounts
          </p>
          <button
            onClick={() => navigate('/platforms')}
            style={{ ...glassButton, padding: '9px 20px', fontSize: '14px', marginTop: '8px' }}
          >
            Go to Platforms
          </button>
        </div>
      )}

      {/* Connected platform cards */}
      {connectedPlatforms.length > 0 && (
        <section
          style={{
            ...transparent,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflow: 'visible',
          }}
        >
          {connectedPlatforms.map((p) => (
            <PlatformCard
              key={p.platform}
              platform={p.platform as 'youtube' | 'instagram'}
              channelName={p.channelName}
              avatarUrl={p.avatarUrl}
              subscriberCount={p.subscriberCount}
              videoCount={p.videoCount}
              lastAnalyzed={p.lastAnalyzed}
              onAnalyze={() => runAnalysis(p.platform)}
              isAnalyzing={analyzingPlatform === p.platform}
            />
          ))}
        </section>
      )}

      {/* Holistic analysis — only when 2+ platforms connected */}
      {isMultiPlatform && (
        <section
          style={{
            ...glassHolisticCard,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Holistic Analysis
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Analyze all connected platforms together and see how each contributes to your overall content strategy.
            </p>
          </div>

          {lastHolisticStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Last run {lastHolisticStr}</span>
              <button
                onClick={() => navigate('/recommendations', { state: { platform: 'all' } })}
                style={{ color: 'rgba(167, 139, 250, 0.9)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
              >
                View Last Report
              </button>
            </div>
          )}

          <button
            onClick={() => runAnalysis('all')}
            disabled={analyzingPlatform !== null}
            className="glow-hover"
            style={{
              ...glassButton,
              padding: '10px 20px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              opacity: analyzingPlatform !== null ? 0.6 : 1,
              cursor: analyzingPlatform !== null ? 'not-allowed' : 'pointer',
            }}
          >
            {analyzingPlatform === 'all' && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {analyzingPlatform === 'all' ? 'Analyzing…' : 'Run Holistic Analysis'}
          </button>
        </section>
      )}
    </div>
  )
}
