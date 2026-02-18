import { buildApp } from './app'
import { env } from './config/env'
import { closeDb } from './core/database/client'

async function start() {
  const app = await buildApp()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`)

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
