import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ERGEBNIS_ZUSATZ,
  MSG_GRUPPE_GEMISCHT,
  MSG_GRUPPE_PUNKTE_UNGUELTIG,
  MSG_MAX_STAERKEN,
  MSG_MAX_TALENTE,
  MSG_PUNKTE_UNGUELTIG,
  MSG_STAERKE_STUFE,
  entferneGruppe,
  formatAlternative,
  gewaehrteStaerken,
  gruppeAufloesen,
  msgEintragUnvollstaendig,
  msgMehrfachZugeordnet,
  msgSeiteLeer,
  msgUngleichwertig,
  msgAbschnittEintragUnvollstaendig,
  istGueltigerPunktwert,
  parseKulturRegeln,
  pruefeGruppe,
  pruefeGruppeImKontext,
  pruefeGruppeStruktur,
  pruefeMehrfachZuordnung,
  pruefeStaerkenAbschnitt,
  pruefeStaerkeWert,
  pruefeTalentPunkte,
  recalculateStats,
  staerkenZuweisungen,
  talentPunkteGesamt,
  validateKultur,
  wahlmoeglichkeiten,
  type KulturAlternative,
  type KulturFeld,
} from '@mcc/shared';

/** Eintrag einer Entweder/Oder-Seite (Speicherformat des Editors). */
function gruppenEintrag(feld: KulturFeld, id: string, name: string, wert: number) {
  return { feld, id, name, wert };
}

const ATHLETIK = { id: 'athletik', name: 'Athletik', punkte: 2 };
const AKROBATIK = { id: 'akrobatik', name: 'Akrobatik', punkte: 1 };

test('TC-01: Talent-Summe 5 über Talente, Waffentalente und Magieschulen ist zulässig', () => {
  const config = {
    talente: [ATHLETIK, AKROBATIK],
    waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 1 }],
    magieSchulen: [{ id: 'bannmagie', name: 'Bannmagie', punkte: 1 }],
  };
  assert.equal(talentPunkteGesamt(parseKulturRegeln(config)), 5);
  assert.equal(validateKultur(config), null);
  assert.equal(pruefeTalentPunkte(parseKulturRegeln(config)), null);
});

test('TC-02: Talent-Summe über 5 wird beim Zuweisen blockiert', () => {
  const erlaubt = {
    talente: [
      { id: 'athletik', name: 'Athletik', punkte: 3 },
      { id: 'akrobatik', name: 'Akrobatik', punkte: 2 },
    ],
  };
  assert.equal(pruefeTalentPunkte(parseKulturRegeln(erlaubt)), null);

  const zuViel = {
    talente: [
      { id: 'athletik', name: 'Athletik', punkte: 3 },
      { id: 'akrobatik', name: 'Akrobatik', punkte: 2 },
      { id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 1 },
    ],
  };
  assert.equal(pruefeTalentPunkte(parseKulturRegeln(zuViel)), MSG_MAX_TALENTE);
  assert.equal(validateKultur(zuViel), MSG_MAX_TALENTE);
});

test('TC-03: Die 5-Punkt-Grenze gilt bereichsübergreifend', () => {
  const config = {
    talente: [{ id: 'athletik', name: 'Athletik', punkte: 3 }],
    waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 2 }],
    magieSchulen: [{ id: 'bannmagie', name: 'Bannmagie', punkte: 1 }],
  };
  assert.equal(pruefeTalentPunkte(parseKulturRegeln(config)), MSG_MAX_TALENTE);
  assert.equal(validateKultur(config), MSG_MAX_TALENTE);
});

test('TC-04: Eine zweite Stärke wird beim Zuweisen blockiert', () => {
  const eine = [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }];
  // Die bereits zugewiesene Stärke selbst darf erneut gewählt werden.
  assert.equal(pruefeStaerkenAbschnitt(eine, 0), null);
  // Für jede weitere Zeile ist eine zweite Stärke blockiert – egal, was in ihr steht.
  const frischeZeile = [...eine, { id: '', name: '', anzahl: 0 }];
  assert.equal(pruefeStaerkenAbschnitt(frischeZeile, 1), MSG_MAX_STAERKEN);
  assert.equal(
    pruefeStaerkenAbschnitt([...eine, { id: 'schnell', name: 'Schnell', anzahl: 0 }], 1),
    MSG_MAX_STAERKEN,
  );
  // Auch die bereits zugewiesene Stärke ein zweites Mal zuweisen ist eine zweite Zuweisung.
  assert.equal(
    pruefeStaerkenAbschnitt([...eine, { id: 'zaeh', name: 'Zäh', anzahl: 0 }], 1),
    MSG_MAX_STAERKEN,
  );

  // Auch eine bereits zugewiesene Stärke mit Anzahl 0 zählt (Review-Fund).
  const nullAnzahl = parseKulturRegeln({ staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 0 }] });
  assert.equal(staerkenZuweisungen(nullAnzahl), 1);
  assert.equal(
    pruefeStaerkenAbschnitt([{ id: 'zaeh', name: 'Zäh', anzahl: 0 }, { id: '', name: '', anzahl: 0 }], 1),
    MSG_MAX_STAERKEN,
  );
});

test('TC-05: Stärke mit Stufe (Anzahl) 2 wird blockiert', () => {
  assert.equal(pruefeStaerkeWert('zaeh', 2, { zaeh: 1 }), MSG_STAERKE_STUFE);
  assert.equal(pruefeStaerkeWert('zaeh', 1, { zaeh: 1 }), null);
  // Eine zugewiesene Stärke mit Anzahl 0 erfüllt R1 ebenfalls nicht.
  assert.equal(pruefeStaerkeWert('zaeh', 0, { zaeh: 1 }), MSG_STAERKE_STUFE);
  // Ohne Zuweisung (keine id) wird kein Wert geprüft.
  assert.equal(pruefeStaerkeWert('', 0, { zaeh: 1 }), null);
});

