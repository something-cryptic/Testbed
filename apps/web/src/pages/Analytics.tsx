import { useEffect, useState, useMemo, useRef, useCallback, memo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useBreakpoint } from '../hooks/useBreakpoint.ts'
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ChartBar, ChevronDown } from 'lucide-react'
import { useUser } from '../context/UserContext.tsx'
import { glassCard, glassCardLight, glassButton, transparent } from '../styles/glass.ts'
import type { NormalizedPost } from '@analyzer/types'

interface Props {
  userId: string
}

// ── Chart option lists ────────────────────────────────────────────────────────

const youtubeChartOptions = [
  { id: 'views_over_time',   label: 'Views Over Time' },
  { id: 'likes_vs_comments', label: 'Likes vs Comments' },
  { id: 'length_vs_views',   label: 'Video Length vs Views' },
  { id: 'upload_frequency',  label: 'Upload Frequency' },
  { id: 'ctr_vs_impressions',label: 'CTR vs Impressions' },
  { id: 'top_videos',        label: 'Top Videos by Views' },
  { id: 'best_days',         label: 'Best Performing Days' },
  { id: 'best_times',        label: 'Best Upload Times' },
  { id: 'avg_view_duration', label: 'Average View Duration' },
  { id: 'retention_rate',    label: 'Retention Rate' },
  { id: 'watch_time_total',  label: 'Total Watch Time' },
  { id: 'watch_time_vs_views', label: 'Watch Time vs Views' },
]

const twitchChartOptions = [
  { id: 'stream_views_over_time', label: 'Stream Views Over Time' },
  { id: 'duration_vs_views',      label: 'Stream Duration vs Views' },
  { id: 'streaming_frequency',    label: 'Streaming Frequency' },
  { id: 'peak_days',              label: 'Peak Viewing Days' },
  { id: 'peak_times',             label: 'Peak Viewing Times' },
  { id: 'longest_streams',        label: 'Longest Streams vs Views' },
  { id: 'avg_watch_time',         label: 'Average Watch Time per Stream' },
  { id: 'retention_by_duration',  label: 'Retention by Stream Length' },
  { id: 'total_watch_time',       label: 'Total Watch Time Over Time' },
  { id: 'views_by_day',           label: 'Views by Day of Week' },
]

const instagramChartOptions = [
  { id: 'reach_over_time',      label: 'Post Reach Over Time' },
  { id: 'engagement_by_type',   label: 'Engagement by Post Type' },
  { id: 'best_posting_times',   label: 'Best Posting Times' },
  { id: 'reels_vs_photos',      label: 'Reels vs Photo Performance' },
  { id: 'impressions_over_time',label: 'Impressions Over Time' },
  { id: 'saves_vs_shares',      label: 'Saves vs Shares' },
  { id: 'watch_time_reels',     label: 'Reel Watch Time' },
  { id: 'scroll_retention',     label: 'Scroll Retention Rate' },
]

// ── Shared chart style constants ──────────────────────────────────────────────

const GRID_STYLE = { stroke: 'rgba(200,180,255,0.08)' }
const AXIS_TICK  = { fill: 'rgba(200,180,255,0.5)', fontSize: 11 }
const TOOLTIP_STYLE: CSSProperties = {
  background: 'rgba(28, 22, 50, 0.95)',
  border: '1px solid rgba(200,180,255,0.2)',
  borderRadius: '10px',
  color: 'white',
  fontSize: '12px',
}

// ── Helper functions ──────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function getDayLabel(i: number): string { return DAY_LABELS[i] ?? '' }

function getHourLabel(h: number): string {
  if (h === 0) return '12AM'
  if (h === 12) return '12PM'
  return h < 12 ? `${h}AM` : `${h - 12}PM`
}

