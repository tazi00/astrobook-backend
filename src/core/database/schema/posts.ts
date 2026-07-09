import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const mediaTypeEnum = pgEnum('media_type', ['IMAGE', 'VIDEO', 'TEXT'])

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  astrologerId: uuid('astrologer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  mediaUrl: text('media_url'), // ImageKit URL
  mediaType: mediaTypeEnum('media_type').default('TEXT'),
  linkedServiceId: uuid('linked_service_id'), // optional — Book Now ke liye
  // Explore ke categories ke saath match karne ke liye — services.tags jaisi hi
  // ids (e.g. "vedic-astrology", "tarot"). Category detail page isi se posts filter karta hai.
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
