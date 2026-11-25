import assert from 'node:assert/strict';
import test from 'node:test';
import {
  istWahlVollstaendig,
  leseAlternativWahl,
  parseKulturRegeln,
  recalculateStats,
  validateKultur,
  wirksameKulturConfig,
  type AlternativWahl,
  type StepDeltas,
} from '@mcc/shared';

/**
 * Entweder/Oder-Wahl der Kulturalternativen im Schritt „Kultur" der
 * Charaktererstellung (SF-000009 / INT-000016). Die Fixtures entsprechen dem
 * Speicherformat des Bibliotheks-Kultureditors (INT-000015): Die Listen
 * stehen als JSON-Strings in der Config, die Culture-Config selbst ist ein
 * JSON-String (so liefert sie `/api/library/cultures`).
 *
 * Getestet werden die reinen Funktionen aus `@mcc/shared` (kulturWahl.ts),
 * die der KulturSelectStep ausschließlich aufruft, und die Zuweisung über den
 * vorhandenen kulturReducer (AK2.4: keine zweite Zuweisungslogik).
 */

/** Kultur „QA-Kultur-Talentwahl": eine Talent-Gruppe (TC-KULT-ALT-01). */
const KULTUR_TALENTWAHL = JSON.stringify({
  gaengigFuer: JSON.stringify(['rasse-mensch']),
  talente: JSON.stringify([]),
  waffenTalente: JSON.stringify([]),
  magieSchulen: JSON.stringify([]),
  staerken: JSON.stringify([]),
  alternativen: JSON.stringify([
    {
      typ: 'talent',
      seiten: [
        [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }],
        [
          { feld: 'talente', id: 'akrobatik', name: 'Akrobatik', wert: 1 },
          { feld: 'talente', id: 'heimlichkeit', name: 'Heimlichkeit', wert: 1 },
        ],
      ],
    },
  ]),
});

/** Kultur „QA-Kultur-Zwei-Gruppen": Talent- und Stärken-Gruppe (TC-KULT-ALT-04). */
const KULTUR_ZWEI_GRUPPEN = JSON.stringify({
  talente: JSON.stringify([]),
  waffenTalente: JSON.stringify([]),
  magieSchulen: JSON.stringify([]),
  staerken: JSON.stringify([]),
  alternativen: JSON.stringify([
    {
      typ: 'talent',
      seiten: [
        [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }],
        [
          { feld: 'talente', id: 'akrobatik', name: 'Akrobatik', wert: 1 },
          { feld: 'talente', id: 'heimlichkeit', name: 'Heimlichkeit', wert: 1 },
        ],
      ],
    },
    {
      typ: 'staerke',
      seiten: [
        [{ feld: 'staerken', id: 'qa-staerke-a', name: 'QA-Stärke-A', wert: 1 }],
        [{ feld: 'staerken', id: 'qa-staerke-b', name: 'QA-Stärke-B', wert: 1 }],
      ],
    },
  ]),
});

/** Kultur „QA-Kultur-Fest-Und-Alternativ": fester Eintrag + Stärken-Gruppe (TC-KULT-ALT-05). */
const KULTUR_FEST_UND_ALTERNATIV = JSON.stringify({
  talente: JSON.stringify([{ id: 'wahrnehmung', name: 'Wahrnehmung', punkte: 1 }]),
  waffenTalente: JSON.stringify([]),
  magieSchulen: JSON.stringify([]),
  staerken: JSON.stringify([]),
  alternativen: JSON.stringify([
    {
      typ: 'staerke',
      seiten: [
        [{ feld: 'staerken', id: 'qa-staerke-a', name: 'QA-Stärke-A', wert: 1 }],
        [{ feld: 'staerken', id: 'qa-staerke-b', name: 'QA-Stärke-B', wert: 1 }],
      ],
    },
  ]),
});

/** Kultur „QA-Kultur-Ohne-Gruppen": nur ein fester Eintrag (TC-KULT-ALT-08). */
const KULTUR_OHNE_GRUPPEN = JSON.stringify({
  gaengigFuer: JSON.stringify(['rasse-mensch']),
  talente: JSON.stringify([{ id: 'wahrnehmung', name: 'Wahrnehmung', punkte: 1 }]),
});

/** Talent-Gruppe bereichsübergreifend (K2b des Vorgängertickets). */
const KULTUR_BEREICHSUEBERGREIFEND = JSON.stringify({
  talente: JSON.stringify([]),
  magieSchulen: JSON.stringify([]),
  staerken: JSON.stringify([]),
  alternativen: JSON.stringify([
    {
      typ: 'talent',
      seiten: [
        [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }],
        [{ feld: 'magieSchulen', id: 'bannmagie', name: 'Bannmagie', wert: 2 }],
      ],
    },
  ]),
});