function groupByWeek(posts: NormalizedPost[]): { week: string; count: number; avgViews: number }[] {
  const map = new Map<string, { views: number; count: number; ts: number }>()
  for (const p of posts) {
    const d = new Date(p.publishedAt)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    const existing = map.get(key) ?? { views: 0, count: 0, ts: monday.getTime() }
    map.set(key, { views: existing.views + p.metrics.views, count: existing.count + 1, ts: existing.ts })
  }
  return Array.from(map.entries())
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([key, { views, count }]) => ({
      week: `${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      count,
      avgViews: count ? Math.round(views / count) : 0,
    }))
}

function groupByDayOfWeek(posts: NormalizedPost[]): { day: string; avgViews: number; totalViews: number; count: number }[] {
  const acc: { views: number; count: number }[] = Array.from({ length: 7 }, () => ({ views: 0, count: 0 }))
  for (const p of posts) {
    const day = new Date(p.publishedAt).getDay()
    acc[day]!.views += p.metrics.views
    acc[day]!.count += 1
  }
  // Start week on Monday
  return [1,2,3,4,5,6,0].map((i) => ({
    day: getDayLabel(i),
    avgViews: acc[i]!.count ? Math.round(acc[i]!.views / acc[i]!.count) : 0,
    totalViews: acc[i]!.views,
    count: acc[i]!.count,
  }))
}

function groupByHour(posts: NormalizedPost[]): { hour: string; avgViews: number; count: number }[] {
  const acc: { views: number; count: number }[] = Array.from({ length: 24 }, () => ({ views: 0, count: 0 }))
  for (const p of posts) {
    const h = new Date(p.publishedAt).getHours()
    acc[h]!.views += p.metrics.views
    acc[h]!.count += 1
  }
  return acc.map((a, h) => ({
    hour: getHourLabel(h),
    avgViews: a.count ? Math.round(a.views / a.count) : 0,
    count: a.count,
  }))
}

function cumulativeSum(posts: NormalizedPost[], getValue: (p: NormalizedPost) => number) {
  const sorted = [...posts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
  let running = 0
  return sorted.map((p) => {
    running += getValue(p)
    return { date: fmtDate(p.publishedAt), total: running, title: p.title }
  })
}

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: 0 }
  const sumX  = data.reduce((s, d) => s + d.x, 0)
  const sumY  = data.reduce((s, d) => s + d.y, 0)
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0)
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function bestDay(posts: NormalizedPost[]): string {
  const byDay: Record<number, number> = {}
  for (const p of posts) {
    const day = new Date(p.publishedAt).getDay()
    byDay[day] = (byDay[day] ?? 0) + p.metrics.views
  }
  const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
  return best ? getDayLabel(parseInt(best[0])) : '—'
}

function inferPostType(p: NormalizedPost): string {
  const t = p.title.toUpperCase()
  if (t.startsWith('REEL')) return 'REEL'
  if (t.startsWith('CAROUSEL')) return 'CAROUSEL'
  return 'IMAGE'
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

function TwitchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#9146FF">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#E1306C">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  )
}

// ── ChartSelector dropdown ────────────────────────────────────────────────────

interface ChartOption { id: string; label: string }

function ChartSelector({ options, selected, onChange, isMobile }: {
  options: ChartOption[]
  selected: string
  onChange: (id: string) => void
  isMobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find((o) => o.id === selected)?.label ?? selected

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', width: isMobile ? '100%' : undefined }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(200,180,255,0.2)',
          borderRadius: '10px',
          padding: '6px 12px',
          color: 'rgba(220,210,255,0.9)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          width: isMobile ? '100%' : undefined,
          minHeight: '44px',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
      >
        {selectedLabel}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            left: isMobile ? 0 : undefined,
            background: 'rgba(28, 22, 50, 0.95)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(200,180,255,0.2)',
            borderRadius: '12px',
            padding: '6px',
            minWidth: isMobile ? 'unset' : '240px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: o.id === selected ? 'white' : 'rgba(220,210,255,0.8)',
                background: o.id === selected ? 'rgba(210,195,255,0.15)' : 'transparent',
                fontWeight: o.id === selected ? 500 : 400,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (o.id !== selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(210,195,255,0.1)'
              }}
              onMouseLeave={(e) => {
                if (o.id !== selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatBox({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div style={{ ...glassCardLight, padding: '12px 16px' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(240, 235, 255, 1)', lineHeight: 1.2 }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(196, 181, 253, 0.6)', marginTop: '4px' }}>
        {label}
      </p>
      {sublabel && (
        <p style={{ fontSize: '11px', color: 'rgba(180, 160, 220, 0.35)', marginTop: '2px' }}>
          {sublabel}
        </p>
      )}
    </div>
  )
}

function SkeletonCard() {
  const { isMobile } = useBreakpoint()
  return (
    <div
      className="animate-pulse"
      style={{ ...glassCard, padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.45 }}
    >
      <div style={{ height: '20px', width: '200px', background: 'rgba(200,180,255,0.1)', borderRadius: '6px' }} />
      <div style={{ height: isMobile ? '160px' : '200px', background: 'rgba(200,180,255,0.06)', borderRadius: '10px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{ height: '72px', background: 'rgba(200,180,255,0.06)', borderRadius: '10px' }} />
        ))}
      </div>
    </div>
  )
}

function platformCardStyle(accent: string): CSSProperties {
  return {
    ...glassCard,
    borderBottom: `1px solid ${accent}`,
    borderRight: `1px solid ${accent}`,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }
}

// ── YouTube card ──────────────────────────────────────────────────────────────

const YouTubeCard = memo(function YouTubeCard({ posts, channelName, subscriberCount }: {
  posts: NormalizedPost[]
  channelName: string
  subscriberCount: number
}) {
  const [selectedChart, setSelectedChart] = useState('views_over_time')
  const { isMobile } = useBreakpoint()

  const sortedAsc = useMemo(
    () => [...posts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()),
    [posts],
  )

  const chartData = useMemo(() => {
    switch (selectedChart) {
      case 'views_over_time':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), views: p.metrics.views, title: p.title }))
      case 'likes_vs_comments':
        return posts.map((p) => ({ x: p.metrics.likes, y: p.metrics.comments, title: p.title }))
      case 'length_vs_views':
        return posts.map((p) => ({ x: Math.round(p.metrics.watchTimeSeconds / 60), y: p.metrics.views, title: p.title }))
      case 'upload_frequency':
        return groupByWeek(posts).map((w) => ({ week: w.week, count: w.count }))
      case 'ctr_vs_impressions':
        return posts.map((p) => ({ x: p.metrics.impressions, y: Math.round(p.metrics.clickThroughRate * 1000) / 10, title: p.title }))
      case 'top_videos':
        return [...posts].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 10)
          .map((p) => ({ name: truncate(p.title, 35), views: p.metrics.views })).reverse()
      case 'best_days':
        return groupByDayOfWeek(posts).map((d) => ({ day: d.day, avgViews: d.avgViews }))
      case 'best_times':
        return groupByHour(posts).map((h) => ({ hour: h.hour, avgViews: h.avgViews }))
      case 'avg_view_duration':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), minutes: Math.round(p.metrics.watchTimeSeconds / 60), title: p.title }))
      case 'retention_rate':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), retention: Math.round(p.metrics.averageViewPercentage * 10) / 10, title: p.title }))
      case 'watch_time_total':
        return cumulativeSum(posts, (p) => p.metrics.watchTimeSeconds / 3600).map((d) => ({ ...d, total: Math.round(d.total * 10) / 10 }))
      case 'watch_time_vs_views':
        return posts.map((p) => ({ x: p.metrics.views, y: Math.round(p.metrics.watchTimeSeconds / 60), title: p.title }))
      default:
        return []
    }
  }, [posts, sortedAsc, selectedChart])

  const stats = useMemo(() => {
    const totalViews = posts.reduce((s, p) => s + p.metrics.views, 0)
    const avgViews = posts.length ? Math.round(totalViews / posts.length) : 0
    switch (selectedChart) {
      case 'retention_rate': {
        const pcts = posts.map((p) => p.metrics.averageViewPercentage).filter((v) => v > 0)
        const avg = pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length * 10) / 10 : 0
        const best = pcts.length ? Math.round(Math.max(...pcts) * 10) / 10 : 0
        const above50 = pcts.filter((v) => v >= 50).length
        return [
          { label: 'Avg Retention', value: `${avg}%` },
          { label: 'Best Video', value: `${best}%` },
          { label: 'Above 50%', value: String(above50), sublabel: 'videos' },
          { label: 'Total Videos', value: String(posts.length) },
        ]
      }
      case 'avg_view_duration': {
        const durations = posts.map((p) => p.metrics.watchTimeSeconds).filter((v) => v > 0)
        const avgDur = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : 0
        const maxDur = durations.length ? Math.max(...durations) : 0
        return [
          { label: 'Avg Duration', value: formatDuration(avgDur) },
          { label: 'Longest', value: formatDuration(maxDur) },
          { label: 'Avg Views', value: fmt(avgViews) },
          { label: 'Total Videos', value: String(posts.length) },
        ]
      }
      case 'watch_time_total':
      case 'watch_time_vs_views': {
        const totalHrs = Math.round(posts.reduce((s, p) => s + p.metrics.watchTimeSeconds, 0) / 3600)
        const avgHrs = posts.length ? Math.round(totalHrs / posts.length * 10) / 10 : 0
        return [
          { label: 'Total Watch Time', value: `${fmt(totalHrs)}h` },
          { label: 'Avg per Video', value: `${avgHrs}h` },
          { label: 'Total Views', value: fmt(totalViews) },
          { label: 'Total Videos', value: String(posts.length) },
        ]
      }
      case 'views_over_time': {
        const months = new Map<string, number>()
        for (const p of posts) {
          const m = new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          months.set(m, (months.get(m) ?? 0) + p.metrics.views)
        }
        const best = Array.from(months.entries()).sort((a, b) => b[1] - a[1])[0]
        const sorted2 = [...posts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
        const half = Math.floor(sorted2.length / 2)
        const firstHalf  = sorted2.slice(0, half).reduce((s, p) => s + p.metrics.views, 0) / (half || 1)
        const secondHalf = sorted2.slice(half).reduce((s, p) => s + p.metrics.views, 0) / ((sorted2.length - half) || 1)
        const growth = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0
        return [
          { label: 'Total Views', value: fmt(totalViews) },
          { label: 'Avg Views/Video', value: fmt(avgViews) },
          { label: 'Best Month', value: best?.[0] ?? '—' },
          { label: 'Growth Rate', value: `${growth > 0 ? '+' : ''}${growth}%`, sublabel: 'vs earlier period' },
        ]
      }
      default:
        return [
          { label: 'Total Views', value: fmt(totalViews) },
          { label: 'Avg Views/Video', value: fmt(avgViews) },
          { label: 'Total Videos', value: String(posts.length) },
          { label: 'Best Day', value: bestDay(posts) },
        ]
    }
  }, [posts, selectedChart])

  const baseHeight = isMobile ? 180 : 220
  const chartHeight = selectedChart === 'top_videos' ? Math.max(chartData.length * 36 + 16, baseHeight) : baseHeight

  return (
    <div style={{ ...platformCardStyle('rgba(255, 0, 0, 0.3)'), padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <YouTubeIcon />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'rgba(255, 180, 180, 0.95)' }}>
              YouTube Analytics
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.5)', marginTop: '2px' }}>
              {channelName} · {fmt(subscriberCount)} subscribers
            </p>
          </div>
        </div>
        <ChartSelector options={youtubeChartOptions} selected={selectedChart} onChange={setSelectedChart} isMobile={isMobile} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        {selectedChart === 'views_over_time' ? (
          <AreaChart data={chartData as { date: string; views: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF0000" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(200,180,255,0.06)' }} formatter={(v: number) => [fmt(v), 'Views']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="views" stroke="#FF0000" strokeWidth={2} fill="url(#ytGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'likes_vs_comments' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Likes" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} label={{ value: 'Likes', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Comments" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [fmt(v), name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#FF6B6B" fillOpacity={0.8} />
          </ScatterChart>
        ) : selectedChart === 'length_vs_views' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Duration" unit="m" tick={AXIS_TICK} tickLine={false} axisLine={false} label={{ value: 'Duration (min)', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Views" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'Views' ? fmt(v) : `${v}m`, name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#FF0000" fillOpacity={0.75} />
          </ScatterChart>
        ) : selectedChart === 'upload_frequency' ? (
          <BarChart data={chartData as { week: string; count: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Uploads']} />
            <Bar dataKey="count" fill="#FF0000" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'ctr_vs_impressions' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Impressions" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} label={{ value: 'Impressions', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="CTR" unit="%" tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'CTR' ? `${v}%` : fmt(v), name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#FF6B6B" fillOpacity={0.8} />
          </ScatterChart>
        ) : selectedChart === 'top_videos' ? (
          <BarChart data={chartData as { name: string; views: number }[]} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={170} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Views']} />
            <Bar dataKey="views" fill="#FF0000" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: fmt, fill: 'rgba(200,180,255,0.45)', fontSize: 11 }} />
          </BarChart>
        ) : selectedChart === 'best_days' ? (
          <BarChart data={chartData as { day: string; avgViews: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Avg Views']} />
            <Bar dataKey="avgViews" fill="#FF0000" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'best_times' ? (
          <BarChart data={chartData as { hour: string; avgViews: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Avg Views']} />
            <Bar dataKey="avgViews" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'avg_view_duration' ? (
          <AreaChart data={chartData as { date: string; minutes: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="ytDurGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF0000" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="m" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}m`, 'Avg Duration']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="minutes" stroke="#FF0000" strokeWidth={2} fill="url(#ytDurGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'retention_rate' ? (
          <AreaChart data={chartData as { date: string; retention: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="ytRetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Retention']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: '50% avg', fill: 'rgba(200,180,255,0.4)', fontSize: 11 }} />
            <Area type="monotone" dataKey="retention" stroke="#FF6B6B" strokeWidth={2} fill="url(#ytRetGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'watch_time_total' ? (
          <AreaChart data={chartData as { date: string; total: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="ytWtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF0000" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${fmt(v)}h`} width={52} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${fmt(v)}h`, 'Cumulative Watch Time']} />
            <Area type="monotone" dataKey="total" stroke="#FF0000" strokeWidth={2} fill="url(#ytWtGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'watch_time_vs_views' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Views" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} label={{ value: 'Views', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Watch Time" unit="m" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'Views' ? fmt(v) : `${v}m`, name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#FF0000" fillOpacity={0.75} />
          </ScatterChart>
        ) : <BarChart data={[]}><CartesianGrid /></BarChart>}
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((s, i) => <StatBox key={i} label={s.label} value={s.value} sublabel={s.sublabel} />)}
      </div>
    </div>
  )
})

