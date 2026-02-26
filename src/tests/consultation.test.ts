/**
 * Consultation API — Integration Test Suite
 *
 * Strategy
 * ─────────
 * • Real Fastify app + real PostgreSQL (same DATABASE_URL as dev)
 * • GoogleMeetService is mocked — no actual Google calls
 * • Test users are seeded with fixed UUIDs before the suite runs
 * • Successful tests write real rows that PERSIST in the DB after the run
 *   → inspect with `npm run db:studio` after testing
 * • Previous run's data is cleaned up in beforeAll so tests are idempotent
 *
 * Data written to DB (visible after run)
 * ───────────────────────────────────────
 *   users               — [TEST] Arjun Sharma (astrologer) + [TEST] Priya Mehta (user)
 *   consultation_services — services 101, 102, 103, 104 for test astrologer
 *   availability_windows  — one upcoming window (30 days from now, 17:00–20:00 IST)
 *   appointments          — one confirmed booking + one cancelled booking
 */

import { vi, describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// ─── Mock GoogleMeetService BEFORE any app imports ───────────────────────────
// vi.mock is hoisted to the top by Vitest so this runs before buildApp()

vi.mock('@/modules/consultation/services/google-meet.service', () => ({
  GoogleMeetService: vi.fn().mockImplementation(() => ({
    createMeeting: vi.fn().mockResolvedValue({
      meetLink: 'https://meet.google.com/test-abc-xyz',
      eventId: 'test-google-event-id-001',
    }),
    cancelEvent: vi.fn().mockResolvedValue(undefined),
  })),
}))

import { buildApp } from '@/app'
import {
  seedTestUsers,
  futureDateStr,
  getTestServices,
  getTestAvailability,
  getTestAppointments,
  TEST_ASTROLOGER_ID,
  TEST_USER_ID,
} from './helpers/seed'

// ─── Shared state (populated by tests in order) ───────────────────────────────
let app: FastifyInstance
let astrologerToken: string
let userToken: string

// IDs created during the test run — stored so later tests can reference them
let service101Id = ''
let service102Id = ''
let availabilityId = ''       // window created in availability tests
let confirmedApptId = ''      // appointment created in booking test
let cancelledApptId = ''      // second appointment, cancelled in cancel test

// The date all booking-related tests use (30 days from now)
const AVAILABILITY_DATE = futureDateStr(30)

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // 1. Seed test users (wipes previous run's child rows via cascade)
  await seedTestUsers()

  // 2. Build the Fastify app (GoogleMeetService mock is already in place)
  app = await buildApp()

  // 3. Mint JWT tokens directly — same as production code does
  astrologerToken = app.jwt.sign(
    { userId: TEST_ASTROLOGER_ID, role: 'astrologer', isOnboarded: true },
    { expiresIn: '1h' },
  )
  userToken = app.jwt.sign(
    { userId: TEST_USER_ID, role: 'user', isOnboarded: true },
    { expiresIn: '1h' },
  )

  console.log('\n📋 Test seed IDs (find these in your DB after the run):')
  console.log(`   Astrologer : ${TEST_ASTROLOGER_ID}`)
  console.log(`   User       : ${TEST_USER_ID}`)
  console.log(`   Date used  : ${AVAILABILITY_DATE}\n`)
})