/** Altbestand mit echten Arrays statt JSON-Strings. */
const KULTUR_ALTBESTAND_ARRAYS = {
  talente: [{ id: 'wahrnehmung', name: 'Wahrnehmung', punkte: 1 }],
  alternativen: [
    {
      typ: 'talent',
      seiten: [
        [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }],
        [{ feld: 'talente', id: 'akrobatik', name: 'Akrobatik', wert: 2 }],
      ],
    },
  ],
};

const KOSTEN = { 'qa-staerke-a': 1, 'qa-staerke-b': 1 };

function leseAbschnitt(wirksam: Record<string, unknown>, key: string): { id: string; name: string; punkte?: number; anzahl?: number }[] {
  const roh = wirksam[key]
  return typeof roh === 'string' ? JSON.parse(roh) : (roh ?? [])
}

function kulturDelta(config: unknown, wahl: AlternativWahl): StepDeltas {
  return {
    kultur: {
      kulturId: 'kultur-test',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: wirksameKulturConfig(config, wahl),
      alternativWahl: wahl,
    },
  }
}

test('TC-KULT-ALT-08 (AK2.5): Kultur ohne Gruppen liefert die unveränderte Config', () => {
  const erwartet = JSON.parse(KULTUR_OHNE_GRUPPEN)
  assert.deepEqual(wirksameKulturConfig(KULTUR_OHNE_GRUPPEN, {}), erwartet)
  // Auch eine überzählige Wahl ändert nichts – es gibt keine Gruppen.
  assert.deepEqual(wirksameKulturConfig(KULTUR_OHNE_GRUPPEN, { 0: 1 }), erwartet)
  assert.equal(wirksameKulturConfig(null, {}), null)
  assert.equal(wirksameKulturConfig('kein json{', {}), null)
  // Leere Config: kein Eintrag, keine Gruppe – harmlos wie null.
  assert.deepEqual(wirksameKulturConfig('', {}), {})
})

test('TC-KULT-ALT-02 (AK2.2): gewählte Seite 1 steht in den Abschnitten, `alternativen` entfällt', () => {
  const wirksam = wirksameKulturConfig(KULTUR_TALENTWAHL, { 0: 0 })
  assert.ok(wirksam)
  // Abschnitt im Speicherformat des Editors (JSON-String) – der kulturReducer
  // liest genau diese Form.
  assert.equal(typeof wirksam.talente, 'string')
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [{ id: 'athletik', name: 'Athletik', punkte: 2 }])
  assert.deepEqual(leseAbschnitt(wirksam, 'waffenTalente'), [])
  assert.deepEqual(leseAbschnitt(wirksam, 'staerken'), [])
  assert.equal('alternativen' in wirksam, false)
  // Unangetastete Config-Felder bleiben erhalten.
  assert.deepEqual(wirksam.gaengigFuer, JSON.stringify(['rasse-mensch']))
})

test('TC-KULT-ALT-03 (AK2.2): gewählte Seite 2 mit mehreren Einträgen, Alternativseite nicht', () => {
  const wirksam = wirksameKulturConfig(KULTUR_TALENTWAHL, { 0: 1 })
  assert.ok(wirksam)
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [
    { id: 'akrobatik', name: 'Akrobatik', punkte: 1 },
    { id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 1 },
  ])
  assert.equal(leseAbschnitt(wirksam, 'talente').some(e => e.id === 'athletik'), false)
})

test('TC-KULT-ALT-03/07 (R2): Wechsel der Wahl ersetzt die Entscheidung – nie beide Seiten', () => {
  // Jede Wirksame Config entsteht aus der unveränderten Config der Kultur;
  // die Einträge beider Seiten derselben Gruppe werden nie gleichzeitig
  // zurückgeschrieben.
  const erste = wirksameKulturConfig(KULTUR_TALENTWAHL, { 0: 0 })
  const zweite = wirksameKulturConfig(KULTUR_TALENTWAHL, { 0: 1 })
  assert.ok(erste); assert.ok(zweite)
  const ids = (cfg: Record<string, unknown>) => leseAbschnitt(cfg, 'talente').map(e => e.id)
  assert.deepEqual(ids(erste), ['athletik'])
  assert.deepEqual(ids(zweite), ['akrobatik', 'heimlichkeit'])
  assert.equal(ids(zweite).includes('athletik'), false)
})

