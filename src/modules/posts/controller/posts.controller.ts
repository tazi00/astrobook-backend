import type { FastifyRequest, FastifyReply } from 'fastify'
import type { PostsService } from '../services/posts.service'
import { CreatePostSchema, GetPostsQuerySchema } from '../schemas/posts.schema'

export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // POST /posts — astrologer only
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string; role: string }
    const dto = CreatePostSchema.parse(request.body)
    const post = await this.postsService.createPost(user.userId, dto)
    return reply.status(201).send({ success: true, data: { post } })
  }

  // GET /posts — sabke posts (feed), ya ?astrologerId=X / ?tag=X se filtered
  getAll = async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit, offset, astrologerId, tag } = GetPostsQuerySchema.parse(request.query)
    const posts = await this.postsService.getAllPosts(limit, offset, astrologerId, tag)
    // Infinite scroll ke liye: agar poore `limit` jitne posts mile, aur pages ho sakte hain
    const hasMore = posts.length === limit
    return reply.send({ success: true, data: { posts, hasMore } })
  }

  // GET /posts/:id — single post detail (public)
  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const post = await this.postsService.getPostById(id)
    return reply.send({ success: true, data: { post } })
  }

  // GET /posts/my — apne posts
  getMy = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const { limit, offset } = GetPostsQuerySchema.parse(request.query)
    const posts = await this.postsService.getMyPosts(user.userId, limit, offset)
    return reply.send({ success: true, data: { posts } })
  }

  // DELETE /posts/:id
  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string }
    const { id } = request.params as { id: string }
    await this.postsService.deletePost(id, user.userId)
    return reply.send({ success: true })
  }

  // GET /posts/upload-token — ImageKit signed token
  getUploadToken = async (_request: FastifyRequest, reply: FastifyReply) => {
    const token = this.postsService.getImageKitAuthToken()
    return reply.send({ success: true, data: token })
  }
}
