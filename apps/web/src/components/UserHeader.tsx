interface Props {
  email: string | null
  onLogout: () => void
}

export default function UserHeader({ email, onLogout }: Props) {
  const initial = email ? email.charAt(0).toUpperCase() : '?'
  const displayName = email ?? 'Account'

  return (
    <header className="border-b border-violet-900/40 bg-[#0f0d1a]/80 sticky top-0 z-10 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* App name */}
        <span className="font-semibold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          Content Analyzer
        </span>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-violet-900/50">
              {initial}
            </div>
            <span className="text-sm text-violet-300/70 hidden sm:block">{displayName}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-violet-400/60 hover:text-violet-300 transition-colors border border-violet-800/50 hover:border-violet-600/60 px-3 py-1 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
