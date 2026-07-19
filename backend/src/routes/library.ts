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
} from '../db/schema'
import { eq } from 'drizzle-orm'

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
]

function createLibraryRoutes() {
  const router = new Hono()

  for (const { path, table } of libraryTables) {
    router.get(`/library/${path}`, async (c) => {
      const data = await db.select().from(table)
      return c.json(data)
    })

    router.post(`/library/${path}`, async (c) => {
      const body = await c.req.json()
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
      await db.delete(table).where(eq(table.id, id))
      return c.json({ message: 'Deleted' })
    })
  }

  return router
}

export default createLibraryRoutes
