import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use direct connection URL for migrations (pooler URLs don't support DDL)
    url: process.env['DATABASE_URL'] ?? "",
  },
  verbose: true,
  strict: true,
})
