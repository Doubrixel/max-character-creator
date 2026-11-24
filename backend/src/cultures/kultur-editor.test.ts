import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MSG_GRUPPE_PUNKTE_UNGUELTIG,
  MSG_MAX_STAERKEN,
  MSG_MAX_TALENTE,
  MSG_STAERKE_STUFE,
  alternativeAnlegen,
  eingabeWert,
  entferneGruppe,
  msgMehrfachZugeordnet,
  msgSeiteLeer,
  parseKulturRegeln,
  pruefeGruppe,
  pruefeGruppeImKontext,
  staerkeAnzahlSetzen,
  staerkeWaehlen,
  talentPunkteGesamt,
  talentPunkteSetzen,
  validateKultur,
  type KulturAbschnittEintrag,
} from '@mcc/shared';

/**
 * UI-Pfad des Bibliotheks-Kultureditors (LibraryTable): Die Handler der
 * Komponente rufen ausschließlich diese Editor-Schritte auf. Die Stärken-
 * Fixtures enthalten gezielt Zeilen mit `anzahl: 0` (Default einer neuen
 * Zeile) – der Review-Fund INT-000015: Solche Zeilen dürfen R1 nicht umgehen.
 */

const ZAEH = { id: 'zaeh', name: 'Zäh' };
const SCHNELL = { id: 'schnell', name: 'Schnell' };
const KOSTEN = { zaeh: 1, schnell: 1, scharfsinn: 1, teuer: 2 };
/** Zeile, die „+ Eintrag hinzufügen" im Abschnitt „Stärken" anlegt. */
const NEUE_ZEILE: KulturAbschnittEintrag = { id: '', name: '', anzahl: 0 };

function staerken(felder: Record<string, string>): KulturAbschnittEintrag[] {
  return JSON.parse(felder.staerken);
}

function mitStaerken(...liste: KulturAbschnittEintrag[]): Record<string, string> {
  return { staerken: JSON.stringify(liste) };
}

test('UI-Pfad TC-04: zweite Stärke wird blockiert, die frische Zeile wieder entfernt', () => {
  const felder = mitStaerken({ ...ZAEH, anzahl: 1 }, NEUE_ZEILE);
  const schritt = staerkeWaehlen(felder, 1, SCHNELL, KOSTEN);
  assert.equal(schritt.fehler, MSG_MAX_STAERKEN);
  // Im Abschnitt „Stärken" bleibt nur „Zäh" mit Anzahl 1 zugewiesen.
  assert.deepEqual(staerken(schritt.felder), [{ ...ZAEH, anzahl: 1 }]);
  assert.equal(validateKultur(schritt.felder, KOSTEN), null);
});

test('UI-Pfad Review-Fund 1: zugewiesene Stärke mit Anzahl 0 blockiert die zweite Stärke', () => {
  // Altbestand: zugewiesene Stärke, die auf Anzahl 0 steht.
  const felder = mitStaerken({ ...ZAEH, anzahl: 0 }, NEUE_ZEILE);
  const schritt = staerkeWaehlen(felder, 1, SCHNELL, KOSTEN);
  assert.equal(schritt.fehler, MSG_MAX_STAERKEN);
  assert.deepEqual(staerken(schritt.felder), [{ ...ZAEH, anzahl: 0 }]);

  // Auch wenn in der neuen Zeile schon Stufe 1 steht: die Zeile zählt über die id nicht mit,
  // die bereits zugewiesene Stärke (Anzahl 0) schon.
  const mitStufe = mitStaerken({ ...ZAEH, anzahl: 0 }, { ...NEUE_ZEILE, anzahl: 1 });
  assert.equal(staerkeWaehlen(mitStufe, 1, SCHNELL, KOSTEN).fehler, MSG_MAX_STAERKEN);
  // Eine andere Zahl als Stufe 1 in der Zeile ist für sich schon unzulässig.
  const mitZahl = mitStaerken({ ...ZAEH, anzahl: 0 }, { ...NEUE_ZEILE, anzahl: 7 });
  assert.equal(staerkeWaehlen(mitZahl, 1, SCHNELL, KOSTEN).fehler, MSG_STAERKE_STUFE);

  // Bereits zugewiesene zweite Zeile (Altbestand): Umwählen wird blockiert, die Zeile bleibt.
  const altbestand = mitStaerken({ ...ZAEH, anzahl: 0 }, { ...SCHNELL, anzahl: 0 });
  const umwaehlen = staerkeWaehlen(altbestand, 1, { id: 'scharfsinn', name: 'Scharfsinn' }, KOSTEN);
  assert.equal(umwaehlen.fehler, MSG_MAX_STAERKEN);
  assert.equal(umwaehlen.felder, altbestand);
  // Die Zuweisung zurücknehmen ist immer möglich und räumt den Zustand auf.
  const zurueck = staerkeWaehlen(altbestand, 1, { id: '', name: '' }, KOSTEN);
  assert.equal(zurueck.fehler, null);
  assert.deepEqual(staerken(zurueck.felder), [{ ...ZAEH, anzahl: 0 }, { ...NEUE_ZEILE, anzahl: 0 }]);
});