test('TC-06: Stärke mit Kosten 2 wird blockiert', () => {
  assert.equal(pruefeStaerkeWert('teuer', 1, { teuer: 2 }), MSG_STAERKE_STUFE);
  // Unbekannte Kosten (Altbestand ohne Kostenfeld) werden nicht beanstandet.
  assert.equal(pruefeStaerkeWert('unbekannt', 1, {}), null);
  assert.equal(validateKultur({ staerken: [{ id: 'teuer', name: 'Teuer', anzahl: 1 }] }, { teuer: 2 }), MSG_STAERKE_STUFE);
});

test('TC-07: Stufe-1-Stärke mit Kosten 1 und Talent 2 ist zulässig', () => {
  const config = {
    staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }],
    talente: [ATHLETIK],
  };
  assert.equal(validateKultur(config, { zaeh: 1 }), null);
});

test('TC-08: Gleichwertige Talentgruppe ist speicherbar und wird korrekt formatiert', () => {
  const config = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config), null);
  const regeln = parseKulturRegeln(config);
  assert.equal(formatAlternative(regeln.alternativen[0]), 'Athletik 2 | Akrobatik 1 + Heimlichkeit 1');
});

test('TC-09: Ungleichwertige Gruppe wird mit benennender Meldung blockiert', () => {
  const config = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config), 'Ungleichwertig: Seite 1 = 2 Punkte, Seite 2 = 1 Punkte');
});

test('TC-10: Stärkengruppe (je Seite eine Stärke) ist zulässig', () => {
  const config = {
    alternativen: [
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config, { zaeh: 1, schnell: 1 }), null);
  const regeln = parseKulturRegeln(config);
  assert.equal(formatAlternative(regeln.alternativen[0]), 'Zäh 1 | Schnell 1');
});

test('TC-11: Kombination aus Gruppe und freiem Eintrag mit Summe 5 ist zulässig', () => {
  const config = {
    talente: [{ id: 'handwerk', name: 'Handwerk', punkte: 3 }],
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config), null);
});

test('TC-12: Wählbares Ergebnis mit mehr als 5 Talentpunkten wird blockiert', () => {
  const config = {
    talente: [{ id: 'handwerk', name: 'Handwerk', punkte: 3 }],
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 3)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 2),
          ],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config), MSG_MAX_TALENTE + ERGEBNIS_ZUSATZ);
});

test('TC-13: Wählbares Ergebnis mit zwei Stärken wird blockiert', () => {
  const config = {
    staerken: [{ id: 'scharfsinn', name: 'Scharfsinn', anzahl: 1 }],
    alternativen: [
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config, { zaeh: 1, schnell: 1, scharfsinn: 1 }), MSG_MAX_STAERKEN + ERGEBNIS_ZUSATZ);
});

test('TC-14: Zwei unabhängige Gruppen (Talente und Stärken) sind zulässig', () => {
  const config = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(config, { zaeh: 1, schnell: 1 }), null);
  const regeln = parseKulturRegeln(config);
  assert.equal(regeln.alternativen.length, 2);
  assert.equal(formatAlternative(regeln.alternativen[1]), 'Zäh 1 | Schnell 1');
});

test('Parser akzeptiert doppelt kodierte JSON-Strings wie echte Arrays', () => {
  // Regelkonforme Kultur (R6): Die Einträge der Gruppe stehen nicht zusätzlich
  // im Abschnitt – dort liegt ein anderes Talent.
  const doppelt = JSON.stringify({
    talente: JSON.stringify([{ id: 'handwerk', name: 'Handwerk', punkte: 3 }]),
    alternativen: JSON.stringify([
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
    ]),
  });
  const regeln = parseKulturRegeln(doppelt);
  assert.equal(talentPunkteGesamt(regeln), 3);
  assert.equal(regeln.alternativen.length, 1);
  assert.equal(formatAlternative(regeln.alternativen[0]), 'Athletik 2 | Akrobatik 1 + Heimlichkeit 1');
  assert.equal(validateKultur(doppelt), null);
});

test('Defekte und leere Configs führen nicht zu Fehlern', () => {
  assert.equal(validateKultur(null), null);
  assert.equal(validateKultur(''), null);
  assert.equal(validateKultur('{ungueltig'), null);
  assert.equal(validateKultur({ talente: 'nicht-json', alternativen: [{}] }), null);
  const regeln = parseKulturRegeln(undefined);
  assert.deepEqual(regeln.alternativen, []);
  assert.equal(talentPunkteGesamt(regeln), 0);
});

// --- Review-Nacharbeit INT-000015 ---------------------------------------------

test('Review R1: Stärken-Einträge mit Anzahl 0 umgehen die Limits nicht', () => {
  const eineNull = parseKulturRegeln({ staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 0 }] });
  assert.equal(staerkenZuweisungen(eineNull), 1);
  assert.equal(validateKultur(eineNull), MSG_STAERKE_STUFE);

  const zweiNull = {
    staerken: [
      { id: 'zaeh', name: 'Zäh', anzahl: 0 },
      { id: 'schnell', name: 'Schnell', anzahl: 0 },
    ],
  };
  assert.equal(validateKultur(zweiNull), MSG_MAX_STAERKEN);

  const teuerNull = { staerken: [{ id: 'teuer', name: 'Teuer', anzahl: 0 }] };
  assert.equal(validateKultur(teuerNull, { teuer: 2 }), MSG_STAERKE_STUFE);

  // Auch im wählbaren Ergebnis zählt die Zuweisung unabhängig vom Wert.
  assert.deepEqual(wahlmoeglichkeiten(eineNull), [{ talentPunkte: 0, staerkenAnzahl: 1 }]);
});

