import assert from 'node:assert/strict';

/**
 * INT-000023 (SF-000014): Kind-Prozess mit isolierter SQLite-DB.
 *  - Bibliothek: gültige Mehrfachkonfiguration speichern, ungültige abweisen
 *  - Chronik: mehrfacher Erwerb bis zur Obergrenze, Boni pro Kauf addiert
 *  - Erstellung/Vorschau: wiederholte Auswahlen zählen mehrfach
 * Alle Daten sind ausschließlich synthetisch.
 */

const [
  { db },
  { migrate },
  { runMigration },
  { seedIfNeeded },
  { default: app },
  shared,
] = await Promise.all([
  import('../db/index'),
  import('drizzle-orm/libsql/migrator'),
  import('../db/migration'),
  import('../db/seed'),
  import('../index'),
  import('@mcc/shared'),
]);

const { readMehrfachConfig } = shared as typeof import('@mcc/shared');

const RASSE_MENSCH = {
  id: 'rasse-mensch',
  name: 'Mensch',
  groessenklasse: 3,
  statblock: { vorteile: [] as string[], nachteile: [] as string[] },
};

const ATTRIBUTE = {
  MUT: 12, KLU: 12, INT: 12, CHA: 12, HIN: 12,
  MYS: 12, FF: 12, GEW: 14, KON: 14, KRA: 12,
};

function attributeDelta() {
  return { attribute: { ...ATTRIBUTE }, rolls: Object.values(ATTRIBUTE), slotAssignments: {} };
}

