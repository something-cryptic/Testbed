import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from './Sidebar.tsx'
import UserHeader from './UserHeader.tsx'

interface Props {
  userId: string
  children: React.ReactNode
}

interface UserProfile {
  name: string | null
  email: string | null
  avatarUrl: string | null
}

const STORAGE_KEY = 'sidebar_collapsed'

export default function Layout({ userId, children }: Props) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    axios
      .get(`/users/${userId}/profile`)
      .then(({ data }) => setProfile(data as UserProfile))
      .catch(() => {})
  }, [userId])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
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

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <div className="min-h-screen bg-[#0f0d1a]">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      {/* Content area shifts right by sidebar width */}
      <div
        className="transition-all duration-300 ease-in-out flex flex-col min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        <UserHeader
          name={profile?.name ?? null}
          email={profile?.email ?? null}
          avatarUrl={profile?.avatarUrl ?? null}
          onLogout={logout}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
