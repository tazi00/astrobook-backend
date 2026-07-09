import { eq, desc, sql, and } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { posts } from '@/core/database/schema'
import type { NewPost } from '@/core/database/schema/posts'

type FindFilters = {
  astrologerId?: string
  tag?: string
}

export class PostsRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPost) {
    const [post] = await this.db.insert(posts).values(data).returning()
    return post!
  }

  // Sabke posts — feed ke liye (latest first), optional astrologerId/tag filter
  async findAll(limit = 20, offset = 0, filters: FindFilters = {}) {
    const conditions = []
    if (filters.astrologerId) conditions.push(eq(posts.astrologerId, filters.astrologerId))
    if (filters.tag) conditions.push(sql`${filters.tag} = ANY(${posts.tags})`)

    return this.db
      .select()
      .from(posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // Ek astrologer ke posts
  async findByAstrologer(astrologerId: string, limit = 20, offset = 0) {
    return this.findAll(limit, offset, { astrologerId })
  }

  // Ek category/tag ke posts (Explore category detail page ke liye)
  async findByTag(tag: string, limit = 20, offset = 0) {
    return this.findAll(limit, offset, { tag })
  }

  async findById(id: string) {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id)).limit(1)
    return post ?? null
  }

  async delete(id: string) {
    await this.db.delete(posts).where(eq(posts.id, id))
  }
}
