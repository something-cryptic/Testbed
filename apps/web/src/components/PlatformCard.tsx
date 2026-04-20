interface Props {
  platform: 'youtube' | 'instagram'
  channelName: string
  avatarUrl: string
  subscriberCount: number
  videoCount: number
  lastAnalyzed: string | null
  onAnalyze: () => void
  isAnalyzing: boolean
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

const platformConfig = {
  youtube: {
    label: 'YouTube',
    badgeClass: 'bg-red-600 text-white',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    Icon: YouTubeIcon,
    statLabel: 'subscribers',
    postLabel: 'videos',
  },
  instagram: {
    label: 'Instagram',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    buttonClass: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
    Icon: InstagramIcon,
    statLabel: 'followers',
    postLabel: 'posts',
  },
}

export default function PlatformCard({
  platform,
  channelName,
  avatarUrl,
  subscriberCount,
  videoCount,
  lastAnalyzed,
  onAnalyze,
  isAnalyzing,
}: Props) {
  const config = platformConfig[platform]
  const { Icon } = config

  const lastAnalyzedStr = lastAnalyzed
    ? new Date(lastAnalyzed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex items-center gap-5">
      {/* Avatar + platform badge */}
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={channelName} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xl font-bold">
            {channelName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={`absolute -bottom-1 -right-1 rounded-full p-1 ${config.badgeClass}`}>
          <Icon size={12} />
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{channelName}</p>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
          <span>{fmt(subscriberCount)} {config.statLabel}</span>
          <span>{fmt(videoCount)} {config.postLabel}</span>
        </div>
        {lastAnalyzedStr && (
          <p className="text-xs text-gray-600 mt-1">Last analyzed {lastAnalyzedStr}</p>
        )}
      </div>

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${config.buttonClass}`}
      >
        {isAnalyzing && <Spinner />}
        {isAnalyzing ? 'Analyzing…' : `Analyze ${config.label}`}
      </button>
    </div>
  )
}
