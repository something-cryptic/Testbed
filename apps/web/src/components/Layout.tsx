import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import axios from 'axios'
import Sidebar from './Sidebar.tsx'
import UserHeader from './UserHeader.tsx'
import { useUser } from '../context/UserContext.tsx'
import { transparent } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

interface Props {
  userId: string
}

const STORAGE_KEY = 'sidebar_collapsed'

export default function Layout({ userId }: Props) {
  const { profile } = useUser()
  const { isMobile } = useBreakpoint()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await axios.post(`/auth/logout/${userId}`)
    } catch {
      // best-effort
    }
    localStorage.removeItem('userId')
    window.location.href = '/'
  }, [userId])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        width: '100%',
        background: 'transparent',
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      <div
        style={{
          ...transparent,
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
        }}
      >
        <UserHeader
          name={profile?.name ?? null}
          email={profile?.email ?? null}
          avatarUrl={profile?.avatarUrl ?? null}
          onLogout={logout}
        />
        <main
          style={{
            ...transparent,
            flex: 1,
            width: '100%',
            overflow: 'visible',
            // Extra bottom padding on mobile so content isn't hidden behind the bottom nav
            paddingBottom: isMobile ? '80px' : 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
