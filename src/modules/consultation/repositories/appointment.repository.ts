import { eq, and, gte, lte, or, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { appointments, consultationServices, users } from '@/core/database/schema'
import type { NewAppointment } from '@/core/database/schema'

export class AppointmentRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewAppointment) {
    const [appointment] = await this.db.insert(appointments).values(data).returning()
    return appointment!
  }

  async findById(id: string) {
    const [appointment] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1)
    return appointment ?? null
  }

  async findConfirmedByAstrologerInRange(
    astrologerId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.astrologerId, astrologerId),
          eq(appointments.status, 'confirmed'),
          lte(appointments.scheduledAt, rangeEnd),
          gte(appointments.endsAt, rangeStart),
        ),
      )
  }

  async findMineWithDetails(userId: string) {
    const astrologerUser = users
    return this.db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        endsAt: appointments.endsAt,
        durationMinutes: appointments.durationMinutes,
        agoraChannel: appointments.agoraChannel,
        agoraToken: appointments.agoraToken,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        service: {
          id: consultationServices.id,
          serviceCode: consultationServices.serviceCode,
          title: consultationServices.title,
          coverImage: consultationServices.coverImage,
          durationMinutes: consultationServices.durationMinutes,
          price: consultationServices.price,
        },
        astrologerName: astrologerUser.name,
        astrologerId: appointments.astrologerId,
        userId: appointments.userId,
      })
      .from(appointments)
      .innerJoin(consultationServices, eq(appointments.serviceId, consultationServices.id))
      .innerJoin(astrologerUser, eq(appointments.astrologerId, astrologerUser.id))
      .where(
        or(eq(appointments.userId, userId), eq(appointments.astrologerId, userId)),
      )
      .orderBy(sql`${appointments.scheduledAt} DESC`)
  }

  async updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed') {
    const [appointment] = await this.db
      .update(appointments)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(appointments.id, id))
      .returning()
    return appointment ?? null
  }
}
