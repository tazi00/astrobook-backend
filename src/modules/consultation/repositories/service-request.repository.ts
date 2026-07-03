import { eq, and, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { serviceRequests, consultationServices, users } from '@/core/database/schema'
import type { NewServiceRequest } from '@/core/database/schema'

export class ServiceRequestRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewServiceRequest) {
    const [request] = await this.db.insert(serviceRequests).values(data).returning()
    return request!
  }

  async findById(id: string) {
    const [request] = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1)
    return request ?? null
  }

  // With service + astrologer details
  async findByIdWithDetails(id: string) {
    const [request] = await this.db
      .select({
        id: serviceRequests.id,
        parentAppointmentId: serviceRequests.parentAppointmentId,
        astrologerId: serviceRequests.astrologerId,
        userId: serviceRequests.userId,
        proposedSlot: serviceRequests.proposedSlot,
        status: serviceRequests.status,
        childAppointmentId: serviceRequests.childAppointmentId,
        createdAt: serviceRequests.createdAt,
        expiresAt: serviceRequests.expiresAt,
        service: {
          id: consultationServices.id,
          title: consultationServices.title,
          shortDescription: consultationServices.shortDescription,
          durationMinutes: consultationServices.durationMinutes,
          price: consultationServices.price,
          coverImage: consultationServices.coverImage,
        },
        astrologerName: users.name,
      })
      .from(serviceRequests)
      .innerJoin(consultationServices, eq(serviceRequests.serviceId, consultationServices.id))
      .innerJoin(users, eq(serviceRequests.astrologerId, users.id))
      .where(eq(serviceRequests.id, id))
      .limit(1)
    return request ?? null
  }

  // User ke pending requests
  async findPendingByUser(userId: string) {
    return this.db
      .select({
        id: serviceRequests.id,
        parentAppointmentId: serviceRequests.parentAppointmentId,
        astrologerId: serviceRequests.astrologerId,
        userId: serviceRequests.userId,
        proposedSlot: serviceRequests.proposedSlot,
        status: serviceRequests.status,
        childAppointmentId: serviceRequests.childAppointmentId,
        createdAt: serviceRequests.createdAt,
        expiresAt: serviceRequests.expiresAt,
        service: {
          id: consultationServices.id,
          title: consultationServices.title,
          shortDescription: consultationServices.shortDescription,
          durationMinutes: consultationServices.durationMinutes,
          price: consultationServices.price,
          coverImage: consultationServices.coverImage,
        },
        astrologerName: users.name,
      })
      .from(serviceRequests)
      .innerJoin(consultationServices, eq(serviceRequests.serviceId, consultationServices.id))
      .innerJoin(users, eq(serviceRequests.astrologerId, users.id))
      .where(and(eq(serviceRequests.userId, userId), eq(serviceRequests.status, 'pending')))
      .orderBy(sql`${serviceRequests.createdAt} DESC`)
  }

  // Astrologer ke sent requests
  async findByAstrologer(astrologerId: string) {
    return this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.astrologerId, astrologerId))
      .orderBy(sql`${serviceRequests.createdAt} DESC`)
  }

  async update(
    id: string,
    data: Partial<{
      status: 'pending' | 'accepted' | 'rejected' | 'expired'
      childAppointmentId: string
    }>,
  ) {
    const [request] = await this.db
      .update(serviceRequests)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(serviceRequests.id, id))
      .returning()
    return request ?? null
  }
}
