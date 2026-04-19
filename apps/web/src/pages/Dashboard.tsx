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

export default function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<NormalizedPost[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVideos()
    fetchLatestAnalysis()
  }, [userId])

  async function fetchVideos() {
    try {
      const { data } = await axios.get(`/videos/${userId}`)
      setPosts(data.posts)
    } catch (err) {
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLatestAnalysis() {
    try {
      const { data } = await axios.get(`/analyze/${userId}/latest`)
      setAnalysis(data)
    } catch {
      // No prior analysis — that's fine
    }
  }

  async function runAnalysis() {
    setAnalyzing(true)
    setError(null)
    try {
      const { data } = await axios.post(`/analyze/${userId}`)
      setAnalysis(data)
      navigate('/recommendations')
    } catch (err) {
      setError('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  function logout() {
    localStorage.removeItem('userId')
    window.location.href = '/'
  }

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
            <span className="font-semibold">YouTube Analyzer</span>
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
              {analyzing ? 'Analyzing…' : 'Run Analysis'}
            </button>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-10">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
            <h2 className="text-lg font-semibold mb-4">Views — Last 10 Videos</h2>
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

        {/* Video grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {loading ? 'Loading videos…' : `Recent Videos (${posts.length})`}
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
                <VideoCard key={p.postId} post={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
