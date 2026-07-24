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

async function replaceSkills() {
  await client.execute({ sql: 'DELETE FROM skills', args: [] });
  console.log('Migration: cleared old skills');

  const now = Date.now();

  const allSkills = [
    // Fertigkeiten (27)
    { name: 'Akrobatik', kategorie: 'fertigkeit', a1: 'FF', a2: 'GE', beschreibung: 'Akrobatische Kunststücke, Balance, Sprünge' },
    { name: 'Anführen', kategorie: 'fertigkeit', a1: 'CH', a2: 'HIN', beschreibung: 'Befehlen, Anleiten, Kampfkommandos' },
    { name: 'Arkane Kunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'MYS', beschreibung: 'Magisches Wissen, Theorie, Artefakte' },
    { name: 'Athletik', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KRA', beschreibung: 'Laufen, Klettern, Sportliche Leistungen' },
    { name: 'Diplomatie', kategorie: 'fertigkeit', a1: 'CHA', a2: 'INT', beschreibung: 'Verhandeln, Überzeugen, Intrigen' },
    { name: 'Empathie', kategorie: 'fertigkeit', a1: 'CHA', a2: 'HIN', beschreibung: 'Gefühle und Stimmungen anderer erkennen' },
    { name: 'Entschlossenheit', kategorie: 'fertigkeit', a1: 'MUT', a2: 'KON', beschreibung: 'Willenskraft, Ausdauer gegen psychischen Druck' },
    { name: 'Geschichten und Mythen', kategorie: 'fertigkeit', a1: 'INT', a2: 'CHA', beschreibung: 'Historisches Wissen, Sagen, Legenden' },
    { name: 'Götter und Okkultismus', kategorie: 'fertigkeit', a1: 'MUT', a2: 'MYS', beschreibung: 'Götter, Kulte, okkultes Wissen' },
    { name: 'Handwerk', kategorie: 'fertigkeit', a1: 'FF', a2: 'KRA', beschreibung: 'Handwerkliche Fertigkeiten, Werkzeuge, Materialien' },
    { name: 'Heilkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'FF', beschreibung: 'Verwundungen behandeln, Krankheiten heilen' },
    { name: 'Heimlichkeit', kategorie: 'fertigkeit', a1: 'FF', a2: 'GEW', beschreibung: 'Schleichen, Verstecken, Lärmlos bewegen' },
    { name: 'Länderkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'CHA', beschreibung: 'Geografie, Kulturen, Handelswege' },
    { name: 'Mechanik', kategorie: 'fertigkeit', a1: 'INT', a2: 'FF', beschreibung: 'Mechanismen verstehen, Konstrukte, Fallen' },
    { name: 'Motorik', kategorie: 'fertigkeit', a1: 'FF', a2: 'GEW', beschreibung: 'Feinmotorik, Geschicklichkeit der Hände' },
    { name: 'Naturkunde', kategorie: 'fertigkeit', a1: 'INT', a2: 'HIN', beschreibung: 'Pflanzen, Tiere, Ökosysteme verstehen' },
    { name: 'Redegewandtheit', kategorie: 'fertigkeit', a1: 'CHA', a2: 'MUT', beschreibung: 'Überzeugen, Lügen, Reden halten' },
    { name: 'Schwimmen', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KRA', beschreibung: 'Schwimmen, Tauchen, Wasserverhalten' },
    { name: 'Seefahrt', kategorie: 'fertigkeit', a1: 'GEW', a2: 'KON', beschreibung: 'Schiffe führen, Segel, Navigation auf dem Wasser' },
    { name: 'Straßenkunde', kategorie: 'fertigkeit', a1: 'HIN', a2: 'CHA', beschreibung: 'Ortsunkundig zurechtfinden, Kontakte finden' },
    { name: 'Tierführung', kategorie: 'fertigkeit', a1: 'CHA', a2: 'HIN', beschreibung: 'Tiere verstehen, abrichten, führen' },
    { name: 'Überleben', kategorie: 'fertigkeit', a1: 'HIN', a2: 'KON', beschreibung: 'In der Wildnis überleben, Lager, Feuer' },
    { name: 'Wahrnehmung', kategorie: 'fertigkeit', a1: 'HIN', a2: 'MUT', beschreibung: 'Umgebung wahrnehmen, Details bemerken' },
    { name: 'Zähigkeit', kategorie: 'fertigkeit', a1: 'KON', a2: 'KRA', beschreibung: 'Schmerz ertragen, Ausdauer, Belastbarkeit' },
    // Kampffertigkeiten (7)
    { name: 'Handgemenge', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf ohne Waffen (Faustkampf, Würgegriffe)' },
    { name: 'Hiebwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Hiebwaffen (Streitkolben, Äxte)' },
    { name: 'Kettenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Kettenwaffen (Kettenstäbe, Flegel)' },
    { name: 'Klingenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Klingenwaffen (Schwerter, Dolche)' },
    { name: 'Schusswaffen', kategorie: 'kampf', a1: 'FF', a2: 'GEW', beschreibung: 'Kampf mit Schusswaffen (Bögen, Armbrüste)' },
    { name: 'Stangenwaffen', kategorie: 'kampf', a1: 'GEW', a2: 'KRA', beschreibung: 'Kampf mit Stangenwaffen (Speere, Hellebarden)' },
    { name: 'Wurfwaffen', kategorie: 'kampf', a1: 'FF', a2: 'GEW', beschreibung: 'Kampf mit Wurfwaffen (Wurfmesser, Speere)' },
    // Magieschulen (20)
    { name: 'Bannmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Verbannens und Bindens' },
    { name: 'Beherrschungsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Beeinflussung und Kontrolle' },
    { name: 'Bewegungsmagie', kategorie: 'magie', a1: 'FF', a2: 'MYS', beschreibung: 'Magie der Bewegung und Telekinese' },
    { name: 'Erkenntnismagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie der Wahrnehmung und des Wissens' },
    { name: 'Felsmagie', kategorie: 'magie', a1: 'KRA', a2: 'MYS', beschreibung: 'Magie des Steins und der Erde' },
    { name: 'Feuermagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Feuers und der Hitze' },
    { name: 'Heilungsmagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie des Heilens und der Lebenskraft' },
    { name: 'Illusionsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Täuschung und Scheinwelten' },
    { name: 'Kampfmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie der Kampfunterstützung und Schutz' },
    { name: 'Lichtmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Lichts und der Reinigung' },
    { name: 'Naturmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie der Natur und der Elemente' },
    { name: 'Raummagie', kategorie: 'magie', a1: 'INT', a2: 'MYS', beschreibung: 'Magie des Raums und der Teleportation' },
    { name: 'Schattenmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie der Schatten und Verbergung' },
    { name: 'Schicksalsmagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Schicksals und der Vorhersage' },
    { name: 'Schutzmagie', kategorie: 'magie', a1: 'KON', a2: 'MYS', beschreibung: 'Magie des Schutzes und der Abwehr' },
    { name: 'Stärkungsmagie', kategorie: 'magie', a1: 'KRA', a2: 'MYS', beschreibung: 'Magie der Verstärkung und Kraft' },
    { name: 'Todesmagie', kategorie: 'magie', a1: 'MUT', a2: 'MYS', beschreibung: 'Magie des Todes und der Geisterwelt' },
    { name: 'Verwandlungsmagie', kategorie: 'magie', a1: 'CHA', a2: 'MYS', beschreibung: 'Magie der Verwandlung und Formveränderung' },
    { name: 'Wassermagie', kategorie: 'magie', a1: 'HIN', a2: 'MYS', beschreibung: 'Magie des Wassers und der Strömungen' },
    { name: 'Windmagie', kategorie: 'magie', a1: 'FF', a2: 'MYS', beschreibung: 'Magie des Windes und der Luft' },
  ];

  for (const s of allSkills) {
    const id = s.name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cfg = JSON.stringify({ kategorie: s.kategorie, maxWert: '18', attribut1: s.a1, attribut2: s.a2, beschreibung: s.beschreibung });
    await client.execute({
      sql: `INSERT INTO skills (id, name, type, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, s.name, s.kategorie, s.beschreibung, cfg, now, now],
    });
  }

  console.log(`Migration: replaced with ${allSkills.length} new skills`);
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

export async function runMigration() {
  await repairCharactersTable();
  await makeSkillsTypeNullable();
  await createStrengthsTable();
  await createWeaknessesTable();
  await replaceSkills();

  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }
}
