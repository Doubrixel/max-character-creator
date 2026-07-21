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

async function seedSkillsFromMasteries() {
  const result = await client.execute({ sql: 'SELECT name FROM skills', args: [] });
  const existing = new Set((result.rows || []).map((r: any) => r.name.toLowerCase()));
  const now = Date.now();

  const allSkills = [
    // Fertigkeiten
    { name: 'Akrobatik', kategorie: 'fertigkeit', a1: 'GE', a2: 'FF', beschreibung: 'Akrobatische Kunststücke, Balance, Sprünge' },
    { name: 'Anführen', kategorie: 'fertigkeit', a1: 'CH', a2: 'MU', beschreibung: 'Befehlen, Anleiten, Kampfkommandos' },
    { name: 'Arkane Kunde', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Magisches Wissen, Theorie, Artefakte' },
    { name: 'Athletik', kategorie: 'fertigkeit', a1: 'GE', a2: 'KK', beschreibung: 'Laufen, Klettern, Sportliche Leistungen' },
    { name: 'Diplomatie', kategorie: 'fertigkeit', a1: 'CH', a2: 'IN', beschreibung: 'Verhandeln, Überzeugen, Intrigen' },
    { name: 'Empathie', kategorie: 'fertigkeit', a1: 'CH', a2: 'IN', beschreibung: 'Gefühle und Stimmungen anderer erkennen' },
    { name: 'Entschlossenheit', kategorie: 'fertigkeit', a1: 'MU', a2: 'KO', beschreibung: 'Willenskraft, Ausdauer gegen psychischen Druck' },
    { name: 'Fingerfertigkeit', kategorie: 'fertigkeit', a1: 'FF', a2: 'GE', beschreibung: 'Feine motorische Skills, Taschendiebstahl, Trickbälle' },
    { name: 'Geschichte und Mythen', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Historisches Wissen, Sagen, Legenden' },
    { name: 'Gifte', kategorie: 'fertigkeit', a1: 'KL', a2: 'MU', beschreibung: 'Giftwirkung erkennen, Gifte herstellen' },
    { name: 'Heilkunde', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Verwundungen behandeln, Krankheiten heilen' },
    { name: 'Heimlichkeit', kategorie: 'fertigkeit', a1: 'FF', a2: 'GE', beschreibung: 'Schleichen, Verstecken, Lärmlos bewegen' },
    { name: 'Kräutersuche/Zutaten', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Kräuter finden, Zutaten bestimmen' },
    { name: 'Legende', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Sagenhafte Überlieferungen, Mythenwissen' },
    { name: 'Nahrungssuche', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Essbare Pflanzen und Tiere finden' },
    { name: 'Naturkunde', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Pflanzen, Tiere, Ökosysteme verstehen' },
    { name: 'Orientierung', kategorie: 'fertigkeit', a1: 'IN', a2: 'KL', beschreibung: 'Weg finden, Karten lesen, Navigation' },
    { name: 'Philosophie', kategorie: 'fertigkeit', a1: 'KL', a2: 'MU', beschreibung: 'Denken, Logik, Ethik, Weltanschauung' },
    { name: 'Redegewandtheit', kategorie: 'fertigkeit', a1: 'CH', a2: 'MU', beschreibung: 'Überzeugen, Lügen, Reden halten' },
    { name: 'Schlösser und Fallen', kategorie: 'fertigkeit', a1: 'FF', a2: 'KL', beschreibung: 'Schlösser öffnen, Fallen erkennen und entschärfen' },
    { name: 'Schleichen', kategorie: 'fertigkeit', a1: 'FF', a2: 'GE', beschreibung: 'Unbemerkt bewegen, Schatten nutzen' },
    { name: 'Schwimmen', kategorie: 'fertigkeit', a1: 'GE', a2: 'KK', beschreibung: 'Schwimmen, Tauchen, Wasserverhalten' },
    { name: 'Seefahrt', kategorie: 'fertigkeit', a1: 'GE', a2: 'KO', beschreibung: 'Schiffe führen, Segel, Navigation auf dem Wasser' },
    { name: 'Sich verkleiden und verstellen', kategorie: 'fertigkeit', a1: 'CH', a2: 'GE', beschreibung: 'Tarnung, Rollenspiel, Identität wechseln' },
    { name: 'Straßenkunde', kategorie: 'fertigkeit', a1: 'IN', a2: 'CH', beschreibung: 'Ortsunkundig zurechtfinden, Kontakte finden' },
    { name: 'Taschendiebstahl', kategorie: 'fertigkeit', a1: 'FF', a2: 'GE', beschreibung: 'Taschendiebstahl, sleight of hand' },
    { name: 'Tierführung', kategorie: 'fertigkeit', a1: 'CH', a2: 'IN', beschreibung: 'Tiere verstehen, abrichten, führen' },
    { name: 'Überleben', kategorie: 'fertigkeit', a1: 'KL', a2: 'KO', beschreibung: 'In der Wildnis überleben, Lager, Feuer' },
    { name: 'Wahrnehmung', kategorie: 'fertigkeit', a1: 'IN', a2: 'SR', beschreibung: 'Umgebung wahrnehmen, details bemerken' },
    { name: 'Wissen', kategorie: 'fertigkeit', a1: 'KL', a2: 'IN', beschreibung: 'Allgemeinwissen, Bildung, Gelehrtheit' },
    { name: 'Wettervorhersage', kategorie: 'fertigkeit', a1: 'IN', a2: 'KL', beschreibung: 'Wetter entwickeln, Wolken lesen' },
    { name: 'Zähigkeit', kategorie: 'fertigkeit', a1: 'KO', a2: 'KK', beschreibung: 'Schmerz ertragen, Ausdauer, Belastbarkeit' },
    { name: 'Zerstörung von Artefakten und Konstrukten', kategorie: 'fertigkeit', a1: 'KL', a2: 'FF', beschreibung: 'Magische Gegenstände und Konstrukte zerstören' },
    // Kampffertigkeiten
    { name: 'Hiebwaffen', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Kampf mit Hiebwaffen (Streitkolben, Äxte)' },
    { name: 'Kettenwaffen', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Kampf mit Kettenwaffen (Kettenstäbe, Flegel)' },
    { name: 'Klingenwaffen', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Kampf mit Klingenwaffen (Schwerter, Dolche)' },
    { name: 'Stangenwaffen', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Kampf mit Stangenwaffen (Speere, Hellebarden)' },
    { name: 'Schusswaffen', kategorie: 'kampf', a1: 'FF', a2: 'GE', beschreibung: 'Kampf mit Schusswaffen (Bögen, Armbrüste)' },
    { name: 'Wurfwaffen', kategorie: 'kampf', a1: 'FF', a2: 'GE', beschreibung: 'Kampf mit Wurfwaffen (Wurfmesser, Speere)' },
    { name: 'Nahkampf', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Allgemeiner Nahkampf' },
    { name: 'Distanz', kategorie: 'kampf', a1: 'FF', a2: 'GE', beschreibung: 'Distanzkampf' },
    { name: 'Schild', kategorie: 'kampf', a1: 'GE', a2: 'KK', beschreibung: 'Schildkampf' },
    // Magie
    { name: 'Elementarmagie', kategorie: 'magie', a1: 'IN', a2: 'KK', beschreibung: 'Magie der Elemente (Erde, Wasser, Feuer, Luft)' },
    { name: 'Feuermagie', kategorie: 'magie', a1: 'MU', a2: 'KK', beschreibung: 'Magie des Feuers und der Hitze' },
    { name: 'Heilungsmagie', kategorie: 'magie', a1: 'KL', a2: 'IN', beschreibung: 'Magie des Heilens und der Lebenskraft' },
    { name: 'Windmagie', kategorie: 'magie', a1: 'IN', a2: 'MU', beschreibung: 'Magie des Windes und der Luft' },
  ];

  let inserted = 0;
  for (const s of allSkills) {
    if (existing.has(s.name.toLowerCase())) continue;
    const id = s.name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cfg = JSON.stringify({ kategorie: s.kategorie, maxWert: '18', attribut1: s.a1, attribut2: s.a2, beschreibung: s.beschreibung });
    await client.execute({
      sql: `INSERT INTO skills (id, name, type, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, s.name, s.kategorie, s.beschreibung, cfg, now, now],
    });
    inserted++;
  }

  console.log(`Migration: seeded ${inserted} skills from mastery references`);
}

export async function runMigration() {
  await repairCharactersTable();
  await makeSkillsTypeNullable();
  await createStrengthsTable();
  await seedSkillsFromMasteries();

  if ((await columnExists('character_steps', 'data')) && !(await columnExists('character_steps', 'delta'))) {
    await client.execute(`ALTER TABLE character_steps RENAME COLUMN data TO delta`);
    console.log('Migration: renamed data to delta in character_steps');
  }
}
