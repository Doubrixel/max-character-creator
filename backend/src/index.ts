import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

app.use('/api/*', cors())

app.use('/*', serveStatic({ root: '../frontend/dist' }))

app.get('/api/health', (c) => {
  return c.json({ message: 'Hello from backend' })
})

export default app