test('Review R3: Gruppe mit leerer Seite kann nicht gespeichert werden', () => {
  const leerSeite2 = {
    alternativen: [
      { typ: 'talent', seiten: [[gruppenEintrag('talente', 'athletik', 'Athletik', 2)], []] },
    ],
  };
  assert.equal(validateKultur(leerSeite2), msgSeiteLeer(2));

  const leerSeite1 = {
    alternativen: [
      { typ: 'talent', seiten: [[], [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1)]] },
    ],
  };
  assert.equal(validateKultur(leerSeite1), msgSeiteLeer(1));

  // „Zäh 0 | " (Review-Beispiel) wird ebenfalls abgelehnt – die erste
  // Feststellung benennt Seite 1: deren Eintrag hat keinen tragenden Wert.
  const nullSumme = {
    alternativen: [
      { typ: 'staerke', seiten: [[gruppenEintrag('staerken', 'zaeh', 'Zäh', 0)], []] },
    ],
  };
  assert.equal(validateKultur(nullSumme), msgEintragUnvollstaendig(1));
});

test('Review R3: Gruppe mit Eintrag ohne Auswahl oder Wert kann nicht gespeichert werden', () => {
  const ohneAuswahl = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', '', '', 2)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(ohneAuswahl), msgEintragUnvollstaendig(2));

  const ohneWert = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 0)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(ohneWert), msgEintragUnvollstaendig(2));
});

test('Review R2: Gruppe auflösen stellt ausschließlich Seite 1 in die Abschnitte zurück', () => {
  const talentGruppe: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [
        gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
        gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
      ],
    ],
  };
  const wiederhergestellt = gruppeAufloesen(talentGruppe);
  assert.equal(wiederhergestellt.length, 1);
  assert.equal(wiederhergestellt[0].name, 'Athletik');
  assert.ok(!wiederhergestellt.some(eintrag => eintrag.name === 'Heimlichkeit'));
  assert.equal(validateKultur({ talente: [{ id: 'athletik', name: 'Athletik', punkte: 2 }] }), null);

  const staerkenGruppe: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
    ],
  };
  const staerken = gruppeAufloesen(staerkenGruppe).map(eintrag => ({
    id: eintrag.id,
    name: eintrag.name,
    anzahl: eintrag.wert,
  }));
  assert.equal(validateKultur({ staerken }), null);

  // Referenz zum Vorzustand: beide Seiten gleichzeitig zurückgeschrieben wäre
  // ein R1-Verstoß (zwei zugewiesene Stärken) – genau das verhindert die Korrektur.
  assert.equal(
    validateKultur({
      staerken: [
        { id: 'zaeh', name: 'Zäh', anzahl: 1 },
        { id: 'schnell', name: 'Schnell', anzahl: 1 },
      ],
    }),
    MSG_MAX_STAERKEN,
  );
});

// --- Review-Nacharbeit INT-000015, Runde 2 ------------------------------------

test('entferneGruppe („Gruppe entfernen") stellt nur Seite 1 her und entfernt die Gruppe', () => {
  const configFelder = {
    talente: JSON.stringify([{ id: 'handwerk', name: 'Handwerk', punkte: 3 }]),
    alternativen: JSON.stringify([
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
    ]),
  };

  const neu = entferneGruppe(configFelder, 0);
  assert.ok(neu);
  // Seite 1 wandert zurück in den Abschnitt, Seite 2 und die Gruppe entfallen.
  assert.deepEqual(JSON.parse(neu!.talente), [
    { id: 'handwerk', name: 'Handwerk', punkte: 3 },
    { id: 'athletik', name: 'Athletik', punkte: 2 },
  ]);
  assert.ok(!('alternativen' in neu!));
  assert.equal(validateKultur(neu), null);
  // R2 bleibt erfüllt: 3 + 2 = 5 Punkte.
  assert.equal(talentPunkteGesamt(parseKulturRegeln(neu)), 5);

  // Unbekannter Index: unverändert.
  assert.equal(entferneGruppe(configFelder, 7), null);
});

test('entferneGruppe stellt bei einer Stärkengruppe genau eine Stärke wieder her', () => {
  const configFelder = {
    staerken: '[]',
    alternativen: JSON.stringify([
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
        ],
      },
    ]),
  };

  const neu = entferneGruppe(configFelder, 0);
  assert.ok(neu);
  assert.deepEqual(JSON.parse(neu!.staerken), [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }]);
  assert.equal(validateKultur(neu, { zaeh: 1, schnell: 1 }), null);
  // Seite 2 („Schnell") darf nicht gleichzeitig zurückgeschrieben werden.
  assert.equal(staerkenZuweisungen(parseKulturRegeln(neu)), 1);
});

test('entferneGruppe mehrerer Gruppen entfernt nur die gewählte', () => {
  const configFelder = {
    alternativen: JSON.stringify([
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 2)],
        ],
      },
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
        ],
      },
    ]),
  };

  const neu = entferneGruppe(configFelder, 1);
  assert.ok(neu);
  const regeln = parseKulturRegeln(neu);
  assert.equal(regeln.alternativen.length, 1);
  assert.equal(formatAlternative(regeln.alternativen[0]), 'Athletik 2 | Akrobatik 2');
  // Die aufgelöste Stärkengruppe steckt jetzt als eine zugewiesene Stärke im Abschnitt.
  assert.deepEqual(JSON.parse(neu!.staerken), [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }]);
  assert.equal(validateKultur(neu, { zaeh: 1, schnell: 1 }), null);
});

