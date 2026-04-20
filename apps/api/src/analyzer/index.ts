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

// ── Main analysis function ────────────────────────────────────────────────────

export async function analyzeChannel(
  posts: NormalizedPost[],
  channelAnalytics: ChannelAnalytics,
  platforms: string | string[],
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })

  const platformList = Array.isArray(platforms) ? platforms : [platforms]
  const isMultiPlatform = platformList.length > 1

  const processed = await callProcessor(posts)

  const userMessage = JSON.stringify(
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
  )

  const crossPlatformInstruction = isMultiPlatform
    ? 'This creator is active on both YouTube and Instagram. In crossPlatformOpportunities identify: which content topics perform well on both vs only one platform, how YouTube content could be adapted for Instagram Reels, and where the creator is missing cross-promotion opportunities. Be specific with titles, topics, and numbers from the data.'
    : 'crossPlatformOpportunities must be an empty array [].'

  const systemPrompt =
    `You are a YouTube growth strategist. Analyze the creator's data and respond with ONLY a valid JSON object. No markdown, no explanation, just the raw JSON object.\n\n` +
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
    `${crossPlatformInstruction}`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')

  let text = raw.text.trim()
  console.log('Raw Claude response:', text.slice(0, 200))

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
