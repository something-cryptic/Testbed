interface Props {
  name: string | null
  email: string | null
  avatarUrl: string | null
  onLogout: () => void
}

export default function UserHeader({ name, email, avatarUrl, onLogout }: Props) {
  const displayName = name ?? email ?? 'Account'
  const initial = displayName.charAt(0).toUpperCase()

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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-violet-700/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-violet-900/50">
                {initial}
              </div>
            )}
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm text-violet-200 font-medium">{displayName}</span>
              {name && email && (
                <span className="text-xs text-violet-400/70">{email}</span>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-violet-300 hover:text-violet-100 transition-colors border border-violet-800/50 hover:border-violet-600/60 px-3 py-1 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
