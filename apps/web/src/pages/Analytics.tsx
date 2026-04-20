import { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import axios from 'axios'

interface Props {
  userId: string
}

interface PlatformProfile {
  platform: string
  channelName: string
}

export default function Analytics({ userId }: Props) {
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([])

  useEffect(() => {
    axios
      .get(`/users/${userId}/profile`)
      .then(({ data }) => {
        const d = data as { connectedPlatforms: PlatformProfile[] }
        setPlatforms(d.connectedPlatforms ?? [])
      })
      .catch(() => {})
  }, [userId])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-violet-100">Analytics</h1>
        <p className="text-sm text-violet-300/70 mt-1">Detailed analytics and graphs coming soon</p>
      </div>

      {/* Empty state or per-platform cards */}
      {platforms.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center">
            <BarChart2 size={28} className="text-violet-400" />
          </div>
          <p className="text-violet-300 font-medium">No platforms connected yet</p>
          <p className="text-sm text-violet-400/60 max-w-xs">
            Connect a platform from the Dashboard to see analytics here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {platforms.map((p) => (
            <div
              key={p.platform}
              className="bg-[#1a1625]/80 border border-violet-800/30 rounded-2xl p-6 flex items-center gap-5"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-900/40 border border-violet-700/30 flex items-center justify-center">
                <BarChart2 size={20} className="text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-violet-100 capitalize">
                  {p.platform === 'youtube' ? 'YouTube' : 'Instagram'} Analytics
                </p>
                <p className="text-sm text-violet-300/60 mt-0.5">Coming soon — detailed charts and trends</p>
              </div>
              <span className="ml-auto text-xs bg-violet-800/40 text-violet-300 border border-violet-700/30 px-2.5 py-1 rounded-full">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
