import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Play, Globe, X } from 'lucide-react'
import { glassCard, glassButton, transparent } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

interface PlatformProfile {
  platform: string
  channelName: string
  avatarUrl: string
}

interface UserProfile {
  name: string | null
  email: string | null
  avatarUrl: string | null
  connectedPlatforms: PlatformProfile[]
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'youtube') return <Play size={18} color="#ef4444" />
  if (platform === 'instagram') return <Globe size={18} color="#ec4899" />
  return <SettingsIcon size={18} color="rgba(200, 185, 235, 0.5)" />
}

export default function Settings({ userId }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

  function loadProfile() {
    fetch(`/users/${userId}/profile`)
      .then((r) => r.json())
      .then((data) => setProfile(data as UserProfile))
      .catch(() => {})
  }

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function disconnect(platform: string) {
    setDisconnecting(platform)
    try {
      const res = await fetch(`/auth/${platform}/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
      loadProfile()
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div
      style={{
        ...transparent,
        maxWidth: '640px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '40px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '20px' : '32px',
      }}
    >
      {/* Page header */}
      <div style={transparent}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(240, 235, 255, 0.95)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(200, 185, 235, 0.5)', marginTop: '4px' }}>
          Account settings and preferences
        </p>
      </div>

      {/* Account section */}
      <section style={{ ...transparent, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(200, 185, 235, 0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Account
        </h2>
        <div style={{ ...glassCard, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name ?? ''}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 0 2px rgba(200, 185, 235, 0.15)',
              }}
            />
          ) : (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              {(profile?.name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 600, color: 'rgba(240, 235, 255, 0.95)', fontSize: '15px' }}>
              {profile?.name ?? '—'}
            </p>
            {profile?.email && (
              <p style={{ fontSize: '13px', color: 'rgba(200, 185, 235, 0.5)', marginTop: '2px' }}>
                {profile.email}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Connected platforms section */}
      <section style={{ ...transparent, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(200, 185, 235, 0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Connected Platforms
        </h2>

        {!profile || profile.connectedPlatforms.length === 0 ? (
          <div style={{ ...glassCard, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'rgba(180, 160, 220, 0.45)' }}>
              No platforms connected yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profile.connectedPlatforms.map((p) => (
              <div
                key={p.platform}
                style={{
                  ...glassCard,
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: '1px solid rgba(200, 150, 255, 0.15)',
                    borderRight: '1px solid rgba(200, 150, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlatformIcon platform={p.platform} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: 'rgba(240, 235, 255, 0.9)', fontSize: '14px' }}>
                    {p.platform === 'youtube' ? 'YouTube' : 'Instagram'}
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'rgba(200, 185, 235, 0.5)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.channelName}
                  </p>
                </div>
                <button
                  onClick={() => disconnect(p.platform)}
                  disabled={disconnecting === p.platform}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'rgba(248, 113, 113, 0.7)',
                    background: 'transparent',
                    borderTop: '1px solid transparent',
                    borderLeft: '1px solid transparent',
                    borderBottom: '1px solid rgba(220, 38, 38, 0.25)',
                    borderRight: '1px solid rgba(220, 38, 38, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: disconnecting === p.platform ? 'not-allowed' : 'pointer',
                    opacity: disconnecting === p.platform ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <X size={13} />
                  {disconnecting === p.platform ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
