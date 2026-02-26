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
  'confirmed',
  'cancelled',
  'completed',
])

// ─── Consultation Services ───────────────────────────────────────────────────
// Each astrologer configures their own details for up to 4 service types (101–104).
// service_code maps to a consultation category (e.g. 101 = Kundli, 102 = Tarot, etc.)

export const consultationServices = pgTable(
  'consultation_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    astrologerId: uuid('astrologer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serviceCode: smallint('service_code').notNull(), // 101 | 102 | 103 | 104
    title: varchar('title', { length: 255 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }).notNull(),
    coverImage: text('cover_image').notNull(),
    about: text('about').notNull(),
    durationMinutes: smallint('duration_minutes').notNull(), // e.g. 30, 45, 60
    price: numeric('price', { precision: 10, scale: 2 }), // optional pricing
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb('meta').$type<any>(), // Flexible metadata — accepts any JSON value (string, array, object, etc.)
  },
  (t) => ({
    // One astrologer can configure each service code only once
    uniqueAstrologerService: unique().on(t.astrologerId, t.serviceCode),
  }),
)

// ─── Availability Windows ────────────────────────────────────────────────────
// Astrologer declares: "On YYYY-MM-DD I am free from HH:MM to HH:MM in <timezone>"

export const availabilityWindows = pgTable(
  'availability_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    astrologerId: uuid('astrologer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // e.g. "2025-02-20"
    startTime: time('start_time').notNull(), // e.g. "17:00:00"
    endTime: time('end_time').notNull(), // e.g. "20:00:00"
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb('meta').$type<any>(), // Flexible metadata — accepts any JSON value (string, array, object, etc.)
  },
  (t) => ({
    // Only one availability window per astrologer per date
    uniqueAstrologerDate: unique().on(t.astrologerId, t.date),
  }),
)

// ─── Appointments ────────────────────────────────────────────────────────────
// Stores a confirmed booking slot with a Google Meet link.

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  astrologerId: uuid('astrologer_id')
    .notNull()
    .references(() => users.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => consultationServices.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  durationMinutes: smallint('duration_minutes').notNull(),
  meetLink: text('meet_link').notNull(),
  googleEventId: text('google_event_id'),
  status: appointmentStatusEnum('status').notNull().default('confirmed'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  meta: jsonb('meta').$type<any>(), // Flexible metadata — accepts any JSON value (string, array, object, etc.)
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConsultationService = typeof consultationServices.$inferSelect
export type NewConsultationService = typeof consultationServices.$inferInsert

export type AvailabilityWindow = typeof availabilityWindows.$inferSelect
export type NewAvailabilityWindow = typeof availabilityWindows.$inferInsert

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
