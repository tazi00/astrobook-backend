import { eq, and, sql, desc, inArray } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { consultationServices, users } from '@/core/database/schema'
import type { CreateServiceDto, UpdateServiceDto } from '../schemas/consultation.schema'

const BASIC_SERVICE_DEFAULTS = {
  title: 'Basic Consultation',
  shortDescription: 'A quick starter consultation to get to know your concerns.',
  about:
    'This is your Basic consultation slot — a short session to discuss your questions and provide initial guidance. You can update the price and duration anytime from your dashboard.',
  durationMinutes: 30,
  price: '199',
} as const

export class ServiceRepository {
  constructor(private readonly db: Database) {}

  // Astrologer khud ek nayi "normal" service banata hai — koi natural
  // uniqueness key nahi (Premium/Elite tier hata diya), har call ek nayi row.
  async create(astrologerId: string, dto: CreateServiceDto) {
    const [service] = await this.db
      .insert(consultationServices)
      .values({
        astrologerId,
        isBasic: false,
        title: dto.title,
        shortDescription: dto.shortDescription,
        coverImage: dto.coverImage,
        about: dto.about,
        durationMinutes: dto.durationMinutes,
        price: dto.price !== undefined ? String(dto.price) : null,
        tags: dto.tags,
        isActive: true,
      })
      .returning()
    return service!
  }

  // Platform ka auto-created "Basic" consultancy — upgradeToAstrologer flow
  // se call hota hai (koi image nahi, fixed starter price/duration).
  async createBasic(astrologerId: string) {
    const [service] = await this.db
      .insert(consultationServices)
      .values({
        astrologerId,
        isBasic: true,
        title: BASIC_SERVICE_DEFAULTS.title,
        shortDescription: BASIC_SERVICE_DEFAULTS.shortDescription,
        coverImage: null,
        about: BASIC_SERVICE_DEFAULTS.about,
        durationMinutes: BASIC_SERVICE_DEFAULTS.durationMinutes,
        price: BASIC_SERVICE_DEFAULTS.price,
        tags: [],
        isActive: true,
      })
      .returning()
    return service!
  }

  // Koi bhi service edit karna (Basic ho ya normal) — astrologer sirf apni
  // price/duration/title/etc update kar sakta hai, ownership caller checks.
  async update(id: string, astrologerId: string, dto: UpdateServiceDto) {
    const [service] = await this.db
      .update(consultationServices)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.about !== undefined && { about: dto.about }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.price !== undefined && { price: String(dto.price) }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(consultationServices.id, id), eq(consultationServices.astrologerId, astrologerId)),
      )
      .returning()
    return service ?? null
  }

  async findById(id: string) {
    const [service] = await this.db
      .select()
      .from(consultationServices)
      .where(eq(consultationServices.id, id))
      .limit(1)
    return service ?? null
  }

  // Cart enrichment ke liye — ek saath multiple service ids fetch karo (N+1 avoid)
  async findByIds(ids: string[]) {
    if (ids.length === 0) return []
    return this.db
      .select()
      .from(consultationServices)
      .where(inArray(consultationServices.id, ids))
  }

  // Basic sabse pehle, phir naye se purane
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
      .orderBy(desc(consultationServices.isBasic), consultationServices.createdAt)
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

  // Ek category/tag ke saare (kisi bhi astrologer ke) active normal services —
  // Explore category detail page ke "Consultancies" section ke liye
  async findByTag(tag: string, limit = 20, offset = 0) {
    return this.db
      .select({
        id: consultationServices.id,
        astrologerId: consultationServices.astrologerId,
        astrologerName: users.name,
        title: consultationServices.title,
        shortDescription: consultationServices.shortDescription,
        coverImage: consultationServices.coverImage,
        durationMinutes: consultationServices.durationMinutes,
        price: consultationServices.price,
        tags: consultationServices.tags,
      })
      .from(consultationServices)
      .innerJoin(users, eq(consultationServices.astrologerId, users.id))
      .where(
        and(
          eq(consultationServices.isActive, true),
          eq(consultationServices.isBasic, false),
          sql`${tag} = ANY(${consultationServices.tags})`,
        ),
      )
      .orderBy(desc(consultationServices.createdAt))
      .limit(limit)
      .offset(offset)
  }
}
