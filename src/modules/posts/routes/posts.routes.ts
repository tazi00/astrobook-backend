import type { FastifyInstance } from 'fastify'
import { getDb } from '@/core/database/client'
import { authenticate } from '@/modules/auth/middleware/authenticate'
import { PostsRepository } from '../repositories/posts.repository'
import { PostsService } from '../services/posts.service'
import { PostsController } from '../controller/posts.controller'

export async function postsRoutes(app: FastifyInstance) {
  const db = getDb()
  const postsRepository = new PostsRepository(db)
  const postsService    = new PostsService(postsRepository)
  const postsController = new PostsController(postsService)

  // GET /posts — public, feed ke liye
  app.get('/posts', postsController.getAll)

  // GET /posts/my — authenticated, astrologer ke apne posts
  app.get('/posts/my', {
    preHandler: [authenticate],
  }, postsController.getMy)

  // GET /posts/upload-token — ImageKit auth token
  app.get('/posts/upload-token', {
    preHandler: [authenticate],
  }, postsController.getUploadToken)

  // POST /posts — authenticated, astrologer only
  app.post('/posts', {
    preHandler: [authenticate],
    schema: {
      tags: ['Posts'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content:         { type: 'string' },
          mediaUrl:        { type: 'string' },
          mediaType:       { type: 'string', enum: ['IMAGE', 'VIDEO', 'TEXT'] },
          linkedServiceId: { type: 'string' },
        },
      },
    },
  }, postsController.create)

  // DELETE /posts/:id — authenticated
  app.delete('/posts/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Posts'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, postsController.delete)
}