test('TC-KULT-ALT-04 (AK2.3): mehrere Gruppen werden unabhängig voneinander gewählt', () => {
  const wirksam = wirksameKulturConfig(KULTUR_ZWEI_GRUPPEN, { 0: 0, 1: 1 })
  assert.ok(wirksam)
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [{ id: 'athletik', name: 'Athletik', punkte: 2 }])
  assert.deepEqual(leseAbschnitt(wirksam, 'staerken'), [
    { id: 'qa-staerke-b', name: 'QA-Stärke-B', anzahl: 1 },
  ])
  assert.equal(leseAbschnitt(wirksam, 'staerken').some(e => e.id === 'qa-staerke-a'), false)
})

test('TC-KULT-ALT-05: fester Eintrag bleibt unabhängig von der Gruppenwahl erhalten', () => {
  const wirksam = wirksameKulturConfig(KULTUR_FEST_UND_ALTERNATIV, { 0: 1 })
  assert.ok(wirksam)
  // Der feste Talent-Eintrag wird nicht angetastet, die Wahl ergänzt nur
  // die Stärke der gewählten Seite.
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [{ id: 'wahrnehmung', name: 'Wahrnehmung', punkte: 1 }])
  assert.deepEqual(leseAbschnitt(wirksam, 'staerken'), [
    { id: 'qa-staerke-b', name: 'QA-Stärke-B', anzahl: 1 },
  ])
})

test('TC-KULT-ALT-09 (A1): unvollständige Wahl gewährt keine Einträge ungewählter Gruppen', () => {
  const ohneWahl = wirksameKulturConfig(KULTUR_ZWEI_GRUPPEN, {})
  assert.ok(ohneWahl)
  assert.deepEqual(leseAbschnitt(ohneWahl, 'talente'), [])
  assert.deepEqual(leseAbschnitt(ohneWahl, 'staerken'), [])
  assert.equal('alternativen' in ohneWahl, false)

  // Nur die Talent-Gruppe gewählt: die Stärken-Gruppe gewährt weiterhin nichts.
  const halbeWahl = wirksameKulturConfig(KULTUR_ZWEI_GRUPPEN, { 0: 0 })
  assert.ok(halbeWahl)
  assert.deepEqual(leseAbschnitt(halbeWahl, 'talente'), [{ id: 'athletik', name: 'Athletik', punkte: 2 }])
  assert.deepEqual(leseAbschnitt(halbeWahl, 'staerken'), [])
})

test('K2b: Einträge einer Gruppe landen in ihrem jeweiligen Abschnitt', () => {
  const wirksam = wirksameKulturConfig(KULTUR_BEREICHSUEBERGREIFEND, { 0: 1 })
  assert.ok(wirksam)
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [])
  assert.deepEqual(leseAbschnitt(wirksam, 'magieSchulen'), [
    { id: 'bannmagie', name: 'Bannmagie', punkte: 2 },
  ])
})

test('Altbestand: echte Arrays werden toleriert, gemischte Abschnitte werden gelesen', () => {
  // Config als Objekt (nicht String) mit echten Arrays: Die gewählte Seite
  // wird als JSON-String in den Abschnitt geschrieben, der Reducer liest ihn.
  const wirksam = wirksameKulturConfig(KULTUR_ALTBESTAND_ARRAYS, { 0: 1 })
  assert.ok(wirksam)
  assert.equal(typeof wirksam.talente, 'string')
  assert.deepEqual(leseAbschnitt(wirksam, 'talente'), [
    { id: 'wahrnehmung', name: 'Wahrnehmung', punkte: 1 },
    { id: 'akrobatik', name: 'Akrobatik', punkte: 2 },
  ])
  const state = recalculateStats(kulturDelta(KULTUR_ALTBESTAND_ARRAYS, { 0: 1 }))
  assert.deepEqual(state.skills, { wahrnehmung: 1, akrobatik: 2 })
})

test('istWahlVollstaendig: Wahlpflicht je Gruppe, Kulturen ohne Gruppen sind ohne Wahl vollständig', () => {
  const talentwahl = parseKulturRegeln(KULTUR_TALENTWAHL)
  const zweiGruppen = parseKulturRegeln(KULTUR_ZWEI_GRUPPEN)
  const ohneGruppen = parseKulturRegeln(KULTUR_OHNE_GRUPPEN)

  // AK2.5: ohne Gruppen wie bisher abschließbar.
  assert.equal(istWahlVollstaendig(ohneGruppen, {}), true)
  // TC-KULT-ALT-09: ohne Wahl / halbe Wahl nicht abschließbar.
  assert.equal(istWahlVollstaendig(zweiGruppen, {}), false)
  assert.equal(istWahlVollstaendig(zweiGruppen, { 0: 0 }), false)
  assert.equal(istWahlVollstaendig(zweiGruppen, { 0: 0, 1: 1 }), true)
  assert.equal(istWahlVollstaendig(talentwahl, { 0: 1 }), true)
  // Ungültige Werte gelten als ungewählt.
  assert.equal(istWahlVollstaendig(talentwahl, { 0: 2 as unknown as 0 }), false)
  assert.equal(istWahlVollstaendig(talentwahl, { 1: 0 }), false)
})

