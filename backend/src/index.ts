import { Hono } from 'hono'
import { cors } from 'hono/cors'
import characters from './routes/characters'
import createLibraryRoutes from './routes/library'

const app = new Hono()

app.use('/api/*', cors())

app.route('/', characters)
app.route('/api', createLibraryRoutes())

app.get('/api/health', (c) => {
  return c.json({ message: 'Hello from backend' })
})

export default app
