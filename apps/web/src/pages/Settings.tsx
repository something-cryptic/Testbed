import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Youtube, Instagram, Unlink } from 'lucide-react'

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
  if (platform === 'youtube') return <Youtube size={18} className="text-red-400" />
  if (platform === 'instagram') return <Instagram size={18} className="text-pink-400" />
  return <SettingsIcon size={18} className="text-gray-400" />
}

export default function Settings({ userId }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetch(`/users/${userId}/profile`)
      .then((r) => r.json())
      .then((data) => setProfile(data as UserProfile))
      .catch(() => {})
  }, [userId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-violet-100">Settings</h1>
        <p className="text-sm text-violet-300/70 mt-1">Account settings and preferences</p>
      </div>

      {/* Account section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-violet-300/80 uppercase tracking-widest">Account</h2>
        <div className="bg-[#1a1625]/80 border border-violet-800/30 rounded-2xl p-5 flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name ?? ''}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-violet-700/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg">
              {(profile?.name ?? profile?.email ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-violet-100">{profile?.name ?? '—'}</p>
            {profile?.email && (
              <p className="text-sm text-violet-300/70">{profile.email}</p>
            )}
          </div>
        </div>
      </section>

      {/* Connected platforms section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-violet-300/80 uppercase tracking-widest">Connected Platforms</h2>

        {!profile || profile.connectedPlatforms.length === 0 ? (
          <div className="bg-[#1a1625]/80 border border-violet-800/30 rounded-2xl p-6 text-center">
            <p className="text-sm text-violet-400/60">No platforms connected yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.connectedPlatforms.map((p) => (
              <div
                key={p.platform}
                className="bg-[#1a1625]/80 border border-violet-800/30 rounded-2xl px-5 py-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
                  <PlatformIcon platform={p.platform} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-violet-100 capitalize">
                    {p.platform === 'youtube' ? 'YouTube' : 'Instagram'}
                  </p>
                  <p className="text-sm text-violet-300/60 truncate">{p.channelName}</p>
                </div>
                <button
                  disabled
                  title="Disconnect coming soon"
                  className="flex items-center gap-1.5 text-xs text-violet-400/50 border border-violet-800/40 px-3 py-1.5 rounded-lg cursor-not-allowed"
                >
                  <Unlink size={13} />
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add platform */}
        {profile && !profile.connectedPlatforms.find((p) => p.platform === 'instagram') && (
          <a
            href="/auth/instagram/login"
            className="bg-[#1a1625]/60 border border-dashed border-violet-700/40 hover:border-violet-500/60 rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-900/30 border border-violet-700/30 flex items-center justify-center">
              <Instagram size={16} className="text-violet-400 group-hover:text-violet-200 transition-colors" />
            </div>
            <p className="text-sm font-medium text-violet-300/60 group-hover:text-violet-200 transition-colors">
              + Connect Instagram
            </p>
          </a>
        )}
      </section>
    </div>
  )
}
