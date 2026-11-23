import { Hono } from 'hono'
import characters from './routes/characters'
import createLibraryRoutes from './routes/library'

const app = new Hono()
const configuredCommitSha = process.env.APP_GIT_SHA?.trim().toLowerCase()
const commitSha = configuredCommitSha && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(configuredCommitSha)
  ? configuredCommitSha
  : null

app.route('/', characters)
app.route('/api', createLibraryRoutes())

app.get('/api/health', (c) => {
  if (commitSha) c.header('X-Commit-SHA', commitSha)
  return c.json({ message: 'Hello from backend', commitSha })
})

export default app
