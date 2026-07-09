import { eq, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { users, consultationServices } from '@/core/database/schema'
import type { OnboardingDto, UpdateProfileDto } from '../schemas/user.schema'

const BASIC_SERVICE_DEFAULTS = {
  title: 'Basic Consultation',
  shortDescription: 'A quick starter consultation to get to know your concerns.',
  about:
    'This is your Basic consultation slot — a short session to discuss your questions and provide initial guidance. You can update the price and duration anytime from your dashboard.',
  durationMinutes: 30,
  price: '199',
} as const

export class UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  }

  async findByPhone(phone: string) {
    const [user] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1)
    return user ?? null
  }

  async updateOnboarding(userId: string, dto: OnboardingDto) {
    const [user] = await this.db
      .update(users)
      .set({
        name: dto.name,
        email: dto.email ?? null,
        dateOfBirth: dto.dateOfBirth ?? null,
        interests: dto.interests ?? [],
        isOnboarded: true,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning()
    return user ?? null
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [user] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning()
    return user ?? null
  }

  // User ko astrologer bananе ke saath, platform automatically ek Basic
  // consultancy bhi bana deta hai (koi image nahi, fixed starter price ₹199 /
  // 30 min) — astrologer baad mein price/duration edit kar sakta hai apne
  // dashboard se. Dono operations ek hi transaction mein — dono ho ya kuch na ho.
  async upgradeToAstrologer(userId: string) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ isAstrologer: true, role: 'astrologer', updatedAt: sql`now()` })
        .where(eq(users.id, userId))
        .returning()

      if (!user) return null

      await tx.insert(consultationServices).values({
        astrologerId: userId,
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

      return user
    })
  }
}