test('gewaehrteStaerken: Anzahl 0 und Phantomzeilen gewähren nichts, höchstens eine Stärke je Kultur', () => {
  // Altbestand mit mehreren Einträgen (Review-Fund): nur der erste zählt.
  assert.deepEqual(
    gewaehrteStaerken([
      { id: 'zaeh', name: 'Zäh', anzahl: 1 },
      { id: 'schnell', name: 'Schnell', anzahl: 1 },
    ]),
    [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }],
  );
  // Ein Eintrag mit Anzahl 0 gewährt nichts – auch nicht als „zweite" Stärke.
  assert.deepEqual(
    gewaehrteStaerken([
      { id: 'zaeh', name: 'Zäh', anzahl: 0 },
      { id: 'schnell', name: 'Schnell', anzahl: 1 },
    ]),
    [{ id: 'schnell', name: 'Schnell', anzahl: 1 }],
  );
  assert.deepEqual(gewaehrteStaerken([{ id: 'zaeh', name: 'Zäh', anzahl: 0 }]), []);
  assert.deepEqual(gewaehrteStaerken([]), []);
  // Review-Fund 1: Eine Phantomzeile („+ Eintrag hinzufügen", ohne Auswahl) mit
  // Anzahl-Wert verdrängt die tatsächlich zugewiesene Stärke nicht – Anzeige im
  // Schritt „Kultur" und Kultur-Rechnung gewähren weiterhin die echte Stärke.
  assert.deepEqual(
    gewaehrteStaerken([
      { id: '', name: '', anzahl: 3 },
      { id: 'zaeh', name: 'Zäh', anzahl: 1 },
    ]),
    [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }],
  );
  assert.deepEqual(gewaehrteStaerken([{ id: '', name: '', anzahl: 3 }]), []);
  // Fund 4 (Runde 6): Die Gewährung hängt an der id – ein Eintrag mit gesetzter
  // id gewährt, auch wenn `name` fehlt (Altbestand verliert keinen Wert
  // stillschweigend; `name` ist für die Anzeige maßgeblich). Eine Zeile ohne id
  // (Phantomzeile) gewährt nichts.
  assert.deepEqual(gewaehrteStaerken([{ id: 'zaeh', name: '', anzahl: 1 }]), [{ id: 'zaeh', name: '', anzahl: 1 }]);
  assert.deepEqual(gewaehrteStaerken([{ id: '', name: 'Zäh', anzahl: 1 }]), []);
});

test('Kultur-Rechnung gewährt dem Charakter höchstens eine Stärke (KulturSelectStep-Pfad)', () => {
  const delta = {
    kultur: {
      kulturId: 'kultur-1',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: {
        talente: JSON.stringify([{ id: 'athletik', name: 'Athletik', punkte: 2 }]),
        staerken: JSON.stringify([
          { id: 'zaeh', name: 'Zäh', anzahl: 1 },
          { id: 'schnell', name: 'Schnell', anzahl: 1 },
        ]),
      },
    },
  };
  const state = recalculateStats(delta);
  assert.deepEqual(state.staerken, ['zaeh']);

  // Anzahl-0-Bypass: gar keine Stärke gewährt.
  const nullDelta = {
    kultur: {
      kulturId: 'kultur-1',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: {
        staerken: JSON.stringify([
          { id: 'zaeh', name: 'Zäh', anzahl: 0 },
          { id: 'schnell', name: 'Schnell', anzahl: 0 },
        ]),
      },
    },
  };
  assert.deepEqual(recalculateStats(nullDelta).staerken, []);
  // Talente der Kultur bleiben unberührt.
  assert.deepEqual(state.skills, { athletik: 2 });
});

test('Kultur-Rechnung gewährt Phantomzeilen keine Punkte und keine Stärke (Review-Fund 1 und 2)', () => {
  // Altbestand aus der Zeit vor der Prüfung: Punkte und Anzahl stehen auf
  // Zeilen ohne Auswahl („Phantomzeilen" – id und name leer). Weder Anzeige
  // (parseEntries, Mangel-3-Standard) noch Kultur-Rechnung gewähren sie.
  const delta = {
    kultur: {
      kulturId: 'kultur-1',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: {
        talente: JSON.stringify([
          { id: '', name: '', punkte: 5 },
          { id: 'athletik', name: 'Athletik', punkte: 2 },
        ]),
        waffenTalente: JSON.stringify([{ id: '', name: '', punkte: 3 }]),
        staerken: JSON.stringify([
          { id: '', name: '', anzahl: 3 },
          { id: 'zaeh', name: 'Zäh', anzahl: 1 },
        ]),
      },
    },
  };
  const phantomState = recalculateStats(delta);
  assert.deepEqual(phantomState.skills, { athletik: 2 });
  assert.deepEqual(phantomState.staerken, ['zaeh']);
});

