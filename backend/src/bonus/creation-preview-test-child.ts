import assert from 'node:assert/strict';
import type { PassiveBonus } from '@mcc/shared';

/**
 * INT-000022 (Rework v2): Kind-Prozess mit isolierter SQLite-DB.
 *  - Vorschau-Endpoint liefert genau die Boni der bereits gewählten Quellen
 *  - Attribut- und abgeleitete Werte im Attribut-Schritt (Vorschau) stimmen
 *    mit dem fertigen Charakter überein
 *  - ohne Bonus bleibt alles unverändert; die Roheingaben werden nicht mutiert
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
  attributeModifier,
  evaluateFormula,
  PASSIVE_DERIVED_STATS,
  previewStatsWithBonuses,
} = shared as typeof import('@mcc/shared');

const RASSE_MENSCH = {
  id: 'rasse-mensch',
  name: 'Mensch',
  groessenklasse: 3,
  statblock: { vorteile: [] as string[], nachteile: [] as string[] },
};

// Synthetische Attributswerte: KON 14 und GEW 14 ergeben Modifikator +2.
const ATTRIBUTE = {
  MUT: 12, KLU: 12, INT: 12, CHA: 12, HIN: 12,
  MYS: 12, FF: 12, GEW: 14, KON: 14, KRA: 12,
};

interface DerivedDefinition {
  name: string
  config: string | null
}

interface CreatedCharacter {
  state: {
    attribute: Record<string, number>
    derived: Record<string, number>
  };
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

async function previewBonuses(steps: Record<string, unknown>): Promise<PassiveBonus> {
  const res = await app.request('/api/characters/preview-bonuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json() as { bonuses: PassiveBonus };
  return body.bonuses;
}

async function createCharacter(name: string, steps: Record<string, unknown>): Promise<CreatedCharacter> {
  const res = await app.request('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, steps }),
  });
  assert.equal(res.status, 201, await res.clone().text());
  return await res.json() as CreatedCharacter;
}

async function derivedDefinitions(): Promise<DerivedDefinition[]> {
  const res = await app.request('/api/library/derived-values');
  assert.equal(res.status, 200);
  return await res.json() as DerivedDefinition[];
}

/**
 * Bildet die Anzeige im Attribut-Schritt nach: Rohattribute und
 * Kachel-Werte aus den Bibliotheksformeln, danach dieselbe Anrechnung wie
 * im fertigen Charakter.
 */
function attributeStepPreview(
  definitions: DerivedDefinition[],
  attribute: Record<string, number>,
  groessenklasse: number,
  bonuses: PassiveBonus,
) {
  const attributeModifiers: Record<string, number> = {};
  for (const [key, value] of Object.entries(attribute)) {
    attributeModifiers[key] = attributeModifier(value);
  }
  const keyByName = new Map(PASSIVE_DERIVED_STATS.map((s) => [s.label, s.key]));
  const derived: Record<string, number> = {};
  for (const def of definitions) {
    const cfg = def.config ? JSON.parse(def.config) as { formel?: unknown } : {};
    const formel = typeof cfg.formel === 'string' ? cfg.formel : '';
    const key = keyByName.get(def.name);
    const result = formel
      ? evaluateFormula(formel, { attribute: attributeModifiers, groessenklasse })
      : { value: null, display: '—' };
    if (key !== undefined && result.value !== null) derived[key] = result.value;
  }
  return previewStatsWithBonuses({ attribute: { ...attribute }, derived, groessenklasse }, [bonuses]);
}

