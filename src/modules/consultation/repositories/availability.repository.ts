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

  /**
   * Insert or update a window for a given (astrologer, date, startTime, endTime).
   * Ek astrologer same date pe multiple ALAG time windows rakh sakta hai —
   * sirf EXACT same date+start+end dobara submit hone par overwrite/reactivate
   * hota hai (idempotent resubmission), naya time range nayi row banati hai.
   */
  async upsert(astrologerId: string, dto: CreateAvailabilityDto) {
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
      .onConflictDoUpdate({
        target: [
          availabilityWindows.astrologerId,
          availabilityWindows.date,
          availabilityWindows.startTime,
          availabilityWindows.endTime,
        ],
        set: {
          timezone: sql`excluded.timezone`,
          isActive: true,
          updatedAt: sql`now()`,
        },
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

  // Ek date ke saare active windows (multiple ho sakte hain)
  async findAllByDate(astrologerId: string, date: string) {
    return this.db
      .select()
      .from(availabilityWindows)
      .where(
        and(
          eq(availabilityWindows.astrologerId, astrologerId),
          eq(availabilityWindows.date, date),
          eq(availabilityWindows.isActive, true),
        ),
      )
      .orderBy(availabilityWindows.startTime)
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
        and(eq(availabilityWindows.id, id), eq(availabilityWindows.astrologerId, astrologerId)),
      )
      .returning()
    return window ?? null
  }
}
