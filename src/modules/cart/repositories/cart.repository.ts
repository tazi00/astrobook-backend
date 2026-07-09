import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { cartItems } from '@/core/database/schema'
import type { NewCartItem } from '@/core/database/schema'

export class CartRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewCartItem) {
    const [item] = await this.db.insert(cartItems).values(data).returning()
    return item!
  }

  async findMine(userId: string) {
    return this.db.select().from(cartItems).where(eq(cartItems.userId, userId))
  }

  async findByIdsForUser(ids: string[], userId: string) {
    if (ids.length === 0) return []
    return this.db
      .select()
      .from(cartItems)
      .where(and(inArray(cartItems.id, ids), eq(cartItems.userId, userId)))
  }

  async setSlot(id: string, userId: string, scheduledAt: Date) {
    const [item] = await this.db
      .update(cartItems)
      .set({ scheduledAt, updatedAt: new Date() })
      .where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
      .returning()
    return item ?? null
  }

  async delete(id: string, userId: string) {
    await this.db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
  }

  async deleteMany(ids: string[], userId: string) {
    if (ids.length === 0) return
    await this.db
      .delete(cartItems)
      .where(and(inArray(cartItems.id, ids), eq(cartItems.userId, userId)))
  }
}
