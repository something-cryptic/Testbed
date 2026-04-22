import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { NormalizedPost, ChannelAnalytics, AnalysisResult } from '@analyzer/types'

// ── Zod schema for validating Claude's response ───────────────────────────────

const VALID_CATEGORIES = ['titles', 'length', 'timing', 'tags', 'thumbnails', 'content'] as const
type ValidCategory = (typeof VALID_CATEGORIES)[number]

const CATEGORY_ALIASES: Record<string, ValidCategory> = {
  content_strategy: 'content',
  channel_optimization: 'content',
  engagement: 'content',
}

function normalizeCategory(value: unknown): ValidCategory {
  if (typeof value !== 'string') return 'content'
  if ((VALID_CATEGORIES as readonly string[]).includes(value)) return value as ValidCategory
  return CATEGORY_ALIASES[value] ?? 'content'
}

const RecommendationSchema = z.object({
  category: z.unknown().transform(normalizeCategory),
  finding: z.string().min(1),
  action: z.string().min(1),
  expectedImpact: z.enum(['low', 'medium', 'high']),
  supportingData: z.string(),
})

const AnalysisResultSchema = z.object({
  topInsights: z.array(z.string().min(1)).min(1),
  quickWins: z.array(z.string().min(1)).min(1),
  contentGaps: z.array(z.string().min(1)),
  bestPerformingPatterns: z.array(z.string().min(1)),
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
    return null
  }
}

// ── Twitch-specific prompt instructions ──────────────────────────────────────

const TWITCH_METRICS_CONTEXT = `
TWITCH VOD DATA CONTEXT: Twitch VODs do not have likes or comments — ignore all zero values for likes, comments, and engagementRate entirely. These fields are structurally absent from Twitch, not a sign of poor performance.

The meaningful Twitch metrics are:
- views (view_count): how many people watched each VOD — this is the primary performance signal
- watchTimeSeconds: stream duration in seconds — analyze whether longer or shorter streams correlate with higher views
- title: look for title patterns (keywords, formatting, game names) that correlate with higher view counts
- publishedAt: extract streaming schedule patterns — which days of the week and times of day get the most viewers
- Streaming consistency: how regularly the creator streams, and whether gaps correlate with viewership drops

Focus Twitch recommendations on:
1. Optimal stream length (based on view_count vs watchTimeSeconds correlation)
2. Best streaming days and times (based on publishedAt timestamps of high-view VODs)
3. Title optimization (patterns in top-performing VOD titles)
4. Streaming frequency and consistency
5. Content focus (what topics or game categories drive more views)

Do not mention likes, comments, engagement rate, or CTR in Twitch-specific recommendations — these metrics do not exist for Twitch VODs.`

const TWITCH_HOLISTIC_CONTEXT = `
IMPORTANT — TWITCH DATA IN THIS HOLISTIC ANALYSIS: The Twitch posts in this dataset have likes=0, comments=0, and engagementRate=0. This is because Twitch VODs do not expose these metrics via the API — it is not a reflection of poor performance. When analyzing Twitch posts, use only views and watchTimeSeconds as performance indicators. Do not compare Twitch engagement rates to YouTube or Instagram engagement rates — they measure fundamentally different things and are not comparable. For cross-platform comparisons, use view counts only.`

// ── Main analysis function ────────────────────────────────────────────────────

export async function analyzeChannel(
  posts: NormalizedPost[],
  channelAnalytics: ChannelAnalytics,
  platforms: string | string[],
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })

  const platformList = Array.isArray(platforms) ? platforms : [platforms]
  const isMultiPlatform = platformList.length > 1

  const hasYouTube = platformList.includes('youtube')
  const hasInstagram = platformList.includes('instagram')
  const hasTwitch = platformList.includes('twitch')
  const isTwitchOnly = hasTwitch && !hasYouTube && !hasInstagram

  const processed = await callProcessor(posts)

  const userMessage =
    JSON.stringify(
      {
        platforms: platformList,
        channelAnalytics,
        posts: posts.slice(0, 30).map((p) => ({
          platform: p.platform,
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
    ) + '\n\nRemember: plain text only, no emojis in any field.'

  // ── Cross-platform instruction ────────────────────────────────────────────
  const crossPlatformInstruction = isMultiPlatform
    ? `This creator is active on multiple platforms (${platformList.join(', ')}). In crossPlatformOpportunities identify: which content topics perform well across platforms vs only one, how long-form content could be adapted for other formats, and where the creator is missing cross-promotion opportunities.${hasYouTube && hasInstagram ? ' Include how YouTube content could be adapted for Instagram Reels.' : ''}${hasTwitch ? ' Include how stream VODs could be clipped and repurposed for YouTube or Instagram.' : ''} Be specific with titles, topics, and numbers from the data.`
    : 'crossPlatformOpportunities must be an empty array [].'

  // ── Twitch context — injected when any Twitch data is present ────────────
  const twitchContext = isTwitchOnly
    ? TWITCH_METRICS_CONTEXT
    : hasTwitch
    ? TWITCH_HOLISTIC_CONTEXT
    : ''

  // ── Role line — adjusted for Twitch-only analyses ────────────────────────
  const roleLine = isTwitchOnly
    ? `You are a Twitch growth strategist. Analyze the creator's VOD data and respond with ONLY a valid JSON object. No markdown, no explanation, just the raw JSON object.`
    : `You are a content growth strategist. Analyze the creator's data and respond with ONLY a valid JSON object. No markdown, no explanation, just the raw JSON object.`

  const systemPrompt =
    `${roleLine}\n\n` +
    `IMPORTANT: Do not use any emojis anywhere in your response. No emojis in insight text, recommendation text, action text, finding text, or any other field. Use plain text only throughout the entire response.\n\n` +
    `The JSON must follow this EXACT structure with no extra fields:\n` +
    `{\n` +
    `  "topInsights": ["string", "string", "string"],\n` +
    `  "quickWins": ["string", "string", "string"],\n` +
    `  "contentGaps": ["string", "string"],\n` +
    `  "bestPerformingPatterns": ["string", "string"],\n` +
    `  "crossPlatformOpportunities": [],\n` +
    `  "recommendations": [\n` +
    `    {\n` +
    `      "category": "titles",\n` +
    `      "finding": "one sentence describing the finding",\n` +
    `      "action": "one sentence describing what to do",\n` +
    `      "expectedImpact": "high",\n` +
    `      "supportingData": "one sentence with specific data"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `category must be exactly one of: titles, length, timing, tags, thumbnails, content\n` +
    `expectedImpact must be exactly one of: low, medium, high\n` +
    `All arrays must have at least 2 items.\n` +
    `All string fields must be non-empty.\n` +
    `${crossPlatformInstruction}` +
    (twitchContext ? `\n\n${twitchContext}` : '')

  console.log('Sending to Claude - post count:', posts.length)
  console.log('Platform:', platformList.join(', '))

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')

  let text = raw.text.trim()

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    console.error('JSON.parse failed. Raw text:', text)
    throw new Error(`Claude returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    const validated = AnalysisResultSchema.parse({
      ...(parsed as object),
      generatedAt: new Date().toISOString(),
    })
    return validated
  } catch (e) {
    console.error('Zod validation failed. Parsed JSON:', JSON.stringify(parsed, null, 2))
    throw new Error(`Claude response failed validation: ${e instanceof Error ? e.message : String(e)}`)
  }
}
