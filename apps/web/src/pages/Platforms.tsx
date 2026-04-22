import { useEffect, useState } from 'react'
import { Play, Globe, Music2, Tv2, Monitor, ExternalLink } from 'lucide-react'
import { glassCard, glassButton, transparent } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

interface PlatformProfile {
  platform: string
  channelName: string
  customUrl: string | null
  avatarUrl: string
  subscriberCount: number
  videoCount: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function channelUrl(platform: string, channelName: string, customUrl: string | null): string {
  switch (platform) {
    case 'youtube':
      return customUrl
        ? `https://www.youtube.com/${customUrl}`
        : `https://www.youtube.com/@${channelName}`
    case 'twitch':    return `https://twitch.tv/${channelName.toLowerCase()}`
    case 'instagram': return `https://instagram.com/${channelName}`
    default:          return '#'
  }
}

const AVAILABLE_PLATFORMS = [
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Connect your YouTube channel to analyze video performance, engagement, and growth',
    Icon: Play,
    iconColor: '#ef4444',
    connectUrl: (userId: string) => `/auth/login?userId=${userId}`,
    comingSoon: false,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Connect your Instagram account to analyze posts, reels, and audience insights',
    Icon: Globe,
    iconColor: '#ec4899',
    connectUrl: (userId: string) => `/auth/instagram/login?userId=${userId}`,
    comingSoon: false,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'TikTok integration coming soon',
    Icon: Music2,
    iconColor: '#a3a3a3',
    connectUrl: () => '#',
    comingSoon: true,
  },
  {
    id: 'twitch',
    label: 'Twitch',
    description: 'Connect your Twitch channel to analyze stream performance, VOD engagement, and viewer growth',
    Icon: Tv2,
    iconColor: '#9146FF',
    connectUrl: (userId: string) => `/auth/twitch/login?userId=${userId}`,
    comingSoon: false,
  },
  {
    id: 'x',
    label: 'X / Twitter',
    description: 'X integration coming soon',
    Icon: Monitor,
    iconColor: '#a3a3a3',
    connectUrl: () => '#',
    comingSoon: true,
  },
]

export default function Platforms({ userId }: Props) {
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([])
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({})
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    fetch(`/users/${userId}/profile`)
      .then((r) => r.json())
      .then((data) => {
        const d = data as { connectedPlatforms: PlatformProfile[] }
        setPlatforms(d.connectedPlatforms ?? [])
      })
      .catch(() => {})
  }, [userId])

  const connectedIds = new Set(platforms.map((p) => p.platform))
  const availableToConnect = AVAILABLE_PLATFORMS.filter((p) => !connectedIds.has(p.id))

  return (
    <div
      style={{
        ...transparent,
        maxWidth: '768px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '24px' : '40px',
      }}
    >
      {/* ── Connected Platforms ── */}
      <section style={{ ...transparent, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(200, 185, 235, 0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Connected Platforms
        </h2>

        {platforms.length === 0 ? (
          <div
            style={{
              ...glassCard,
              padding: '32px 24px',
              textAlign: 'center',
              color: 'rgba(180, 160, 220, 0.5)',
              fontSize: '14px',
            }}
          >
            No platforms connected yet
          </div>
        ) : (
          platforms.map((p) => {
            const cfg = AVAILABLE_PLATFORMS.find((a) => a.id === p.platform)
            const Icon = cfg?.Icon ?? Globe
            const proxyUrl = p.avatarUrl ? `/proxy/image?url=${encodeURIComponent(p.avatarUrl)}` : ''
            const showImg = proxyUrl && !imgFailed[p.platform]
            const url = channelUrl(p.platform, p.channelName, p.customUrl)

            return (
              <div
                key={p.platform}
                style={{
                  ...glassCard,
                  padding: isMobile ? '16px' : '20px 24px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: '16px',
                }}
              >
                {/* Avatar + info row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {showImg ? (
                      <img
                        src={proxyUrl}
                        alt={p.channelName}
                        crossOrigin="anonymous"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={() => setImgFailed((prev) => ({ ...prev, [p.platform]: true }))}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: p.platform === 'youtube'
                            ? '#dc2626'
                            : p.platform === 'twitch'
                            ? '#7c3aed'
                            : 'linear-gradient(135deg, #9333ea, #ec4899)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}
                      >
                        {p.channelName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: cfg?.iconColor ?? '#888',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={10} color="white" />
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.channelName}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {fmt(p.subscriberCount)} {p.platform === 'youtube' ? 'subscribers' : 'followers'}
                      {' · '}
                      {fmt(p.videoCount)} {p.platform === 'instagram' ? 'posts' : p.platform === 'twitch' ? 'VODs' : 'videos'}
                    </p>
                  </div>

                  {/* Visit Channel inline — desktop only */}
                  {!isMobile && (
                    <button
                      onClick={() => window.open(url, '_blank', 'noopener noreferrer')}
                      className="glow-hover"
                      style={{
                        ...glassButton,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      Visit Channel
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>

                {/* Visit Channel full-width — mobile only */}
                {isMobile && (
                  <button
                    onClick={() => window.open(url, '_blank', 'noopener noreferrer')}
                    className="glow-hover"
                    style={{
                      ...glassButton,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      width: '100%',
                    }}
                  >
                    Visit Channel
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* ── Add a Platform ── */}
      {availableToConnect.length > 0 && (
        <section style={{ ...transparent, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(200, 185, 235, 0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Add a Platform
          </h2>

          {availableToConnect.map((p) => (
            <div
              key={p.id}
              style={{
                ...glassCard,
                padding: isMobile ? '16px' : '20px 24px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '16px',
                opacity: p.comingSoon ? 0.5 : 1,
                cursor: p.comingSoon ? 'default' : 'auto',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(200, 150, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <p.Icon size={20} color={p.comingSoon ? '#a3a3a3' : p.iconColor} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                  {p.label}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>
                  {p.description}
                </p>
              </div>

              {/* Action */}
              {p.comingSoon ? (
                <span
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'rgba(180, 160, 220, 0.4)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    flexShrink: 0,
                    cursor: 'not-allowed',
                    display: 'inline-block',
                    textAlign: 'center' as const,
                    width: isMobile ? '100%' : undefined,
                  }}
                >
                  Coming Soon
                </span>
              ) : (
                <a
                  href={p.connectUrl(userId)}
                  className="glow-hover"
                  style={{
                    ...glassButton,
                    padding: isMobile ? '10px 16px' : '7px 16px',
                    fontSize: '13px',
                    flexShrink: 0,
                    textDecoration: 'none',
                    display: isMobile ? 'flex' : 'inline-block',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isMobile ? '100%' : undefined,
                  }}
                >
                  Connect {p.label}
                </a>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
