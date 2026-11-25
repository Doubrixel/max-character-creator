import assert from 'node:assert/strict';
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
