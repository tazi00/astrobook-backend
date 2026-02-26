import { eq } from 'drizzle-orm'
import { getDb } from '@/core/database/client'
import {
  users,
  consultationServices,
  availabilityWindows,
  appointments,
} from '@/core/database/schema'

// ─── Fixed test identity UUIDs ────────────────────────────────────────────────
// Using clearly reserved UUIDs so test rows are easy to identify in the DB.
// Must be valid UUID v4 format (hex only, 8-4-4-4-12)
export const TEST_ASTROLOGER_ID = '00000000-0000-0000-0001-000000000001'
export const TEST_USER_ID      = '00000000-0000-0000-0001-000000000002'

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * Wipes any left-over test data from a previous run then inserts fresh
 * test users (astrologer + regular user).
 *
 * Cascade deletes on users take care of services, availability, appointments.
 */
export async function seedTestUsers() {
  const db = getDb()

  // Clean up previous run (cascade removes all child rows)
  await db.delete(users).where(eq(users.id, TEST_ASTROLOGER_ID))
  await db.delete(users).where(eq(users.id, TEST_USER_ID))

  const [astrologer] = await db
    .insert(users)
    .values({
      id: TEST_ASTROLOGER_ID,
      firebaseUid: 'test-firebase-astrologer-seed-001',
      name: '[TEST] Arjun Sharma',
      email: 'test.astrologer@astrobook.test',
      role: 'astrologer',
      isOnboarded: true,
      isAstrologer: true,
      meta: { seededBy: 'vitest', role: 'astrologer' },
    })
    .returning()

  const [user] = await db
    .insert(users)
    .values({
      id: TEST_USER_ID,
      firebaseUid: 'test-firebase-user-seed-002',
      name: '[TEST] Priya Mehta',
      email: 'test.user@astrobook.test',
      role: 'user',
      isOnboarded: true,
      isAstrologer: false,
      meta: { seededBy: 'vitest', role: 'user' },
    })
    .returning()

  return { astrologer: astrologer!, user: user! }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getTestServices(astrologerId: string) {
  const db = getDb()
  return db
    .select()
    .from(consultationServices)
    .where(eq(consultationServices.astrologerId, astrologerId))
}

export async function getTestAvailability(astrologerId: string) {
  const db = getDb()
  return db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.astrologerId, astrologerId))
}

export async function getTestAppointments(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, userId))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD string N days from today */
export function futureDateStr(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]!
}
