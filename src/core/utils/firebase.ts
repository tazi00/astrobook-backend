import * as admin from 'firebase-admin'
import { env } from '@/config/env'
import { readFileSync } from 'fs'

let firebaseApp: admin.app.App | null = null

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    try {
      const serviceAccount = JSON.parse(
        readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
      )

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })

      console.log('✅ Firebase Admin SDK initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error)
      throw error
    }
  }

  return firebaseApp
}

export async function verifyFirebaseToken(idToken: string) {
  const app = getFirebaseAdmin()
  const decodedToken = await app.auth().verifyIdToken(idToken)
  return decodedToken
}

export const firebaseAuth = () => getFirebaseAdmin().auth()
