import { Hono } from 'hono'
import { db } from '../db'
import { characters, characterXpLog, characterSteps, spells } from '../db/schema'
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

  return c.json(result[0])
})

app.get('/api/characters/:id/state', async (c) => {
  const id = c.req.param('id')
  const upTo = parseInt(c.req.query('upTo') ?? '7', 10)

  const allSteps = await db.select()
    .from(characterSteps)
    .where(eq(characterSteps.characterId, id))

  const deltas: Record<number, Record<string, unknown>> = {}
  for (const row of allSteps) {
    if (row.stepNumber! <= upTo) {
      deltas[row.stepNumber!] = row.delta ? JSON.parse(row.delta) : {}
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

  const newState = recalculateStats(allDeltas)

  return c.json({ step: updatedStep, state: newState })
})

app.post('/api/characters/:id/steps/:step/validate', async (c) => {
  const id = c.req.param('id')
  const step = parseInt(c.req.param('step'), 10)

  const allSteps = await db.select()
    .from(characterSteps)
    .where(eq(characterSteps.characterId, id))

  const allDeltas: Record<number, Record<string, unknown>> = {}
  for (const row of allSteps) {
    allDeltas[row.stepNumber!] = row.delta ? JSON.parse(row.delta) : {}
  }

  const VALID_SKILLS = [
    'nahkampf', 'distanz', 'schild', 'akrobatik', 'schleichen',
    'wahrnehmung', 'ueberleben', 'wissen', 'elementar', 'heilung',
  ]

  const MEISTERSCHAFT_SKILL_MAP: Record<string, string> = {
    'm_nah_1': 'nahkampf', 'm_nah_2': 'nahkampf',
    'm_dis_1': 'distanz', 'm_dis_2': 'distanz',
    'm_akr_1': 'akrobatik', 'm_akr_2': 'akrobatik',
    'm_sch_1': 'schleichen', 'm_sch_2': 'schleichen',
    'm_wah_1': 'wahrnehmung', 'm_wah_2': 'wahrnehmung',
    'm_wis_1': 'wissen', 'm_wis_2': 'wissen',
    'm_ele_1': 'elementar', 'm_ele_2': 'elementar',
    'm_hei_1': 'heilung', 'm_hei_2': 'heilung',
  }

  const warnings: Array<{ step: number, errors: string[] }> = []

  for (let s = step + 1; s <= 7; s++) {
    const delta = allDeltas[s]
    if (!delta) continue

    const deltasBefore: Record<number, Record<string, unknown>> = {}
    for (let i = 1; i < s; i++) {
      if (allDeltas[i]) deltasBefore[i] = allDeltas[i]
    }
    const stateBefore = recalculateStats(deltasBefore)
    const errors: string[] = []

    if (s === 4 || s === 5) {
      const deltaSkills = (delta.skills ?? {}) as Record<string, number>
      for (const key of Object.keys(deltaSkills)) {
        if (!VALID_SKILLS.includes(key)) {
          errors.push(`${key} ist kein gültiger Skill`)
        }
      }
    }

    if (s === 7) {
      const meisterschaften = (delta.meisterschaften ?? []) as string[]
      const stateSkills = (stateBefore.skills ?? {}) as Record<string, number>
      for (const mId of meisterschaften) {
        const skill = MEISTERSCHAFT_SKILL_MAP[mId]
        if (skill) {
          const wert = stateSkills[skill] ?? 0
          if (wert < 6) {
            errors.push(`Meisterschaft ${mId} erfordert Skill ${skill} mit Wert 6, aktuell ${wert}`)
          }
        }
      }

      const spellIds = (delta.spells ?? []) as string[]
      for (const spellId of spellIds) {
        const spellRows = await db.select().from(spells).where(eq(spells.id, spellId))
        if (spellRows.length > 0) {
          const config = spellRows[0].config ? JSON.parse(spellRows[0].config) : {}
          const school = config.school as string | undefined
          if (school) {
            const schoolValue = (stateBefore.skills as Record<string, number> | undefined)?.[school] ?? 0
            if (schoolValue <= 0) {
              errors.push(`Spell ${spellId} erfordert Magie-Schule mit Wert > 0`)
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      warnings.push({ step: s, errors })
    }
  }

  return c.json({ valid: warnings.length === 0, warnings })
})

export default app
