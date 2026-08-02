import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'
import { db } from './db'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { runMigration } from './db/migration'
import { seedIfNeeded } from './db/seed'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function findStaticRoot(): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'frontend', 'dist'),
    path.join(process.cwd(), 'frontend', 'dist'),
    path.join(process.cwd(), '..', 'frontend', 'dist'),
  ]
  return candidates.find((c) => existsSync(c)) ?? null
}

async function startServer() {
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'drizzle') })
  await runMigration()
  await seedIfNeeded()
  console.log('Database migrations applied')

  const staticRoot = findStaticRoot()
  if (staticRoot) {
    app.use('/*', serveStatic({ root: staticRoot }))
    app.use('/assets/*', serveStatic({ root: staticRoot }))
  } else {
    console.log('frontend/dist not found — API only (dev mode)')
  }

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
