// agora.service.ts
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'
import { env } from '@/config/env'

export interface AgoraTokenResult {
  channel: string
  token: string
}

export class AgoraService {
  generateToken(appointmentId: string): AgoraTokenResult {
    const channel = `astrobook-${appointmentId}`
    const token = RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channel,
      0,
      RtcRole.PUBLISHER,
      Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    )
    return { channel, token }
  }
}
