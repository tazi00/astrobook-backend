import { eq } from 'drizzle-orm'
import type { Database } from '@/core/database/client'
import { pushTokens } from '@/core/database/schema'

type PushMessage = {
  title: string
  body: string
  data?: Record<string, string>
}

// Expo Push Service — ek hi API se Android (FCM) + iOS (APNs) dono ko
// deliver ho jaata hai, alag-alag SDK integrate nahi karna padta
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export class PushNotificationService {
  constructor(private readonly db: Database) {}

  async registerToken(userId: string, expoPushToken: string, platform?: string) {
    await this.db
      .insert(pushTokens)
      .values({ userId, expoPushToken, platform })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.expoPushToken],
        set: { updatedAt: new Date(), platform },
      })
  }

  // Notification bhejna best-effort hai — kabhi bhi throw nahi karta,
  // warna ek notification fail hone se poora payment/booking flow break
  // ho jaayega. Fail hone pe bas log karo.
  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    try {
      const tokens = await this.db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.userId, userId))

      if (tokens.length === 0) return // user ne kabhi token register hi nahi kiya

      const payload = tokens.map((t) => ({
        to: t.expoPushToken,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      }))

      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('[PushNotificationService] send failed:', err)
    }
  }

  async sendToMany(userIds: string[], message: PushMessage): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, message)))
  }
}
