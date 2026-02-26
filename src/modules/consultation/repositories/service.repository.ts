import { eq, and, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { consultationServices } from '@/core/database/schema'
import type { UpsertServiceDto } from '../schemas/consultation.schema'

export class ServiceRepository {
  constructor(private readonly db: Database) {}

  async upsert(astrologerId: string, dto: UpsertServiceDto) {
    const [service] = await this.db
      .insert(consultationServices)
      .values({
        astrologerId,
        serviceCode: dto.serviceCode,
        title: dto.title,
        shortDescription: dto.shortDescription,
        coverImage: dto.coverImage,
        about: dto.about,
        durationMinutes: dto.durationMinutes,
        price: dto.price !== undefined ? String(dto.price) : null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [consultationServices.astrologerId, consultationServices.serviceCode],
        set: {
          title: sql`excluded.title`,
          shortDescription: sql`excluded.short_description`,
          coverImage: sql`excluded.cover_image`,
          about: sql`excluded.about`,
          durationMinutes: sql`excluded.duration_minutes`,
          price: sql`excluded.price`,
          updatedAt: sql`now()`,
        },
      })
      .returning()
    return service!
  }

  async findById(id: string) {
    const [service] = await this.db
      .select()
      .from(consultationServices)
      .where(eq(consultationServices.id, id))
      .limit(1)
    return service ?? null
  }

  async findByAstrologer(astrologerId: string) {
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

  async findByAstrologerAndCode(astrologerId: string, serviceCode: number) {
    const [service] = await this.db
      .select()
      .from(consultationServices)
      .where(
        and(
          eq(consultationServices.astrologerId, astrologerId),
          eq(consultationServices.serviceCode, serviceCode),
        ),
      )
      .limit(1)
    return service ?? null
  }

  async deactivate(id: string, astrologerId: string) {
    const [service] = await this.db
      .update(consultationServices)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(
        and(eq(consultationServices.id, id), eq(consultationServices.astrologerId, astrologerId)),
      )
      .returning()
    return service ?? null
  }
}
