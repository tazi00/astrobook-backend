import type { FastifyInstance } from 'fastify'
import { ALL_CATEGORIES, CATEGORY_FILTERS } from '../constants'

export async function categoriesRoutes(app: FastifyInstance) {
  // GET /categories — Explore ke top filter tabs + saari categories
  app.get(
    '/categories',
    {
      schema: {
        tags: ['Categories'],
        summary: 'Get Explore category taxonomy',
      },
    },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: {
          filters: CATEGORY_FILTERS,
          categories: ALL_CATEGORIES,
        },
      })
    },
  )
}
