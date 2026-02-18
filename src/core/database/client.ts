import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/config/env'
import * as schema from './schema'

let pool: Pool | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    pool.on('error', (err) => {
      console.error('Unexpected error on idle DB client', err)
      process.exit(-1)
    })
  }
  return pool
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema, logger: env.NODE_ENV === 'development' })
  }
  return db
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    db = null
  }
}

export type Database = ReturnType<typeof getDb>
