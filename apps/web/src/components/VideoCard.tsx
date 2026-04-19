import type { NormalizedPost } from '@analyzer/types'

interface Props {
  post: NormalizedPost
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function VideoCard({ post }: Props) {
  const { title, thumbnailUrl, publishedAt, metrics } = post
  const date = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden flex flex-col hover:ring-1 hover:ring-gray-700 transition-all">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt={title} className="w-full aspect-video object-cover" />
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="font-medium text-sm leading-snug line-clamp-2">{title}</p>
        <p className="text-xs text-gray-500">{date}</p>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
          <Stat label="Views" value={fmt(metrics.views)} />
          <Stat label="Likes" value={fmt(metrics.likes)} />
          <Stat label="Eng%" value={`${metrics.engagementRate.toFixed(2)}%`} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}
