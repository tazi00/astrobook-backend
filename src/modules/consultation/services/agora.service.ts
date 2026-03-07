import { RtcTokenBuilder, RtcRole } from 'agora-token'
import { env } from '@/config/env'

export class AgoraService {
  generateChannelName(appointmentId: string): string {
    return `astrobook_${appointmentId}`
  }

  /**
   * Generates an RTC token valid until the appointment ends (+ 30 min buffer).
   * uid=0 means any user can join with this token (suitable for 1:1 calls).
   */
  generateToken(channelName: string, appointmentEndsAt: Date): string {
    const uid = 0
    const bufferSeconds = 30 * 60
    const expiryTs = Math.floor(appointmentEndsAt.getTime() / 1000) + bufferSeconds

    return RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiryTs,
      expiryTs,
    )
  }

  /**
   * Generates a fresh token for an existing appointment (e.g. when user joins the call).
   * Extends validity 1 hour from now.
   */
  refreshToken(channelName: string): string {
    const uid = 0
    const expiryTs = Math.floor(Date.now() / 1000) + 3600

    return RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiryTs,
      expiryTs,
    )
  }
}
