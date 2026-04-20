import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  BarChart2,
  Lightbulb,
  Link,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',           icon: Home,       path: '/dashboard'      },
  { label: 'Analytics',           icon: BarChart2,  path: '/analytics'      },
  { label: 'Recommendations',     icon: Lightbulb,  path: '/recommendations'},
  { label: 'Platforms',           icon: Link,       path: '/dashboard'      },
  { label: 'Settings',            icon: Settings,   path: '/settings'       },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(path: string) {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full flex flex-col bg-[#0f172a] border-r border-white/5 z-20 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo area */}
      <div className={`h-14 flex items-center border-b border-white/5 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
          <BarChart2 size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent whitespace-nowrap overflow-hidden">
            Content Analyzer
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = isActive(path)
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom: version + collapse toggle */}
      <div className="border-t border-white/5 py-3 flex flex-col gap-2 shrink-0">
        {!collapsed && (
          <p className="text-xs text-gray-600 px-5">v0.1.0</p>
        )}
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} className="shrink-0" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
