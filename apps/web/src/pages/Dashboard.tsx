import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { NormalizedPost, AnalysisResult } from '@analyzer/types'
import VideoCard from '../components/VideoCard.tsx'

interface Props {
  userId: string
}

function YouTubeBadge() {
  return (
    <span className="flex items-center gap-1.5 bg-red-600/20 text-red-400 border border-red-600/30 text-xs font-medium px-2.5 py-1 rounded-full">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
      </svg>
      YouTube
    </span>
  )
}

function InstagramBadge() {
  return (
    <span className="flex items-center gap-1.5 bg-purple-600/20 text-purple-400 border border-purple-600/30 text-xs font-medium px-2.5 py-1 rounded-full">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
      Instagram
    </span>
  )
}

export default function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<NormalizedPost[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
    fetchVideos()
    fetchLatestAnalysis()
  }, [userId])

  async function fetchStatus() {
    try {
      const { data } = await axios.get(`/auth/status/${userId}`)
      setConnectedPlatforms((data as { platforms: string[] }).platforms)
    } catch {
      // If the endpoint fails, assume YouTube only (backwards compat)
      setConnectedPlatforms(['youtube'])
    }
  }

  async function fetchVideos() {
    try {
      const { data } = await axios.get(`/videos/${userId}`)
      setPosts((data as { posts: NormalizedPost[] }).posts)
    } catch {
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLatestAnalysis() {
    try {
      const { data } = await axios.get(`/analyze/${userId}/latest`)
      setAnalysis(data as AnalysisResult)
    } catch {
      // No prior analysis — that's fine
    }
  }

  async function runAnalysis() {
    setAnalyzing(true)
    setError(null)
    try {
      const { data } = await axios.post(`/analyze/${userId}`)
      setAnalysis(data as AnalysisResult)
      navigate('/recommendations')
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  function logout() {
    localStorage.removeItem('userId')
    window.location.href = '/'
  }

  const hasYouTube = connectedPlatforms.includes('youtube')
  const hasInstagram = connectedPlatforms.includes('instagram')
  const isMultiPlatform = hasYouTube && hasInstagram

  const chartData = posts
    .slice(0, 10)
    .map((p) => ({ name: p.title.slice(0, 20) + '…', views: p.metrics.views }))
    .reverse()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            <span className="font-semibold">Content Analyzer</span>
          </div>
          <div className="flex items-center gap-3">
            {analysis && (
              <button
                onClick={() => navigate('/recommendations')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Recommendations
              </button>
            )}
            <button
              onClick={runAnalysis}
              disabled={analyzing || posts.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {analyzing ? 'Analyzing…' : isMultiPlatform ? 'Analyze All Platforms' : 'Run Analysis'}
            </button>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Connected platforms */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500">Connected:</span>
          {hasYouTube && <YouTubeBadge />}
          {hasInstagram && <InstagramBadge />}
          {!hasInstagram && (
            <a
              href="/auth/instagram/login"
              className="flex items-center gap-1.5 border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
            >
              + Connect Instagram
            </a>
          )}
        </div>

        {/* Top insights banner */}
        {analysis && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">Top Insights</h2>
            <ul className="flex flex-col gap-2">
              {analysis.topInsights.slice(0, 3).map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-red-500 mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Views chart */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              Views — Last 10 {isMultiPlatform ? 'Posts' : 'Videos'}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#f87171' }}
                />
                <Bar dataKey="views" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Post grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {loading ? 'Loading…' : `Recent ${isMultiPlatform ? 'Posts' : 'Videos'} (${posts.length})`}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-xl aspect-video animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((p) => (
                <VideoCard key={`${p.platform}-${p.postId}`} post={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
