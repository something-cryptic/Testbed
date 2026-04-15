import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if redirected back from OAuth with user_id
    const userId = searchParams.get('user_id')
    if (userId) {
      localStorage.setItem('user_id', userId)
      navigate('/dashboard')
    }
  }, [searchParams, navigate])

  const handleConnect = () => {
    window.location.href = 'http://localhost:8000/auth/login'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        {/* YouTube-inspired logo area */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">YouTube Content Analyzer</h1>
          <p className="mt-2 text-gray-500">
            Get AI-powered insights to grow your channel
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">Analyze Performance</p>
              <p className="text-gray-500 text-xs">Deep dive into your video metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">AI Recommendations</p>
              <p className="text-gray-500 text-xs">Claude-powered growth strategies</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">Quick Wins</p>
              <p className="text-gray-500 text-xs">Actionable steps to improve today</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Connect YouTube Account
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Requires YouTube channel access. Your data stays private.
        </p>
      </div>
    </div>
  )
}
