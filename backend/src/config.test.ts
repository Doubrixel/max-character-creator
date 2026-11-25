import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import app from './index';
import { db } from './db';

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