test('Fund 4 (Runde 6): Gewährung hängt an der id – Bestand ohne name verliert keine Punkte', () => {
  // Altbestand (A3, kein Rewrite): Eintrag mit gesetzter id, aber ohne `name`.
  // Die Anzeige im Schritt „Kultur" blendet ihn aus (Mangel-3-Standard), die
  // Gewährung darf den Wert trotzdem nicht stillschweigend verlieren.
  const delta = {
    kultur: {
      kulturId: 'kultur-1',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: {
        talente: JSON.stringify([{ id: 'athletik', name: '', punkte: 2 }]),
        waffenTalente: JSON.stringify([{ id: 'klingenwaffen', name: '', punkte: 3 }]),
        staerken: JSON.stringify([{ id: 'zaeh', name: '', anzahl: 1 }]),
      },
    },
  };
  const state = recalculateStats(delta);
  assert.deepEqual(state.skills, { athletik: 2, klingenwaffen: 3 });
  assert.deepEqual(state.staerken, ['zaeh']);

  // Phantomzeile (keine id) gewährt weiterhin nichts – auch mit gesetztem name.
  const phantomDelta = {
    kultur: {
      kulturId: 'kultur-1',
      kulturName: 'Testkultur',
      kulturDescription: null,
      kulturConfig: {
        talente: JSON.stringify([{ id: '', name: 'Athletik', punkte: 2 }]),
        staerken: JSON.stringify([{ id: '', name: 'Zäh', anzahl: 1 }]),
      },
    },
  };
  const phantomState = recalculateStats(phantomDelta);
  assert.deepEqual(phantomState.skills, {});
  assert.deepEqual(phantomState.staerken, []);
});

test('Review Fund 2: Abschnittseinträge mit Wert brauchen eine vollständige Auswahl', () => {
  // Phantomzeile mit Wert: weder anzeige- noch gewährend – das komplette
  // 5-Punkte-Budget würde beim Gewähren verloren gehen. Nicht speicherbar.
  assert.equal(
    validateKultur({ talente: [{ id: '', name: '', punkte: 5 }] }),
    msgAbschnittEintragUnvollstaendig('talente'),
  );
  assert.equal(
    validateKultur({ waffenTalente: [{ id: 'klingenwaffen', name: '', punkte: 2 }] }),
    msgAbschnittEintragUnvollstaendig('waffenTalente'),
  );
  assert.equal(
    validateKultur({ magieSchulen: [{ id: '', name: 'Bannmagie', punkte: 2 }] }),
    msgAbschnittEintragUnvollstaendig('magieSchulen'),
  );
  // Review-Fund 1 auf API-Ebene: Eine Phantomzeile im Abschnitt „Stärken"
  // zählt nicht als Zuweisung (R1), bleibt aber unvollständig und verdrängt
  // die zugewiesene Stärke nicht – die Kultur wird abgelehnt.
  assert.equal(
    validateKultur({
      staerken: [
        { id: '', name: '', anzahl: 3 },
        { id: 'zaeh', name: 'Zäh', anzahl: 1 },
      ],
    }),
    msgAbschnittEintragUnvollstaendig('staerken'),
  );
  // Frische Platzhalterzeile ohne Wert (Wert 0) bleibt zulässig: sie gewährt
  // nichts und wird nirgends angezeigt.
  assert.equal(validateKultur({ talente: [{ id: '', name: '', punkte: 0 }] }), null);
  assert.equal(validateKultur({ staerken: [{ id: '', name: '', anzahl: 0 }] }), null);
  // Vollständige Einträge bleiben zulässig.
  assert.equal(validateKultur({ talente: [ATHLETIK, AKROBATIK] }), null);
});

// --- Review-Nacharbeit INT-000015: Live-Meldung direkt an der Gruppe -----------

test('Live-Prüfung pruefeGruppe benennt leere und unvollständige Seiten wie die Speicherprüfung', () => {
  // Frisch angelegte Gruppe: Seite 2 noch ohne Eintrag.
  const leer: KulturAlternative = {
    typ: 'talent',
    seiten: [[gruppenEintrag('talente', 'athletik', 'Athletik', 2)], []],
  };
  assert.equal(pruefeGruppe(leer), msgSeiteLeer(2));
  assert.equal(pruefeGruppe(leer), validateKultur({ alternativen: [leer] }));

  // „Athletik 2 |  2": Seite 2 hat einen Eintrag ohne Auswahl.
  const ohneAuswahl: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [gruppenEintrag('talente', '', '', 2)],
    ],
  };
  assert.equal(pruefeGruppe(ohneAuswahl), msgEintragUnvollstaendig(2));
  assert.equal(pruefeGruppe(ohneAuswahl), validateKultur({ alternativen: [ohneAuswahl] }));

  // Gewählt, aber ohne Wert.
  const ohneWert: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 1)],
      [gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 0)],
    ],
  };
  assert.equal(pruefeGruppe(ohneWert), msgEintragUnvollstaendig(2));

  // Die erste unvollständige Seite wird benannt – hier Seite 1.
  const seite1Leer: KulturAlternative = {
    typ: 'talent',
    seiten: [[], [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 0)]],
  };
  assert.equal(pruefeGruppe(seite1Leer), msgSeiteLeer(1));
});

test('Live-Prüfung pruefeGruppe: R1 je Stärken-Eintrag, R4 Gleichwertigkeit, gültige Gruppe', () => {
  // R1: Stufe (Anzahl) 0 trägt nicht – auch in der Gruppe nicht.
  const anzahlNull: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 0)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 0)],
    ],
  };
  assert.equal(pruefeGruppe(anzahlNull), msgEintragUnvollstaendig(1));

  // R1: Stufe 2 und Kosten 2 sind unzulässig; unbekannte Kosten werden nicht beanstandet.
  const stufeZwei: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 2)],
    ],
  };
  assert.equal(pruefeGruppe(stufeZwei, { zaeh: 1, schnell: 1 }), MSG_STAERKE_STUFE);

  const teuer: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
      [gruppenEintrag('staerken', 'teuer', 'Teuer', 1)],
    ],
  };
  assert.equal(pruefeGruppe(teuer, { teuer: 2 }), MSG_STAERKE_STUFE);
  assert.equal(pruefeGruppe(teuer), null);

  // R4: ungleichwertige Gruppe – Live- und Speicherprüfung liefern dieselbe Meldung.
  const ungleichwertig: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1)],
    ],
  };
  assert.equal(pruefeGruppe(ungleichwertig), msgUngleichwertig(2, 1));
  assert.equal(pruefeGruppe(ungleichwertig), 'Ungleichwertig: Seite 1 = 2 Punkte, Seite 2 = 1 Punkte');
  assert.equal(pruefeGruppe(ungleichwertig), validateKultur({ alternativen: [ungleichwertig] }));

  // Gültig: Auftragsbeispiel, bereichsübergreifend (K2b) – keine Meldung.
  const gueltig: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [
        gruppenEintrag('waffenTalente', 'klingenwaffen', 'Klingenwaffen', 1),
        gruppenEintrag('magieSchulen', 'bannmagie', 'Bannmagie', 1),
      ],
    ],
  };
  assert.equal(pruefeGruppe(gueltig), null);
  assert.equal(validateKultur({ alternativen: [gueltig] }), null);
});

