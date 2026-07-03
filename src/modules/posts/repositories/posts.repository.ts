import { eq, desc } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { posts } from '@/core/database/schema'
import type { NewPost } from '@/core/database/schema/posts'

export class PostsRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPost) {
    const [post] = await this.db
      .insert(posts)
      .values(data)
      .returning()
    return post!
  }

  // Sabke posts — feed ke liye (latest first)
  async findAll(limit = 20, offset = 0) {
    return this.db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // Ek astrologer ke posts
  async findByAstrologer(astrologerId: string, limit = 20, offset = 0) {
    return this.db
      .select()
      .from(posts)
      .where(eq(posts.astrologerId, astrologerId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findById(id: string) {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)
    return post ?? null
  }

  async delete(id: string) {
    await this.db.delete(posts).where(eq(posts.id, id))
  }
}
