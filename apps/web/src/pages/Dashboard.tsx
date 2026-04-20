import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import UserHeader from '../components/UserHeader.tsx'
import PlatformCard from '../components/PlatformCard.tsx'

interface Props {
  userId: string
}

interface PlatformProfile {
  platform: 'youtube' | 'instagram'
  channelName: string
  avatarUrl: string
  subscriberCount: number
  videoCount: number
  lastAnalyzed: string | null
}

interface UserProfile {
  email: string | null
  connectedPlatforms: PlatformProfile[]
  lastHolisticAnalysis: string | null
}

export default function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [analyzingPlatform, setAnalyzingPlatform] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [userId])

  async function fetchProfile() {
    try {
      const { data } = await axios.get(`/users/${userId}/profile`)
      setProfile(data as UserProfile)
    } catch {
      setError('Failed to load profile')
    }
  }

  async function runAnalysis(platform: string) {
    console.log('Run analysis clicked:', platform, 'for userId:', userId)
    setAnalyzingPlatform(platform)
    setError(null)
    try {
      await axios.post(`/analyze/${userId}?platform=${platform}`)
      navigate('/recommendations', { state: { platform } })
    } catch {
      setError(`Analysis failed for ${platform}. Please try again.`)
    } finally {
      setAnalyzingPlatform(null)
      fetchProfile()
    }
  }

  async function logout() {
    try {
      await axios.post(`/auth/logout/${userId}`)
    } catch {
      // best-effort
    }
    localStorage.removeItem('userId')
    window.location.href = '/'
  }

  const isMultiPlatform = (profile?.connectedPlatforms.length ?? 0) > 1
  const lastHolisticStr = profile?.lastHolisticAnalysis
    ? new Date(profile.lastHolisticAnalysis).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen">
      <UserHeader email={profile?.email ?? null} onLogout={logout} />

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Connected platform cards */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Connected Platforms</h2>

          {!profile && (
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-900 rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          )}

          {profile?.connectedPlatforms.map((p) => (
            <PlatformCard
              key={p.platform}
              platform={p.platform}
              channelName={p.channelName}
              avatarUrl={p.avatarUrl}
              subscriberCount={p.subscriberCount}
              videoCount={p.videoCount}
              lastAnalyzed={p.lastAnalyzed}
              onAnalyze={() => runAnalysis(p.platform)}
              isAnalyzing={analyzingPlatform === p.platform}
            />
          ))}

          {/* Connect Instagram if not connected */}
          {profile && !profile.connectedPlatforms.find((p) => p.platform === 'instagram') && (
            <a
              href="/auth/instagram/login"
              className="bg-gray-900 rounded-2xl p-6 flex items-center gap-4 border border-dashed border-gray-700 hover:border-gray-500 transition-colors group"
            >
              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-gray-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Connect Instagram</p>
                <p className="text-sm text-gray-600">Add your Instagram account to unlock cross-platform insights</p>
              </div>
            </a>
          )}
        </section>

        {/* Holistic analysis — only shown when multiple platforms connected */}
        {isMultiPlatform && (
          <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-700/40 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Holistic Analysis</h2>
              <p className="text-sm text-gray-400 mt-1">
                Analyze all connected platforms together and see how each contributes to your overall content strategy.
              </p>
            </div>

            {lastHolisticStr && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>Last run {lastHolisticStr}</span>
                <button
                  onClick={() => navigate('/recommendations', { state: { platform: 'all' } })}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
                >
                  View Last Report
                </button>
              </div>
            )}

            <button
              onClick={() => runAnalysis('all')}
              disabled={analyzingPlatform !== null}
              className="self-start flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
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
      </main>
    </div>
  )
}
