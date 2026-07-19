import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DATABASE_URL || 'file:///app/data/sqlite.db' });

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await client.execute({ sql: `PRAGMA table_info(${table})`, args: [] });
  const rows = result.rows || [];
  return rows.some((row: any) => row.name === column);
}

async function hasPrimaryKey(table: string): Promise<boolean> {
  const result = await client.execute({ sql: `PRAGMA table_info(${table})`, args: [] });
  const rows = result.rows || [];
  return rows.some((row: any) => row.pk === 1);
}

async function repairCharactersTable() {
  if (await hasPrimaryKey('characters')) return;

  console.log('Migration: repairing characters table (lost PK)');

  await client.execute(`CREATE TABLE characters_backup (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    created_at integer,
    updated_at integer,
    status text DEFAULT 'draft',
    xp integer DEFAULT 15,
    total_xp integer DEFAULT 15
  )`);

  await client.execute(`INSERT INTO characters_backup (id, name, created_at, updated_at, status, xp, total_xp)
    SELECT id, name, created_at, updated_at, status, xp, total_xp FROM characters`);

  await client.execute(`DROP TABLE characters`);
  await client.execute(`ALTER TABLE characters_backup RENAME TO characters`);

  console.log('Migration: characters table repaired');
}

async function makeSkillsTypeNullable() {
  const result = await client.execute({ sql: `PRAGMA table_info(skills)`, args: [] });
  const typeCol = (result.rows || []).find((row: any) => row.name === 'type');
  if (!typeCol || typeCol.notnull === 0) return;

  console.log('Migration: making skills.type nullable');

  await client.execute(`CREATE TABLE skills_backup (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    type text,
    description text,
    config text,
    created_at integer,
    updated_at integer
  )`);

  await client.execute(`INSERT INTO skills_backup (id, name, type, description, config, created_at, updated_at)
    SELECT id, name, type, description, config, created_at, updated_at FROM skills`);

  await client.execute(`DROP TABLE skills`);
  await client.execute(`ALTER TABLE skills_backup RENAME TO skills`);

  console.log('Migration: skills.type is now nullable');
}

async function createStrengthsTable() {
  const result = await client.execute({ sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='strengths'`, args: [] });
  if (result.rows && result.rows.length > 0) return;

  console.log('Migration: creating strengths table');

  await client.execute(`CREATE TABLE strengths (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    description text,
    config text,
    created_at integer,
    updated_at integer
  )`);

  const now = Date.now();
  const defaultStrengths = [
    { id: 'staerke_zaeh', name: 'Zäh', description: '+1 Widerstand gegen physische Angriffe', config: '{}' },
    { id: 'staerke_schnell', name: 'Schnell', description: '+1 Initiative in der ersten Kampfrunde', config: '{}' },
    { id: 'staerke_scharfsinn', name: 'Scharfsinn', description: '+1 auf alle Wahrnehmungsproben', config: '{}' },
    { id: 'staerke_charisma', name: 'Charisma', description: '+1 auf soziale Proben', config: '{}' },
  ];

  for (const s of defaultStrengths) {
    await client.execute({
      sql: `INSERT INTO strengths (id, name, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.name, s.description, s.config, now, now],
    });
  }

  console.log('Migration: strengths table created with 4 default entries');
}

export async function runMigration() {
  await repairCharactersTable();
  await makeSkillsTypeNullable();
  await createStrengthsTable();

  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }
}