function attributeDelta() {
  return { attribute: { ...ATTRIBUTE }, rolls: Object.values(ATTRIBUTE), slotAssignments: {} };
}

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await runMigration();
  await seedIfNeeded();

  const definitions = await derivedDefinitions();

  const konId = await postLibrary('strengths', 'QA22 KON2', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 2 },
  });
  const lpId = await postLibrary('strengths', 'QA22 LP5', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { LP: 5 },
  });
  const gewId = await postLibrary('strengths', 'QA22 GEW2', {
    kosten: '1', kategorie: 'staerke',
    passive_bonus_aktiv: 'true', passive_bonus: { GEW: 2 },
  });
  await postLibrary('strengths', 'QA22 Neutral', {
    kosten: '1', kategorie: 'staerke', passive_bonus_aktiv: 'false', passive_bonus: { KON: 9 },
  });
  const rassenVorteilId = await postLibrary('strengths', 'QA22 Rassenvorteil KON2', {
    kosten: '0', kategorie: 'rasse', unterkategorie: 'vorteil',
    passive_bonus_aktiv: 'true', passive_bonus: { KON: 2 },
  });
  const meisterschaftId = await postLibrary('masteries', 'QA22 Meisterschaft INI2', {
    effekt: 'QA Effekt', kosten: '1', kategorie: 'pflicht', schwelle: '1', kategorie_name: 'Akrobatik',
    passive_bonus_aktiv: 'true', passive_bonus: { INI: 2 },
  });
  assert.ok(konId && lpId && gewId && rassenVorteilId && meisterschaftId);

  // --- TC-01 / TC-04: KON +2 aus einer Stärke bereits im Attribut-Schritt ---
  const konSteps = {
    rasse: RASSE_MENSCH,
    kindheit: { skills: {}, staerke: 'QA22 KON2' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
  };
  const konBonuses = await previewBonuses(konSteps);
  assert.deepEqual(konBonuses, { KON: 2 }, 'Vorschau liefert den KON-Bonus der gewählten Stärke');
  const konPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, konBonuses);
  assert.equal(konPreview.attribute.KON, 16, 'Vorschau zeigt KON 14 + Bonus 2');
  const konFinal = await createCharacter('QA22 KON Charakter', konSteps);
  assert.equal(konFinal.state.attribute.KON, 16, 'fertiger Charakter zeigt ebenfalls 16');
  assert.equal(konPreview.attribute.KON, konFinal.state.attribute.KON, 'keine Abweichung Vorschau/Charakterbogen');

  // --- TC-02 / TC-07: LP +5 auf den abgeleiteten Wert obendrauf ---
  const lpSteps = {
    rasse: RASSE_MENSCH,
    kindheit: { skills: {}, staerke: 'QA22 LP5' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
  };
  const lpBonuses = await previewBonuses(lpSteps);
  assert.deepEqual(lpBonuses, { LP: 5 });
  const lpPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, lpBonuses);
  assert.equal(lpPreview.derived.LP, 30, 'LP 25 aus (GK 3 + KON-Mod +2) * 5 plus Bonus 5');
  const lpFinal = await createCharacter('QA22 LP Charakter', lpSteps);
  assert.equal(lpFinal.state.derived.LP, 30);
  assert.equal(lpPreview.derived.LP, lpFinal.state.derived.LP);

  // --- TC-03: ohne aktiven Bonus bleibt alles unverändert ---
  const neutralSteps = {
    rasse: RASSE_MENSCH,
    kindheit: { skills: {}, staerke: 'QA22 Neutral' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
  };
  assert.deepEqual(await previewBonuses(neutralSteps), {}, 'inaktiver Bonus liefert keine Vorschau-Boni');
  const neutralPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, {});
  assert.equal(neutralPreview.attribute.KON, 14);
  assert.equal(neutralPreview.derived.LP, 25);
  const neutralFinal = await createCharacter('QA22 Neutralcharakter', neutralSteps);
  assert.equal(neutralFinal.state.attribute.KON, 14);
  assert.equal(neutralFinal.state.derived.LP, 25);

  // --- TC-05: GEW-Attributbonus verändert GES nicht ---
  const gewSteps = {
    rasse: RASSE_MENSCH,
    kindheit: { skills: {}, staerke: 'QA22 GEW2' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
  };
  const gewPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, await previewBonuses(gewSteps));
  assert.equal(gewPreview.attribute.GEW, 16, 'GEW zeigt 14 + Bonus 2');
  assert.equal(gewPreview.derived.GES, 5, 'GES bleibt GK 3 + Modifikator des rohen GEW 14');
  const gewFinal = await createCharacter('QA22 GEW Charakter', gewSteps);
  assert.equal(gewFinal.state.attribute.GEW, 16);
  assert.equal(gewFinal.state.derived.GES, 5);
  assert.equal(gewPreview.derived.GES, gewFinal.state.derived.GES);

  // --- TC-06: Rassenvorteil (namensbasiert) fließt ebenfalls ein ---
  const rassenSteps = {
    rasse: {
      ...RASSE_MENSCH,
      statblock: { vorteile: ['QA22 Rassenvorteil KON2'], nachteile: [] },
    },
    kindheit: { skills: {}, staerke: 'QA22 Neutral' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
  };
  const rassenBonuses = await previewBonuses(rassenSteps);
  assert.deepEqual(rassenBonuses, { KON: 2 }, 'Rassenvorteil wird über seinen Namen gefunden');
  const rassenPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, rassenBonuses);
  assert.equal(rassenPreview.attribute.KON, 16);
  const rassenFinal = await createCharacter('QA22 Rassenvorteilcharakter', rassenSteps);
  assert.equal(rassenFinal.state.attribute.KON, 16);
  assert.equal(rassenPreview.attribute.KON, rassenFinal.state.attribute.KON);

  // --- Meisterschaft: auch ein späterer Schritt wird konsistent einbezogen ---
  const meisterschaftSteps = {
    rasse: RASSE_MENSCH,
    kindheit: { skills: {}, staerke: 'QA22 Neutral' },
    ausbildung: { skills: {}, staerken: [], ressourcen: {} },
    attribute: attributeDelta(),
    Zauber: {
      pflicht: [{
        skillId: 'akrobatik',
        meisterschaft: { id: meisterschaftId, name: 'QA22 Meisterschaft INI2' },
      }],
      spells: [],
    },
  };
  const iniBonuses = await previewBonuses(meisterschaftSteps);
  assert.deepEqual(iniBonuses, { INI: 2 });
  const iniPreview = attributeStepPreview(definitions, ATTRIBUTE, 3, iniBonuses);
  const iniFinal = await createCharacter('QA22 Meisterschaftscharakter', meisterschaftSteps);
  assert.equal(iniPreview.derived.INI, 19, 'INI 17 aus 20 - INT - GE plus Bonus 2');
  assert.equal(iniFinal.state.derived.INI, 19);
  assert.equal(iniPreview.derived.INI, iniFinal.state.derived.INI);

  // --- Regression: die Vorschau darf die Roheingaben nicht verändern --------
  const rawAttribute = { KON: 14, GEW: 14 };
  const untouched = attributeStepPreview(definitions, rawAttribute, 3, { KON: 2, LP: 5 });
  assert.deepEqual(rawAttribute, { KON: 14, GEW: 14 }, 'Attribut-Rohwerte bleiben unverändert');
  assert.equal(untouched.attribute.KON, 16);
  assert.equal(untouched.derived.LP, 30);
} finally {
  db.$client.close();
}
