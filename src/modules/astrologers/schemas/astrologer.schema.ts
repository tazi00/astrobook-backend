import { z } from 'zod'

export const AstrologerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  interests: z.array(z.string()).nullable(),
  meta: z
    .object({
      speciality: z.string(),
      exp: z.string(),
      rating: z.number(),
      reviews: z.number(),
      languages: z.string(),
      emoji: z.string(),
      online: z.boolean(),
      price: z.number().optional(), // base price per min
      about: z.string().optional(), // profile description
    })
    .nullable(),
  isOnboarded: z.boolean(),
  createdAt: z.date(),
})

export type AstrologerResponse = z.infer<typeof AstrologerResponseSchema>
