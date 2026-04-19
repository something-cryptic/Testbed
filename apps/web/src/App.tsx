import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Recommendations from './pages/Recommendations.tsx'

function getUserId(): string | null {
  // Check URL param first (set by OAuth redirect)
  const params = new URLSearchParams(window.location.search)
  const paramId = params.get('userId')
  if (paramId) {
    localStorage.setItem('userId', paramId)
    return paramId
  }
  // Fall back to localStorage
  return localStorage.getItem('userId')
}

export function useUserId() {
  return getUserId()
}

export default function App() {
  const userId = getUserId()

  return (
    <Routes>
      <Route path="/" element={userId ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={userId ? <Dashboard userId={userId} /> : <Navigate to="/" replace />} />
      <Route path="/recommendations" element={userId ? <Recommendations userId={userId} /> : <Navigate to="/" replace />} />
    </Routes>
  )
}
