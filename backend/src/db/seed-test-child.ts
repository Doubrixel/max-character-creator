import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

const [{ db }, { migrate }, { runMigration }, { seedIfNeeded }, { characters, derivedValues, races }, { default: app }] = await Promise.all([
  import('./index'),
  import('drizzle-orm/libsql/migrator'),
  import('./migration'),
  import('./seed'),
  import('./schema'),
  import('../index'),
]);

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await db.$client.execute('DROP TABLE characters');
  await db.$client.execute(`CREATE TABLE characters (
    id text,
    name text NOT NULL,
    created_at integer,
    updated_at integer,
    status text,
    state text,
    xp integer,
    total_xp integer
  )`);
  await db.$client.execute({
    sql: `INSERT INTO characters (id, name, created_at, updated_at, status, state, xp, total_xp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['legacy-character', 'Legacy Hero', 1, 2, 'active', '{"keep":true}', 15, 15],
  });
  await db.$client.execute({
    sql: `INSERT INTO races (id, name, config) VALUES (?, ?, ?)`,
    args: ['malformed-race', 'Unvollständige Rasse', '{invalid-json'],
  });
  await runMigration();
  await seedIfNeeded();

  const repairedCharacter = await db.select().from(characters).where(eq(characters.id, 'legacy-character'));
  assert.equal(repairedCharacter.length, 1);
  assert.equal(repairedCharacter[0].state, '{"keep":true}');
  const malformedRace = await db.select().from(races).where(eq(races.id, 'malformed-race'));
  assert.equal(malformedRace.length, 1);
  assert.equal(malformedRace[0].config, '{invalid-json');

  const customId = randomUUID();
  await db.insert(derivedValues).values({
    id: customId,
    name: 'Hausregel: Kritischer Treffer',
    description: 'Vom Nutzer angelegte Hausregel',
    config: JSON.stringify({ formel: 'W20 <= 2' }),
    createdAt: 1,
    updatedAt: 1,
  });

  const initiativeBefore = await db.select().from(derivedValues)
    .where(eq(derivedValues.name, 'Initiative'));
  assert.equal(initiativeBefore.length, 1);
  await db.update(derivedValues)
    .set({ description: 'Individuelle Initiative', config: JSON.stringify({ formel: 'INT + GE' }) })
    .where(eq(derivedValues.name, 'Initiative'));
  await db.delete(derivedValues).where(eq(derivedValues.name, 'GK'));

  await seedIfNeeded();

  const customAfter = await db.select().from(derivedValues).where(eq(derivedValues.id, customId));
  assert.equal(customAfter.length, 1);
  assert.equal(customAfter[0].config, JSON.stringify({ formel: 'W20 <= 2' }));

  const initiativeAfter = await db.select().from(derivedValues)
    .where(eq(derivedValues.name, 'Initiative'));
  assert.equal(initiativeAfter.length, 1);
  assert.equal(initiativeAfter[0].description, 'Individuelle Initiative');
  assert.equal(initiativeAfter[0].config, JSON.stringify({ formel: 'INT + GE' }));

  const missingDefault = await db.select().from(derivedValues).where(eq(derivedValues.name, 'GK'));
  assert.equal(missingDefault.length, 1);
  assert.equal(missingDefault[0].config, JSON.stringify({ formel: 'GK' }));

  const crossOriginHealth = await app.request('/api/health', {
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(crossOriginHealth.headers.get('access-control-allow-origin'), null);
} finally {
  db.$client.close();
}
