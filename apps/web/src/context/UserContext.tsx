import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useTheme } from './ThemeContext.tsx'

export interface UserProfile {
  name: string | null
  googleName: string | null
  email: string | null
  avatarUrl: string | null
  googleAvatarUrl: string | null
  username: string | null
  customAvatarUrl: string | null
  preferences: {
    theme: string
    sidebarCollapsed: boolean
    defaultPlatform: 'youtube' | 'instagram' | 'all'
    emailNotifications: boolean
    showSubscriberCount: boolean
  } | null
  connectedPlatforms: {
    platform: string
    channelName: string
    customUrl: string | null
    avatarUrl: string
    subscriberCount: number
    videoCount: number
    lastAnalyzed: string | null
  }[]
  lastHolisticAnalysis: string | null
}

interface UserContextType {
  profile: UserProfile | null
  refreshProfile: () => Promise<void>
  userId: string
}

const UserContext = createContext<UserContextType | null>(null)

export function useUser(): UserContextType {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}

interface ProviderProps {
  userId: string
  children: React.ReactNode
}

export function UserProvider({ userId, children }: ProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const hasFetched = useRef(false)
  const { setTheme } = useTheme()

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await axios.get(`/users/${userId}/profile`)
      const p = data as UserProfile
      setProfile(p)

      // Apply theme from saved preferences
      const savedTheme = p.preferences?.theme ?? 'lavender'
      setTheme(savedTheme)
      localStorage.setItem('theme', savedTheme)
    } catch {
      // leave profile null — pages handle empty state
    }
  }, [userId, setTheme])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchProfile()
  }, [fetchProfile])

  const value = useMemo(
    () => ({ profile, refreshProfile: fetchProfile, userId }),
    [profile, fetchProfile, userId],
  )

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
