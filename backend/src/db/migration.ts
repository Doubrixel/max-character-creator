import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DATABASE_URL || 'file:./sqlite.db' });

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

async function tableExists(table: string): Promise<boolean> {
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [table],
  });
  return (result.rows?.length ?? 0) > 0;
}

async function repairCharactersTable() {
  if (!(await tableExists('characters'))) return;
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
}

async function createWeaknessesTable() {
  const result = await client.execute({ sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='weaknesses'`, args: [] });
  if (result.rows && result.rows.length > 0) return;

  console.log('Migration: creating weaknesses table');

  await client.execute(`CREATE TABLE weaknesses (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    description text,
    config text,
    created_at integer,
    updated_at integer
  )`);

  console.log('Migration: weaknesses table created');
}

async function rebuildCharacterStepsWithStepKey() {
  const hasStepNumber = await columnExists('character_steps', 'step_number');
  const hasStepKey = await columnExists('character_steps', 'step_key');
  if (hasStepKey && !hasStepNumber) return;

  console.log('Migration: rebuilding character_steps with step_key');

  const stepKeyByNumber = [
    'schicksal', 'rasse', 'abstammung', 'kultur',
    'kindheit', 'ausbildung', 'attribute', 'meisterschaft',
  ];

  await client.execute(`CREATE TABLE character_steps_new (
    id text PRIMARY KEY NOT NULL,
    character_id text NOT NULL,
    step_key text NOT NULL,
    delta text,
    updated_at integer
  )`);

  if (hasStepNumber) {
    for (let i = 1; i <= stepKeyByNumber.length; i++) {
      await client.execute({
        sql: `INSERT INTO character_steps_new (id, character_id, step_key, delta, updated_at)
          SELECT id, character_id, ?, delta, updated_at FROM character_steps WHERE step_number = ?`,
        args: [stepKeyByNumber[i - 1], i],
      });
    }
  } else {
    await client.execute(`INSERT INTO character_steps_new (id, character_id, step_key, delta, updated_at)
      SELECT id, character_id, step_key, delta, updated_at FROM character_steps`);
  }

  await client.execute(`DROP TABLE character_steps`);
  await client.execute(`ALTER TABLE character_steps_new RENAME TO character_steps`);
  await client.execute(
    `CREATE UNIQUE INDEX character_steps_character_id_step_key_unique ON character_steps (character_id, step_key)`
  );

  console.log('Migration: character_steps rebuilt (step_key + unique index)');
}

export async function runMigration() {
  await repairCharactersTable();
  await makeSkillsTypeNullable();
  await createStrengthsTable();
  await createWeaknessesTable();

  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }

  await rebuildCharacterStepsWithStepKey();
}
