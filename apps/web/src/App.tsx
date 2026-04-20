import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Recommendations from './pages/Recommendations.tsx'
import Analytics from './pages/Analytics.tsx'
import Settings from './pages/Settings.tsx'
import Layout from './components/Layout.tsx'

function getUserId(): string | null {
  const params = new URLSearchParams(window.location.search)
  const paramId = params.get('userId')
  if (paramId) {
    localStorage.setItem('userId', paramId)
    return paramId
  }
  return localStorage.getItem('userId')
}

export function useUserId() {
  return getUserId()
}

export default function App() {
  const userId = getUserId()

  return (
    <Routes>
      {/* Public — no sidebar */}
      <Route path="/" element={userId ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Authenticated — wrapped in Layout (sidebar + header) */}
      <Route
        path="/dashboard"
        element={
          userId
            ? <Layout userId={userId}><Dashboard userId={userId} /></Layout>
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/recommendations"
        element={
          userId
            ? <Layout userId={userId}><Recommendations userId={userId} /></Layout>
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/analytics"
        element={
          userId
            ? <Layout userId={userId}><Analytics userId={userId} /></Layout>
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/settings"
        element={
          userId
            ? <Layout userId={userId}><Settings userId={userId} /></Layout>
            : <Navigate to="/" replace />
        }
      />
    </Routes>
  )
}
