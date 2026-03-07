import { and, eq, gt, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { chatMessages } from '@/core/database/schema'
import type { NewChatMessage } from '@/core/database/schema'

export class ChatRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewChatMessage) {
    const [message] = await this.db.insert(chatMessages).values(data).returning()
    return message!
  }

  async findByAppointment(appointmentId: string) {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.appointmentId, appointmentId))
      .orderBy(sql`${chatMessages.createdAt} ASC`)
  }

  async findAfterTimestamp(appointmentId: string, after: Date) {
    return this.db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.appointmentId, appointmentId),
          gt(chatMessages.createdAt, after),
        ),
      )
      .orderBy(sql`${chatMessages.createdAt} ASC`)
  }
}
