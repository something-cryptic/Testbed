import { useState, useCallback, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  ChartBar,
  Lightbulb,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  glassSidebar,
  glassNavItemActive,
  glassNavItemHover,
  glassNavItem,
} from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

const NAV_ITEMS = [
  { label: 'Dashboard',       icon: Home,      path: '/dashboard'       },
  { label: 'Analytics',       icon: ChartBar,  path: '/analytics'       },
  { label: 'Recommendations', icon: Lightbulb, path: '/recommendations' },
  { label: 'Platforms',       icon: Layers,    path: '/platforms'       },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

function Sidebar({ collapsed, onToggle }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const { isMobile, isTablet } = useBreakpoint()

  const isActive = useCallback((path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }, [location.pathname])

  // ── Mobile: bottom navigation bar ──────────────────────────────────────────
  if (isMobile) {
    return (
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
          background: 'var(--glass-strong)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-accent)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path)
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              title={label}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
                minWidth: '44px',
                padding: '10px 0',
                transition: 'color 0.15s ease',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>
                {label === 'Recommendations' ? 'Tips' : label}
              </span>
            </button>
          )
        })}
      </nav>
    )
  }

  // ── Tablet: always collapsed sidebar ─────────────────────────────────────
  const effectiveCollapsed = isTablet ? true : collapsed

  // ── Desktop: full sidebar ──────────────────────────────────────────────────
  return (
    <aside
      style={{
        ...glassSidebar,
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        overflowY: 'auto',
        width: effectiveCollapsed ? '64px' : '240px',
        transition: 'width 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* Logo area */}
      <div
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          padding: effectiveCollapsed ? '0' : '0 20px',
          justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(167, 139, 250, 0.35)',
          }}
        >
          <ChartBar size={14} color="white" />
        </div>
        {!effectiveCollapsed && (
          <span
            style={{
              marginLeft: '12px',
              fontWeight: 600,
              fontSize: '14px',
              background: 'linear-gradient(90deg, #c4b5fd, #a5b4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            Content Analyzer
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: '12px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflowY: 'auto',
        }}
      >
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path)
          const hovered = hoveredItem === label
          const itemStyle = active
            ? glassNavItemActive
            : hovered
            ? glassNavItemHover
            : glassNavItem

          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              onMouseEnter={() => setHoveredItem(label)}
              onMouseLeave={() => setHoveredItem(null)}
              title={effectiveCollapsed ? label : undefined}
              className="glow-nav"
              style={{
                ...itemStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '0 8px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: active ? 500 : 400,
                textAlign: 'left',
                color: active
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
                background: itemStyle.background ?? 'transparent',
                minHeight: '44px',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!effectiveCollapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom: version + collapse toggle (desktop only) */}
      {!isTablet && (
        <div
          style={{
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {!effectiveCollapsed && (
            <p style={{ fontSize: '11px', padding: '0 20px', color: 'var(--text-muted)' }}>
              v0.1.0
            </p>
          )}
          <button
            onClick={onToggle}
            title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="glow-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 8px',
              padding: '9px 12px',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              minHeight: '44px',
            }}
          >
            {effectiveCollapsed
              ? <ChevronRight size={17} />
              : <><ChevronLeft size={17} style={{ flexShrink: 0 }} /><span style={{ fontSize: '12px' }}>Collapse</span></>
            }
          </button>
        </div>
      )}
    </aside>
  )
}

export default memo(Sidebar)