afterAll(async () => {
  if (app) await app.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// ASTROLOGER — SERVICES
// ─────────────────────────────────────────────────────────────────────────────

describe('Astrologer – Services', () => {
  test('POST /consultation/services → creates service 101 (Kundli Reading)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 101,
        title: 'Kundli Reading',
        shortDescription: 'Detailed analysis of your birth chart and planetary positions.',
        coverImage: 'https://cdn.astrobook.test/services/kundli.jpg',
        about:
          'Get a comprehensive Kundli reading that covers your life path, career, relationships, and spiritual journey based on Vedic astrology.',
        durationMinutes: 45,
        price: 799,
        meta: { category: 'vedic', popular: true },
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.service.serviceCode).toBe(101)
    expect(body.service.title).toBe('Kundli Reading')
    expect(body.service.durationMinutes).toBe(45)
    expect(body.service.astrologerId).toBe(TEST_ASTROLOGER_ID)

    service101Id = body.service.id
    console.log(`   ✔ service 101 id: ${service101Id}`)
  })

  test('POST /consultation/services → creates service 102 (Tarot Reading)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 102,
        title: 'Tarot Reading',
        shortDescription: 'Intuitive tarot card reading for clarity and guidance.',
        coverImage: 'https://cdn.astrobook.test/services/tarot.jpg',
        about:
          'A 30-minute tarot session focused on your current situation and the energies influencing your path ahead.',
        durationMinutes: 30,
        price: 499,
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.service.serviceCode).toBe(102)
    service102Id = body.service.id
    console.log(`   ✔ service 102 id: ${service102Id}`)
  })

  test('POST /consultation/services → creates service 103 (Numerology)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 103,
        title: 'Numerology Session',
        shortDescription: 'Discover the hidden meaning behind your name and birth numbers.',
        coverImage: 'https://cdn.astrobook.test/services/numerology.jpg',
        about:
          'Using your full birth name and date of birth, we decode your life path number, destiny number, and personal year to guide your decisions.',
        durationMinutes: 30,
        price: 399,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().service.serviceCode).toBe(103)
  })

  test('POST /consultation/services → creates service 104 (Vastu Consultation)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 104,
        title: 'Vastu Consultation',
        shortDescription: 'Align your living or work space with positive energies.',
        coverImage: 'https://cdn.astrobook.test/services/vastu.jpg',
        about:
          'A thorough Vastu Shastra consultation for your home or office. Share your floor plan and we will identify energy blocks and suggest remedies.',
        durationMinutes: 60,
        price: 1199,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().service.serviceCode).toBe(104)
  })

  test('POST /consultation/services → upserts (updates) service 101 title', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 101,
        title: 'Kundli Reading (Premium)',
        shortDescription: 'In-depth Vedic birth chart analysis with remedies.',
        coverImage: 'https://cdn.astrobook.test/services/kundli.jpg',
        about:
          'A premium Kundli session covering your birth chart, Dasha periods, and personalised remedies to improve your fortune.',
        durationMinutes: 60,
        price: 999,
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    // Same ID, updated title
    expect(body.service.id).toBe(service101Id)
    expect(body.service.title).toBe('Kundli Reading (Premium)')
    expect(body.service.durationMinutes).toBe(60)
  })

  test('GET /consultation/services/mine → returns all 4 services', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/services/mine',
      headers: { authorization: `Bearer ${astrologerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.services).toHaveLength(4)
    const codes = body.services.map((s: any) => s.serviceCode).sort()
    expect(codes).toEqual([101, 102, 103, 104])

    // Verify DB also has 4 rows
    const dbServices = await getTestServices(TEST_ASTROLOGER_ID)
    expect(dbServices).toHaveLength(4)
  })

  test('POST /consultation/services → 403 for a regular user (wrong role)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        serviceCode: 101,
        title: 'Attempt by user',
        shortDescription: 'This should be rejected.',
        coverImage: 'https://cdn.astrobook.test/x.jpg',
        about: 'Should never reach the database because of role guard.',
        durationMinutes: 30,
      },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('FORBIDDEN')
  })

  test('POST /consultation/services → 401 with no token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      payload: {
        serviceCode: 101,
        title: 'No auth',
        shortDescription: 'x'.repeat(10),
        coverImage: 'https://cdn.astrobook.test/x.jpg',
        about: 'x'.repeat(20),
        durationMinutes: 30,
      },
    })

    expect(res.statusCode).toBe(401)
  })

  test('POST /consultation/services → 400 when required fields are missing (Fastify schema guard)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 101,
        // title, shortDescription, coverImage, about, durationMinutes missing
      },
    })

    // Fastify body schema catches missing required fields before Zod → 400
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('BAD_REQUEST')
  })

  test('POST /consultation/services → 400 for invalid service code (105)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 105, // not in enum [101,102,103,104]
        title: 'Bad code',
        shortDescription: 'x'.repeat(10),
        coverImage: 'https://cdn.astrobook.test/x.jpg',
        about: 'x'.repeat(20),
        durationMinutes: 30,
      },
    })

    expect(res.statusCode).toBe(400)
  })

  test('POST /consultation/services → 400 when durationMinutes is below minimum (5)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/services',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        serviceCode: 101,
        title: 'Short session',
        shortDescription: 'x'.repeat(10),
        coverImage: 'https://cdn.astrobook.test/x.jpg',
        about: 'x'.repeat(20),
        durationMinutes: 5, // below minimum: 15
      },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ASTROLOGER — AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe('Astrologer – Availability', () => {
  test('POST /consultation/availability → creates a window for the test date', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        date: AVAILABILITY_DATE,
        startTime: '17:00',
        endTime: '20:00',
        timezone: 'Asia/Kolkata',
        meta: { note: 'evening slots — IST' },
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.availability.date).toBe(AVAILABILITY_DATE)
    expect(body.availability.startTime).toMatch(/^17:00/)
    expect(body.availability.endTime).toMatch(/^20:00/)
    expect(body.availability.timezone).toBe('Asia/Kolkata')

    availabilityId = body.availability.id
    console.log(`   ✔ availability id: ${availabilityId}  date: ${AVAILABILITY_DATE}`)
  })

  test('POST /consultation/availability → upserts (updates) window when same date is submitted again', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        date: AVAILABILITY_DATE,
        startTime: '18:00', // updated start time
        endTime: '21:00',
        timezone: 'Asia/Kolkata',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    // Same row updated in place (same ID, new start time)
    expect(body.availability.id).toBe(availabilityId)
    expect(body.availability.startTime).toMatch(/^18:00/)
  })

  test('GET /consultation/availability/mine → returns upcoming windows', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/availability/mine',
      headers: { authorization: `Bearer ${astrologerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.availability.length).toBeGreaterThanOrEqual(1)
    expect(body.availability.some((w: any) => w.id === availabilityId)).toBe(true)
  })

  test('DELETE /consultation/availability/:id → soft-deletes the window', async () => {
    // Create a temporary window to delete (so we keep the booking window intact)
    const tempDate = futureDateStr(60)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: { date: tempDate, startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
    })
    const tempId = createRes.json().availability.id

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/consultation/availability/${tempId}`,
      headers: { authorization: `Bearer ${astrologerToken}` },
    })

    expect(deleteRes.statusCode).toBe(204)

    // The window should no longer appear in upcoming list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/availability/mine',
      headers: { authorization: `Bearer ${astrologerToken}` },
    })
    const ids = listRes.json().availability.map((w: any) => w.id)
    expect(ids).not.toContain(tempId)
  })

  test('DELETE /consultation/availability/:id → 403 when another user tries to delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/consultation/availability/${availabilityId}`,
      headers: { authorization: `Bearer ${userToken}` }, // regular user, wrong role
    })

    // requireRole(['astrologer','admin']) blocks this
    expect(res.statusCode).toBe(403)
  })

  test('POST /consultation/availability → 422 when end time is before start time', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        date: futureDateStr(45),
        startTime: '20:00',
        endTime: '17:00', // end < start
        timezone: 'Asia/Kolkata',
      },
    })

    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('VALIDATION_ERROR')
  })

  test('POST /consultation/availability → 422 for a past date', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        date: '2020-01-01', // clearly in the past
        startTime: '10:00',
        endTime: '12:00',
        timezone: 'Asia/Kolkata',
      },
    })

    expect(res.statusCode).toBe(422)
  })

  test('POST /consultation/availability → 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      payload: { date: futureDateStr(10), startTime: '10:00', endTime: '12:00' },
    })

    expect(res.statusCode).toBe(401)
  })

  // Reset the booking window back to 17:00–20:00 (wide range for slot allocation)
  test('POST /consultation/availability → resets window to 17:00–20:00 for booking tests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/availability',
      headers: { authorization: `Bearer ${astrologerToken}` },
      payload: {
        date: AVAILABILITY_DATE,
        startTime: '17:00',
        endTime: '20:00',
        timezone: 'Asia/Kolkata',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    // Upsert returns the same row again
    expect(body.availability.id).toBe(availabilityId)
    expect(body.availability.startTime).toMatch(/^17:00/)

    // Verify in DB
    const dbWindows = await getTestAvailability(TEST_ASTROLOGER_ID)
    const active = dbWindows.filter((w) => w.isActive)
    expect(active.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// USER — BROWSE (public endpoints, no auth required)
// ─────────────────────────────────────────────────────────────────────────────

describe('User – Browse (public)', () => {
  test("GET /consultation/astrologers/:id/services → returns astrologer's active services", async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/consultation/astrologers/${TEST_ASTROLOGER_ID}/services`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.services.length).toBe(4)
    // Each service has the required public fields
    const svc = body.services[0]
    expect(svc).toHaveProperty('id')
    expect(svc).toHaveProperty('title')
    expect(svc).toHaveProperty('shortDescription')
    expect(svc).toHaveProperty('coverImage')
    expect(svc).toHaveProperty('durationMinutes')
  })

  test('GET /consultation/astrologers/:id/available-dates → returns highlighted calendar dates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/consultation/astrologers/${TEST_ASTROLOGER_ID}/available-dates`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.availableDates)).toBe(true)
    expect(body.availableDates).toContain(AVAILABILITY_DATE)
  })

  test('GET /consultation/astrologers/:id/services → returns empty array for unknown astrologer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/astrologers/00000000-0000-0000-0000-000000000000/services',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().services).toHaveLength(0)
  })

  test('GET /consultation/astrologers/:id/available-dates → returns empty array for unknown astrologer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/astrologers/00000000-0000-0000-0000-000000000000/available-dates',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().availableDates).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// USER — BOOKING
