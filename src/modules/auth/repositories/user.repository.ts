import { eq, or } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { users } from '@/core/database/schema'
import type { NewUser } from '@/core/database/schema'

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

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    return user ?? null
  }

  async findByPhone(phone: string) {
    const [user] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1)
    return user ?? null
  }

  async findByEmailOrPhone(email?: string, phone?: string) {
    if (!email && !phone) return null

    const conditions = []
    if (email) conditions.push(eq(users.email, email))
    if (phone) conditions.push(eq(users.phone, phone))

    const [user] = await this.db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1)

    return user ?? null
  }

  async create(data: NewUser) {
    const [user] = await this.db.insert(users).values(data).returning()
    return user!
  }

  async updateOnboardingStatus(id: string, isOnboarded: boolean) {
    const [user] = await this.db
      .update(users)
      .set({ isOnboarded, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return user ?? null
  }
}