test('leseAlternativWahl: tolerantes Lesen aus Step-Daten', () => {
  assert.deepEqual(leseAlternativWahl(null), {})
  assert.deepEqual(leseAlternativWahl(undefined), {})
  assert.deepEqual(leseAlternativWahl([]), {})
  assert.deepEqual(leseAlternativWahl('x'), {})
  // JSON-Round-Trip macht aus Zahlschlüsseln Strings.
  const gespeichert = JSON.parse(JSON.stringify({ 0: 1, 1: 0 }))
  assert.deepEqual(leseAlternativWahl(gespeichert), { 0: 1, 1: 0 })
  // Ungültige Schlüssel und Werte werden verworfen.
  assert.deepEqual(leseAlternativWahl({ 0: 2, x: 1, '-1': 0, 1: '0' }), { 1: 0 })
})

test('AK2.2/AK2.4: der kulturReducer weist die gewählte Seite wie einen festen Eintrag zu', () => {
  // Die Zuweisung läuft über denselben Codepfad wie bei festen Einträgen
  // (recalculateStats → kulturReducer); der Charakter erhält genau die
  // Einträge der gewählten Seite.
  const seite1 = recalculateStats(kulturDelta(KULTUR_TALENTWAHL, { 0: 0 }))
  assert.deepEqual(seite1.skills, { athletik: 2 })

  const seite2 = recalculateStats(kulturDelta(KULTUR_TALENTWAHL, { 0: 1 }))
  assert.deepEqual(seite2.skills, { akrobatik: 1, heimlichkeit: 1 })
  assert.equal('athletik' in (seite2.skills ?? {}), false)

  // Stärken-Gruppe: die gewählte Stärke wird wie eine feste Stärke zugewiesen.
  const staerken = recalculateStats(kulturDelta(KULTUR_ZWEI_GRUPPEN, { 0: 0, 1: 1 }))
  assert.deepEqual(staerken.skills, { athletik: 2 })
  assert.deepEqual(staerken.staerken, ['qa-staerke-b'])
})

test('AK2.5: Kultur ohne Gruppen – Zuweisung wie bisher, ohne Pflichtfelder', () => {
  const state = recalculateStats(kulturDelta(KULTUR_OHNE_GRUPPEN, {}))
  assert.deepEqual(state.skills, { wahrnehmung: 1 })
  assert.deepEqual(state.staerken, [])
})

test('R5 (Ergebnis-Stabilität): jede vollständige Wahl ergibt eine gültige Kultur', () => {
  // Jedes wählbare Ergebnis (je Gruppe genau eine Seite) erfüllt die Regeln
  // R1/R2 des Vorgängertickets – die wirksame Config vollständiger Wahlen
  // besteht dessen Speicherprüfung.
  for (const wahl of [{ 0: 0 }, { 0: 1 }] as AlternativWahl[]) {
    assert.equal(validateKultur(wirksameKulturConfig(KULTUR_TALENTWAHL, wahl), KOSTEN), null)
  }
  for (const wahl of [
    { 0: 0, 1: 0 },
    { 0: 0, 1: 1 },
    { 0: 1, 1: 0 },
    { 0: 1, 1: 1 },
  ] as AlternativWahl[]) {
    assert.equal(validateKultur(wirksameKulturConfig(KULTUR_ZWEI_GRUPPEN, wahl), KOSTEN), null)
    assert.equal(validateKultur(wirksameKulturConfig(KULTUR_FEST_UND_ALTERNATIV, wahl), KOSTEN), null)
  }
  // Die Fixtures selbst sind gültige Kulturen (Voraussetzung der Prüfung).
  assert.equal(validateKultur(KULTUR_TALENTWAHL, KOSTEN), null)
  assert.equal(validateKultur(KULTUR_ZWEI_GRUPPEN, KOSTEN), null)
  assert.equal(validateKultur(KULTUR_FEST_UND_ALTERNATIV, KOSTEN), null)
  assert.equal(validateKultur(KULTUR_BEREICHSUEBERGREIFEND, KOSTEN), null)
})
