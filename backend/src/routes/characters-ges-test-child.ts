import assert from 'node:assert/strict';

/**
 * INT-000019 (SF-000011): Geschwindigkeit (GES = GK + GE) als abgeleiteter Wert.
 * Prüfungen:
 *  - Bibliothek: Seed legt „Geschwindigkeit" mit Formel „GK + GE" an,
 *    bestehende Definitionen bleiben unverändert.
 *  - Erstellung (Formel-Semantik der Kachel): „GK + GE" ergibt GK plus
 *    Gewandheits-Modifikator; ohne zugeordnete Gewandheit erscheint „—".
 *  - Zentrale Berechnung: Beispiele der Abnahmekriterien (3+4=7 usw.).
 *  - Chronik: neue Charaktere persistieren GES, Bestandscharaktere ohne
 *    gespeichertes GES erhalten den Wert zur Laufzeit aus GK und GEW,
 *    ohne dass der gespeicherte Zustand verändert wird.
 */

const [{ db }, { migrate }, { runMigration }, { seedIfNeeded }, { characters }, { default: app }, shared] = await Promise.all([
  import('../db/index'),
  import('drizzle-orm/libsql/migrator'),
  import('../db/migration'),
  import('../db/seed'),
  import('../db/schema'),
  import('../index'),
  import('@mcc/shared'),
]);

const { evaluateFormula, geschwindigkeit } = shared as typeof import('@mcc/shared');
const { randomUUID } = await import('node:crypto');
const { eq } = await import('drizzle-orm');

interface StateResponse {
  state: { derived: Record<string, number> };
}

const RASSE_MENSCH = { id: 'rasse-mensch', name: 'Mensch', groessenklasse: 3, statblock: { vorteile: [], nachteile: [] } };
const RASSE_ELF = { id: 'rasse-elf', name: 'Elf', groessenklasse: 2, statblock: { vorteile: [], nachteile: [] } };

function attributeDelta(values: Record<string, number>) {
  return {
    attribute: values,
    rolls: Object.values(values),
    slotAssignments: {} as Record<string, number>,
  };
}