async function postLibrary(
  path: string,
  name: string,
  config: Record<string, unknown>,
): Promise<{ status: number; id?: string; body: unknown }> {
  const res = await app.request(`/api/library/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: 'Synthetischer Testdatensatz', config: JSON.stringify(config) }),
  });
  const body = await res.json() as { id?: string };
  return { status: res.status, id: body.id, body };
}

async function createCharacter(name: string, steps: Record<string, unknown>): Promise<{
  id: string;
  state: {
    attribute: Record<string, number>;
    staerken: string[];
    meisterschaften: { id: string; name: string }[];
  };
}> {
  const res = await app.request('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, steps }),
  });
  assert.equal(res.status, 201, await res.clone().text());
  return await res.json() as any;
}

async function getState(id: string): Promise<{
  state: {
    attribute: Record<string, number>;
    staerken: string[];
    meisterschaften: { id: string; name: string }[];
  };
}> {
  const res = await app.request(`/api/characters/${id}/state`);
  assert.equal(res.status, 200);
  return await res.json() as any;
}

async function spend(id: string, targetId: string, targetName: string): Promise<number> {
  const res = await app.request(`/api/characters/${id}/xp/spend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'learn_strength', targetId, targetName,
      reason: 'Neu erlernen: Stärke', cost: 15,
    }),
  });
  return res.status;
}

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await runMigration();
  await seedIfNeeded();

  // --- Bibliothek: gültige und ungültige Obergrenzen -----------------------
  const flink = await postLibrary('strengths', 'Flink', {
    kosten: '1', kategorie: 'staerke',
    mehrfach_waehlbar: 'true', max_auswahl: '2',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 1 },
  });
  assert.equal(flink.status, 201, JSON.stringify(flink.body));
  assert.ok(flink.id);
  assert.deepEqual(readMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: '2' }), {
    flag: true, max: 2, aktiv: true,
  });

  const meisterflink = await postLibrary('masteries', 'Meisterflink', {
    effekt: 'Testeffekt', kosten: '1', kategorie: 'pflicht', schwelle: '1',
    kategorie_name: 'Akrobatik', voraussetzung: 'Keine',
    mehrfach_waehlbar: 'true', max_auswahl: '2',
    passive_bonus_aktiv: 'true', passive_bonus: { MUT: 2 },
  });
  assert.equal(meisterflink.status, 201, JSON.stringify(meisterflink.body));
  assert.ok(meisterflink.id);

  const einfach = await postLibrary('strengths', 'Einfach', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 1 },
  });
  assert.equal(einfach.status, 201);
  assert.ok(einfach.id);

  for (const [index, wert] of ['0', '-2', '1,5', 'abc'].entries()) {
    const invalid = await postLibrary('strengths', `Ungueltig${index}`, {
      kosten: '1', kategorie: 'staerke', mehrfach_waehlbar: 'true', max_auswahl: wert,
    });
    assert.equal(invalid.status, 400, `ungültige Obergrenze „${wert}“ wurde gespeichert`);
  }
  const patchInvalid = await app.request(`/api/library/strengths/${flink.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: JSON.stringify({ mehrfach_waehlbar: 'true', max_auswahl: '0' }) }),
  });
  assert.equal(patchInvalid.status, 400, 'ungültige PATCH-Konfiguration wurde übernommen');
  const patched = await app.request(`/api/library/strengths/${flink.id}`);
  const patchedBody = await patched.json() as { config: string };
  assert.equal(readMehrfachConfig(patchedBody.config).max, 2, 'gültige Konfiguration bleibt erhalten');

  // --- Chronik: regulärer Preis, Obergrenze, summierte Boni ----------------
  const chronik = await createCharacter('QA23 Chronikcharakter', {
    rasse: RASSE_MENSCH,
    attribute: attributeDelta(),
  });
  const addXp = await app.request(`/api/characters/${chronik.id}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 30, reason: 'Synthetische Test-XP' }),
  });
  assert.equal(addXp.status, 200, await addXp.clone().text());

  assert.equal(await spend(chronik.id, flink.id!, 'Flink'), 200, 'erster Kauf');
  const nachErstem = await getState(chronik.id);
  assert.equal(nachErstem.state.attribute.KON, 15, 'nach einem Kauf KON 14 + 1');
  assert.deepEqual(nachErstem.state.staerken, [flink.id], 'ein Eintrag nach erstem Kauf');

  assert.equal(await spend(chronik.id, flink.id!, 'Flink'), 200, 'zweiter Kauf zum regulären Preis');
  const nachZweitem = await getState(chronik.id);
  assert.equal(nachZweitem.state.attribute.KON, 16, 'zwei Käufe ergeben KON +2');
  assert.deepEqual(nachZweitem.state.staerken, [flink.id, flink.id], 'zwei Auswahlen gespeichert');

  const dritter = await spend(chronik.id, flink.id!, 'Flink');
  assert.equal(dritter, 400, 'dritter Kauf muss an der Obergrenze scheitern');
  assert.deepEqual((await getState(chronik.id)).state.staerken, [flink.id, flink.id]);

  // Nicht mehrfach wählbar: nach einem Kauf unverändert gesperrt.
  const addXpAgain = await app.request(`/api/characters/${chronik.id}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 30, reason: 'Weitere synthetische Test-XP' }),
  });
  assert.equal(addXpAgain.status, 200, await addXpAgain.clone().text());
  assert.equal(await spend(chronik.id, einfach.id!, 'Einfach'), 200);
  assert.equal(await spend(chronik.id, einfach.id!, 'Einfach'), 400, 'Einfach bleibt einmalig');

  // --- Erstellung und Vorschau: wiederholte Auswahlen zählen mehrfach ------
  const steps = {
    rasse: RASSE_MENSCH,
    attribute: attributeDelta(),
    kindheit: { skills: {}, staerke: flink.id, staerken: [flink.id, flink.id] },
    Zauber: {
      pflicht: [
        { skillId: 'akrobatik', meisterschaft: { id: meisterflink.id, name: 'Meisterflink' } },
        { skillId: 'akrobatik', meisterschaft: { id: meisterflink.id, name: 'Meisterflink' } },
      ],
      spells: [],
    },
  };
  const preview = await app.request('/api/characters/preview-bonuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  assert.equal(preview.status, 200, await preview.clone().text());
  const previewBody = await preview.json() as { bonuses: Record<string, number> };
  assert.deepEqual(previewBody.bonuses, { KON: 2, MUT: 4 }, 'Vorschau zählt beide Auswahlen je Stärke/Meisterschaft');

  const erstellt = await createCharacter('QA23 Erstellungscharakter', steps);
  assert.deepEqual(erstellt.state.staerken, [flink.id, flink.id], 'beide Stärken-Auswahlen im Charakter');
  assert.equal(erstellt.state.meisterschaften.length, 2, 'beide Meisterschafts-Auswahlen im Charakter');
  assert.equal(erstellt.state.attribute.KON, 16, 'KON +2 aus zwei Flink-Auswahlen');
  assert.equal(erstellt.state.attribute.MUT, 16, 'MUT +4 aus zwei Meisterflink-Auswahlen');
  const gelesen = await getState(erstellt.id);
  assert.equal(gelesen.state.attribute.KON, 16, 'Chronik liest die summierten Boni');
  assert.equal(gelesen.state.attribute.MUT, 16);

  // Altbestand mit nur `staerke` bleibt unverändert (eine Auswahl).
  const alt = await createCharacter('QA23 Altbestand', {
    rasse: RASSE_MENSCH,
    attribute: attributeDelta(),
    kindheit: { skills: {}, staerke: flink.id },
  });
  assert.deepEqual(alt.state.staerken, [flink.id]);
  assert.equal(alt.state.attribute.KON, 15, 'altes Delta zählt nur einmal');
} finally {
  db.$client.close();
}
