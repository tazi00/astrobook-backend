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

// ─── Booking ──────────────────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  astrologerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime({
    message: 'Must be a valid ISO datetime',
    offset: true,
  }),
  notes: z.string().max(500).optional(),
})

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export const CancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─── Payment ──────────────────────────────────────────────────────────────────

export const CreatePaymentOrderSchema = z.object({
  appointmentId: z.string().uuid(),
})

export const VerifyPaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

// ─── Service Request (Mid-session upsell) ────────────────────────────────────

export const CreateServiceRequestSchema = z.object({
  parentAppointmentId: z.string().uuid(),
  serviceId: z.string().uuid(),
  proposedSlot: z.string().datetime({ message: 'Must be a valid ISO datetime' }),
})

export const RespondServiceRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
})

// ─── Enums (for reference) ────────────────────────────────────────────────────

export const APPOINTMENT_STATUS = [
  'pending', // payment nahi hua
  'confirmed', // payment ho gaya, time nahi aaya
  'ongoing', // session chal raha hai
  'completed', // session khatam
  'cancelled', // cancel hua
] as const

export const BUNDLE_STATUS = [
  'in_progress', // koi child session ongoing hai
  'paused', // saare current complete, future child pending
  'completed', // sab khatam
] as const

export const SERVICE_REQUEST_STATUS = ['pending', 'accepted', 'rejected', 'expired'] as const

export const PAYMENT_STATUS = ['pending', 'success', 'failed'] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpsertServiceDto = z.infer<typeof UpsertServiceSchema>
export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>
export type CreateAvailabilityDto = z.infer<typeof CreateAvailabilitySchema>
export type CreateBookingDto = z.infer<typeof CreateBookingSchema>
export type CancelAppointmentDto = z.infer<typeof CancelAppointmentSchema>
export type CreatePaymentOrderDto = z.infer<typeof CreatePaymentOrderSchema>
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>
export type CreateServiceRequestDto = z.infer<typeof CreateServiceRequestSchema>
export type RespondServiceRequestDto = z.infer<typeof RespondServiceRequestSchema>

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number]
export type BundleStatus = (typeof BUNDLE_STATUS)[number]
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUS)[number]
export type PaymentStatus = (typeof PAYMENT_STATUS)[number]
