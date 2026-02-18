import { eq, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { users } from '@/core/database/schema'
import type { OnboardingDto, UpdateProfileDto } from '../schemas/user.schema'

export class UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  }

  async findByFirebaseUid(firebaseUid: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1)
    return user ?? null
  }

  async updateOnboarding(userId: string, dto: OnboardingDto) {
    const [user] = await this.db
      .update(users)
      .set({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth,
        interests: dto.interests,
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
      .set({
        ...dto,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning()
    return user ?? null
  }

  async upgradeToAstrologer(userId: string) {
    const [user] = await this.db
      .update(users)
      .set({
        isAstrologer: true,
        role: 'astrologer',
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning()
    return user ?? null
  }
}
