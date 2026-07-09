import { z } from 'zod'

export const CreatePostSchema = z.object({
  content: z.string().min(1, 'Content required').max(2000),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'TEXT']).default('TEXT'),
  linkedServiceId: z.string().uuid().optional(),
  tags: z.array(z.string().min(1)).max(5).default([]),
})

export const GetPostsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  astrologerId: z.string().uuid().optional(),
  tag: z.string().optional(),
})

export type CreatePostDto = z.infer<typeof CreatePostSchema>
export type GetPostsQueryDto = z.infer<typeof GetPostsQuerySchema>