test('Gemischte Gruppe aus Stärken und Talenten (K2c) wird in Live- und Speicherprüfung abgelehnt', () => {
  const gemischt = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('talente', 'athletik', 'Athletik', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(gemischt, { zaeh: 1 }), MSG_GRUPPE_GEMISCHT);
  assert.equal(pruefeGruppe(parseKulturRegeln(gemischt).alternativen[0], { zaeh: 1 }), MSG_GRUPPE_GEMISCHT);

  // Auch ohne expliziten Typ (wird aus den Einträgen abgeleitet) und in umgekehrter Reihenfolge.
  const ohneTyp = {
    alternativen: [
      {
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 1)],
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
        ],
      },
    ],
  };
  assert.equal(validateKultur(ohneTyp, { zaeh: 1 }), MSG_GRUPPE_GEMISCHT);
  assert.equal(pruefeGruppeStruktur(parseKulturRegeln(ohneTyp).alternativen[0]), MSG_GRUPPE_GEMISCHT);

  // Reine Stärken-Gruppe (K2a) und bereichsübergreifende Talent-Gruppe (K2b) bleiben zulässig.
  const staerkenGruppe: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
    ],
  };
  assert.equal(pruefeGruppeStruktur(staerkenGruppe), null);
  assert.equal(pruefeGruppe(staerkenGruppe, { zaeh: 1, schnell: 1 }), null);
  const talentGruppe: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [gruppenEintrag('waffenTalente', 'klingenwaffen', 'Klingenwaffen', 2)],
    ],
  };
  assert.equal(pruefeGruppe(talentGruppe), null);
});

// --- Review-Nacharbeit INT-000015, Runde 4: Review-Fund 3 (F3) ------------------

test('Review F3: negative und nicht ganzzahlige Punkte in den Abschnitten werden abgelehnt', () => {
  // Repro aus dem Review: −5 + 10 ergibt die Summe 5 – ohne die Wertprüfung
  // stimmten alle Regeln zu, der Reducer gewährte Athletik +10.
  const negativ = {
    talente: [
      { id: '', name: '', punkte: -5 },
      { id: 'athletik', name: 'Athletik', punkte: 10 },
    ],
  };
  assert.equal(talentPunkteGesamt(parseKulturRegeln(negativ)), 5);
  assert.equal(pruefeTalentPunkte(parseKulturRegeln(negativ)), null);
  assert.equal(validateKultur(negativ), MSG_PUNKTE_UNGUELTIG);

  // In jedem der drei Bereiche – auch als String (doppelt kodiert).
  assert.equal(
    validateKultur({ waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: -1 }] }),
    MSG_PUNKTE_UNGUELTIG,
  );
  assert.equal(
    validateKultur({ magieSchulen: [{ id: 'bannmagie', name: 'Bannmagie', punkte: '-1' }] }),
    MSG_PUNKTE_UNGUELTIG,
  );

  // Nicht ganzzahlig ist unzulässig, auch wenn die Summe passt (2,5 + 2,5 = 5).
  const bruchzahl = {
    talente: [
      { id: 'athletik', name: 'Athletik', punkte: 2.5 },
      { id: 'akrobatik', name: 'Akrobatik', punkte: 2.5 },
    ],
  };
  assert.equal(validateKultur(bruchzahl), MSG_PUNKTE_UNGUELTIG);
  assert.equal(
    validateKultur({ waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 1.5 }] }),
    MSG_PUNKTE_UNGUELTIG,
  );

  // Basissumme in R5 bei einer Kultur mit Gruppe (Review: „dasselbe gilt für R5"):
  // −3 ließe sich jede Gruppe mit einer beliebigen Punktsumme kombinieren.
  const basisR5 = {
    talente: [{ id: 'handwerk', name: 'Handwerk', punkte: -3 }],
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 3)],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 2),
          ],
        ],
      },
    ],
  };
  assert.equal(validateKultur(basisR5), MSG_PUNKTE_UNGUELTIG);

  // Unverändert zugelassen: ganze Zahlen ab 0 (auch 0), Summe 5 ist zulässig.
  assert.equal(
    validateKultur({ talente: [ATHLETIK, AKROBATIK, { id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 0 }] }),
    null,
  );
  assert.equal(validateKultur({ talente: [{ id: 'athletik', name: 'Athletik', punkte: '0' }] }), null);

  // R2 greift hinter der Wertprüfung weiterhin.
  assert.equal(validateKultur({ talente: [{ id: 'athletik', name: 'Athletik', punkte: 6 }] }), MSG_MAX_TALENTE);

  // Die Wertprüfung selbst.
  assert.equal(istGueltigerPunktwert(0), true);
  assert.equal(istGueltigerPunktwert(5), true);
  assert.equal(istGueltigerPunktwert(-1), false);
  assert.equal(istGueltigerPunktwert(-0.5), false);
  assert.equal(istGueltigerPunktwert(1.5), false);
  assert.equal(istGueltigerPunktwert(Number.NaN), false);
  assert.equal(istGueltigerPunktwert(Number.POSITIVE_INFINITY), false);
});