const VOLLE_ATTRIBUTE = {
  MUT: 12, KLU: 12, INT: 12, CHA: 12, HIN: 12, MYS: 12, FF: 12, GEW: 18, KON: 12, KRA: 12,
};

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await runMigration();
  await seedIfNeeded();

  // --- Bibliothek (TC-GES-05): Definition mit Formel vorhanden, keine Regression ---
  const libraryResponse = await app.request('/api/library/derived-values');
  assert.equal(libraryResponse.status, 200);
  const definitions = await libraryResponse.json() as { name: string; description: string | null; config: string | null }[];
  const gesDefinition = definitions.find((d) => d.name === 'Geschwindigkeit');
  assert.ok(gesDefinition, 'Seed legt „Geschwindigkeit" als abgeleiteten Wert an');
  assert.equal(JSON.parse(gesDefinition.config ?? '{}').formel, 'GK + GE');
  assert.ok((gesDefinition.description ?? '').length > 0, 'Beschreibung der GES-Definition ist gefüllt');
  for (const name of ['Lebenspunkte', 'Verteidigung', 'Initiative', 'GK']) {
    const existing = definitions.find((d) => d.name === name);
    assert.ok(existing, `${name} bleibt in der Bibliothek vorhanden`);
  }
  const verteidigung = definitions.find((d) => d.name === 'Verteidigung');
  assert.equal(JSON.parse(verteidigung?.config ?? '{}').formel, '12 + GE + INT + ( 5 - GK ) * 2', 'Formel der Verteidigung ist unverändert');

  // --- Erstellung (TC-GES-02/03/08): Formelbewertung der Kachel „GK + GE" ---
  const beispiel = evaluateFormula('GK + GE', { attribute: { GEW: 4 }, groessenklasse: 3 });
  assert.equal(beispiel.value, 7, 'GK 3 + GE 4 ergibt GES 7');
  assert.equal(beispiel.display, '7');
  const gewandheit14 = evaluateFormula('GK + GE', { attribute: { GEW: 2 }, groessenklasse: 3 });
  assert.equal(gewandheit14.value, 5, 'GK 3 + GE 2 ergibt GES 5');
  const elf = evaluateFormula('GK + GE', { attribute: { GEW: 2 }, groessenklasse: 2 });
  assert.equal(elf.value, 4, 'GK 2 + GE 2 ergibt GES 4');
  const ohneGewandheit = evaluateFormula('GK + GE', { attribute: {}, groessenklasse: 3 });
  assert.equal(ohneGewandheit.value, null, 'ohne zugeordnete Gewandheit bleibt GES unberechnet');
  assert.equal(ohneGewandheit.display, '—', 'ohne Gewandheit zeigt die Kachel den Platzhalter „—"');

  // --- Zentrale Berechnung: Abnahmebeispiele ---
  assert.equal(geschwindigkeit(3, 18), 7, 'GES(3, 18) = 7');
  assert.equal(geschwindigkeit(3, 14), 5, 'GES(3, 14) = 5');
  assert.equal(geschwindigkeit(2, 14), 4, 'GES(2, 14) = 4');
  assert.equal(geschwindigkeit(3, 12), 4, 'GES(3, 12) = 4');
  assert.equal(geschwindigkeit(3, undefined), 3, 'fehlende Gewandheit fällt auf GE 0 zurück');

  // --- Chronik (TC-GES-04): neuer Charakter speichert GES = GK + GE ---
  const createResponse = await app.request('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'GES-Neu-Mensch',
      steps: { rasse: RASSE_MENSCH, attribute: attributeDelta(VOLLE_ATTRIBUTE) },
    }),
  });
  assert.equal(createResponse.status, 201, await createResponse.clone().text());
  const created = await createResponse.json() as { id: string } & StateResponse;
  assert.equal(created.state.derived.GES, 7, 'Mensch GK 3 mit GEW 18 speichert GES 7');
  assert.equal(created.state.derived.LP, 20, 'Lebenspunkte bleiben unverändert berechnet');
  assert.equal(created.state.derived.VTD, 21, 'Verteidigung bleibt unverändert berechnet');
  assert.equal(created.state.derived.INI, 15, 'Initiative bleibt unverändert berechnet');

  const newStateResponse = await app.request(`/api/characters/${created.id}/state`);
  assert.equal(newStateResponse.status, 200);
  const newState = await newStateResponse.json() as StateResponse;
  assert.equal(newState.state.derived.GES, 7, 'Chronik zeigt denselben GES-Wert wie die Persistierung');

  // --- Chronik: GES folgt Änderungen von GK und GE (TC-GES-03 auf Persistenzebene) ---
  const elfResponse = await app.request('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'GES-Neu-Elf',
      steps: { rasse: RASSE_ELF, attribute: attributeDelta({ ...VOLLE_ATTRIBUTE, GEW: 14 }) },
    }),
  });
  assert.equal(elfResponse.status, 201);
  const elfCreated = await elfResponse.json() as StateResponse;
  assert.equal(elfCreated.state.derived.GES, 4, 'Elf GK 2 mit GEW 14 speichert GES 4');

  // --- Chronik (TC-GES-06): Bestandscharakter ohne gespeichertes GES ---
  const legacyId = randomUUID();
  const legacyDerived = { LP: 20, FK: 6, SP: 6, VTD: 21, KW: 14, GW: 14, SS: 0, INI: 15 };
  const legacyState = {
    version: 1,
    name: 'GES-Alt-Mensch',
    schicksal: null,
    rasse: RASSE_MENSCH,
    groessenklasse: 3,
    kultur: null,
    attribute: { ...VOLLE_ATTRIBUTE, GEW: 12 },
    derived: { ...legacyDerived },
    skills: {},
    rassenVorteile: [],
    rassenNachteile: [],
    staerken: [],
    ressourcen: {},
    meisterschaften: [],
    spells: [],
    xp: 15,
  };
  await db.insert(characters).values({
    id: legacyId,
    name: legacyState.name,
    createdAt: 1,
    updatedAt: 2,
    status: 'completed',
    state: JSON.stringify(legacyState),
    xp: 15,
    totalXp: 15,
  });

  const legacyStateResponse = await app.request(`/api/characters/${legacyId}/state`);
  assert.equal(legacyStateResponse.status, 200);
  const legacyRead = await legacyStateResponse.json() as StateResponse;
  assert.equal(legacyRead.state.derived.GES, 4, 'Bestandscharakter erhält GES = GK 3 + GE 1 zur Laufzeit');
  for (const [key, value] of Object.entries(legacyDerived)) {
    assert.equal(legacyRead.state.derived[key], value, `bisheriger abgeleiteter Wert ${key} ist unverändert`);
  }
  assert.equal(Object.keys(legacyRead.state.derived).length, Object.keys(legacyDerived).length + 1, 'nur GES kommt hinzu');

  // Der gespeicherte Zustand wird nicht umgeschrieben (rein abgeleiteter Wert).
  const storedRow = await db.select().from(characters).where(eq(characters.id, legacyId));
  assert.equal(storedRow.length, 1);
  const storedDerived = (JSON.parse(storedRow[0].state ?? '{}') as { derived?: Record<string, number> }).derived;
  assert.equal(storedDerived?.GES, undefined, 'gespeicherter Bestandszustand bleibt ohne GES');
} finally {
  db.$client.close();
}
