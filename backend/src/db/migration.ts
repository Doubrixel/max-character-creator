import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DATABASE_URL || 'file:///app/data/sqlite.db' });

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await client.execute({ sql: `PRAGMA table_info(${table})`, args: [] });
  const rows = result.rows || [];
  return rows.some((row: any) => row.name === column);
}

export async function runMigration() {
  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }

  if (await columnExists('characters', 'stats')) {
    const tableInfo = await client.execute({ sql: `PRAGMA table_info(characters)`, args: [] });
    const rows = tableInfo.rows || [];
    const statsCol = rows.find((row: any) => row.name === 'stats');
    if (statsCol) {
      await client.execute(`CREATE TABLE characters_new AS SELECT id, name, created_at, updated_at, status, xp, total_xp FROM characters`);
      await client.execute(`DROP TABLE characters`);
      await client.execute(`ALTER TABLE characters_new RENAME TO characters`);
      console.log('Migration: removed stats column from characters');
    }
  }
}
