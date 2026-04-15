import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const IMPACT_COLORS = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const CATEGORY_ICONS = {
  titles: '✍️',
  length: '⏱️',
  timing: '📅',
  tags: '🏷️',
  thumbnails: '🖼️',
}

const IMPACT_DOT = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
}

export default function Recommendations() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('insights')

  useEffect(() => {
    const stored = localStorage.getItem('recommendations')
    if (stored) {
      setData(JSON.parse(stored))
    } else {
      navigate('/dashboard')
    }
  }, [navigate])

  if (!data) return null

  const tabs = [
    { id: 'insights', label: 'Top Insights', count: data.top_insights?.length },
    { id: 'quickwins', label: 'Quick Wins', count: data.quick_wins?.length },
    { id: 'recommendations', label: 'Recommendations', count: data.recommendations?.length },
    { id: 'patterns', label: 'Patterns', count: data.best_performing_patterns?.length },
    { id: 'gaps', label: 'Content Gaps', count: data.content_gaps?.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Analysis Results</h1>
              <p className="text-xs text-gray-400">Powered by Claude</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-red-500' : 'bg-gray-100'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Top Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔍 Key Findings</h2>
            {data.top_insights?.map((insight, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex gap-4">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-gray-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Wins */}
        {activeTab === 'quickwins' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">⚡ Things to Change Now</h2>
            {data.quick_wins?.map((win, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-green-100 shadow-sm flex gap-4">
                <div className="text-green-500 text-xl flex-shrink-0">✓</div>
                <p className="text-gray-700 leading-relaxed">{win}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Detailed Recommendations</h2>
            {data.recommendations?.map((rec, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[rec.category] || '📌'}</span>
                    <span className="font-semibold text-gray-800 capitalize">{rec.category}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${IMPACT_DOT[rec.expected_impact] || 'bg-gray-400'}`} />
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${
                        IMPACT_COLORS[rec.expected_impact] || IMPACT_COLORS.low
                      }`}
                    >
                      {rec.expected_impact} impact
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Finding</p>
                    <p className="text-gray-700 text-sm">{rec.finding}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Action</p>
                    <p className="text-gray-800 text-sm font-medium">{rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Best Performing Patterns */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🏆 What's Working</h2>
            {data.best_performing_patterns?.map((pattern, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm flex gap-4">
                <span className="text-blue-500 text-xl flex-shrink-0">⭐</span>
                <p className="text-gray-700 leading-relaxed">{pattern}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content Gaps */}
        {activeTab === 'gaps' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🎯 Opportunities to Explore</h2>
            {data.content_gaps?.map((gap, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-purple-100 shadow-sm flex gap-4">
                <span className="text-purple-500 text-xl flex-shrink-0">💡</span>
                <p className="text-gray-700 leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
