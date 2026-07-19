import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
  status: text('status').default('draft'),
  xp: integer('xp').default(15),
  totalXp: integer('total_xp').default(15),
});

export const characterSteps = sqliteTable('character_steps', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id),
  stepNumber: integer('step_number'),
  delta: text('delta'),
  updatedAt: integer('updated_at'),
});

export const races = sqliteTable('races', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const cultures = sqliteTable('cultures', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const trainings = sqliteTable('trainings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const masteries = sqliteTable('masteries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const spells = sqliteTable('spells', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const resources = sqliteTable('resources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const statblocks = sqliteTable('statblocks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const derivedValues = sqliteTable('derived_values', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const strengths = sqliteTable('strengths', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const characterSkills = sqliteTable('character_skills', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  name: text('name'),
  value: integer('value'),
  source: text('source'),
});

export const characterResources = sqliteTable('character_resources', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  resourceId: text('resource_id').notNull().references(() => resources.id),
  amount: integer('amount'),
});

export const characterItems = sqliteTable('character_items', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  itemId: text('item_id').notNull().references(() => items.id),
  quantity: integer('quantity'),
});

export const characterSpells = sqliteTable('character_spells', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  spellId: text('spell_id').notNull().references(() => spells.id),
});

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  description: text('description'),
  config: text('config'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const characterXpLog = sqliteTable('character_xp_log', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at'),
});

export const characterMasteries = sqliteTable('character_masteries', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id),
  masteryId: text('mastery_id').notNull().references(() => masteries.id),
});
