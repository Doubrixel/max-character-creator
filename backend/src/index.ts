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

// INT-000018: Der Testmodus wird serverseitig aus der Umgebungsvariable
// SYSTEM=TEST gelesen und als Flag ans Frontend gereicht. Eine rein
// clientseitige Umschaltung gibt es bewusst nicht.
app.get('/api/config', (c) => {
  return c.json({ testMode: process.env.SYSTEM === 'TEST' })
})

app.get('/api/health', (c) => {
  if (commitSha) c.header('X-Commit-SHA', commitSha)
  return c.json({ message: 'Hello from backend', commitSha })
})

export default app
