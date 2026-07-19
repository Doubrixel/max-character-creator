import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'

app.use('/*', serveStatic({ root: './frontend/dist' }))
app.use('/assets/*', serveStatic({ root: './frontend/dist' }))

const port = parseInt(process.env.PORT || '3000', 10)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server running on http://localhost:${port}`)
