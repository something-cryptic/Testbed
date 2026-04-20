import type { Recommendation } from '@analyzer/types'

const impactColors = {
  high: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  low: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
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
    <div className="bg-[#1a1625]/80 border border-violet-800/30 rounded-xl p-5 flex flex-col gap-3 hover:border-violet-600/50 hover:bg-[#1e1a2e]/80 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg">{categoryIcons[rec.category] ?? '💡'}</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${impactColors[rec.expectedImpact]}`}
        >
          {rec.expectedImpact} impact
        </span>
      </div>
      <p className="font-semibold text-sm leading-snug text-violet-100">{rec.finding}</p>
      <p className="text-sm text-violet-200 leading-relaxed">{rec.action}</p>
      {rec.supportingData && (
        <p className="text-xs text-violet-300/80 italic">{rec.supportingData}</p>
      )}
    </div>
  )
}
