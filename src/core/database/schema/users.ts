import { pgTable, uuid, varchar, timestamp, boolean, pgEnum, date, text, jsonb } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['user', 'astrologer', 'admin'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  role: userRoleEnum('role').notNull().default('user'),
  interests: text('interests').array(), // Array of interests: ['Numerology', 'Vastu', etc.]
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  isAstrologer: boolean('is_astrologer').notNull().default(false), // Can upgrade to astrologer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  meta: jsonb('meta').$type<any>(), // Flexible metadata — accepts any JSON value (string, array, object, etc.)
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