// ─────────────────────────────────────────────────────────────────────────────

describe('User – Booking', () => {
  test('POST /consultation/appointments → books a slot, allocates time, returns Meet link', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        astrologerId: TEST_ASTROLOGER_ID,
        serviceId: service101Id,
        date: AVAILABILITY_DATE,
        notes: 'Please focus on career and marriage timing.',
        meta: { userTimezone: 'Asia/Kolkata', platform: 'ios' },
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    const appt = body.appointment

    expect(appt.status).toBe('confirmed')
    expect(appt.meetLink).toBe('https://meet.google.com/test-abc-xyz')
    expect(appt.durationMinutes).toBe(60) // matches upserted service 101 (60 min)
    expect(appt.astrologerId).toBe(TEST_ASTROLOGER_ID)
    expect(appt.userId).toBe(TEST_USER_ID)

    // scheduledAt must fall within the 17:00–20:00 window
    const scheduledAt = new Date(appt.scheduledAt)
    const endsAt = new Date(appt.endsAt)
    expect(endsAt.getTime() - scheduledAt.getTime()).toBe(60 * 60 * 1000) // 60 min

    confirmedApptId = appt.id
    console.log(`   ✔ appointment id : ${confirmedApptId}`)
    console.log(`   ✔ scheduled at   : ${appt.scheduledAt}`)
    console.log(`   ✔ meet link      : ${appt.meetLink}`)
  })

  test('POST /consultation/appointments → second booking gets a DIFFERENT random slot', async () => {
    // Book again with service 102 (30 min) — slot allocator must avoid the first appointment
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        astrologerId: TEST_ASTROLOGER_ID,
        serviceId: service102Id,
        date: AVAILABILITY_DATE,
        notes: 'Quick tarot check.',
      },
    })

    expect(res.statusCode).toBe(201)
    const appt = res.json().appointment
    expect(appt.id).not.toBe(confirmedApptId) // different appointment
    expect(appt.status).toBe('confirmed')

    cancelledApptId = appt.id // we'll cancel this one
    console.log(`   ✔ 2nd appointment id : ${cancelledApptId}`)
  })

  test('GET /consultation/appointments/mine → user sees both their appointments', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/appointments/mine',
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(res.statusCode).toBe(200)
    const ids = res.json().appointments.map((a: any) => a.id)
    expect(ids).toContain(confirmedApptId)
    expect(ids).toContain(cancelledApptId)
  })

  test('GET /consultation/appointments/mine → astrologer sees the same appointments', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/appointments/mine',
      headers: { authorization: `Bearer ${astrologerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const ids = res.json().appointments.map((a: any) => a.id)
    expect(ids).toContain(confirmedApptId)
    expect(ids).toContain(cancelledApptId)
  })

  test('PATCH /consultation/appointments/:id/cancel → user cancels the second appointment (204)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/consultation/appointments/${cancelledApptId}/cancel`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(res.statusCode).toBe(204)

    // Confirm status in DB
    const dbAppts = await getTestAppointments(TEST_USER_ID)
    const cancelled = dbAppts.find((a) => a.id === cancelledApptId)
    expect(cancelled?.status).toBe('cancelled')
  })

  test('PATCH /consultation/appointments/:id/cancel → 400 when trying to cancel an already-cancelled appointment', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/consultation/appointments/${cancelledApptId}/cancel`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('BAD_REQUEST')
  })

  test('PATCH /consultation/appointments/:id/cancel → 403 when a third party tries to cancel', async () => {
    // Mint a stranger token (different userId, not involved in the appointment)
    const strangerToken = app.jwt.sign(
      { userId: '00000000-0000-0000-0000-stranger0001', role: 'user', isOnboarded: true },
      { expiresIn: '1h' },
    )

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/consultation/appointments/${confirmedApptId}/cancel`,
      headers: { authorization: `Bearer ${strangerToken}` },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('FORBIDDEN')
  })

  test('POST /consultation/appointments → 400 when astrologer has no availability on that date', async () => {
    const unavailableDate = futureDateStr(90) // no window exists for this date
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        astrologerId: TEST_ASTROLOGER_ID,
        serviceId: service101Id,
        date: unavailableDate,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('BAD_REQUEST')
  })

  test('POST /consultation/appointments → 400 when serviceId does not belong to the given astrologer', async () => {
    // Mint a different astrologer and use their service ID with the test astrologer
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        astrologerId: '00000000-0000-0000-0000-stranger0001', // mismatched astrologer
        serviceId: service101Id,
        date: AVAILABILITY_DATE,
      },
    })

    expect(res.statusCode).toBe(400)
  })

  test('POST /consultation/appointments → 400 when required fields are missing (Fastify schema guard)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        // astrologerId and serviceId missing
        date: AVAILABILITY_DATE,
      },
    })

    expect(res.statusCode).toBe(400)
  })

  test('POST /consultation/appointments → 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consultation/appointments',
      payload: {
        astrologerId: TEST_ASTROLOGER_ID,
        serviceId: service101Id,
        date: AVAILABILITY_DATE,
      },
    })

    expect(res.statusCode).toBe(401)
  })

  test('GET /consultation/appointments/mine → 401 without auth token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/consultation/appointments/mine',
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DB STATE SUMMARY (runs last, purely informational)
// ─────────────────────────────────────────────────────────────────────────────

describe('DB state after test run', () => {
  test('DB contains all expected test rows', async () => {
    const services = await getTestServices(TEST_ASTROLOGER_ID)
    const availability = await getTestAvailability(TEST_ASTROLOGER_ID)
    const appts = await getTestAppointments(TEST_USER_ID)

    console.log('\n📊 Rows written to DB by this test run:')
    console.log(`   consultation_services   : ${services.length} rows`)
    console.log(`   availability_windows    : ${availability.filter((w) => w.isActive).length} active row(s)`)
    console.log(`   appointments (confirmed): ${appts.filter((a) => a.status === 'confirmed').length}`)
    console.log(`   appointments (cancelled): ${appts.filter((a) => a.status === 'cancelled').length}`)

    expect(services).toHaveLength(4)
    expect(availability.filter((w) => w.isActive).length).toBeGreaterThanOrEqual(1)
    expect(appts.filter((a) => a.status === 'confirmed')).toHaveLength(1)
    expect(appts.filter((a) => a.status === 'cancelled')).toHaveLength(1)
  })
})
