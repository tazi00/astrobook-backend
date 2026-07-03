import ImageKit from 'imagekit'
import { env } from '@/config/env'
import { ForbiddenError, NotFoundError } from '@/core/errors'
import type { PostsRepository } from '../repositories/posts.repository'
import type { CreatePostDto } from '../schemas/posts.schema'

export class PostsService {
  private imagekit: ImageKit

  constructor(private readonly postsRepository: PostsRepository) {
    this.imagekit = new ImageKit({
      publicKey:   env.IMAGEKIT_PUBLIC_KEY  ?? '',
      privateKey:  env.IMAGEKIT_PRIVATE_KEY ?? '',
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT ?? '',
    })
  }

  // ── Create Post ────────────────────────────────────────────────────────────

  async createPost(astrologerId: string, dto: CreatePostDto) {
    return this.postsRepository.create({
      astrologerId,
      content:         dto.content,
      mediaUrl:        dto.mediaUrl ?? null,
      mediaType:       dto.mediaType,
      linkedServiceId: dto.linkedServiceId ?? null,
    })
  }

  // ── Get All Posts — feed ───────────────────────────────────────────────────

  async getAllPosts(limit: number, offset: number) {
    return this.postsRepository.findAll(limit, offset)
  }

  // ── Get My Posts — astrologer ──────────────────────────────────────────────

  async getMyPosts(astrologerId: string, limit: number, offset: number) {
    return this.postsRepository.findByAstrologer(astrologerId, limit, offset)
  }

  // ── Delete Post ────────────────────────────────────────────────────────────

  async deletePost(postId: string, userId: string) {
    const post = await this.postsRepository.findById(postId)
    if (!post) throw NotFoundError('Post not found')
    if (post.astrologerId !== userId) throw ForbiddenError('Tumhara post nahi hai')
    await this.postsRepository.delete(postId)
  }

  // ── ImageKit Upload Auth Token ─────────────────────────────────────────────
  // Frontend seedha ImageKit pe upload karega — backend sirf token deta hai

  getImageKitAuthToken() {
    return this.imagekit.getAuthenticationParameters()
  }
}