test('UI-Pfad: Stärke wählen steht direkt auf Stufe 1 – Anzahl 0 ist für eine zugewiesene Stärke nicht erreichbar', () => {
  const frisch = mitStaerken(NEUE_ZEILE);
  const schritt = staerkeWaehlen(frisch, 0, ZAEH, KOSTEN);
  assert.equal(schritt.fehler, null);
  assert.deepEqual(staerken(schritt.felder), [{ ...ZAEH, anzahl: 1 }]);
  assert.equal(validateKultur(schritt.felder, KOSTEN), null);

  // Anzahl 0 (und 2) auf der zugewiesenen Stärke wird nicht übernommen.
  const nullVersuch = staerkeAnzahlSetzen(schritt.felder, 0, '0', KOSTEN);
  assert.equal(nullVersuch.fehler, MSG_STAERKE_STUFE);
  assert.equal(nullVersuch.felder, schritt.felder);
  assert.equal(staerkeAnzahlSetzen(schritt.felder, 0, '2', KOSTEN).fehler, MSG_STAERKE_STUFE);
  assert.equal(staerkeAnzahlSetzen(schritt.felder, 0, '', KOSTEN).fehler, MSG_STAERKE_STUFE);
  assert.deepEqual(staerken(schritt.felder), [{ ...ZAEH, anzahl: 1 }]);

  const ok = staerkeAnzahlSetzen(schritt.felder, 0, '1', KOSTEN);
  assert.equal(ok.fehler, null);

  // Ohne Zuweisung wird der Wert unverändert übernommen (die Zeile zählt nicht).
  const unzugewiesen = staerkeAnzahlSetzen(mitStaerken(NEUE_ZEILE), 0, '3', KOSTEN);
  assert.equal(unzugewiesen.fehler, null);
  assert.deepEqual(staerken(unzugewiesen.felder), [{ ...NEUE_ZEILE, anzahl: 3 }]);
  assert.equal(validateKultur(unzugewiesen.felder, KOSTEN), null);
});

