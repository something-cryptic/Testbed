interface Props {
  email: string | null
  onLogout: () => void
}

export default function UserHeader({ email, onLogout }: Props) {
  const initial = email ? email.charAt(0).toUpperCase() : '?'
  const displayName = email ?? 'Account'

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 sticky top-0 z-10 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* App name */}
        <span className="font-semibold text-white">Content Analyzer</span>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {initial}
            </div>
            <span className="text-sm text-gray-300 hidden sm:block">{displayName}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 hover:border-gray-500 px-3 py-1 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