// ── Twitch card ───────────────────────────────────────────────────────────────

const TwitchCard = memo(function TwitchCard({ posts, channelName, followerCount }: {
  posts: NormalizedPost[]
  channelName: string
  followerCount: number
}) {
  const [selectedChart, setSelectedChart] = useState('stream_views_over_time')
  const { isMobile } = useBreakpoint()

  const sortedAsc = useMemo(
    () => [...posts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()),
    [posts],
  )

  const chartData = useMemo(() => {
    switch (selectedChart) {
      case 'stream_views_over_time':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), views: p.metrics.views, title: p.title }))
      case 'duration_vs_views':
        return posts.map((p) => ({ x: Math.round(p.metrics.watchTimeSeconds / 360) / 10, y: p.metrics.views, title: p.title, dur: formatDuration(p.metrics.watchTimeSeconds) }))
      case 'streaming_frequency':
        return groupByWeek(posts).map((w) => ({ week: w.week, count: w.count }))
      case 'peak_days':
        return groupByDayOfWeek(posts).map((d) => ({ day: d.day, avgViews: d.avgViews }))
      case 'peak_times':
        return groupByHour(posts).map((h) => ({ hour: h.hour, avgViews: h.avgViews }))
      case 'longest_streams':
        return [...posts].sort((a, b) => b.metrics.watchTimeSeconds - a.metrics.watchTimeSeconds).slice(0, 10)
          .map((p) => ({ name: truncate(p.title, 35), hours: Math.round(p.metrics.watchTimeSeconds / 360) / 10, views: p.metrics.views })).reverse()
      case 'avg_watch_time':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), hours: Math.round(p.metrics.watchTimeSeconds / 360) / 10, title: p.title }))
      case 'retention_by_duration': {
        const data = posts.map((p) => ({ x: Math.round(p.metrics.watchTimeSeconds / 360) / 10, y: p.metrics.views, title: p.title }))
        return data
      }
      case 'total_watch_time':
        return cumulativeSum(posts, (p) => p.metrics.watchTimeSeconds / 3600).map((d) => ({ ...d, total: Math.round(d.total * 10) / 10 }))
      case 'views_by_day':
        return groupByDayOfWeek(posts).map((d) => ({ day: d.day, totalViews: d.totalViews }))
      default:
        return []
    }
  }, [posts, sortedAsc, selectedChart])

  // Trend line for retention_by_duration
  const trendLine = useMemo(() => {
    if (selectedChart !== 'retention_by_duration') return null
    const pts = posts.map((p) => ({ x: p.metrics.watchTimeSeconds / 3600, y: p.metrics.views }))
    if (pts.length < 2) return null
    const { slope, intercept } = linearRegression(pts)
    const xs = pts.map((p) => p.x)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    return [
      { x: minX, y: Math.max(0, slope * minX + intercept) },
      { x: maxX, y: Math.max(0, slope * maxX + intercept) },
    ]
  }, [posts, selectedChart])

  const stats = useMemo(() => {
    const totalViews = posts.reduce((s, p) => s + p.metrics.views, 0)
    const avgViews = posts.length ? Math.round(totalViews / posts.length) : 0
    const totalSecs = posts.reduce((s, p) => s + p.metrics.watchTimeSeconds, 0)
    const avgDurSecs = posts.length ? totalSecs / posts.length : 0

    switch (selectedChart) {
      case 'duration_vs_views':
      case 'retention_by_duration':
      case 'avg_watch_time': {
        const durations = posts.map((p) => p.metrics.watchTimeSeconds).filter((v) => v > 0)
        const sorted = [...durations].sort((a, b) => a - b)
        const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? 0
        const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? 0
        return [
          { label: 'Optimal Length', value: `${Math.round(p25/360)/10}–${Math.round(p75/360)/10}h`, sublabel: 'middle 50%' },
          { label: 'Avg Duration', value: formatDuration(avgDurSecs) },
          { label: 'Total Hours Streamed', value: `${fmt(Math.round(totalSecs / 3600))}h` },
          { label: 'Avg Views', value: fmt(avgViews) },
        ]
      }
      default:
        return [
          { label: 'Total VODs', value: String(posts.length) },
          { label: 'Avg Views/Stream', value: fmt(avgViews) },
          { label: 'Most Streamed Day', value: bestDay(posts) },
          { label: 'Avg Stream Duration', value: formatDuration(avgDurSecs) },
        ]
    }
  }, [posts, selectedChart])

  const isLongestStreams = selectedChart === 'longest_streams'
  const baseHeight = isMobile ? 180 : 220
  const chartHeight = isLongestStreams ? Math.max(chartData.length * 36 + 16, baseHeight) : baseHeight

  return (
    <div style={{ ...platformCardStyle('rgba(145, 70, 255, 0.3)'), padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TwitchIcon />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'rgba(195, 160, 255, 0.95)' }}>
              Twitch Analytics
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.5)', marginTop: '2px' }}>
              {channelName} · {fmt(followerCount)} followers
            </p>
          </div>
        </div>
        <ChartSelector options={twitchChartOptions} selected={selectedChart} onChange={setSelectedChart} isMobile={isMobile} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        {selectedChart === 'stream_views_over_time' ? (
          <AreaChart data={chartData as { date: string; views: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="twGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9146FF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#9146FF" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(200,180,255,0.06)' }} formatter={(v: number) => [fmt(v), 'Views']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="views" stroke="#9146FF" strokeWidth={2} fill="url(#twGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'duration_vs_views' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Duration" unit="h" tick={AXIS_TICK} tickLine={false} axisLine={false} label={{ value: 'Duration (hrs)', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Views" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string, props) => [name === 'Views' ? fmt(v) : props.payload?.dur ?? `${v}h`, name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string; dur: string }[]} fill="#9146FF" fillOpacity={0.75} />
          </ScatterChart>
        ) : selectedChart === 'streaming_frequency' ? (
          <BarChart data={chartData as { week: string; count: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Streams']} />
            <Bar dataKey="count" fill="#9146FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'peak_days' ? (
          <BarChart data={chartData as { day: string; avgViews: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Avg Views']} />
            <Bar dataKey="avgViews" fill="#9146FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'peak_times' ? (
          <BarChart data={chartData as { hour: string; avgViews: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Avg Views']} />
            <Bar dataKey="avgViews" fill="#B380FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'longest_streams' ? (
          <BarChart data={chartData as { name: string; hours: number; views: number }[]} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} unit="h" />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={170} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'hours' ? `${v}h` : fmt(v), name === 'hours' ? 'Duration' : 'Views']} />
            <Bar dataKey="hours" fill="#9146FF" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => `${v}h`, fill: 'rgba(200,180,255,0.45)', fontSize: 11 }} />
          </BarChart>
        ) : selectedChart === 'avg_watch_time' ? (
          <AreaChart data={chartData as { date: string; hours: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="twWtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9146FF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#9146FF" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="h" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}h`, 'Stream Duration']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="hours" stroke="#9146FF" strokeWidth={2} fill="url(#twWtGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'retention_by_duration' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Duration" unit="h" tick={AXIS_TICK} tickLine={false} axisLine={false} label={{ value: 'Duration (hrs)', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Views" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'Views' ? fmt(v) : `${v}h`, name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#9146FF" fillOpacity={0.75} />
            {trendLine && (
              <Scatter data={trendLine} fill="none" line={{ stroke: 'rgba(145,70,255,0.5)', strokeWidth: 2, strokeDasharray: '4 4' }} shape={() => null as unknown as React.ReactElement} />
            )}
          </ScatterChart>
        ) : selectedChart === 'total_watch_time' ? (
          <AreaChart data={chartData as { date: string; total: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="twCumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9146FF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#9146FF" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${fmt(v)}h`} width={52} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${fmt(v)}h`, 'Cumulative Watch Time']} />
            <Area type="monotone" dataKey="total" stroke="#9146FF" strokeWidth={2} fill="url(#twCumGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'views_by_day' ? (
          <BarChart data={chartData as { day: string; totalViews: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Total Views']} />
            <Bar dataKey="totalViews" fill="#B380FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : <BarChart data={[]}><CartesianGrid /></BarChart>}
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((s, i) => <StatBox key={i} label={s.label} value={s.value} sublabel={s.sublabel} />)}
      </div>
    </div>
  )
})

// ── Instagram card ────────────────────────────────────────────────────────────

const InstagramCard = memo(function InstagramCard({ posts, channelName, followerCount }: {
  posts: NormalizedPost[]
  channelName: string
  followerCount: number
}) {
  const [selectedChart, setSelectedChart] = useState('reach_over_time')
  const { isMobile } = useBreakpoint()

  const sortedAsc = useMemo(
    () => [...posts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()),
    [posts],
  )

  const chartData = useMemo(() => {
    switch (selectedChart) {
      case 'reach_over_time':
      case 'impressions_over_time':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), impressions: p.metrics.impressions, title: p.title }))
      case 'engagement_by_type': {
        const typeMap: Record<string, { total: number; count: number }> = {}
        for (const p of posts) {
          const type = inferPostType(p)
          if (!typeMap[type]) typeMap[type] = { total: 0, count: 0 }
          typeMap[type]!.total += p.metrics.engagementRate * 100
          typeMap[type]!.count += 1
        }
        return Object.entries(typeMap).map(([type, { total, count }]) => ({
          type,
          rate: Math.round((total / count) * 10) / 10,
        }))
      }
      case 'best_posting_times':
        return groupByHour(posts).map((h) => ({ hour: h.hour, avgImpressions: h.avgViews }))
      case 'reels_vs_photos': {
        const reels  = posts.filter((p) => inferPostType(p) === 'REEL')
        const photos = posts.filter((p) => inferPostType(p) !== 'REEL')
        const avg = (arr: NormalizedPost[], key: keyof typeof arr[0]['metrics']) =>
          arr.length ? Math.round(arr.reduce((s, p) => s + (p.metrics[key] as number), 0) / arr.length) : 0
        return [
          { metric: 'Views',    reels: avg(reels, 'views'),    photos: avg(photos, 'views') },
          { metric: 'Likes',    reels: avg(reels, 'likes'),    photos: avg(photos, 'likes') },
          { metric: 'Comments', reels: avg(reels, 'comments'), photos: avg(photos, 'comments') },
          { metric: 'Shares',   reels: avg(reels, 'shares'),   photos: avg(photos, 'shares') },
        ]
      }
      case 'saves_vs_shares':
        return posts.map((p) => ({ x: p.metrics.shares, y: p.metrics.likes, title: p.title }))
      case 'watch_time_reels': {
        const reels = sortedAsc.filter((p) => inferPostType(p) === 'REEL')
        return reels.map((p) => ({ date: fmtDate(p.publishedAt), minutes: Math.round(p.metrics.watchTimeSeconds / 60), title: p.title }))
      }
      case 'scroll_retention':
        return sortedAsc.map((p) => ({ date: fmtDate(p.publishedAt), retention: Math.round(p.metrics.averageViewPercentage * 10) / 10, title: p.title }))
      default:
        return []
    }
  }, [posts, sortedAsc, selectedChart])

  const stats = useMemo(() => {
    const totalImpressions = posts.reduce((s, p) => s + p.metrics.impressions, 0)
    const avgEngagement = posts.length
      ? Math.round(posts.reduce((s, p) => s + p.metrics.engagementRate * 100, 0) / posts.length * 10) / 10
      : 0
    const typeMap: Record<string, { total: number; count: number }> = {}
    for (const p of posts) {
      const type = inferPostType(p)
      if (!typeMap[type]) typeMap[type] = { total: 0, count: 0 }
      typeMap[type]!.total += p.metrics.engagementRate
      typeMap[type]!.count += 1
    }
    const bestType = Object.entries(typeMap).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0]?.[0] ?? '—'

    switch (selectedChart) {
      case 'scroll_retention': {
        const pcts = posts.map((p) => p.metrics.averageViewPercentage).filter((v) => v > 0)
        const avg = pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length * 10) / 10 : 0
        const best = pcts.length ? Math.round(Math.max(...pcts) * 10) / 10 : 0
        return [
          { label: 'Avg Retention', value: `${avg}%` },
          { label: 'Best Post', value: `${best}%` },
          { label: 'Total Posts', value: String(posts.length) },
          { label: 'Best Type', value: bestType },
        ]
      }
      case 'watch_time_reels': {
        const reels = posts.filter((p) => inferPostType(p) === 'REEL')
        const totalSecs = reels.reduce((s, p) => s + p.metrics.watchTimeSeconds, 0)
        const avgSecs = reels.length ? totalSecs / reels.length : 0
        return [
          { label: 'Total Reels', value: String(reels.length) },
          { label: 'Avg Watch Time', value: formatDuration(avgSecs) },
          { label: 'Total Watch Time', value: formatDuration(totalSecs) },
          { label: 'Avg Engagement', value: `${avgEngagement}%` },
        ]
      }
      default:
        return [
          { label: 'Total Posts', value: String(posts.length) },
          { label: 'Avg Engagement', value: `${avgEngagement}%` },
          { label: 'Best Post Type', value: bestType, sublabel: 'by engagement' },
          { label: 'Total Impressions', value: fmt(totalImpressions) },
        ]
    }
  }, [posts, selectedChart])

  return (
    <div style={{ ...platformCardStyle('rgba(225, 48, 108, 0.3)'), padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <InstagramIcon />
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'rgba(255, 160, 190, 0.95)' }}>
              Instagram Analytics
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(200, 185, 235, 0.5)', marginTop: '2px' }}>
              {channelName} · {fmt(followerCount)} followers
            </p>
          </div>
        </div>
        <ChartSelector options={instagramChartOptions} selected={selectedChart} onChange={setSelectedChart} isMobile={isMobile} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
        {selectedChart === 'reach_over_time' || selectedChart === 'impressions_over_time' ? (
          <AreaChart data={chartData as { date: string; impressions: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E1306C" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(200,180,255,0.06)' }} formatter={(v: number) => [fmt(v), 'Impressions']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="impressions" stroke={selectedChart === 'impressions_over_time' ? '#F06292' : '#E1306C'} strokeWidth={2} fill="url(#igGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'engagement_by_type' ? (
          <BarChart data={chartData as { type: string; rate: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="type" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="%" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Avg Engagement']} />
            <Bar dataKey="rate" fill="#E1306C" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'best_posting_times' ? (
          <BarChart data={chartData as { hour: string; avgImpressions: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Avg Impressions']} />
            <Bar dataKey="avgImpressions" fill="#E1306C" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'reels_vs_photos' ? (
          <BarChart data={chartData as { metric: string; reels: number; photos: number }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="metric" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), '']} />
            <Bar dataKey="reels" name="Reels" fill="#E1306C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="photos" name="Photos/Carousel" fill="#F48FB1" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : selectedChart === 'saves_vs_shares' ? (
          <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="x" type="number" name="Shares" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} label={{ value: 'Shares', position: 'insideBottom', offset: -2, fill: 'rgba(200,180,255,0.35)', fontSize: 11 }} />
            <YAxis dataKey="y" type="number" name="Likes" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [fmt(v), name]}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Scatter data={chartData as { x: number; y: number; title: string }[]} fill="#E1306C" fillOpacity={0.8} />
          </ScatterChart>
        ) : selectedChart === 'watch_time_reels' ? (
          <AreaChart data={chartData as { date: string; minutes: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="igReelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E1306C" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="m" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}m`, 'Watch Time']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <Area type="monotone" dataKey="minutes" stroke="#E1306C" strokeWidth={2} fill="url(#igReelGrad)" dot={false} />
          </AreaChart>
        ) : selectedChart === 'scroll_retention' ? (
          <AreaChart data={chartData as { date: string; retention: number; title: string }[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="igRetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F06292" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#F06292" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid {...GRID_STYLE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Scroll Retention']}
              labelFormatter={(_l, p) => p?.[0]?.payload?.title ? truncate(p[0].payload.title, 40) : _l} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: '50% avg', fill: 'rgba(200,180,255,0.4)', fontSize: 11 }} />
            <Area type="monotone" dataKey="retention" stroke="#F06292" strokeWidth={2} fill="url(#igRetGrad)" dot={false} />
          </AreaChart>
        ) : <BarChart data={[]}><CartesianGrid /></BarChart>}
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((s, i) => <StatBox key={i} label={s.label} value={s.value} sublabel={s.sublabel} />)}
      </div>
    </div>
  )
})

