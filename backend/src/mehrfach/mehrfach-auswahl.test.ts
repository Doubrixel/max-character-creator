import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  displayNameWithCount,
  filterVerfuegbareMeisterschaften,
  istMeisterschaftNochWaehlbar,
  istStaerkeNochWaehlbar,
  isPositiveIntegerInput,
  maxAuswahlVonEintrag,
  parsePositiveInteger,
  readMehrfachConfig,
  staerkenPunkteVerbrauch,
  toRoman,
  validateMehrfachConfig,
  zaehleAuswahlen,
  zaehleMeisterschaftAuswahlen,
  zaehleStaerkenAuswahlen,
  type StaerkenWahlEintrag,
} from '@mcc/shared';

test('INT-000023: die Obergrenze akzeptiert nur ganze positive Zahlen', () => {
  assert.equal(isPositiveIntegerInput('1'), true);
  assert.equal(isPositiveIntegerInput('3'), true);
  assert.equal(isPositiveIntegerInput('0'), false, '0 ist keine positive Zahl');
  assert.equal(isPositiveIntegerInput('-2'), false, 'negative Zahlen sind unzulässig');
  assert.equal(isPositiveIntegerInput('1,5'), false, 'Dezimalzahlen sind unzulässig');
  assert.equal(isPositiveIntegerInput('abc'), false, 'Text ist unzulässig');
  assert.equal(isPositiveIntegerInput(''), false);

  assert.equal(parsePositiveInteger(2), 2);
  assert.equal(parsePositiveInteger('3'), 3);
  assert.equal(parsePositiveInteger('0'), null);
  assert.equal(parsePositiveInteger('-2'), null);
  assert.equal(parsePositiveInteger('1,5'), null);
  assert.equal(parsePositiveInteger('abc'), null);

  assert.deepEqual(readMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: '3' }), {
    flag: true, max: 3, aktiv: true,
  });
  assert.equal(readMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: '0' }).aktiv, false);
  assert.equal(readMehrfachConfig(JSON.stringify({ mehrfach_waehlbar: 'true', max_auswahl: '2' })).aktiv, true);
  assert.equal(readMehrfachConfig({ mehrfach_waehlbar: 'false', max_auswahl: '2' }).aktiv, false);
  assert.equal(readMehrfachConfig(null).aktiv, false);

  assert.equal(validateMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: '2' }), null);
  assert.ok(validateMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: '0' }));
  assert.ok(validateMehrfachConfig({ mehrfach_waehlbar: 'true', max_auswahl: 'abc' }));
  assert.equal(validateMehrfachConfig({ mehrfach_waehlbar: 'false', max_auswahl: 'abc' }), null);
});

test('INT-000023: römische Zählung und Auswahlzählung', () => {
  assert.equal(toRoman(1), 'I');
  assert.equal(toRoman(2), 'II');
  assert.equal(toRoman(3), 'III');
  assert.equal(toRoman(4), 'IV');
  assert.equal(toRoman(5), 'V');
  assert.equal(toRoman(9), 'IX');
  assert.equal(toRoman(10), 'X');
  assert.equal(displayNameWithCount('Flink', 1), 'Flink');
  assert.equal(displayNameWithCount('Flink', 2), 'Flink II');
  assert.equal(displayNameWithCount('Meisterflink', 3), 'Meisterflink III');

  assert.equal(zaehleAuswahlen(['id-1', 'id-1', 'id-2'], { id: 'id-1' }), 2);
  assert.equal(zaehleAuswahlen(['Flink', 'id-1', 'FLINK '], { id: 'id-1', namen: ['Flink'] }), 3);
  assert.equal(zaehleAuswahlen([], { id: 'id-1' }), 0);
});

test('INT-000023 Rework / MCC-010: Meisterschafts-Obergrenze gilt characterweit, nicht je Fertigkeit', () => {
  // Synthetische Testdaten: „Meisterflink" ist mehrfach wählbar mit Obergrenze 2.
  const meisterflink = { id: 'mf-1', name: 'Meisterflink', mehrfach: true, max: 2 }
  const meisterhand = { id: 'mf-2', name: 'Meisterhand', mehrfach: false, max: null }
  const pool = [meisterflink, meisterhand]

  const akrobatik = { id: 'mf-1', name: 'Meisterflink' }
  const alchemie = { id: 'mf-1', name: 'Meisterflink' }

  // Erste Wahl für Akrobatik: Meisterflink bleibt im Auswahlfeld verfügbar.
  assert.deepEqual(
    filterVerfuegbareMeisterschaften(pool, [akrobatik], [akrobatik]).map((m) => m.id),
    ['mf-1', 'mf-2'],
  )

  // Zweite Wahl für Alchemie: Obergrenze 2 erreicht. Im Auswahlfeld einer
  // dritten Fertigkeit („Anführen") darf Meisterflink nicht mehr angeboten
  // und auch nicht erneut akzeptiert werden.
  const alleGewaehlt = [akrobatik, alchemie]
  assert.equal(istMeisterschaftNochWaehlbar(alleGewaehlt, meisterflink, 2), false);
  assert.deepEqual(
    filterVerfuegbareMeisterschaften(pool, alleGewaehlt, []).map((m) => m.id),
    ['mf-2'],
  )

  // Zählung über alle Fertigkeiten hinweg; Altbestand mit Namen statt Id
  // wird normalisiert mitgezählt.
  assert.equal(
    zaehleMeisterschaftAuswahlen(
      [{ id: 'alt-1', name: ' MEISTERFLINK ' }, { id: 'mf-1', name: 'Meisterflink' }],
      meisterflink,
    ),
    2,
  );

  // Nicht mehrfach wählbare Einträge bleiben unverändert: je Fertigkeit
  // höchstens eine Auswahl, für andere Fertigkeiten weiterhin verfügbar.
  assert.deepEqual(
    filterVerfuegbareMeisterschaften([meisterhand], [meisterhand], [meisterhand]).map((m) => m.id),
    [],
  );
  assert.deepEqual(
    filterVerfuegbareMeisterschaften([meisterhand], [meisterhand], []).map((m) => m.id),
    ['mf-2'],
  );
});

