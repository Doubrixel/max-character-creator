import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import app from './index';
import { db } from './db';

const releaseEnvHelper = new URL('../../ops/mcc-release-env.sh', import.meta.url);

/**
 * INT-000018: Das Testmodus-Flag folgt ausschließlich dem serverseitig
 * gelesenen Umgebungsstatus SYSTEM=TEST (kein clientseitiger Schalter).
 */
test('/api/config reports test mode only when SYSTEM=TEST is set', async () => {
  const original = process.env.SYSTEM;
  try {
    process.env.SYSTEM = 'TEST';
    const enabled = await app.request('/api/config');
    assert.equal(enabled.status, 200);
    assert.deepEqual(await enabled.json(), { testMode: true });

    process.env.SYSTEM = 'PRODUCTION';
    const otherValue = await app.request('/api/config');
    assert.deepEqual(await otherValue.json(), { testMode: false });

    delete process.env.SYSTEM;
    const missing = await app.request('/api/config');
    assert.deepEqual(await missing.json(), { testMode: false });
  } finally {
    if (original === undefined) delete process.env.SYSTEM;
    else process.env.SYSTEM = original;
    db.$client.close();
  }
});

/**
 * Der Testmodus darf nicht clientseitig umschaltbar sein: Query-Parameter
 * und Header müssen das serverseitige Flag unverändert lassen.
 */
test('/api/config cannot be switched from the client', async () => {
  const original = process.env.SYSTEM;
  try {
    delete process.env.SYSTEM;
    const responses = [
      await app.request('/api/config?testMode=true'),
      await app.request('/api/config?SYSTEM=TEST'),
      await app.request('/api/config', {
        headers: { 'X-SYSTEM': 'TEST', 'X-Test-Mode': 'true' },
      }),
    ];
    for (const response of responses) {
      assert.deepEqual(await response.json(), { testMode: false });
    }
  } finally {
    if (original === undefined) delete process.env.SYSTEM;
    else process.env.SYSTEM = original;
  }
});

/**
 * INT-000018: Der QA-Start (Compose mit SYSTEM=TEST) muss die Variable in den
 * Container reichen, sonst bleibt /api/config trotz korrektem Gate auf false.
 */
test('docker compose forwards SYSTEM into the app container', () => {
  const compose = readFileSync(new URL('../../docker-compose.yml', import.meta.url), 'utf8');
  assert.ok(
    compose.includes('SYSTEM=${SYSTEM:-}'),
    'docker-compose.yml must pass the SYSTEM variable through to the container',
  );
});

interface ReleaseEnvResult {
  envFile: string;
  systemctlCalls: string;
  status: number;
}

/**
 * Führt exakt den Helper aus, den auch ops/deploy-commit.sh verwendet. `systemctl`
 * wird durch ein Stub ersetzt, das seine Argumente protokolliert; so ist prüfbar,
 * ob ein Re-Deploy den Dienst tatsächlich neu startet.
 */
function runReleaseEnv(
  action: 'write' | 'refresh',
  commitSha: string,
  system: string | undefined,
): ReleaseEnvResult {
  const dir = mkdtempSync(join(tmpdir(), 'mcc-release-env-'));
  const fakeBin = join(dir, 'bin');
  mkdirSync(fakeBin);
  const log = join(dir, 'systemctl.log');
  const stub = join(fakeBin, 'systemctl');
  writeFileSync(stub, `#!/bin/sh\nprintf '%s\\n' "$*" >> "${log}"\n`, { mode: 0o755 });
  const envFile = join(dir, '.release.env');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
    APP_GROUP: 'root',
  };
  if (system === undefined) delete env.SYSTEM;
  else env.SYSTEM = system;

  const result = spawnSync(
    'sh',
    [
      fileURLToPath(releaseEnvHelper),
      action,
      envFile,
      commitSha,
      'max-character-creator.service',
    ],
    { env, encoding: 'utf8' },
  );
  return {
    envFile: readFileSync(envFile, 'utf8'),
    systemctlCalls: existsSync(log) ? readFileSync(log, 'utf8') : '',
    status: result.status ?? -1,
  };
}

/** Bildet den Zustand eines frisch aus .release.env gestarteten Prozesses ab. */
async function configForEnvFile(content: string): Promise<{ testMode: boolean }> {
  const original = process.env.SYSTEM;
  try {
    const systemLine = content.match(/^SYSTEM=(.*)$/m);
    if (systemLine) process.env.SYSTEM = systemLine[1];
    else delete process.env.SYSTEM;
    const response = await app.request('/api/config');
    return (await response.json()) as { testMode: boolean };
  } finally {
    if (original === undefined) delete process.env.SYSTEM;
    else process.env.SYSTEM = original;
  }
}

/**
 * INT-000018 (Review-Finding): Der native systemd-Pfad war bisher nicht
 * automatisiert getestet. Dieser Test simuliert den Re-Deploy desselben
 * Commits mit und ohne SYSTEM und prüft, dass .release.env und der daraus
 * gelesene /api/config-Wert Aktivierung und Zurücksetzen des Flags
 * widerspiegeln. Bei `refresh` muss außerdem wirklich neu gestartet werden.
 */
test('re-deploy of the same commit activates and resets the test-mode flag', async () => {
  const commitSha = 'a'.repeat(40); // synthetische Commit-Kennung

  // 1) QA aktiviert SYSTEM=TEST auf dem bereits deployten, laufenden Commit.
  const activated = runReleaseEnv('refresh', commitSha, 'TEST');
  assert.equal(activated.status, 0);
  assert.ok(activated.envFile.includes(`APP_GIT_SHA=${commitSha}`));
  assert.match(activated.envFile, /^SYSTEM=TEST$/m);
  assert.match(activated.systemctlCalls, /restart max-character-creator\.service/);
  assert.deepEqual(await configForEnvFile(activated.envFile), { testMode: true });

  // 2) Timer-Update ohne SYSTEM setzt das Flag auf demselben Commit zurück.
  const reset = runReleaseEnv('refresh', commitSha, undefined);
  assert.equal(reset.status, 0);
  assert.ok(reset.envFile.includes(`APP_GIT_SHA=${commitSha}`));
  assert.doesNotMatch(reset.envFile, /^SYSTEM=/m);
  assert.match(reset.systemctlCalls, /restart max-character-creator\.service/);
  assert.deepEqual(await configForEnvFile(reset.envFile), { testMode: false });

  // 3) Ein von TEST abweichender Wert aktiviert den Testmodus ebenfalls nicht.
  const otherValue = runReleaseEnv('write', commitSha, 'PRODUCTION');
  assert.equal(otherValue.status, 0);
  assert.doesNotMatch(otherValue.envFile, /^SYSTEM=/m);
  assert.deepEqual(await configForEnvFile(otherValue.envFile), { testMode: false });
});
