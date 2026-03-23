import { eq, and, gte, lte, or, sql, inArray, lt, gt } from 'drizzle-orm'
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

  // Conflict check — confirmed + ongoing appointments in a time range
  async findConfirmedByAstrologerInRange(astrologerId: string, rangeStart: Date, rangeEnd: Date) {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.astrologerId, astrologerId),
          inArray(appointments.status, ['pending', 'confirmed', 'ongoing']),
          lt(appointments.scheduledAt, rangeEnd), // ← rangeEnd
          gt(appointments.endsAt, rangeStart), // ← rangeStart
        ),
      )
  }
  // Full detail query — with service + astrologer info
  private baseDetailQuery(db: Database) {
    return db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        endsAt: appointments.endsAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        bundleStatus: appointments.bundleStatus,
        parentId: appointments.parentId,
        agoraChannel: appointments.agoraChannel,
        agoraToken: appointments.agoraToken,
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
        astrologerName: users.name,
        astrologerId: appointments.astrologerId,
        userId: appointments.userId,
      })
      .from(appointments)
      .innerJoin(consultationServices, eq(appointments.serviceId, consultationServices.id))
      .innerJoin(users, eq(appointments.astrologerId, users.id))
  }

  // Grouped: upcoming / ongoing / completed / cancelled
  async findMineGrouped(userId: string) {
    const rows = await this.baseDetailQuery(this.db)
      .where(or(eq(appointments.userId, userId), eq(appointments.astrologerId, userId)))
      .orderBy(sql`${appointments.scheduledAt} ASC`)

    return {
      upcoming: rows.filter((r) => r.status === 'confirmed' || r.status === 'pending'),
      ongoing: rows.filter((r) => r.status === 'ongoing'),
      completed: rows.filter((r) => r.status === 'completed'),
      cancelled: rows.filter((r) => r.status === 'cancelled'),
    }
  }

  // Single appointment with full detail
  async findByIdWithDetails(id: string) {
    const [row] = await this.baseDetailQuery(this.db).where(eq(appointments.id, id)).limit(1)
    return row ?? null
  }

  // Child sessions of a parent appointment
  async findChildren(parentId: string) {
    return this.baseDetailQuery(this.db)
      .where(eq(appointments.parentId, parentId))
      .orderBy(sql`${appointments.scheduledAt} ASC`)
  }

  // Astrologer schedule — all confirmed/ongoing for a specific date
  async findByAstrologerAndDate(astrologerId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)
    return this.baseDetailQuery(this.db)
      .where(
        and(
          eq(appointments.astrologerId, astrologerId),
          inArray(appointments.status, ['confirmed', 'ongoing']),
          gte(appointments.scheduledAt, dayStart),
          lte(appointments.scheduledAt, dayEnd),
        ),
      )
      .orderBy(sql`${appointments.scheduledAt} ASC`)
  }

  async update(
    id: string,
    data: Partial<{
      status: 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled'
      bundleStatus: 'in_progress' | 'paused' | 'completed'
      agoraChannel: string
      agoraToken: string
    }>,
  ) {
    const [appointment] = await this.db
      .update(appointments)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(appointments.id, id))
      .returning()
    return appointment ?? null
  }
}
