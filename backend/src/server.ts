import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'
import { db } from './db'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { runMigration } from './db/migration'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function startServer() {
  await runMigration()
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'drizzle') })
  console.log('Database migrations applied')

  app.use('/*', serveStatic({ root: './frontend/dist' }))
  app.use('/assets/*', serveStatic({ root: './frontend/dist' }))

  const port = parseInt(process.env.PORT || '3000', 10)

  serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  })

  console.log(`Server running on http://localhost:${port}`)
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
