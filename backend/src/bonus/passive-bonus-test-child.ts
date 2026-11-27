import assert from 'node:assert/strict';

/**
 * INT-000020 (SF-000012): Im Kind-Prozess mit isolierter SQLite-DB:
 *  - Nur-Ganzzahl-Validierung und Config-Lesen
 *  - Passive Boni bei der Charaktererstellung (Vorteil, Rassenvorteil, Meisterschaft)
 *  - Passive Boni bei XP-Vergabe in der Chronik
 *  - Bestehenbleiben des GES-Bonus beim Lesen des Charakterzustands
 * Alle Daten sind synthetisch.
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

const {
  readPassiveBonusConfig,
  sanitizeIntegerInput,
  isIntegerInput,
  buildBonusCatalog,
  collectPassiveBonuses,
  applyPassiveBonuses,
} = shared as typeof import('@mcc/shared');

interface StateResponse {
  state: {
    attribute: Record<string, number>
    derived: Record<string, number>
    staerken: string[]
    rassenVorteile: string[]
    groessenklasse: number
  };
}

const RASSE_MENSCH = {
  id: 'rasse-mensch',
  name: 'Mensch',
  groessenklasse: 3,
  statblock: { vorteile: [] as string[], nachteile: [] as string[] },
};

const ATTRIBUTE = {
  MUT: 14, KLU: 12, INT: 12, CHA: 12, HIN: 12,
  MYS: 12, FF: 12, GEW: 14, KON: 12, KRA: 12,
};

function attributeDelta() {
  return { attribute: ATTRIBUTE, rolls: Object.values(ATTRIBUTE), slotAssignments: {} };
}

async function postLibrary(path: string, name: string, config: Record<string, unknown>): Promise<string> {
  const res = await app.request(`/api/library/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: 'Synthetischer Testdatensatz', config: JSON.stringify(config) }),
  });
  assert.equal(res.status, 201, await res.clone().text());
  const body = await res.json() as { id: string };
  return body.id;
}

async function createCharacter(name: string, steps: Record<string, unknown>): Promise<{ id: string } & StateResponse> {
  const res = await app.request('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, steps }),
  });
  assert.equal(res.status, 201, await res.clone().text());
  return await res.json() as { id: string } & StateResponse;
}

async function getState(id: string): Promise<StateResponse> {
  const res = await app.request(`/api/characters/${id}/state`);
  assert.equal(res.status, 200);
  return await res.json() as StateResponse;
}

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await runMigration();
  await seedIfNeeded();

  // --- Nur ganze Zahlen: Eingabe und Config ---------------------------------
  assert.equal(isIntegerInput('-'), true, 'Minus-Zwischenzustand bleibt zulässig');
  assert.equal(isIntegerInput('1,5'), false, 'Dezimaltrennzeichen ist unzulässig');
  assert.equal(sanitizeIntegerInput('1,5'), '', 'Dezimaleingabe wird verworfen');
  assert.equal(sanitizeIntegerInput('2,5'), '', 'Dezimaleingabe wird verworfen');
  assert.equal(sanitizeIntegerInput('-2'), '-2', 'negative ganze Zahl bleibt erhalten');
  assert.equal(sanitizeIntegerInput('3'), '3');

  assert.equal(readPassiveBonusConfig(null).aktiv, false);
  assert.equal(readPassiveBonusConfig(JSON.stringify({ passive_bonus: { MUT: 4 } })).aktiv, false, 'ohne Aktivierung wirkt nichts');
  assert.deepEqual(
    readPassiveBonusConfig({ passive_bonus_aktiv: 'true', passive_bonus: { MUT: '1,5', KON: -2, LP: 3 } }).werte,
    { KON: -2, LP: 3 },
    'Dezimalwerte werden verworfen, ganze Zahlen (auch negative) übernommen',
  );

  const catalog = buildBonusCatalog([
    { id: 'v1', name: 'QA Vorteil', config: { passive_bonus_aktiv: 'true', passive_bonus: { KON: 2 } } },
  ]);
  const once = collectPassiveBonuses(catalog, { ids: ['v1'], names: ['QA Vorteil'] });
  assert.deepEqual(once, { KON: 2 }, 'Id- und Namensverweis zählen denselben Eintrag nur einmal');
  const state: Record<string, unknown> = { attribute: { KON: 12 }, derived: { LP: 20 }, groessenklasse: 3 };
  applyPassiveBonuses(state, [{ KON: 2, LP: 5 }]);
  assert.deepEqual(state.attribute, { KON: 14 });
  assert.deepEqual(state.derived, { LP: 25 });

  // --- Bibliothekseinträge mit passiven Boni anlegen -------------------------
  const vorteilId = await postLibrary('strengths', 'QA Vorteil Bonus', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 2, INI: 1 },
  });
  await postLibrary('strengths', 'QA Rassenvorteil Bonus', {
    kosten: '0', kategorie: 'rasse', unterkategorie: 'vorteil',
    passive_bonus_aktiv: 'true', passive_bonus: { KRA: 2, GES: 1 },
  });
  const chronikId = await postLibrary('strengths', 'QA Chronik Bonus', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 3, LP: 5 },
  });
  const meisterschaftId = await postLibrary('masteries', 'QA Meisterschaft Bonus', {
    effekt: 'QA Effekt', kosten: '1', kategorie: 'pflicht', schwelle: '1', kategorie_name: 'Akrobatik',
    passive_bonus_aktiv: 'true', passive_bonus: { MUT: 2 },
  });
  await postLibrary('strengths', 'QA Vorteil Neutral', {
    kosten: '1', kategorie: 'staerke', passive_bonus_aktiv: 'false', passive_bonus: { MUT: 9 },
  });

  // --- Charaktererstellung: Vorteil + Rassenvorteil + Meisterschaft ----------
  const rasse = {
    ...RASSE_MENSCH,
    statblock: { vorteile: ['QA Rassenvorteil Bonus'], nachteile: [] },
  };
  const created = await createCharacter('QA Bonuscharakter', {
    rasse,
    attribute: attributeDelta(),
    kindheit: { skills: {}, staerke: 'QA Vorteil Bonus' },
    Zauber: {
      pflicht: [{ skillId: 'akrobatik', meisterschaft: { id: meisterschaftId, name: 'QA Meisterschaft Bonus' } }],
      spells: [],
    },
  });
  assert.equal(created.state.attribute.KON, 14, 'Vorteil addiert +2 auf KON');
  assert.equal(created.state.attribute.MUT, 16, 'Meisterschaft addiert +2 auf MUT');
  assert.equal(created.state.attribute.KRA, 14, 'Rassenvorteil addiert +2 auf KRA');
  assert.equal(created.state.derived.INI, 18, 'abgeleiteter Wert INI (17) erhält +1 obenauf');
  assert.equal(created.state.derived.GES, 6, 'GES = GK 3 + GE 2 plus Bonus +1');
  assert.equal(created.state.derived.LP, 20, 'LP bleibt ohne Bonus unverändert berechnet');
  assert.ok(vorteilId && created.state.staerken.includes('QA Vorteil Bonus'), 'Vorteil ist im Charakter gespeichert');
  assert.ok(created.state.rassenVorteile.includes('QA Rassenvorteil Bonus'));

  const read = await getState(created.id);
  assert.equal(read.state.attribute.KON, 14, 'Chronik liest den KON-Bonus');
  assert.equal(read.state.derived.INI, 18, 'Chronik liest den INI-Bonus');
  assert.equal(read.state.derived.GES, 6, 'GES-Bonus bleibt beim Neuberechnen erhalten');

  // --- Chronik: XP-Vergabe für eine neue Stärke ------------------------------
  const chronikCharacter = await createCharacter('QA Chronikcharakter', {
    rasse: RASSE_MENSCH,
    attribute: attributeDelta(),
  });
  assert.equal(chronikCharacter.state.attribute.KON, 12);
  assert.equal(chronikCharacter.state.derived.LP, 20);

  const spend = await app.request(`/api/characters/${chronikCharacter.id}/xp/spend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'learn_strength', targetId: chronikId, targetName: 'QA Chronik Bonus',
      reason: 'Neu erlernen: Stärke', cost: 15,
    }),
  });
  assert.equal(spend.status, 200, await spend.clone().text());
  const afterReload = await getState(chronikCharacter.id);
  assert.equal(afterReload.state.attribute.KON, 15, 'Chronik-Vergabe addiert +3 auf KON');
  assert.equal(afterReload.state.derived.LP, 25, 'Chronik-Vergabe addiert +5 auf LP');
  assert.equal(afterReload.state.attribute.KON, 15, 'Chronik-Bonus übersteht das Neuladen');
  assert.equal(afterReload.state.derived.LP, 25);
  assert.ok(afterReload.state.staerken.includes(chronikId));

  // --- Ohne aktiven Bonus bleibt alles unverändert ---------------------------
  const neutralCharacter = await createCharacter('QA Neutralcharakter', {
    rasse: RASSE_MENSCH,
    attribute: attributeDelta(),
    kindheit: { skills: {}, staerke: 'QA Vorteil Neutral' },
  });
  assert.equal(neutralCharacter.state.attribute.MUT, 14, 'inaktiver Bonus wirkt nicht');
  assert.equal(neutralCharacter.state.staerken.includes('QA Vorteil Neutral'), true);
} finally {
  db.$client.close();
}
