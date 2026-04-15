import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import VideoCard from './VideoCard'

const API_BASE = 'http://localhost:8000'

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [videos, setVideos] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const userId = localStorage.getItem('user_id')

  useEffect(() => {
    // Handle redirect from OAuth with user_id in URL
    const urlUserId = searchParams.get('user_id')
    if (urlUserId) {
      localStorage.setItem('user_id', urlUserId)
    }

    const id = urlUserId || userId
    if (!id) {
      navigate('/')
      return
    }

    fetchData(id)
  }, [])

  const fetchData = async (id) => {
    try {
      setLoading(true)
      setError(null)

      const [videosRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/videos/${id}`),
        fetch(`${API_BASE}/analytics/${id}`),
      ])

      if (!videosRes.ok) throw new Error('Failed to fetch videos')
      if (!analyticsRes.ok) throw new Error('Failed to fetch analytics')

      const videosData = await videosRes.json()
      const analyticsData = await analyticsRes.json()

      setVideos(videosData.videos || [])
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    const id = localStorage.getItem('user_id')
    try {
      setAnalyzing(true)
      setError(null)

      const res = await fetch(`${API_BASE}/analyze/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Analysis failed')

      const result = await res.json()
      localStorage.setItem('recommendations', JSON.stringify(result))
      navigate('/recommendations')
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('recommendations')
    navigate('/')
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">YouTube Analyzer</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || loading || videos.length === 0}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 px-5 rounded-lg transition-colors duration-200"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>🤖</span>
                  Analyze My Channel
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {analyzing && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-4 rounded-lg flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="font-semibold">AI Analysis in Progress</p>
              <p className="text-sm opacity-80">Claude is analyzing your channel data. This may take 30-60 seconds...</p>
            </div>
          </div>
        )}

        {/* Channel Analytics Summary */}
        {analytics && !loading && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Last 90 Days</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Views', value: formatNumber(analytics.views), icon: '👁️' },
                { label: 'Watch Time (min)', value: formatNumber(Math.round(analytics.watchTime)), icon: '⏱️' },
                { label: 'Subscribers Gained', value: formatNumber(analytics.subscribersGained), icon: '📈' },
                { label: 'Net Subscribers', value: formatNumber(analytics.subscribersGained - analytics.subscribersLost), icon: '👥' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-2xl mb-1">{stat.icon}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {loading ? 'Loading videos...' : `${videos.length} Recent Videos`}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">📺</p>
            <p className="text-xl font-medium">No videos found</p>
            <p className="mt-1">Make sure your YouTube channel has public videos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
