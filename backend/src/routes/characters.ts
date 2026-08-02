import { Hono } from 'hono'
import { db } from '../db'
import { characters, characterXpLog, characterSteps } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import {
  recalculateStats,
  buildFinalCharacter,
  isStepKey,
  STEP_ORDER,
  StepDeltas,
  StepKey,
  CharacterState,
} from '@mcc/shared'

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

  const steps: StepDeltas | undefined = body.steps

  if (steps) {
    const final = buildFinalCharacter(body.name, steps)

    await db.insert(characters).values({
      id,
      name: body.name,
      createdAt: now,
      updatedAt: now,
      status: 'completed',
      state: JSON.stringify(final),
      xp: 15,
      totalXp: 15,
    })

    for (const step of STEP_ORDER) {
      const delta = steps[step]
      if (!delta) continue
      await db.insert(characterSteps).values({
        id: crypto.randomUUID(),
        characterId: id,
        stepKey: step,
        delta: JSON.stringify(delta),
        updatedAt: now,
      })
    }

    return c.json({ id, name: body.name, status: 'completed', xp: 15, state: final }, 201)
  }

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

  return c.json(result[0])
})

app.get('/api/characters/:id/state', async (c) => {
  const id = c.req.param('id')

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  if (character[0].state) {
    const final = JSON.parse(character[0].state)
    return c.json({ state: final, deltas: null })
  }

  const upToParam = c.req.query('upTo')
  const upTo: StepKey | undefined = upToParam && isStepKey(upToParam) ? upToParam : undefined
  const upToIdx = upTo ? STEP_ORDER.indexOf(upTo) : STEP_ORDER.length - 1

  const allSteps = await db.select()
    .from(characterSteps)
    .where(eq(characterSteps.characterId, id))

  const deltas: StepDeltas = {}
  for (const row of allSteps) {
    const stepKey = row.stepKey
    if (!stepKey || !isStepKey(stepKey)) continue
    const idx = STEP_ORDER.indexOf(stepKey)
    if (idx >= 0 && idx <= upToIdx) {
      deltas[stepKey] = row.delta ? JSON.parse(row.delta) : {}
    }
  }

  const state = recalculateStats(deltas)
  return c.json({ state, deltas })
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
  const { characterSteps: cs, characterXpLog: xpLog } = await import('../db/schema')

  await db.delete(xpLog).where(eq(xpLog.characterId, id))
  await db.delete(cs).where(eq(cs.characterId, id))
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
  const step = c.req.param('step')
  if (!isStepKey(step)) return c.json({ error: 'Unknown step' }, 400)

  const result = await db.select()
    .from(characterSteps)
    .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepKey, step)))

  if (result.length === 0) {
    return c.json({ delta: {} })
  }

  return c.json({ delta: result[0].delta ? JSON.parse(result[0].delta) : {} })
})

app.post('/api/characters/:id/steps/:step', async (c) => {
  const id = c.req.param('id')
  const step = c.req.param('step')
  if (!isStepKey(step)) return c.json({ error: 'Unknown step' }, 400)
  const body = await c.req.json()
  const now = Date.now()

  const existing = await db.select()
    .from(characterSteps)
    .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepKey, step)))

  let updatedStep
  if (existing.length > 0) {
    updatedStep = await db.update(characterSteps)
      .set({
        delta: JSON.stringify(body.delta),
        updatedAt: now,
      })
      .where(and(eq(characterSteps.characterId, id), eq(characterSteps.stepKey, step)))
      .returning()
    updatedStep = updatedStep[0]
  } else {
    updatedStep = await db.insert(characterSteps).values({
      id: crypto.randomUUID(),
      characterId: id,
      stepKey: step,
      delta: JSON.stringify(body.delta),
      updatedAt: now,
    }).returning()
    updatedStep = updatedStep[0]
  }

  const allSteps = await db.select()
    .from(characterSteps)
    .where(eq(characterSteps.characterId, id))

  const allDeltas: StepDeltas = {}
  for (const row of allSteps) {
    const stepKey = row.stepKey
    if (!stepKey || !isStepKey(stepKey)) continue
    allDeltas[stepKey] = row.delta ? JSON.parse(row.delta) : {}
  }

  const newState: CharacterState = recalculateStats(allDeltas)

  return c.json({ step: updatedStep, state: newState })
})

export default app
