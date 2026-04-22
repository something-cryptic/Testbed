import { useState, useMemo } from 'react'
import { glassCard, glassButton } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  platform: 'youtube' | 'instagram' | 'twitch'
  channelName: string
  customUrl?: string | null
  avatarUrl: string
  subscriberCount: number
  videoCount: number
  lastAnalyzed: string | null
  onAnalyze: () => void
  isAnalyzing: boolean
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
  )
}

function TwitchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

const platformConfig = {
  youtube: {
    label: 'YouTube',
    badgeColor: '#ef4444',
    fallbackBg: '#dc2626',
    Icon: YouTubeIcon,
    statLabel: 'subscribers',
    postLabel: 'videos',
  },
  instagram: {
    label: 'Instagram',
    badgeColor: '#ec4899',
    fallbackBg: 'linear-gradient(135deg, #9333ea, #ec4899)',
    Icon: InstagramIcon,
    statLabel: 'followers',
    postLabel: 'posts',
  },
  twitch: {
    label: 'Twitch',
    badgeColor: '#9146FF',
    fallbackBg: '#7c3aed',
    Icon: TwitchIcon,
    statLabel: 'followers',
    postLabel: 'VODs',
  },
}

export default function PlatformCard({
  platform,
  channelName,
  customUrl,
  avatarUrl,
  subscriberCount,
  videoCount,
  lastAnalyzed,
  onAnalyze,
  isAnalyzing,
}: Props) {
  void customUrl // available for future channel linking
  const config = platformConfig[platform]
  const { Icon } = config
  const [imgFailed, setImgFailed] = useState(false)
  const { isMobile } = useBreakpoint()
  const proxyUrl = useMemo(
    () => (avatarUrl ? `/proxy/image?url=${encodeURIComponent(avatarUrl)}` : ''),
    [avatarUrl],
  )
  const showImage = proxyUrl && !imgFailed

  const lastAnalyzedStr = lastAnalyzed
    ? new Date(lastAnalyzed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      className="transition-all hover:-translate-y-0.5"
      style={{
        ...glassCard,
        padding: isMobile ? '16px' : '20px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '12px' : '16px',
      }}
    >
      {/* Top row on mobile: avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        {/* Avatar + platform badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {showImage ? (
            <img
              src={proxyUrl}
              alt={channelName}
              crossOrigin="anonymous"
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 0 2px rgba(200, 185, 235, 0.15)',
              }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: config.fallbackBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              {channelName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: config.badgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px rgba(26, 21, 40, 0.8)',
            }}
          >
            <Icon size={11} />
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {channelName}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            {fmt(subscriberCount)} {config.statLabel}
            <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
            {fmt(videoCount)} {config.postLabel}
          </p>
          {lastAnalyzedStr && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Last analyzed {lastAnalyzedStr}
            </p>
          )}
        </div>
      </div>

      {/* Analyze button — full width on mobile */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="glow-hover shrink-0 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          ...glassButton,
          opacity: isAnalyzing ? 0.7 : 1,
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          width: isMobile ? '100%' : undefined,
        }}
      >
        {isAnalyzing && <Spinner />}
        {isAnalyzing ? 'Analyzing…' : `Analyze ${config.label}`}
      </button>
    </div>
  )
}
