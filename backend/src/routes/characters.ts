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
    totalXp: characters.totalXp,
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

    await db.insert(characterXpLog).values({
      id: crypto.randomUUID(),
      characterId: id,
      amount: 15,
      reason: 'Charakterstart',
      createdAt: now,
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

  await db.insert(characterXpLog).values({
    id: crypto.randomUUID(),
    characterId: id,
    amount: 15,
    reason: 'Charakterstart',
    createdAt: now,
  })

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

  const amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? Math.floor(body.amount) : 0
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (amount <= 0) return c.json({ error: 'XP-Anzahl muss größer als 0 sein' }, 400)
  if (!reason) return c.json({ error: 'Session-Name fehlt' }, 400)

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  const currentXp = character[0].xp ?? 15
  const currentTotalXp = character[0].totalXp ?? 15

  await db.insert(characterXpLog).values({
    id: crypto.randomUUID(),
    characterId: id,
    amount: amount,
    reason: reason,
    createdAt: now,
  })

  const updated = await db.update(characters)
    .set({
      xp: currentXp + amount,
      totalXp: currentTotalXp + amount,
      updatedAt: now,
    })
    .where(eq(characters.id, id))
    .returning()

  return c.json(updated[0])
})

app.get('/api/characters/:id/xp', async (c) => {
  const id = c.req.param('id')

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  const log = await db.select().from(characterXpLog).where(eq(characterXpLog.characterId, id))
  const sorted = [...log].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  return c.json({
    xp: character[0].xp ?? 15,
    totalXp: character[0].totalXp ?? 15,
    log: sorted,
  })
})

app.delete('/api/characters/:id/xp/:logId', async (c) => {
  const id = c.req.param('id')
  const logId = c.req.param('logId')
  const now = Date.now()

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  const entries = await db.select().from(characterXpLog).where(eq(characterXpLog.characterId, id))
  if (entries.length === 0) {
    return c.json({ error: 'Kein Eintrag vorhanden' }, 404)
  }
  const sorted = [...entries].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const newest = sorted[sorted.length - 1]
  if (newest.id !== logId) {
    return c.json({ error: 'Nur der letzte Eintrag kann entfernt werden' }, 400)
  }
  if ((newest.amount ?? 0) <= 0) {
    return c.json({ error: 'Nur XP-Zugänge können entfernt werden' }, 400)
  }
  const total = character[0].totalXp ?? 15
  if (Math.floor((total - (newest.amount ?? 0)) / 100) !== Math.floor(total / 100)) {
    return c.json({ error: 'Entfernen nicht möglich: der Eintrag ist mit einem Level-Aufstieg verbunden' }, 400)
  }

  await db.delete(characterXpLog).where(eq(characterXpLog.id, logId))

  const updated = await db.update(characters)
    .set({
      xp: (character[0].xp ?? 15) - (newest.amount ?? 0),
      totalXp: total - (newest.amount ?? 0),
      updatedAt: now,
    })
    .where(eq(characters.id, id))
    .returning()

  return c.json(updated[0])
})

app.post('/api/characters/:id/xp/spend', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = Date.now()

  const kind = typeof body.kind === 'string' ? body.kind : ''
  const targetId = typeof body.targetId === 'string' ? body.targetId : ''
  const targetName = typeof body.targetName === 'string' && body.targetName.trim() !== '' ? body.targetName.trim() : targetId
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const cost = typeof body.cost === 'number' && Number.isFinite(body.cost) ? Math.floor(body.cost) : 0

  if (!['skill_up', 'learn_skill', 'learn_strength'].includes(kind)) {
    return c.json({ error: 'Unbekannte Aktion' }, 400)
  }
  if (!targetId) return c.json({ error: 'Ziel fehlt' }, 400)
  if (cost <= 0) return c.json({ error: 'Ungültige Kosten' }, 400)

  const character = await db.select().from(characters).where(eq(characters.id, id))
  if (character.length === 0) {
    return c.json({ error: 'Character not found' }, 404)
  }

  const currentXp = character[0].xp ?? 15
  if (currentXp < cost) {
    return c.json({ error: 'Nicht genug XP verfügbar' }, 400)
  }

  const state = character[0].state ? JSON.parse(character[0].state) : {}
  const skills = (state.skills ?? {}) as Record<string, number>
  const staerken = (state.staerken ?? []) as string[]

  if (kind === 'skill_up') {
    if (!(targetId in skills)) return c.json({ error: 'Skill ist dem Charakter nicht bekannt' }, 400)
    skills[targetId] = (skills[targetId] ?? 0) + 1
  } else if (kind === 'learn_skill') {
    if (targetId in skills) return c.json({ error: 'Skill ist bereits bekannt' }, 400)
    skills[targetId] = 1
  } else {
    if (staerken.includes(targetId)) return c.json({ error: 'Stärke ist bereits vorhanden' }, 400)
    staerken.push(targetId)
  }
  state.skills = skills
  state.staerken = staerken

  await db.insert(characterXpLog).values({
    id: crypto.randomUUID(),
    characterId: id,
    amount: -cost,
    reason: reason || `Aufwertung: ${targetName}`,
    createdAt: now,
  })

  const updated = await db.update(characters)
    .set({
      xp: currentXp - cost,
      state: JSON.stringify(state),
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
