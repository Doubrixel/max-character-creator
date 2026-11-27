import { Hono } from 'hono'
import { db } from '../db'
import { characters, characterXpLog, characterSteps, strengths, masteries } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import {
  recalculateStats,
  buildFinalCharacter,
  geschwindigkeit,
  isStepKey,
  STEP_ORDER,
  StepDeltas,
  StepKey,
  CharacterState,
  applyPassiveBonuses,
  buildBonusCatalog,
  collectCreationPassiveBonuses,
  collectPassiveBonusesForSelections,
  readMehrfachConfig,
  zaehleAuswahlen,
} from '@mcc/shared'

const app = new Hono()

/** Bibliothekskatalog der passiven Boni (Vorteile/Stärken und Meisterschaften). */
async function loadBonusCatalog() {
  const [staerken, meisterschaften] = await Promise.all([
    db.select().from(strengths),
    db.select().from(masteries),
  ])
  return buildBonusCatalog([
    ...staerken.map((row) => ({ id: row.id, name: row.name, config: row.config })),
    ...meisterschaften.map((row) => ({ id: row.id, name: row.name, config: row.config })),
  ])
}

/** INT-000022: Bonusmenge der gewählten Schritte — für Erstellung und Vorschau identisch. */
async function bonusesForSteps(steps: StepDeltas) {
  return collectCreationPassiveBonuses(await loadBonusCatalog(), steps)
}

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

    // INT-000020 (SF-000012): Passive Boni der gewählten Meisterschaften,
    // Vorteile und Rassenvorteile einmalig additiv auf den fertigen Charakter
    // anrechnen (Attribute direkt, abgeleitete Werte nach ihrer Berechnung).
    const bonuses = await bonusesForSteps(steps)
    applyPassiveBonuses(final, [bonuses])

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

/**
 * INT-000022: Vorschau der passiven Boni für den Attribut-Schritt. Es wird
 * nichts gespeichert; geliefert werden nur die Boni der bereits gewählten
 * Stärken/Vorteile, Rassenvorteile und Meisterschaften. Die Anrechnung auf die
 * angezeigten Werte erfolgt im Frontend mit `previewStatsWithBonuses`.
 */
app.post('/api/characters/preview-bonuses', async (c) => {
  const body = await c.req.json()
  const steps = (body?.steps ?? {}) as StepDeltas
  return c.json({ bonuses: await bonusesForSteps(steps) })
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
    const final = JSON.parse(character[0].state) as Record<string, unknown>
    // INT-000019 (SF-000011): GES ist rein abgeleitet (GES = GK + GE) und wird
    // an dieser Stelle aus den vorhandenen Daten ermittelt. Damit erhalten auch
    // Bestandscharaktere, die vor der Einführung von GES abgeschlossen wurden,
    // denselben Wert wie neue Charaktere — der gespeicherte Zustand selbst
    // bleibt unverändert (keine Datenmigration nötig).
    const derived = final.derived
    if (derived && typeof derived === 'object' && !Array.isArray(derived)) {
      // INT-000020 (Re-Review): Nur nachholen, wenn noch kein GES gespeichert
      // ist. Bei neuen Charakteren wurde derived.GES bereits bei der Erstellung
      // aus dem rohen GEW berechnet (inkl. eines ggf. vergebenen GES-/GK-Bonus)
      // und gespeichert. Eine Neuberechnung aus `final.attribute.GEW` würde
      // hier den passiven GEW-Attributbonus erneut in GES hineinwirken lassen —
      // die Erstellung nutzt den rohen GEW —, sodass Erstellung und Chronik
      // für denselben Wert auseinanderliefen. Der gespeicherte Wert ist die
      // einzige konsistente Grundlage; nachgeholt wird nur für
      // Bestandscharaktere ohne GES (siehe INT-000019).
      const gesStored = (derived as Record<string, unknown>).GES
      if (typeof gesStored !== 'number') {
        const rasse = final.rasse as { groessenklasse?: unknown } | null | undefined
        const groessenklasse = typeof final.groessenklasse === 'number'
          ? final.groessenklasse
          : typeof rasse?.groessenklasse === 'number' ? rasse.groessenklasse : 3
        const attribute = final.attribute
        const gewandheit = attribute && typeof attribute === 'object' && !Array.isArray(attribute)
          ? (attribute as Record<string, unknown>).GEW
          : undefined
        ;(derived as Record<string, number>).GES = geschwindigkeit(
          groessenklasse,
          typeof gewandheit === 'number' ? gewandheit : undefined,
        )
      }
    }
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
  let strengthRow: { id: string; name: string; config: string | null } | undefined

  if (kind === 'skill_up') {
    if (!(targetId in skills)) return c.json({ error: 'Skill ist dem Charakter nicht bekannt' }, 400)
    skills[targetId] = (skills[targetId] ?? 0) + 1
  } else if (kind === 'learn_skill') {
    if (targetId in skills) return c.json({ error: 'Skill ist bereits bekannt' }, 400)
    skills[targetId] = 1
  } else {
    // INT-000023: Mehrfach wählbare Stärken bleiben bis zur konfigurierten
    // Obergrenze zum regulären Preis erwerbbar. Alle anderen verhalten sich
    // unverändert (nach einem Kauf nicht erneut angeboten).
    strengthRow = (await db.select().from(strengths).where(eq(strengths.id, targetId)))[0]
    const mehrfach = readMehrfachConfig(strengthRow?.config)
    const anzahl = zaehleAuswahlen(staerken, {
      id: strengthRow?.id ?? targetId,
      namen: [targetName, strengthRow?.name],
    })
    if (!mehrfach.aktiv && anzahl > 0) {
      return c.json({ error: 'Stärke ist bereits vorhanden' }, 400)
    }
    if (mehrfach.aktiv && anzahl >= (mehrfach.max ?? 1)) {
      return c.json({ error: `Maximale Auswahl-Obergrenze (${mehrfach.max}) erreicht` }, 400)
    }
    staerken.push(strengthRow?.id ?? targetId)
  }
  state.skills = skills
  state.staerken = staerken

  // INT-000020 (SF-000012): Wird eine Stärke in der Chronik neu erlernt,
  // werden ihre passiven Boni additiv auf den gespeicherten Zustand gelegt.
  if (kind === 'learn_strength') {
    const catalog = buildBonusCatalog(
      (await db.select().from(strengths)).map((row) => ({
        id: row.id, name: row.name, config: row.config,
      })),
    )
    const bonus = collectPassiveBonusesForSelections(catalog, [
      { id: strengthRow?.id ?? targetId, name: targetName },
    ])
    // Der gespeicherte Zustand enthält den Bonus bereits aus früheren
    // Auswahlen; pro neuem Kauf wird genau ein Bonus hinzugefügt.
    applyPassiveBonuses(state, [bonus])
  }

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
