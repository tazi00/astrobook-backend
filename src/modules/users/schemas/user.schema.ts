import { z } from 'zod'

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const OnboardingSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
})

// ─── Update Profile ───────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  interests: z.array(z.string()).optional(),
})

// ─── Response ─────────────────────────────────────────────────────────────────

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  firebaseUid: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  name: z.string(),
  dateOfBirth: z.string().nullable(),
  role: z.enum(['user', 'astrologer', 'admin']),
  interests: z.array(z.string()).nullable(),
  isOnboarded: z.boolean(),
  isAstrologer: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingDto = z.infer<typeof OnboardingSchema>
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>

// ─── Interest Options ─────────────────────────────────────────────────────────

export const INTEREST_OPTIONS = [
  'Numerology',
  'Vastu',
  'Past Life',
  'Reiki',
  'Tarot',
  'Astrology',
  'Palmistry',
  'Face Reading',
  'Kundli',
  'Horoscope',
  'Gemstones',
  'Meditation',
] as const
