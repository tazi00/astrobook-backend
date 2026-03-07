import { z } from 'zod'

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

export type SendMessageDto = z.infer<typeof SendMessageSchema>
