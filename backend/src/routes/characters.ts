import { Hono } from 'hono'
import { db } from '../db'
import { characters, characterXpLog, characterSteps } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { recalculateStats } from '../reducers'

const app = new Hono()

app.get('/api/characters', async (c) => {
  const result = await db.select({
    id: characters.id,
    name: characters.name,
    status: characters.status,
    xp: characters.xp,
  }).from(characters)
  return c.json(result)
})

app.post('/api/characters', async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = Date.now()

  const result = await db.insert(characters).values({
    id,
    name: body.name,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    xp: 15,
    totalXp: 15,
  }).returning()

  return c.json(result[0], 201)
})

app.get('/api/characters/:id', async (c) => {
  const id = c.req.param('id')
  const result = await db.select().from(characters).where(eq(characters.id, id))

  if (result.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  return c.json({
    ...result[0],
    stats: JSON.parse(result[0].stats || '{}'),
  })
})

app.patch('/api/characters/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = Date.now()

  const updateData: Record<string, unknown> = { updatedAt: now }
  if (body.name !== undefined) updateData.name = body.name
  if (body.status !== undefined) updateData.status = body.status

  const result = await db.update(characters)
    .set(updateData)
    .where(eq(characters.id, id))
    .returning()

  if (result.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  return c.json(result[0])
})

app.delete('/api/characters/:id', async (c) => {
  const id = c.req.param('id')
  const result = await db.delete(characters).where(eq(characters.id, id)).returning()

  if (result.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  return c.json({ message: 'Character deleted' })
})

app.post('/api/characters/:id/xp', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = Date.now()

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  const currentXp = character[0].xp ?? 15
  const currentTotalXp = character[0].totalXp ?? 15

  await db.insert(characterXpLog).values({
    id: crypto.randomUUID(),
    characterId: id,
    amount: body.amount,
    reason: body.reason,
    createdAt: now,
  })

  const updated = await db.update(characters)
    .set({
      xp: currentXp + body.amount,
      totalXp: currentTotalXp + body.amount,
      updatedAt: now,
    })
    .where(eq(characters.id, id))
    .returning()

  return c.json(updated[0])
})

app.get('/api/characters/:id/steps/:step', async (c) => {
  const id = c.req.param('id')
  const step = parseInt(c.req.param('step'), 10)

  const result = await db.select()
    .from(characterSteps)
    .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepNumber, step)))

  if (result.length === 0) {
    return c.json({ delta: {} })
  }

  return c.json({ delta: result[0].delta ? JSON.parse(result[0].delta) : {} })
})

app.post('/api/characters/:id/steps/:step', async (c) => {
  const id = c.req.param('id')
  const step = parseInt(c.req.param('step'), 10)
  const body = await c.req.json()
  const now = Date.now()

  const existing = await db.select()
    .from(characterSteps)
    .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepNumber, step)))

  let updatedStep
  if (existing.length > 0) {
    updatedStep = await db.update(characterSteps)
      .set({
        delta: JSON.stringify(body.delta),
        updatedAt: now,
      })
      .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepNumber, step)))
      .returning()
    updatedStep = updatedStep[0]
  } else {
    updatedStep = await db.insert(characterSteps).values({
      id: crypto.randomUUID(),
      characterId: id,
      stepNumber: step,
      delta: JSON.stringify(body.delta),
      updatedAt: now,
    }).returning()
    updatedStep = updatedStep[0]
  }

  const allSteps = await db.select()
    .from(characterSteps)
    .where(eq(characterSteps.characterId, id))

  const allDeltas: Record<number, Record<string, unknown>> = {}
  for (const row of allSteps) {
    allDeltas[row.stepNumber!] = row.delta ? JSON.parse(row.delta) : {}
  }

  const newStats = recalculateStats(allDeltas)

  await db.update(characters)
    .set({ stats: JSON.stringify(newStats) })
    .where(eq(characters.id, id))

  return c.json({ step: updatedStep, stats: newStats })
})

export default app