test('UI-Pfad F1: „Anzahl" auf einer zweiten zugewiesenen Zeile wird live mit dem Limit blockiert', () => {
  // Altbestand (A3, kein Rewrite): „Zäh" Anzahl 1 ist zugewiesen, daneben steht
  // „Schnell" mit Anzahl 0. Bei „Schnell" Anzahl 1 eintragen (Review-Repro F1).
  const altbestand = mitStaerken({ ...ZAEH, anzahl: 1 }, { ...SCHNELL, anzahl: 0 });
  const schritt = staerkeAnzahlSetzen(altbestand, 1, '1', KOSTEN);
  // Dieselbe Abschnittsprüfung wie beim Wählen – live mit der Limit-Meldung,
  // nicht erst beim Speichern.
  assert.equal(schritt.fehler, MSG_MAX_STAERKEN);
  // Der Wert 1 wird nicht übernommen.
  assert.equal(schritt.felder, altbestand);
  assert.deepEqual(staerken(schritt.felder), [{ ...ZAEH, anzahl: 1 }, { ...SCHNELL, anzahl: 0 }]);
  // Wäre der Wert übernommen worden, stünden live zwei zugewiesene Stärken im Editor.
  assert.equal(validateKultur(altbestand, KOSTEN), MSG_MAX_STAERKEN);

  // In umgekehrter Reihenfolge (Zeile mit Anzahl 0 zuerst) gilt dasselbe.
  const umgekehrt = mitStaerken({ ...SCHNELL, anzahl: 0 }, { ...ZAEH, anzahl: 1 });
  const versuch = staerkeAnzahlSetzen(umgekehrt, 0, '1', KOSTEN);
  assert.equal(versuch.fehler, MSG_MAX_STAERKEN);
  assert.equal(versuch.felder, umgekehrt);

  // Stufe 2 auf der zweiten Zeile ist für sich schon unzulässig (vor der Abschnittsprüfung).
  assert.equal(staerkeAnzahlSetzen(altbestand, 1, '2', KOSTEN).fehler, MSG_STAERKE_STUFE);

  // Die Zuweisung der zweiten Zeile zurücknehmen ist immer möglich; danach ist
  // der Abschnitt wieder gültig und ohne manuelles Zeilenlöschen speicherbar.
  const aufgeraeumt = staerkeWaehlen(altbestand, 1, { id: '', name: '' }, KOSTEN);
  assert.equal(aufgeraeumt.fehler, null);
  assert.deepEqual(staerken(aufgeraeumt.felder), [{ ...ZAEH, anzahl: 1 }, { ...NEUE_ZEILE, anzahl: 0 }]);
  assert.equal(validateKultur(aufgeraeumt.felder, KOSTEN), null);
  // In der freien Zeile ist Anzahl 1 nun wieder zulässig (keine zweite Zuweisung).
  assert.equal(staerkeAnzahlSetzen(aufgeraeumt.felder, 1, '1', KOSTEN).fehler, null);
});

test('UI-Pfad TC-05/TC-06: Stufe 2 und Kosten 2 werden nicht zugewiesen', () => {
  // TC-05: In der Zeile steht bereits Stufe 2, dann wird die Stärke gewählt.
  const stufeZwei = mitStaerken({ ...NEUE_ZEILE, anzahl: 2 });
  const schrittStufe = staerkeWaehlen(stufeZwei, 0, ZAEH, KOSTEN);
  assert.equal(schrittStufe.fehler, MSG_STAERKE_STUFE);
  assert.deepEqual(staerken(schrittStufe.felder), [{ ...NEUE_ZEILE, anzahl: 2 }]);

  // TC-06: Stärke mit Kosten 2.
  const teuer = staerkeWaehlen(mitStaerken(NEUE_ZEILE), 0, { id: 'teuer', name: 'Teststärke Teuer' }, KOSTEN);
  assert.equal(teuer.fehler, MSG_STAERKE_STUFE);
  assert.deepEqual(staerken(teuer.felder), [NEUE_ZEILE]);
});

test('UI-Pfad TC-01/TC-02/TC-03: Talentpunkte über 5 werden bereichsübergreifend blockiert', () => {
  const athletik = { id: 'athletik', name: 'Athletik', punkte: 3 };
  const akrobatik = { id: 'akrobatik', name: 'Akrobatik', punkte: 2 };
  const heimlichkeit = { id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 0 };

  // TC-02: Summe 5 + 1 → blockiert, die frische Zeile wird entfernt.
  const felder = { talente: JSON.stringify([athletik, akrobatik, heimlichkeit]) };
  const schritt = talentPunkteSetzen(felder, 'talente', 2, '1');
  assert.equal(schritt.fehler, MSG_MAX_TALENTE);
  assert.deepEqual(JSON.parse(schritt.felder.talente), [athletik, akrobatik]);
  assert.equal(talentPunkteGesamt(parseKulturRegeln(schritt.felder)), 5);

  // Eine Zeile mit bisherigem Wert behält ihn.
  const bestaetigt = { talente: JSON.stringify([athletik, akrobatik, { ...heimlichkeit, punkte: 1 }]) };
  const zuViel = talentPunkteSetzen(bestaetigt, 'talente', 0, '4');
  assert.equal(zuViel.fehler, MSG_MAX_TALENTE);
  assert.equal(zuViel.felder, bestaetigt);

  // TC-03: die Grenze gilt über alle drei Bereiche zusammen.
  const bereichsuebergreifend = {
    talente: JSON.stringify([athletik]),
    waffenTalente: JSON.stringify([{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 2 }]),
    magieSchulen: JSON.stringify([{ id: 'bannmagie', name: 'Bannmagie', punkte: 0 }]),
  };
  assert.equal(talentPunkteSetzen(bereichsuebergreifend, 'magieSchulen', 0, '1').fehler, MSG_MAX_TALENTE);
  assert.equal(talentPunkteSetzen(bereichsuebergreifend, 'magieSchulen', 0, '0').fehler, null);

  // TC-01: Summe 5 ist zulässig (Athletik 2, Akrobatik 1, Klingenwaffen 1, Bannmagie 1).
  const basis = {
    ...bereichsuebergreifend,
    talente: JSON.stringify([{ ...athletik, punkte: 2 }, { ...akrobatik, punkte: 1 }]),
    waffenTalente: JSON.stringify([{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 1 }]),
  };
  const fuenf = talentPunkteSetzen(basis, 'magieSchulen', 0, '1');
  assert.equal(fuenf.fehler, null);
  assert.equal(talentPunkteGesamt(parseKulturRegeln(fuenf.felder)), 5);
  assert.equal(validateKultur(fuenf.felder), null);
});

