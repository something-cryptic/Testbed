export interface PostMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  watchTimeSeconds: number
  impressions: number
  clickThroughRate: number
  engagementRate: number
  averageViewPercentage: number
}

export interface NormalizedPost {
  platform: string
  postId: string
  title: string
  description: string
  tags: string[]
  publishedAt: string
  thumbnailUrl: string
  metrics: PostMetrics
}

export interface ChannelAnalytics {
  totalViews: number
  totalWatchTime: number
  subscribersGained: number
  subscribersLost: number
  period: string
}

export interface Recommendation {
  category: 'titles' | 'length' | 'timing' | 'tags' | 'thumbnails' | 'content'
  finding: string
  action: string
  expectedImpact: 'low' | 'medium' | 'high'
  supportingData: string
}

export interface AnalysisResult {
  topInsights: string[]
  quickWins: string[]
  contentGaps: string[]
  bestPerformingPatterns: string[]
  recommendations: Recommendation[]
  crossPlatformOpportunities: string[]
  generatedAt: string
}

export interface InstagramMedia {
  id: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REEL'
  caption: string
  timestamp: string
  permalink: string
  thumbnailUrl: string
  metrics: PostMetrics
}

export interface InstagramInsights {
  followerCount: number
  followsCount: number
  mediaCount: number
  profileViews: number
  websiteClicks: number
  period: string
}

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface ConnectedPlatform {
  id: string
  userId: string
  platform: 'youtube' | 'instagram' | 'tiktok'
  accessToken: string
  refreshToken: string
  expiresAt: string
}
