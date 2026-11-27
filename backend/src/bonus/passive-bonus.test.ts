import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  PASSIVE_ATTRIBUTE_STATS,
  PASSIVE_DERIVED_STATS,
  passiveStatFieldLabel,
} from '@mcc/shared';

test('INT-000021: Bonus-Felder der Bibliothek tragen ausschließlich die etablierten Kürzel', () => {
  const expectedKeys = [
    'MUT', 'KLU', 'INT', 'CHA', 'HIN', 'MYS', 'FF', 'GEW', 'KON', 'KRA',
    'LP', 'FK', 'SP', 'VTD', 'KW', 'GW', 'SS', 'INI', 'GK', 'GES',
  ];
  const stats = [...PASSIVE_ATTRIBUTE_STATS, ...PASSIVE_DERIVED_STATS];

  // Reihenfolge und Zuordnung Kürzel → Feld bleiben unverändert.
  assert.deepEqual(stats.map((stat) => stat.key), expectedKeys);
  assert.deepEqual(stats.map(passiveStatFieldLabel), expectedKeys);

  // Die angezeigte Beschriftung ist immer das Kürzel, niemals ein Langname.
  for (const stat of stats) {
    assert.equal(passiveStatFieldLabel(stat), stat.key);
    assert.ok(
      !/\s/.test(passiveStatFieldLabel(stat)),
      `Langname als Feldbezeichnung: ${stat.label}`,
    );
  }
});

test('INT-000020: passive Boni werden validiert, in Erstellung und Chronik additiv angewandt', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'max-character-creator-bonus-'));
  try {
    const result = spawnSync(process.execPath, ['--import=tsx', 'src/bonus/passive-bonus-test-child.ts'], {
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
