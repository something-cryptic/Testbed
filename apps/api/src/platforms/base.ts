import type { NormalizedPost, PostMetrics, ChannelAnalytics } from '@analyzer/types'

export abstract class BasePlatform {
  abstract getRecentPosts(userId: string): Promise<NormalizedPost[]>
  abstract getPostAnalytics(userId: string, postId: string): Promise<PostMetrics>
  abstract getChannelAnalytics(userId: string): Promise<ChannelAnalytics>
}