test('UI-Pfad TC-08/TC-10: Alternative anlegen löst den Eintrag in eine Gruppe mit (noch) leerer Seite 2', () => {
  const felder = { talente: JSON.stringify([{ id: 'athletik', name: 'Athletik', punkte: 2 }]) };
  const mitGruppe = alternativeAnlegen(felder, 'talente', 0);
  assert.ok(mitGruppe);
  assert.equal(mitGruppe.talente, '[]');
  const regeln = parseKulturRegeln(mitGruppe);
  assert.equal(regeln.alternativen.length, 1);
  assert.equal(regeln.alternativen[0].typ, 'talent');
  assert.deepEqual(regeln.alternativen[0].seiten, [[{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }], []]);
  // Noch nicht speicherbar: Seite 2 ist leer – Live- und Speicherprüfung nennen dieselbe Ursache.
  assert.equal(pruefeGruppe(regeln.alternativen[0]), msgSeiteLeer(2));
  assert.equal(validateKultur(mitGruppe), msgSeiteLeer(2));

  // Eintrag ohne Auswahl oder ohne Wert kann nicht tragen.
  assert.equal(alternativeAnlegen({ talente: JSON.stringify([{ id: 'athletik', name: 'Athletik', punkte: 0 }]) }, 'talente', 0), null);
  assert.equal(alternativeAnlegen({ talente: JSON.stringify([{ id: '', name: '', punkte: 2 }]) }, 'talente', 0), null);
  assert.equal(alternativeAnlegen({ talente: '[]' }, 'talente', 3), null);

  // Stärke: es entsteht eine Stärken-Gruppe.
  const staerke = alternativeAnlegen(mitStaerken({ ...ZAEH, anzahl: 1 }), 'staerken', 0);
  assert.ok(staerke);
  assert.equal(staerke.staerken, '[]');
  assert.equal(parseKulturRegeln(staerke).alternativen[0].typ, 'staerke');
});

test('UI-Pfad Review-Fund 2: „Gruppe entfernen" nach dem Anlegen einer Stärkengruppe – Editor bleibt speicherbar', () => {
  // 1. Stärke zuweisen, 2. Alternative anlegen (Seite 2 wird in der Alternativpflege gefüllt),
  // 3. „Gruppe entfernen": Zurück in den Abschnitt kommt nur Seite 1.
  const zugewiesen = staerkeWaehlen(mitStaerken(NEUE_ZEILE), 0, ZAEH, KOSTEN).felder;
  const mitGruppe = alternativeAnlegen(zugewiesen, 'staerken', 0)!;
  const gefuellt = {
    ...mitGruppe,
    alternativen: JSON.stringify([
      {
        typ: 'staerke',
        seiten: [
          [{ feld: 'staerken', id: 'zaeh', name: 'Zäh', wert: 1 }],
          [{ feld: 'staerken', id: 'schnell', name: 'Schnell', wert: 1 }],
        ],
      },
    ]),
  };
  assert.equal(validateKultur(gefuellt, KOSTEN), null);

  const aufgeloest = entferneGruppe(gefuellt, 0);
  assert.ok(aufgeloest);
  assert.deepEqual(JSON.parse(aufgeloest.staerken), [{ ...ZAEH, anzahl: 1 }]);
  assert.ok(!('alternativen' in aufgeloest));
  // Der Editorzustand besteht R1/R2 und ist ohne manuelles Zeilenlöschen speicherbar.
  assert.equal(validateKultur(aufgeloest, KOSTEN), null);
});

