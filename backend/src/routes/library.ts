import { Hono } from 'hono'
import { db } from '../db'
import {
  races,
  cultures,
  trainings,
  masteries,
  spells,
  resources,
  items,
  statblocks,
  derivedValues,
  skills,
  strengths,
  weaknesses,
  characterSteps,
} from '../db/schema'
import { eq } from 'drizzle-orm'
import { validateKultur, parseKosten, validateMehrfachConfig } from '@mcc/shared'

const libraryTables = [
  { path: 'races', table: races },
  { path: 'cultures', table: cultures },
  { path: 'trainings', table: trainings },
  { path: 'masteries', table: masteries },
  { path: 'spells', table: spells },
  { path: 'resources', table: resources },
  { path: 'items', table: items },
  { path: 'statblocks', table: statblocks },
  { path: 'derived-values', table: derivedValues },
  { path: 'skills', table: skills },
  { path: 'strengths', table: strengths },
  { path: 'weaknesses', table: weaknesses },
]

function createLibraryRoutes() {
  const router = new Hono()

  // Speicherprüfung der Kulturregeln R1/R2/R4/R5 (INT-000015): regelwidrige
  // Kulturen werden nicht abgelegt, auch wenn das Frontend umgangen wird.
  async function kulturSpeicherFehler(config: unknown): Promise<string | null> {
    const rows = await db.select().from(strengths)
    const kostenById: Record<string, number> = {}
    for (const row of rows) {
      const kosten = parseKosten(row.config)
      if (kosten !== null) kostenById[row.id] = kosten
    }
    return validateKultur(config, kostenById)
  }

  /** INT-000023: ungültige Mehrfachauswahl-Konfigurationen abweisen. */
  function mehrfachSpeicherFehler(path: string, config: unknown): string | null {
    if (path !== 'strengths' && path !== 'masteries') return null
    if (config === undefined || config === null) return null
    return validateMehrfachConfig(config)
  }

  for (const { path, table } of libraryTables) {
    router.get(`/library/${path}`, async (c) => {
      const data = await db.select().from(table)
      return c.json(data)
    })

    router.post(`/library/${path}`, async (c) => {
      const body = await c.req.json()
      if (path === 'cultures') {
        const fehler = await kulturSpeicherFehler(body.config)
        if (fehler) return c.json({ message: fehler }, 400)
      }
      const mehrfachFehler = mehrfachSpeicherFehler(path, body.config)
      if (mehrfachFehler) return c.json({ message: mehrfachFehler }, 400)
      const entry = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description ?? null,
        config: body.config ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await db.insert(table).values(entry)
      return c.json(entry, 201)
    })

    router.get(`/library/${path}/:id`, async (c) => {
      const id = c.req.param('id')
      const result = await db.select().from(table).where(eq(table.id, id))
      if (result.length === 0) {
        return c.json({ error: 'Not found' }, 404)
      }
      return c.json(result[0])
    })

    router.patch(`/library/${path}/:id`, async (c) => {
      const id = c.req.param('id')
      const body = await c.req.json()
      const existing = await db.select().from(table).where(eq(table.id, id))
      if (existing.length === 0) {
        return c.json({ error: 'Not found' }, 404)
      }
      if (path === 'cultures') {
        const config = body.config !== undefined ? body.config : existing[0].config
        const fehler = await kulturSpeicherFehler(config)
        if (fehler) return c.json({ message: fehler }, 400)
      }
      const mehrfachFehler = mehrfachSpeicherFehler(
        path,
        body.config !== undefined ? body.config : existing[0].config,
      )
      if (mehrfachFehler) return c.json({ message: mehrfachFehler }, 400)
      const updated = {
        ...existing[0],
        ...body,
        updatedAt: Date.now(),
      }
      await db.update(table).set(updated).where(eq(table.id, id))
      return c.json(updated)
    })

    router.delete(`/library/${path}/:id`, async (c) => {
      const id = c.req.param('id')
      const existing = await db.select().from(table).where(eq(table.id, id))
      if (existing.length === 0) {
        return c.json({ error: 'Not found' }, 404)
      }

      const allSteps = await db.select().from(characterSteps)
      let referencedBy = 0
      for (const step of allSteps) {
        if (step.delta && step.delta.includes(id)) {
          referencedBy++
        }
      }

      if (referencedBy > 0) {
        return c.json({
          error: 'Referenziert',
          message: `Wird von ${referencedBy} Charakter(en) verwendet und kann nicht gelöscht werden.`,
        }, 409)
      }

      await db.delete(table).where(eq(table.id, id))
      return c.json({ message: 'Deleted' })
    })
  }

  return router
}

export default createLibraryRoutes
