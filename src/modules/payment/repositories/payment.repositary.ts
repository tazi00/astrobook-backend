import { eq, sql } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { payments } from '@/core/database/schema'
import type { NewPayment } from '@/core/database/schema'

export class PaymentRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewPayment) {
    const [payment] = await this.db.insert(payments).values(data).returning()
    return payment!
  }

  async findById(id: string) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    return payment ?? null
  }

  async findByAppointmentId(appointmentId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.appointmentId, appointmentId))
      .limit(1)
    return payment ?? null
  }

  async findByOrderId(razorpayOrderId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpayOrderId))
      .limit(1)
    return payment ?? null
  }

  async updateByOrderId(
    razorpayOrderId: string,
    data: Partial<{
      status: 'pending' | 'success' | 'failed'
      razorpayPaymentId: string
      razorpaySignature: string
    }>,
  ) {
    const [payment] = await this.db
      .update(payments)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(payments.razorpayOrderId, razorpayOrderId))
      .returning()
    return payment ?? null
  }
}