test('UI-Pfad PO G/H: Live-Meldung an der Gruppe – Wertformat und Mehrfachzuordnung wie beim Speichern', () => {
  const athletik = { id: 'athletik', name: 'Athletik', punkte: 2 };
  const akrobatik = { id: 'akrobatik', name: 'Akrobatik', punkte: 1 };

  // 1. „Alternative hinzufügen" an „Athletik": frische Gruppe, Seite 2 ist leer.
  const mitGruppe = alternativeAnlegen({ talente: JSON.stringify([athletik, akrobatik]) }, 'talente', 0)!;
  assert.equal(mitGruppe.talente, JSON.stringify([akrobatik]));
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(mitGruppe), 0), msgSeiteLeer(2));

  // 2. In der Alternativpflege wird auf Seite 2 „Akrobatik" (1) und „Heimlichkeit" (1)
  //    gewählt – so wie `eintragWaehlen`/`wertSetzen` die Einträge schreiben.
  //    „Akrobatik 1" steht noch im Abschnitt „Talente".
  const seite1 = [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 2 }];
  const seite2 = [
    { feld: 'talente', id: 'akrobatik', name: 'Akrobatik', wert: 1 },
    { feld: 'talente', id: 'heimlichkeit', name: 'Heimlichkeit', wert: 1 },
  ];
  const gruppe = (seiten: unknown) => JSON.stringify([{ typ: 'talent', seiten }]);
  const doppelt = { ...mitGruppe, alternativen: gruppe([seite1, seite2]) };
  // Live-Meldung direkt an der Gruppe (role="alert") – dieselbe wie beim Speichern.
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(doppelt), 0), msgMehrfachZugeordnet('Akrobatik'));
  assert.equal(validateKultur(doppelt), msgMehrfachZugeordnet('Akrobatik'));

  // 3. „Akrobatik" aus dem Abschnitt entfernen (Zeile löschen): Gruppe und Kultur sind in Ordnung.
  const aufgeraeumt = { ...doppelt, talente: '[]' };
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(aufgeraeumt), 0), null);
  assert.equal(validateKultur(aufgeraeumt), null);

  // 4. Der umgekehrte Editor-Pfad: Die Gruppe ist vollständig, danach wird „Akrobatik"
  //    im Abschnitt „Talente" neu gewählt (frische Zeile, noch ohne Punkte).
  const imAbschnittGewaehlt = {
    ...aufgeraeumt,
    talente: JSON.stringify([{ id: 'akrobatik', name: 'Akrobatik', punkte: 0 }]),
  };
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(imAbschnittGewaehlt), 0), msgMehrfachZugeordnet('Akrobatik'));
  assert.equal(validateKultur(imAbschnittGewaehlt), msgMehrfachZugeordnet('Akrobatik'));

  // G: Der Editor kann keine Bruchwerte erzeugen – „1,5" und „1.5" werden zur ganzen Zahl 1.
  assert.equal(eingabeWert('1,5'), 1);
  assert.equal(eingabeWert('1.5'), 1);
  // Altbestand bzw. direkter API-Aufruf mit Bruchwert: Live-Meldung an der Gruppe und beim Speichern.
  const altbestand = {
    alternativen: gruppe([
      [{ feld: 'talente', id: 'athletik', name: 'Athletik', wert: 1.5 }],
      [{ feld: 'talente', id: 'akrobatik', name: 'Akrobatik', wert: 1.5 }],
    ]),
  };
  assert.equal(pruefeGruppeImKontext(parseKulturRegeln(altbestand), 0), MSG_GRUPPE_PUNKTE_UNGUELTIG);
  assert.equal(validateKultur(altbestand), MSG_GRUPPE_PUNKTE_UNGUELTIG);
});
