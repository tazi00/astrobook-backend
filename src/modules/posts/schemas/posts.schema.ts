import { z } from 'zod'

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

export const CreatePostSchema = z.object({
  content: z.string().min(1, 'Content required').max(2000),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'TEXT']).default('TEXT'),
  bgColor: z.string().regex(HEX_COLOR).optional(),
  textColor: z.string().regex(HEX_COLOR).optional(),
  // 2 min hard cap — frontend bhi enforce karta hai, yeh sirf backend-side
  // safety net hai (client compress/trim ke baad ka actual duration bhejega)
  durationSeconds: z.number().int().positive().max(120).optional(),
  linkedServiceId: z.string().uuid().optional(),
  tags: z.array(z.string().min(1)).max(5).default([]),
})

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment khaali nahi ho sakta').max(500),
})

export const GetPostsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  astrologerId: z.string().uuid().optional(),
  tag: z.string().optional(),
})

export type CreatePostDto = z.infer<typeof CreatePostSchema>
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>
export type GetPostsQueryDto = z.infer<typeof GetPostsQuerySchema>
