import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ERGEBNIS_ZUSATZ,
  MSG_MAX_STAERKEN,
  MSG_MAX_TALENTE,
  MSG_STAERKE_STUFE,
  formatAlternative,
  gruppeAufloesen,
  msgEintragUnvollstaendig,
  msgSeiteLeer,
  parseKulturRegeln,
  pruefeStaerkenAbschnitt,
  pruefeStaerkeWert,
  pruefeTalentPunkte,
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
  const eine = parseKulturRegeln({
    staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 1 }],
  });
  // Die bereits zugewiesene Stärke selbst darf erneut gewählt werden.
  assert.equal(pruefeStaerkenAbschnitt(eine, 'zaeh'), null);
  // Für jede weitere Zeile ist eine zweite Stärke blockiert.
  assert.equal(pruefeStaerkenAbschnitt(eine, ''), MSG_MAX_STAERKEN);
  assert.equal(pruefeStaerkenAbschnitt(eine, 'schnell'), MSG_MAX_STAERKEN);

  const inArbeit = parseKulturRegeln({
    staerken: [
      { id: 'zaeh', name: 'Zäh', anzahl: 1 },
      { id: 'schnell', name: 'Schnell', anzahl: 0 },
    ],
  });
  assert.equal(pruefeStaerkenAbschnitt(inArbeit, 'schnell'), MSG_MAX_STAERKEN);

  // Auch eine bereits zugewiesene Stärke mit Anzahl 0 zählt (Review-Fund).
  const nullAnzahl = parseKulturRegeln({ staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 0 }] });
  assert.equal(staerkenZuweisungen(nullAnzahl), 1);
  assert.equal(pruefeStaerkenAbschnitt(nullAnzahl, 'schnell'), MSG_MAX_STAERKEN);
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
  const doppelt = JSON.stringify({
    talente: JSON.stringify([ATHLETIK, AKROBATIK]),
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
