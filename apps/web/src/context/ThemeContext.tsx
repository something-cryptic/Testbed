import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { themes, defaultTheme, type Theme } from '../styles/themes.ts'

interface ThemeContextType {
  theme: Theme
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
})

export function ThemeProvider({
  children,
  initialThemeId = 'lavender',
}: {
  children: React.ReactNode
  initialThemeId?: string
}) {
  const [themeId, setThemeId] = useState(initialThemeId)
  const theme = themes[themeId] ?? defaultTheme

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--background',          theme.background)
    root.style.setProperty('--background-gradient', theme.backgroundGradient)
    root.style.setProperty('--glow-color',          theme.glowColor)
    root.style.setProperty('--glow-color-strong',   theme.glowColorStrong)
    root.style.setProperty('--border-accent',        theme.borderAccent)
    root.style.setProperty('--border-accent-strong', theme.borderAccentStrong)
    root.style.setProperty('--border-subtle',        theme.borderSubtle)
    root.style.setProperty('--glass-base',           theme.glassBase)
    root.style.setProperty('--glass-medium',         theme.glassMedium)
    root.style.setProperty('--glass-strong',         theme.glassStrong)
    root.style.setProperty('--button-base',          theme.buttonBase)
    root.style.setProperty('--text-primary',         theme.textPrimary)
    root.style.setProperty('--text-secondary',       theme.textSecondary)
    root.style.setProperty('--text-muted',           theme.textMuted)
    root.style.setProperty('--accent-color',         theme.accentColor)
  }, [theme])

  function setTheme(id: string) {
    setThemeId(id)
  }

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
