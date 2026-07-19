import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'
import { db } from './db'
import { migrate } from 'drizzle-orm/libsql/migrator'

async function startServer() {
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Database migrations applied')

  app.use('/*', serveStatic({ root: './frontend/dist' }))
  app.use('/assets/*', serveStatic({ root: './frontend/dist' }))

  const port = parseInt(process.env.PORT || '3000', 10)

  serve({
    fetch: app.fetch,
    port,
  })

  console.log(`Server running on http://localhost:${port}`)
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