// ── Page ──────────────────────────────────────────────────────────────────────

interface PlatformData {
  posts: NormalizedPost[]
  channelName: string
  subscriberCount: number
  videoCount: number
}

export default function Analytics({ userId }: Props) {
  const navigate = useNavigate()
  const { profile } = useUser()
  const { isMobile } = useBreakpoint()

  const [data, setData] = useState<Record<string, PlatformData>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    if (!profile) return

    const platforms = profile.connectedPlatforms.map((p) => p.platform)
    if (platforms.length === 0) { setLoading(false); return }

    const meta: Record<string, { channelName: string; subscriberCount: number; videoCount: number }> = {}
    for (const p of profile.connectedPlatforms) {
      meta[p.platform] = {
        channelName: p.channelName ?? '',
        subscriberCount: p.subscriberCount ?? 0,
        videoCount: p.videoCount ?? 0,
      }
    }

    const fetches = platforms.map((platform) =>
      axios
        .get<{ platform: string; posts: NormalizedPost[] }>(`/videos/${userId}?platform=${platform}`)
        .then(({ data: d }) => ({ platform, posts: d.posts }))
        .catch(() => ({ platform, posts: [] as NormalizedPost[] })),
    )

    Promise.allSettled(fetches).then((results) => {
      const next: Record<string, PlatformData> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const { platform, posts } = r.value
          next[platform] = { posts, ...meta[platform]! }
        }
      }
      setData(next)
      setLoading(false)
    })
  }, [profile, userId])

  useEffect(() => { fetchData() }, [fetchData])

  const connected = profile?.connectedPlatforms ?? []

  return (
    <div
      style={{
        ...transparent,
        maxWidth: '900px',
        margin: '0 auto',
        padding: isMobile ? '16px' : '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '16px' : '24px',
      }}
    >
      {/* No platforms */}
      {!loading && connected.length === 0 && (
        <div
          style={{
            ...glassCard,
            padding: '64px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,150,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChartBar size={24} color="#a78bfa" />
          </div>
          <p style={{ fontWeight: 600, color: 'rgba(220,210,255,0.9)', fontSize: '16px' }}>No platforms connected yet</p>
          <p style={{ fontSize: '14px', color: 'rgba(180,160,220,0.55)', maxWidth: '280px', lineHeight: 1.5 }}>
            Connect a platform to see analytics here
          </p>
          <button onClick={() => navigate('/platforms')} className="glow-hover" style={{ ...glassButton, padding: '9px 20px', fontSize: '14px', marginTop: '8px' }}>
            Go to Platforms
          </button>
        </div>
      )}

      {/* Skeletons while loading */}
      {loading && connected.map((p) => <SkeletonCard key={p.platform} />)}

      {/* Platform cards */}
      {!loading && connected.map((cp) => {
        const d = data[cp.platform]
        if (!d) return null
        if (cp.platform === 'youtube')   return <YouTubeCard   key="youtube"   posts={d.posts} channelName={d.channelName} subscriberCount={d.subscriberCount} />
        if (cp.platform === 'twitch')    return <TwitchCard    key="twitch"    posts={d.posts} channelName={d.channelName} followerCount={d.subscriberCount} />
        if (cp.platform === 'instagram') return <InstagramCard key="instagram" posts={d.posts} channelName={d.channelName} followerCount={d.subscriberCount} />
        return null
      })}
    </div>
  )
}
