import { z } from 'zod'

// ─── Login ────────────────────────────────────────────────────────────────────

export const FirebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
    })
    .optional(),
})

// ─── Refresh ──────────────────────────────────────────────────────────────────

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// ─── Response ─────────────────────────────────────────────────────────────────

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    firebaseUid: z.string(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    name: z.string(),
    role: z.enum(['user', 'astrologer', 'admin']),
    isOnboarded: z.boolean(),
  }),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type FirebaseLoginDto = z.infer<typeof FirebaseLoginSchema>
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
