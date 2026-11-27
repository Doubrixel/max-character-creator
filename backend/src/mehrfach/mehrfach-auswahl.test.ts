import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  displayNameWithCount,
  isPositiveIntegerInput,
  parsePositiveInteger,
  readMehrfachConfig,
  toRoman,
  validateMehrfachConfig,
  zaehleAuswahlen,
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
