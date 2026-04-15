export default function VideoCard({ video }) {
  const thumbnail =
    video.thumbnails?.medium?.url ||
    video.thumbnails?.default?.url ||
    `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`

  const formatNumber = (num) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num?.toString() || '0'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const parseDuration = (iso) => {
    if (!iso) return ''
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return ''
    const h = parseInt(match[1] || 0)
    const m = parseInt(match[2] || 0)
    const s = parseInt(match[3] || 0)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        <img
          src={thumbnail}
          alt={video.title}
          className="w-full h-44 object-cover"
          onError={(e) => {
            e.target.src = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`
          }}
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
            {parseDuration(video.duration)}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 leading-snug">
          {video.title}
        </h3>

        <p className="text-xs text-gray-400 mb-3">{formatDate(video.publishedAt)}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{formatNumber(video.viewCount)}</p>
            <p className="text-xs text-gray-400">Views</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{formatNumber(video.likeCount)}</p>
            <p className="text-xs text-gray-400">Likes</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{formatNumber(video.commentCount)}</p>
            <p className="text-xs text-gray-400">Comments</p>
          </div>
        </div>

        {video.tags && video.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{video.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
