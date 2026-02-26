import { eq, and, gte, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { availabilityWindows } from '@/core/database/schema'
import type { CreateAvailabilityDto } from '../schemas/consultation.schema'

export class AvailabilityRepository {
  constructor(private readonly db: Database) {}

  async create(astrologerId: string, dto: CreateAvailabilityDto) {
    const [window] = await this.db
      .insert(availabilityWindows)
      .values({
        astrologerId,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone,
        isActive: true,
      })
      .returning()
    return window!
  }

  async findById(id: string) {
    const [window] = await this.db
      .select()
      .from(availabilityWindows)
      .where(eq(availabilityWindows.id, id))
      .limit(1)
    return window ?? null
  }

  async findByDate(astrologerId: string, date: string) {
    const [window] = await this.db
      .select()
      .from(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.astrologerId, astrologerId),
          eq(availabilityWindows.date, date),
          eq(availabilityWindows.isActive, true),
        ),
      )
      .limit(1)
    return window ?? null
  }

  // Returns all upcoming active availability dates for a given astrologer
  async findUpcomingByAstrologer(astrologerId: string) {
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

  async delete(id: string, astrologerId: string) {
    const [window] = await this.db
      .update(availabilityWindows)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(availabilityWindows.id, id),
          eq(availabilityWindows.astrologerId, astrologerId),
        ),
      )
      .returning()
    return window ?? null
  }
}
