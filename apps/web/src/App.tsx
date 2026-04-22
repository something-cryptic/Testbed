import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.tsx'
import Layout from './components/Layout.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

const Dashboard       = lazy(() => import('./pages/Dashboard.tsx'))
const Recommendations = lazy(() => import('./pages/Recommendations.tsx'))
const Analytics       = lazy(() => import('./pages/Analytics.tsx'))
const Settings        = lazy(() => import('./pages/Settings.tsx'))
const Platforms       = lazy(() => import('./pages/Platforms.tsx'))
const Profile         = lazy(() => import('./pages/Profile.tsx'))

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

const fallback = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      color: 'rgba(200, 180, 255, 0.6)',
      fontSize: '14px',
    }}
  >
    Loading...
  </div>
)

export default function App() {
  const userId = getUserId()
  const savedTheme = localStorage.getItem('theme') ?? 'lavender'

  return (
    <ThemeProvider initialThemeId={savedTheme}>
      <Suspense fallback={fallback}>
        <Routes>
          {/* Public */}
          <Route path="/" element={userId ? <Navigate to="/dashboard" replace /> : <Login />} />

          {/* Authenticated — all share one UserProvider so profile is fetched once */}
          {userId ? (
            <Route
              element={
                <UserProvider userId={userId}>
                  <Layout userId={userId} />
                </UserProvider>
              }
            >
              <Route path="/dashboard"       element={<Dashboard       userId={userId} />} />
              <Route path="/recommendations" element={<Recommendations userId={userId} />} />
              <Route path="/analytics"       element={<Analytics       userId={userId} />} />
              <Route path="/platforms"       element={<Platforms       userId={userId} />} />
              <Route path="/settings"        element={<Settings        userId={userId} />} />
              <Route path="/profile"         element={<Profile         userId={userId} />} />
            </Route>
          ) : (
            <>
              <Route path="/dashboard"       element={<Navigate to="/" replace />} />
              <Route path="/recommendations" element={<Navigate to="/" replace />} />
              <Route path="/analytics"       element={<Navigate to="/" replace />} />
              <Route path="/platforms"       element={<Navigate to="/" replace />} />
              <Route path="/settings"        element={<Navigate to="/" replace />} />
              <Route path="/profile"         element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </ThemeProvider>
  )
}
