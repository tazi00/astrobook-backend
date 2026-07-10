import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

// ─── Push Tokens ────────────────────────────────────────────────────────────
// Ek user ke multiple devices ho sakte hain (phone + tablet, ya reinstall
// baad naya token) — isliye ek user ke multiple rows ho sakti hain.
// (userId, expoPushToken) unique hai — same device dobara register kare
// toh duplicate row nahi banegi, bas updatedAt refresh hoga.

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoPushToken: text('expo_push_token').notNull(),
    platform: text('platform'), // 'ios' | 'android'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTokenUnique: unique().on(table.userId, table.expoPushToken),
  }),
)

export type PushToken = typeof pushTokens.$inferSelect
export type NewPushToken = typeof pushTokens.$inferInsert
