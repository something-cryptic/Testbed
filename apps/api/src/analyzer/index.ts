import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { NormalizedPost, ChannelAnalytics, AnalysisResult } from '@analyzer/types'

const client = new Anthropic()

// ── Zod schema for validating Claude's response ───────────────────────────────

const RecommendationSchema = z.object({
  category: z.enum(['titles', 'length', 'timing', 'tags', 'thumbnails', 'content']),
  finding: z.string(),
  action: z.string(),
  expectedImpact: z.enum(['low', 'medium', 'high']),
  supportingData: z.string(),
})

const AnalysisResultSchema = z.object({
  topInsights: z.array(z.string()),
  quickWins: z.array(z.string()),
  contentGaps: z.array(z.string()),
  bestPerformingPatterns: z.array(z.string()),
  recommendations: z.array(RecommendationSchema),
  crossPlatformOpportunities: z.array(z.string()),
  generatedAt: z.string(),
})

// ── Python processor call ─────────────────────────────────────────────────────

interface ProcessorResult {
  avgEngagementRate: number
  bestPostingDays: string[]
  bestPostingHours: number[]
  optimalVideoLength: number
  topPerformingTags: string[]
  viewVelocityScore: number
  consistencyScore: number
  engagementTrend: string
}

async function callProcessor(posts: NormalizedPost[]): Promise<ProcessorResult | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch('http://localhost:8001/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    return (await res.json()) as ProcessorResult
  } catch {
    // Processor is down or timed out — fall back to raw data
    return null
  }
}

// ── Main analysis function ────────────────────────────────────────────────────

export async function analyzeChannel(
  posts: NormalizedPost[],
  channelAnalytics: ChannelAnalytics,
  platform: string,
): Promise<AnalysisResult> {
  // Try processor first; fall back gracefully
  const processed = await callProcessor(posts)

  const userMessage = JSON.stringify(
    {
      platform,
      channelAnalytics,
      posts: posts.slice(0, 30).map((p) => ({
        title: p.title,
        publishedAt: p.publishedAt,
        tags: p.tags.slice(0, 10),
        metrics: p.metrics,
        duration: p.metrics.watchTimeSeconds,
      })),
      ...(processed ? { processorInsights: processed } : {}),
    },
    null,
    2,
  )

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system:
      'You are a social media growth strategist with deep expertise in YouTube analytics. ' +
      'Analyze this creator\'s data and return ONLY a JSON object matching the AnalysisResult interface. ' +
      'Be specific — reference actual titles, numbers, and dates from their data. ' +
      'Do not wrap in markdown.',
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')

  let text = raw.text.trim()
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(text) as unknown
  const validated = AnalysisResultSchema.parse({
    ...(parsed as object),
    generatedAt: new Date().toISOString(),
  })

  return validated
}