// --- PO-Entscheidungen G und H (INT-000015, 24.11. 17:28) ----------------------

/** Auftragsbeispiel „Athletik 2 | Akrobatik 1 + Heimlichkeit 1" (TC-08). */
const AUFTRAGSBEISPIEL: KulturAlternative = {
  typ: 'talent',
  seiten: [
    [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
    [
      gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
      gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
    ],
  ],
};

test('PO G: Bruchwerte in einer Entweder/Oder-Gruppe werden in Live- und Speicherprüfung abgelehnt', () => {
  // „1,5 | 1,5" war gleichwertig (1,5 = 1,5) und passierte zuvor die Speicherprüfung.
  const halbzahlig: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 1.5)],
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1.5)],
    ],
  };
  assert.equal(
    MSG_GRUPPE_PUNKTE_UNGUELTIG,
    'Ungültiger Punktwert in einer Entweder/Oder-Gruppe: Werte müssen ganze Zahlen ab 1 sein.',
  );
  assert.equal(pruefeGruppe(halbzahlig), MSG_GRUPPE_PUNKTE_UNGUELTIG);
  // Live-Meldung an der Gruppe und Speicherprüfung: dieselbe Meldung.
  assert.equal(
    pruefeGruppeImKontext(parseKulturRegeln({ alternativen: [halbzahlig] }), 0),
    MSG_GRUPPE_PUNKTE_UNGUELTIG,
  );
  assert.equal(validateKultur({ alternativen: [halbzahlig] }), MSG_GRUPPE_PUNKTE_UNGUELTIG);

  // Das Wertformat wird vor der Gleichwertigkeit benannt (2 ≠ 1,5 – Ursache ist der Bruchwert).
  const ungleich: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1.5)],
    ],
  };
  assert.equal(pruefeGruppe(ungleich), MSG_GRUPPE_PUNKTE_UNGUELTIG);
  assert.equal(validateKultur({ alternativen: [ungleich] }), MSG_GRUPPE_PUNKTE_UNGUELTIG);

  // Auch in einer Stärken-Gruppe – vor der Stufenprüfung (R1).
  const staerke: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1.5)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 1.5)],
    ],
  };
  assert.equal(pruefeGruppe(staerke, { zaeh: 1, schnell: 1 }), MSG_GRUPPE_PUNKTE_UNGUELTIG);
  assert.equal(
    validateKultur({ alternativen: [staerke] }, { zaeh: 1, schnell: 1 }),
    MSG_GRUPPE_PUNKTE_UNGUELTIG,
  );

  // Als String übergeben (doppelt kodiert), in einem von mehreren Einträgen einer Seite.
  const alsString = {
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: '1.5' }],
          [
            gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 0.5),
          ],
        ],
      },
    ],
  };
  assert.equal(validateKultur(alsString), MSG_GRUPPE_PUNKTE_UNGUELTIG);

  // Unverändert zulässig: ganze Zahlen ab 1 (Auftragsbeispiel).
  assert.equal(validateKultur({ alternativen: [AUFTRAGSBEISPIEL] }), null);

  // Unverändert: 0 und negative Werte behalten ihre Meldung (kein tragender Wert).
  const nullWert: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 0)],
    ],
  };
  assert.equal(pruefeGruppe(nullWert), msgEintragUnvollstaendig(2));
  assert.equal(
    pruefeGruppe({
      ...nullWert,
      seiten: [nullWert.seiten[0], [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', -0.5)]],
    }),
    msgEintragUnvollstaendig(2),
  );
});

