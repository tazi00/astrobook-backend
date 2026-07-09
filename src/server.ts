import { buildApp } from './app'
import { env } from './config/env'
import { closeDb, getDb } from './core/database/client'
import { AppointmentRepository } from './modules/consultation/repositories/appointment.repository'

async function start() {
  const app = await buildApp()

  // ── Auto-timeout background sweep ─────────────────────────────────────────
  // 'ongoing' sessions jinka scheduled time nikal chuka hai, unhe safety net
  // ke taur pe har minute check karke 'completed' kar do — is se independent
  // hai ki koi request aayi ya nahi (jaise agar dono log app hi band kar dein
  // aur kabhi wapas na aayein)
  const appointmentRepo = new AppointmentRepository(getDb())
  const timeoutSweepInterval = setInterval(async () => {
    try {
      const completed = await appointmentRepo.completeTimedOutSessions()
      if (completed.length > 0) {
        app.log.info({ count: completed.length }, 'Auto-completed timed-out sessions')
      }
    } catch (err) {
      app.log.error(err, 'Session auto-timeout sweep failed')
    }
  }, 60 * 1000)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`)
    clearInterval(timeoutSweepInterval)

    try {
      await app.close()
      await closeDb()
      app.log.info('Server closed. DB connections drained.')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('uncaughtException', (err) => {
    app.log.fatal({ err }, 'Uncaught exception — shutting down')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ reason }, 'Unhandled rejection — shutting down')
    process.exit(1)
  })

  // Start server
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`🚀 Server running on http://${env.HOST}:${env.PORT}`)
    app.log.info(`📚 Swagger docs at http://localhost:${env.PORT}/docs`)
  } catch (err) {
    app.log.error(err, 'Failed to start server')
    process.exit(1)
  }
}

start()
