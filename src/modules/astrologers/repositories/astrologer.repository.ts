// src/modules/astrologers/repositories/astrologer.repository.ts
import { eq, and, gte } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { users, consultationServices, availabilityWindows } from '@/core/database/schema'

export class AstrologerRepository {
  constructor(private readonly db: Database) {}

  async findAll() {
    return this.db.select().from(users).where(eq(users.isAstrologer, true))
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.isAstrologer, true)))
      .limit(1)
    return user ?? null
  }

  async findServices(astrologerId: string) {
    return this.db
      .select()
      .from(consultationServices)
      .where(
        and(
          eq(consultationServices.astrologerId, astrologerId),
          eq(consultationServices.isActive, true),
        ),
      )
      .orderBy(consultationServices.serviceCode)
  }

  async findSlots(astrologerId: string) {
    const today = new Date().toISOString().split('T')[0]!
    return this.db
      .select()
      .from(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.astrologerId, astrologerId),
          eq(availabilityWindows.isActive, true),
          gte(availabilityWindows.date, today),
        ),
      )
      .orderBy(availabilityWindows.date)
  }
}