test('PO H (R6): Eintrag zugleich in einer Gruppenseite und im Abschnitt wird abgelehnt', () => {
  // Editor-Pfad: „Athletik 2" ist per „Alternative hinzufügen" in die Gruppe gewandert;
  // „Akrobatik 1" steht noch im Abschnitt „Talente" – und wird zusätzlich auf Seite 2 gewählt.
  const config = {
    talente: [{ id: 'akrobatik', name: 'Akrobatik', punkte: 1 }],
    alternativen: [AUFTRAGSBEISPIEL],
  };
  const regeln = parseKulturRegeln(config);
  assert.equal(
    msgMehrfachZugeordnet('Akrobatik'),
    'Ungültige Gruppe: Eintrag Akrobatik ist mehrfach zugeordnet (Abschnitt oder mehrere Gruppen).',
  );
  assert.equal(pruefeMehrfachZuordnung(regeln, 0), msgMehrfachZugeordnet('Akrobatik'));
  // Live-Meldung an der Gruppe und Speicherprüfung nennen dieselbe Ursache.
  assert.equal(pruefeGruppeImKontext(regeln, 0), msgMehrfachZugeordnet('Akrobatik'));
  assert.equal(validateKultur(config), msgMehrfachZugeordnet('Akrobatik'));

  // Die Gruppe für sich ist in Ordnung – die Doppelzuordnung ist der Grund (nicht R2/R4).
  assert.equal(validateKultur({ alternativen: [AUFTRAGSBEISPIEL] }), null);
  // Ein anderer Eintrag im Abschnitt ist ebenfalls in Ordnung (TC-11).
  assert.equal(
    validateKultur({
      talente: [{ id: 'handwerk', name: 'Handwerk', punkte: 3 }],
      alternativen: [AUFTRAGSBEISPIEL],
    }),
    null,
  );

  // In jedem der Abschnitte: gleiche id in einem anderen Talentbereich ...
  assert.equal(
    validateKultur({
      waffenTalente: [{ id: 'athletik', name: 'Athletik', punkte: 1 }],
      alternativen: [AUFTRAGSBEISPIEL],
    }),
    msgMehrfachZugeordnet('Athletik'),
  );
  // ... und unabhängig vom Wert des Abschnittseintrags (zugeteilt ist die id, wie bei R1).
  assert.equal(
    validateKultur({
      magieSchulen: [{ id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 0 }],
      alternativen: [AUFTRAGSBEISPIEL],
    }),
    msgMehrfachZugeordnet('Heimlichkeit'),
  );

  // Stärke zugleich im Abschnitt „Stärken" und in einer Stärken-Gruppe.
  const staerkenGruppe: KulturAlternative = {
    typ: 'staerke',
    seiten: [
      [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
      [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
    ],
  };
  const kosten = { zaeh: 1, schnell: 1 };
  assert.equal(validateKultur({ alternativen: [staerkenGruppe] }, kosten), null);
  assert.equal(
    validateKultur(
      { staerken: [{ id: 'schnell', name: 'Schnell', anzahl: 1 }], alternativen: [staerkenGruppe] },
      kosten,
    ),
    msgMehrfachZugeordnet('Schnell'),
  );

  // Dieselbe id auf den beiden Seiten derselben Gruppe ist keine Mehrfachzuordnung:
  // „Athletik 2 | Athletik 1 + Heimlichkeit 1" – je Gruppe ist genau eine Seite aktiv (R5).
  const beidseitig: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
      [
        gruppenEintrag('talente', 'athletik', 'Athletik', 1),
        gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
      ],
    ],
  };
  assert.equal(pruefeMehrfachZuordnung(parseKulturRegeln({ alternativen: [beidseitig] }), 0), null);
  assert.equal(validateKultur({ alternativen: [beidseitig] }), null);

  // Unbekannter Index: keine Meldung.
  assert.equal(pruefeMehrfachZuordnung(regeln, 7), null);
  assert.equal(pruefeGruppeImKontext(regeln, 7), null);
});

test('PO H (R6): Eintrag in zwei Gruppen wird abgelehnt – Live-Meldung an beiden Gruppen', () => {
  // „Akrobatik" steht in Gruppe 1 (Seite 2) und in Gruppe 2 (Seite 2).
  const gruppe2: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'handwerk', 'Handwerk', 2)],
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 2)],
    ],
  };
  const config = { alternativen: [AUFTRAGSBEISPIEL, gruppe2] };
  const regeln = parseKulturRegeln(config);
  assert.equal(validateKultur(config), msgMehrfachZugeordnet('Akrobatik'));
  // Live an beiden Gruppen – die Meldung nennt den doppelt zugeordneten Eintrag.
  assert.equal(pruefeGruppeImKontext(regeln, 0), msgMehrfachZugeordnet('Akrobatik'));
  assert.equal(pruefeGruppeImKontext(regeln, 1), msgMehrfachZugeordnet('Akrobatik'));

  // Seite 2 der zweiten Gruppe austauschen (bereichsübergreifend, weiterhin 2 Punkte): behoben.
  const behoben: KulturAlternative = {
    typ: 'talent',
    seiten: [
      gruppe2.seiten[0],
      [
        gruppenEintrag('waffenTalente', 'klingenwaffen', 'Klingenwaffen', 1),
        gruppenEintrag('magieSchulen', 'bannmagie', 'Bannmagie', 1),
      ],
    ],
  };
  const behobenRegeln = parseKulturRegeln({ alternativen: [AUFTRAGSBEISPIEL, behoben] });
  assert.equal(pruefeGruppeImKontext(behobenRegeln, 0), null);
  assert.equal(pruefeGruppeImKontext(behobenRegeln, 1), null);
  assert.equal(validateKultur({ alternativen: [AUFTRAGSBEISPIEL, behoben] }), null);
  // R5 bleibt für die unabhängigen Gruppen erfüllt: 2 + 2 = 4 Punkte in jedem Ergebnis.
  assert.deepEqual(wahlmoeglichkeiten(behobenRegeln).map(ergebnis => ergebnis.talentPunkte), [4, 4, 4, 4]);
});

test('PO G/H: Reihenfolge der Meldungen – Struktur und Wertformat vor der Zuordnung', () => {
  // Per API: Seite 2 leer und zugleich „Akrobatik" im Abschnitt und auf Seite 1.
  const leer: KulturAlternative = {
    typ: 'talent',
    seiten: [[gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 2)], []],
  };
  const config = {
    talente: [{ id: 'akrobatik', name: 'Akrobatik', punkte: 1 }],
    alternativen: [leer],
  };
  assert.equal(validateKultur(config), msgSeiteLeer(2));
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(config), 0), msgSeiteLeer(2));

  // Bruchwert und Doppelzuordnung: zuerst das Wertformat.
  const bruch: KulturAlternative = {
    typ: 'talent',
    seiten: [
      [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1.5)],
      [gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1.5)],
    ],
  };
  const bruchConfig = {
    talente: [{ id: 'akrobatik', name: 'Akrobatik', punkte: 1 }],
    alternativen: [bruch],
  };
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(bruchConfig), 0), MSG_GRUPPE_PUNKTE_UNGUELTIG);
  assert.equal(validateKultur(bruchConfig), MSG_GRUPPE_PUNKTE_UNGUELTIG);
});
