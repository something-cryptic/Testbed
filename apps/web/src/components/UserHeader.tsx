import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { glassHeader } from '../styles/glass.ts'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/analytics':       'Analytics',
  '/recommendations': 'Recommendations',
  '/platforms':       'Platforms',
  '/settings':        'Settings',
  '/profile':         'Profile',
}

interface Props {
  name: string | null
  email: string | null
  avatarUrl: string | null
  onLogout: () => void
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  color?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glow-hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        color: color ?? 'var(--text-secondary)',
        background: hovered ? 'rgba(210, 195, 255, 0.12)' : 'transparent',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.15s ease',
        minHeight: '44px',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}

export default function UserHeader({ name, email, avatarUrl, onLogout }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard'
  const displayName = name ?? email ?? 'Account'
  const initial = displayName.charAt(0).toUpperCase()

  const [isOpen, setIsOpen] = useState(false)
  const [triggerHovered, setTriggerHovered] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function openDropdown() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setIsOpen(true)
  }

  // Lock background scroll when dropdown is open on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = isOpen ? 'hidden' : ''
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen, isMobile])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function close(fn?: () => void) {
    setIsOpen(false)
    fn?.()
  }

  return (
    <header
      className="sticky top-0 z-10"
      style={{ ...glassHeader, height: '56px', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 100 }}
    >
      <div style={{ width: '100%', padding: isMobile ? '0 12px' : '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Page title — hidden on mobile (bottom nav provides context) */}
        {!isMobile && (
          <span
            style={{
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--text-primary)',
            }}
          >
            {pageTitle}
          </span>
        )}

        {/* Right side */}
        <div ref={containerRef} style={{ flexShrink: 0, marginLeft: isMobile ? 'auto' : 0 }}>
          {/* Trigger: avatar + name + chevron */}
          <button
            ref={triggerRef}
            onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
            onMouseEnter={() => setTriggerHovered(true)}
            onMouseLeave={() => setTriggerHovered(false)}
            className="glow-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '12px',
              background: triggerHovered || isOpen ? 'rgba(210, 195, 255, 0.08)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              minHeight: '44px',
            }}
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: '0 0 0 1.5px rgba(200, 185, 235, 0.2)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
            )}

            {/* Name block — hidden on mobile */}
            {!isMobile && (
              <div
                className="hidden sm:flex flex-col leading-tight"
                style={{ maxWidth: '160px', overflow: 'hidden' }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                {name && email && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {email}
                  </span>
                )}
              </div>
            )}

            {/* Chevron */}
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                flexShrink: 0,
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Overlay */}
          {isOpen && (
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(10, 8, 20, 0.67)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 9998,
                transition: 'all 0.2s ease',
              }}
            />
          )}

          {/* Dropdown — fixed positioned, full-width on mobile */}
          {isOpen && (
            <div
              className="dropdown-enter"
              style={
                isMobile
                  ? {
                      position: 'fixed',
                      top: dropdownPos.top,
                      left: '8px',
                      right: '8px',
                      zIndex: 9999,
                      padding: '8px',
                      borderRadius: '16px',
                      background: 'var(--glass-strong)',
                      backdropFilter: 'blur(60px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                      border: '1px solid var(--border-accent)',
                      borderBottom: '1px solid var(--border-accent-strong)',
                      borderRight: '1px solid var(--border-accent-strong)',
                      boxShadow: `
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        0 8px 16px rgba(0, 0, 0, 0.4),
                        0 24px 48px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.08)
                      `,
                    }
                  : {
                      position: 'fixed',
                      top: dropdownPos.top,
                      right: dropdownPos.right,
                      zIndex: 9999,
                      minWidth: '220px',
                      padding: '8px',
                      borderRadius: '16px',
                      background: 'var(--glass-strong)',
                      backdropFilter: 'blur(60px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                      border: '1px solid var(--border-accent)',
                      borderBottom: '1px solid var(--border-accent-strong)',
                      borderRight: '1px solid var(--border-accent-strong)',
                      boxShadow: `
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        0 8px 16px rgba(0, 0, 0, 0.4),
                        0 24px 48px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.08)
                      `,
                    }
              }
            >
              {/* Profile header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '4px',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>
                )}
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </p>
                  {email && (
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px',
                      }}
                    >
                      {email}
                    </p>
                  )}
                </div>
              </div>

              {/* Menu items */}
              <MenuItem
                icon={User}
                label="Profile"
                onClick={() => close(() => navigate('/profile'))}
              />
              <MenuItem
                icon={Settings}
                label="Settings"
                onClick={() => close(() => navigate('/settings'))}
              />

              {/* Divider */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '4px 0' }} />

              <MenuItem
                icon={LogOut}
                label="Sign Out"
                color="rgba(255, 150, 150, 0.9)"
                onClick={() => close(onLogout)}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
