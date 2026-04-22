import type { CSSProperties } from 'react'

export const glassCard: CSSProperties = {
  background: 'var(--glass-base)',
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  borderTop: '1px solid var(--border-subtle)',
  borderLeft: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-accent)',
  borderRight: '1px solid var(--border-accent)',
  borderRadius: '20px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
  color: 'var(--text-primary)',
  width: '100%',
  minHeight: '88px',
  position: 'relative',
  zIndex: 1,
  willChange: 'transform',
  transform: 'translateZ(0)',
}

export const glassSidebar: CSSProperties = {
  background: 'var(--glass-medium)',
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  borderRight: '1px solid var(--border-accent)',
  boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
  position: 'relative',
  zIndex: 1,
}

export const glassNavItem: CSSProperties = {
  borderRadius: '12px',
  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  border: '1px solid transparent',
  color: 'var(--text-secondary)',
}

export const glassNavItemActive: CSSProperties = {
  background: 'var(--glass-base)',
  borderRadius: '12px',
  borderTop: '1px solid var(--border-subtle)',
  borderLeft: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-accent-strong)',
  borderRight: '1px solid var(--border-accent-strong)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  color: 'var(--text-primary)',
}

export const glassNavItemHover: CSSProperties = {
  background: 'var(--glass-base)',
  borderRadius: '12px',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
}

export const glassHeader: CSSProperties = {
  background: 'var(--glass-medium)',
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  borderBottom: '1px solid var(--border-accent)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative',
  zIndex: 1,
}

export const glassButton: CSSProperties = {
  background: 'var(--button-base)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderTop: '1px solid var(--border-subtle)',
  borderLeft: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-accent-strong)',
  borderRight: '1px solid var(--border-accent-strong)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cursor: 'pointer',
  willChange: 'transform',
  minHeight: '44px',
}

export const glassHolisticCard: CSSProperties = {
  background: 'var(--glass-medium)',
  backdropFilter: 'blur(16px) saturate(150%)',
  WebkitBackdropFilter: 'blur(16px) saturate(150%)',
  borderTop: '1px solid var(--border-subtle)',
  borderLeft: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-accent)',
  borderRight: '1px solid var(--border-accent)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  color: 'var(--text-primary)',
  width: '100%',
  position: 'relative',
  zIndex: 1,
}

// Light card — no backdropFilter, for use in long scrollable lists to avoid GPU overdraw
export const glassCardLight: CSSProperties = {
  background: 'var(--glass-base)',
  borderTop: '1px solid var(--border-subtle)',
  borderLeft: '1px solid var(--border-subtle)',
  borderBottom: '1px solid var(--border-accent)',
  borderRight: '1px solid var(--border-accent)',
  borderRadius: '16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  position: 'relative',
  zIndex: 1,
  color: 'var(--text-primary)',
  width: '100%',
  willChange: 'transform',
  transform: 'translateZ(0)',
}

export const transparent: CSSProperties = {
  background: 'transparent',
  position: 'relative',
  zIndex: 1,
}
