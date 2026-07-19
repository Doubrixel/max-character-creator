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

export async function runMigration() {
  await repairCharactersTable();

  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }
}
