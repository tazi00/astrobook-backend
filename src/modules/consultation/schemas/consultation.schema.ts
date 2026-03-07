import { z } from 'zod'

// ─── Service Codes ────────────────────────────────────────────────────────────

export const SERVICE_CODES = [101, 102, 103, 104] as const
export type ServiceCode = (typeof SERVICE_CODES)[number]

export const ServiceCodeSchema = z.union([
  z.literal(101),
  z.literal(102),
  z.literal(103),
  z.literal(104),
])

// ─── Consultation Service ─────────────────────────────────────────────────────

export const UpsertServiceSchema = z.object({
  serviceCode: ServiceCodeSchema,
  title: z.string().min(3).max(255),
  shortDescription: z.string().min(10).max(500),
  coverImage: z.string().url('Cover image must be a valid URL'),
  about: z.string().min(20),
  durationMinutes: z
    .number()
    .int()
    .min(15, 'Minimum duration is 15 minutes')
    .max(180, 'Maximum duration is 180 minutes'),
  price: z.number().positive().optional(),
})

export const UpdateServiceSchema = UpsertServiceSchema.omit({ serviceCode: true }).partial()

// ─── Availability Window ──────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const CreateAvailabilitySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'Start time must be HH:MM (24h)'),
    endTime: z.string().regex(timeRegex, 'End time must be HH:MM (24h)'),
    timezone: z.string().default('Asia/Kolkata'),
  })
  .refine(
    (d) => {
      const [sh = 0, sm = 0] = d.startTime.split(':').map(Number)
      const [eh = 0, em = 0] = d.endTime.split(':').map(Number)
      return sh * 60 + sm < eh * 60 + em
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  )
  .refine(
    (d) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(d.date) >= today
    },
    { message: 'Availability date cannot be in the past', path: ['date'] },
  )

// ─── Booking — Initiate (creates Razorpay order) ──────────────────────────────

export const InitiateBookingSchema = z.object({
  astrologerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().max(500).optional(),
})

// ─── Booking — Confirm (verifies payment + creates appointment) ───────────────

export const ConfirmBookingSchema = z.object({
  astrologerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().max(500).optional(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

// ─── Kept for internal backwards compat (slot allocation uses this shape) ─────

export const CreateBookingSchema = InitiateBookingSchema

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export const CancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpsertServiceDto = z.infer<typeof UpsertServiceSchema>
export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>
export type CreateAvailabilityDto = z.infer<typeof CreateAvailabilitySchema>
export type CreateBookingDto = z.infer<typeof CreateBookingSchema>
export type InitiateBookingDto = z.infer<typeof InitiateBookingSchema>
export type ConfirmBookingDto = z.infer<typeof ConfirmBookingSchema>
export type CancelAppointmentDto = z.infer<typeof CancelAppointmentSchema>
