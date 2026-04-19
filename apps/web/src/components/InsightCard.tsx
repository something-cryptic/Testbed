import type { Recommendation } from '@analyzer/types'

const impactColors = {
  high: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const categoryIcons: Record<string, string> = {
  titles: '✏️',
  length: '⏱️',
  timing: '📅',
  tags: '🏷️',
  thumbnails: '🖼️',
  content: '🎬',
}

interface Props {
  rec: Recommendation
}

export default function InsightCard({ rec }: Props) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 flex flex-col gap-3 hover:ring-1 hover:ring-gray-700 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg">{categoryIcons[rec.category] ?? '💡'}</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${impactColors[rec.expectedImpact]}`}
        >
          {rec.expectedImpact} impact
        </span>
      </div>
      <p className="font-semibold text-sm leading-snug">{rec.finding}</p>
      <p className="text-sm text-gray-400 leading-relaxed">{rec.action}</p>
      {rec.supportingData && (
        <p className="text-xs text-gray-600 italic">{rec.supportingData}</p>
      )}
    </div>
  )
}
