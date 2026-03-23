import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  date,
  time,
  text,
  smallint,
  numeric,
  pgEnum,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core'
import { users } from './users'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending', // payment nahi hua abhi
  'confirmed', // payment done, time nahi aaya
  'ongoing', // session chal raha hai
  'completed', // session khatam
  'cancelled', // cancel hua
])

export const bundleStatusEnum = pgEnum('bundle_status', [
  'in_progress', // koi child session ongoing hai
  'paused', // current complete, future child pending
  'completed', // sab khatam
])

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed'])

export const serviceRequestStatusEnum = pgEnum('service_request_status', [
  'pending',
  'accepted',
  'rejected',
  'expired',
])

// ─── Consultation Services ───────────────────────────────────────────────────

export const consultationServices = pgTable(
  'consultation_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    astrologerId: uuid('astrologer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serviceCode: smallint('service_code').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }).notNull(),
    coverImage: text('cover_image').notNull(),
    about: text('about').notNull(),
    durationMinutes: smallint('duration_minutes').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb('meta').$type<any>(),
  },
  (t) => ({
    uniqueAstrologerService: unique().on(t.astrologerId, t.serviceCode),
  }),
)

// ─── Availability Windows ────────────────────────────────────────────────────

export const availabilityWindows = pgTable(
  'availability_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    astrologerId: uuid('astrologer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb('meta').$type<any>(),
  },
  (t) => ({
    uniqueAstrologerDate: unique().on(t.astrologerId, t.date),
  }),
)

// ─── Appointments ────────────────────────────────────────────────────────────

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  astrologerId: uuid('astrologer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => consultationServices.id, { onDelete: 'cascade' }),

  // Bundle / parent-child
  parentId: uuid('parent_id').references((): any => appointments.id, { onDelete: 'set null' }),
  bundleStatus: bundleStatusEnum('bundle_status'), // only on parent appointments

  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  durationMinutes: smallint('duration_minutes').notNull(),

  // Agora — only populated after payment
  agoraChannel: text('agora_channel'),
  agoraToken: text('agora_token'),

  status: appointmentStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  meta: jsonb('meta').$type<any>(),
})

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }),
  razorpaySignature: varchar('razorpay_signature', { length: 512 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Service Requests (Mid-session upsell) ───────────────────────────────────

export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentAppointmentId: uuid('parent_appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  astrologerId: uuid('astrologer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => consultationServices.id, { onDelete: 'cascade' }),
  proposedSlot: timestamp('proposed_slot', { withTimezone: true }).notNull(),
  status: serviceRequestStatusEnum('status').notNull().default('pending'),
  // Once accepted + paid, this links to the new child appointment
  childAppointmentId: uuid('child_appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConsultationService = typeof consultationServices.$inferSelect
export type NewConsultationService = typeof consultationServices.$inferInsert

export type AvailabilityWindow = typeof availabilityWindows.$inferSelect
export type NewAvailabilityWindow = typeof availabilityWindows.$inferInsert

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert

export type ServiceRequest = typeof serviceRequests.$inferSelect
export type NewServiceRequest = typeof serviceRequests.$inferInsert
