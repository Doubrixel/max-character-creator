import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

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