test('INT-000023: Mehrfachauswahl in Bibliothek, Chronik und Erstellung', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'max-character-creator-mehrfach-'));
  try {
    const result = spawnSync(process.execPath, ['--import=tsx', 'src/mehrfach/mehrfach-auswahl-test-child.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: pathToFileURL(join(tempDir, 'test.sqlite')).href },
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

/**
 * Bildet den Creation-Auswahlfluss nach: Solange Obergrenze UND Budget es
 * erlauben, wird die Stärke erneut in die Auswahlliste aufgenommen.
 */
function simuliereCreationAuswahl(
  budget: number,
  eintrag: StaerkenWahlEintrag,
  kostenVon: (id: string) => number,
): { auswahlen: string[]; verfuegbar: number } {
  const auswahlen: string[] = [];
  let guard = 100;
  while (
    guard-- > 0 &&
    istStaerkeNochWaehlbar(
      eintrag,
      auswahlen,
      budget - staerkenPunkteVerbrauch(auswahlen, kostenVon),
    )
  ) {
    auswahlen.push(eintrag.id);
  }
  return {
    auswahlen,
    verfuegbar: budget - staerkenPunkteVerbrauch(auswahlen, kostenVon),
  };
}

test('INT-000027: jede Auswahl einer mehrfach wählbaren Stärke kostet den regulären Preis', () => {
  // Synthetisches Fixture „Flink": Kosten 1, mehrfach wählbar, Obergrenze 2.
  const flink: StaerkenWahlEintrag = { id: 'flink-1', kosten: 1, mehrfach: true, max: 2 }
  const kostenVon = (id: string) => (id === flink.id ? flink.kosten : 1)

  assert.equal(staerkenPunkteVerbrauch([], kostenVon), 0);
  assert.equal(staerkenPunkteVerbrauch(['flink-1'], kostenVon), 1);
  assert.equal(
    staerkenPunkteVerbrauch(['flink-1', 'flink-1'], kostenVon),
    2,
    'die zweite Auswahl zieht erneut 1 Punkt vom Budget ab',
  );
  assert.equal(staerkenPunkteVerbrauch(['flink-1', 'flink-1', 'flink-1'], kostenVon), 3);
  // Altbestand mit unbekanntem Kostenwert fällt auf 1 zurück.
  assert.equal(staerkenPunkteVerbrauch(['unbekannt'], () => Number.NaN), 1);

  // 2 Punkte, Kosten 1, Obergrenze 2 ⇒ genau zwei Auswahlen, danach 0 Punkte.
  const { auswahlen, verfuegbar } = simuliereCreationAuswahl(2, flink, kostenVon);
  assert.equal(auswahlen.length, 2);
  assert.equal(verfuegbar, 0);
  assert.equal(istStaerkeNochWaehlbar(flink, auswahlen, verfuegbar), false);
});

test('INT-000027: Punktbudget und Obergrenze wirken gemeinsam als Begrenzung', () => {
  const kostenVon = () => 1

  // Obergrenze 3, aber nur 2 Punkte: das Budget blockiert vor der Obergrenze.
  const flinkDrei: StaerkenWahlEintrag = { id: 'flink-1', kosten: 1, mehrfach: true, max: 3 }
  const budgetFall = simuliereCreationAuswahl(2, flinkDrei, kostenVon);
  assert.equal(budgetFall.auswahlen.length, 2);
  assert.equal(zaehleStaerkenAuswahlen(budgetFall.auswahlen, 'flink-1'), 2);
  assert.equal(budgetFall.verfuegbar, 0);
  assert.equal(
    istStaerkeNochWaehlbar(flinkDrei, budgetFall.auswahlen, budgetFall.verfuegbar),
    false,
    'keine dritte Auswahl, obwohl die Obergrenze 3 noch frei ist',
  );

  // Obergrenze 2, aber 3 Punkte: die Obergrenze blockiert vor dem Budget.
  const flinkZwei: StaerkenWahlEintrag = { ...flinkDrei, max: 2 }
  const obergrenzenFall = simuliereCreationAuswahl(3, flinkZwei, kostenVon);
  assert.equal(obergrenzenFall.auswahlen.length, 2);
  assert.equal(obergrenzenFall.verfuegbar, 1, '1 Punkt bleibt für eine andere Stärke');
  assert.equal(istStaerkeNochWaehlbar(flinkZwei, obergrenzenFall.auswahlen, obergrenzenFall.verfuegbar), false);

  const einfach: StaerkenWahlEintrag = { id: 'einfach-1', kosten: 1, mehrfach: false, max: null }
  assert.equal(istStaerkeNochWaehlbar(einfach, obergrenzenFall.auswahlen, obergrenzenFall.verfuegbar), true);
  assert.equal(istStaerkeNochWaehlbar(einfach, obergrenzenFall.auswahlen, 0), false,
    'bei aufgebrauchtem Budget wird auch die andere Stärke nicht angeboten');
});

test('INT-000027: höherer Preis, Entfernen und nicht mehrfach wählbare Stärken bleiben unverändert', () => {
  const teuer: StaerkenWahlEintrag = { id: 'teuer-1', kosten: 2, mehrfach: true, max: 2 }
  const kostenVon = (id: string) => (id === teuer.id ? 2 : 1)

  const fall = simuliereCreationAuswahl(2, teuer, kostenVon);
  assert.equal(fall.auswahlen.length, 1, 'Kosten 2 bei Budget 2 erlauben nur eine Auswahl');
  assert.equal(fall.verfuegbar, 0);

  // Eine Entfernung gibt den Preis vollständig zurück.
  assert.equal(staerkenPunkteVerbrauch(['teuer-1'], kostenVon), 2);
  assert.equal(staerkenPunkteVerbrauch([], kostenVon), 0);
  assert.equal(istStaerkeNochWaehlbar(teuer, [], 2), true);

  // Nicht mehrfach wählbare Stärken verhalten sich wie bisher: eine Auswahl.
  const einfach: StaerkenWahlEintrag = { id: 'einfach-1', kosten: 1, mehrfach: false, max: null }
  assert.equal(maxAuswahlVonEintrag(einfach), 1);
  assert.equal(maxAuswahlVonEintrag(teuer), 2);
  const einfachFall = simuliereCreationAuswahl(3, einfach, kostenVon);
  assert.equal(einfachFall.auswahlen.length, 1);
  assert.equal(einfachFall.verfuegbar, 2);
});

test('INT-000028: Schritt 5 erlaubt bei 1 Punkt genau eine Stärke – auch bei mehrfach wählbarer Stärke', () => {
  // Synthetische Fixtures wie in den Testfällen MCC-028-01 bis -06.
  const flink: StaerkenWahlEintrag = { id: 'flink-1', kosten: 1, mehrfach: true, max: 2 }
  const zaeh: StaerkenWahlEintrag = { id: 'zaeh-1', kosten: 1, mehrfach: false, max: null }
  const kostenVon = (id: string) => (id === flink.id ? flink.kosten : zaeh.kosten)
  const verfuegbarVon = (auswahlen: readonly string[]) =>
    1 - staerkenPunkteVerbrauch(auswahlen, kostenVon)

  // Start: 1 Punkt; beide Stärken sind wählbar (Flink: Auswahl 0 / 2).
  assert.equal(verfuegbarVon([]), 1)
  assert.equal(istStaerkeNochWaehlbar(flink, [], verfuegbarVon([])), true)
  assert.equal(istStaerkeNochWaehlbar(zaeh, [], verfuegbarVon([])), true)

  // Erste Auswahl von Flink: Budget aufgebraucht. Die Obergrenze 2 wäre zwar
  // noch frei, das 1-Punkt-Budget verhindert aber eine zweite Auswahl – auch
  // einer anderen Stärke.
  const nachFlink = [flink.id]
  assert.equal(verfuegbarVon(nachFlink), 0)
  assert.equal(zaehleStaerkenAuswahlen(nachFlink, flink.id), 1)
  assert.equal(istStaerkeNochWaehlbar(flink, nachFlink, verfuegbarVon(nachFlink)), false)
  assert.equal(istStaerkeNochWaehlbar(zaeh, nachFlink, verfuegbarVon(nachFlink)), false)

  // Entfernen der Auswahl gibt den Punkt vollständig zurück.
  assert.equal(verfuegbarVon([]), 1)
  assert.equal(istStaerkeNochWaehlbar(flink, [], verfuegbarVon([])), true)

  // Eine nicht mehrfach wählbare Stärke verbraucht ebenfalls den einen Punkt.
  const nachZaeh = [zaeh.id]
  assert.equal(verfuegbarVon(nachZaeh), 0)
  assert.equal(istStaerkeNochWaehlbar(zaeh, nachZaeh, verfuegbarVon(nachZaeh)), false)
});
