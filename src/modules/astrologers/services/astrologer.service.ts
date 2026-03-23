// src/modules/astrologers/services/astrologer.service.ts
import { NotFoundError } from '@/core/errors'
import type { AstrologerRepository } from '../repositories/astrologer.repository'
import { AstrologerResponseSchema } from '../schemas/astrologer.schema'

export class AstrologerService {
  constructor(private readonly astrologerRepository: AstrologerRepository) {}

  async getAll() {
    const astrologers = await this.astrologerRepository.findAll()
    return astrologers.map((a) => AstrologerResponseSchema.parse(a))
  }

  async getById(id: string) {
    const astrologer = await this.astrologerRepository.findById(id)
    if (!astrologer) throw NotFoundError('Astrologer not found')
    return AstrologerResponseSchema.parse(astrologer)
  }

  async getServices(astrologerId: string) {
    const astrologer = await this.astrologerRepository.findById(astrologerId)
    if (!astrologer) throw NotFoundError('Astrologer not found')
    return this.astrologerRepository.findServices(astrologerId)
  }

  async getSlots(astrologerId: string) {
    const astrologer = await this.astrologerRepository.findById(astrologerId)
    if (!astrologer) throw NotFoundError('Astrologer not found')
    return this.astrologerRepository.findSlots(astrologerId)
  }
}
