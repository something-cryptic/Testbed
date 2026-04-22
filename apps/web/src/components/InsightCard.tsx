import { memo } from 'react'
import type { CSSProperties } from 'react'
import type { Recommendation } from '@analyzer/types'
import { glassCardLight } from '../styles/glass.ts'

const impactColors = {
  high:   'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  low:    'bg-purple-500/10 text-purple-300 border-purple-500/20',
}

const categoryIcons: Record<string, string> = {
  titles:     '✏️',
  length:     '⏱️',
  timing:     '📅',
  tags:       '🏷️',
  thumbnails: '🖼️',
  content:    '🎬',
}

const categoryTint: Record<string, CSSProperties> = {
  titles:     { background: 'rgba(59, 130, 246, 0.06)'  },
  thumbnails: { background: 'rgba(59, 130, 246, 0.06)'  },
  timing:     { background: 'rgba(34, 197, 94, 0.06)'   },
  tags:       { background: 'rgba(34, 197, 94, 0.06)'   },
  length:     { background: 'rgba(251, 146, 60, 0.06)'  },
  content:    { background: 'rgba(168, 85, 247, 0.06)'  },
}

interface Props {
  rec: Recommendation
}

function InsightCard({ rec }: Props) {
  const tint = categoryTint[rec.category] ?? {}
  return (
    <div
      className="p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
      style={{ ...glassCardLight, ...tint, contentVisibility: 'auto', containIntrinsicSize: '0 160px' } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg">{categoryIcons[rec.category] ?? '💡'}</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${impactColors[rec.expectedImpact]}`}
        >
          {rec.expectedImpact} impact
        </span>
      </div>
      <p className="font-semibold text-sm leading-snug text-purple-50">{rec.finding}</p>
      <p className="text-sm text-purple-200 leading-relaxed">{rec.action}</p>
      {rec.supportingData && (
        <p className="text-xs text-purple-300/80 italic">{rec.supportingData}</p>
      )}
    </div>
  )
}

export default memo(InsightCard)
