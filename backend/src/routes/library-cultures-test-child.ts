import assert from 'node:assert/strict';
import {
  ERGEBNIS_ZUSATZ,
  MSG_MAX_STAERKEN,
  MSG_MAX_TALENTE,
  MSG_STAERKE_STUFE,
  msgEintragUnvollstaendig,
  msgSeiteLeer,
} from '@mcc/shared';

const [{ db }, { migrate }, { runMigration }, { seedIfNeeded }, { strengths }, { default: app }] = await Promise.all([
  import('../db/index'),
  import('drizzle-orm/libsql/migrator'),
  import('../db/migration'),
  import('../db/seed'),
  import('../db/schema'),
  import('../index'),
]);

const gruppenEintrag = (feld: string, id: string, name: string, wert: number) => ({ feld, id, name, wert });

async function postKultur(config: unknown, name: string): Promise<Response> {
  return app.request('/api/library/cultures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: null, config: JSON.stringify(config) }),
  });
}

async function messageOf(res: Response): Promise<string> {
  const body = await res.json() as { message?: string };
  return body.message ?? '';
}

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  await runMigration();
  await seedIfNeeded();

  // Synthetische Stärke mit Kosten 2 (R1: nur Kosten 1 erlaubt).
  await db.insert(strengths).values({
    id: 'synth-teuer',
    name: 'Synthetische Teuerstärke',
    description: 'Synthetischer Datensatz für die Kulturprüfung',
    config: JSON.stringify({ kosten: '2' }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const gueltig = {
    talente: [
      { id: 'athletik', name: 'Athletik', punkte: 2 },
      { id: 'akrobatik', name: 'Akrobatik', punkte: 1 },
    ],
    waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 1 }],
    magieSchulen: [{ id: 'bannmagie', name: 'Bannmagie', punkte: 1 }],
  };

  // AK1.3: Summe 5 wird gespeichert.
  const ok = await postKultur(gueltig, 'Synthetische Kultur Fünf Punkte');
  assert.equal(ok.status, 201, await ok.clone().text());
  const gespeichert = await ok.json() as { id: string };
  assert.ok(gespeichert.id);

  // AK1.3: Summe 6 wird abgelehnt.
  const zuViel = await postKultur({
    talente: [
      { id: 'athletik', name: 'Athletik', punkte: 3 },
      { id: 'akrobatik', name: 'Akrobatik', punkte: 2 },
      { id: 'heimlichkeit', name: 'Heimlichkeit', punkte: 1 },
    ],
  }, 'Synthetische Kultur Zu Viele Punkte');
  assert.equal(zuViel.status, 400);
  assert.equal(await messageOf(zuViel), MSG_MAX_TALENTE);

  // AK1.1: höchstens eine Stärke.
  const zweiStaerken = await postKultur({
    staerken: [
      { id: 'zaeh', name: 'Zäh', anzahl: 1 },
      { id: 'schnell', name: 'Schnell', anzahl: 1 },
    ],
  }, 'Synthetische Kultur Zwei Staerken');
  assert.equal(zweiStaerken.status, 400);
  assert.equal(await messageOf(zweiStaerken), MSG_MAX_STAERKEN);

  // AK1.2: Stufe (Anzahl) muss 1 sein.
  const stufeZwei = await postKultur({
    staerken: [{ id: 'zaeh', name: 'Zäh', anzahl: 2 }],
  }, 'Synthetische Kultur Stufe Zwei');
  assert.equal(stufeZwei.status, 400);
  assert.equal(await messageOf(stufeZwei), MSG_STAERKE_STUFE);

  // AK1.2: Kosten müssen 1 sein.
  const teuer = await postKultur({
    staerken: [{ id: 'synth-teuer', name: 'Synthetische Teuerstärke', anzahl: 1 }],
  }, 'Synthetische Kultur Teure Staerke');
  assert.equal(teuer.status, 400);
  assert.equal(await messageOf(teuer), MSG_STAERKE_STUFE);

  // AK1.4/AK1.6: gleichwertige Gruppe wird gespeichert.
  const gruppe = await postKultur({
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
  }, 'Synthetische Kultur Entweder Oder');
  assert.equal(gruppe.status, 201, await gruppe.clone().text());

  // AK1.5: ungleichwertige Gruppe wird abgelehnt.
  const ungleich = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1)],
        ],
      },
    ],
  }, 'Synthetische Kultur Ungleichwertig');
  assert.equal(ungleich.status, 400);
  assert.equal(await messageOf(ungleich), 'Ungleichwertig: Seite 1 = 2 Punkte, Seite 2 = 1 Punkte');

  // AK1.7: jedes wählbare Ergebnis muss R2 erfüllen.
  const kombination = await postKultur({
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
  }, 'Synthetische Kultur Ueber Fuenf');
  assert.equal(kombination.status, 400);
  assert.equal(await messageOf(kombination), MSG_MAX_TALENTE + ERGEBNIS_ZUSATZ);

  // AK1.7: jedes wählbare Ergebnis muss R1 erfüllen.
  const kombinationStaerken = await postKultur({
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
  }, 'Synthetische Kultur Zwei Staerken Ergebnis');
  assert.equal(kombinationStaerken.status, 400);
  assert.equal(await messageOf(kombinationStaerken), MSG_MAX_STAERKEN + ERGEBNIS_ZUSATZ);

  // Review-Fund 1: zugewiesene Stärken mit Anzahl 0 umgehen R1 nicht.
  const anzahlNull = await postKultur({
    staerken: [
      { id: 'zaeh', name: 'Zäh', anzahl: 0 },
      { id: 'schnell', name: 'Schnell', anzahl: 0 },
    ],
  }, 'Synthetische Kultur Anzahl Null');
  assert.equal(anzahlNull.status, 400, await anzahlNull.clone().text());
  assert.equal(await messageOf(anzahlNull), MSG_MAX_STAERKEN);

  const teuerNull = await postKultur({
    staerken: [{ id: 'synth-teuer', name: 'Synthetische Teuerstärke', anzahl: 0 }],
  }, 'Synthetische Kultur Teure Staerke Anzahl Null');
  assert.equal(teuerNull.status, 400, await teuerNull.clone().text());
  assert.equal(await messageOf(teuerNull), MSG_STAERKE_STUFE);

  // Review-Fund 3: jede Gruppenseite braucht mindestens einen konkreten Eintrag.
  const leereSeite = await postKultur({
    alternativen: [
      { typ: 'talent', seiten: [[gruppenEintrag('talente', 'athletik', 'Athletik', 2)], []] },
    ],
  }, 'Synthetische Kultur Leere Seite');
  assert.equal(leereSeite.status, 400, await leereSeite.clone().text());
  assert.equal(await messageOf(leereSeite), msgSeiteLeer(2));

  const ohneAuswahl = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [gruppenEintrag('talente', '', '', 2)],
        ],
      },
    ],
  }, 'Synthetische Kultur Ohne Auswahl');
  assert.equal(ohneAuswahl.status, 400, await ohneAuswahl.clone().text());
  assert.equal(await messageOf(ohneAuswahl), msgEintragUnvollstaendig(2));

  // Gleiche Summe 0 auf beiden Seiten ist trotz Gleichwertigkeit kein wählbares Ergebnis.
  const staerkenNull = await postKultur({
    alternativen: [
      {
        typ: 'staerke',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 0)],
          [gruppenEintrag('staerken', 'schnell', 'Schnell', 0)],
        ],
      },
    ],
  }, 'Synthetische Kultur Staerken Null');
  assert.equal(staerkenNull.status, 400, await staerkenNull.clone().text());
  assert.equal(await messageOf(staerkenNull), msgEintragUnvollstaendig(1));

  // PATCH: auch das Bearbeiten prüft die Regeln.
  const patchUngueltig = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({ talente: [{ id: 'handwerk', name: 'Handwerk', punkte: 6 }] }),
    }),
  });
  assert.equal(patchUngueltig.status, 400);
  assert.equal(await messageOf(patchUngueltig), MSG_MAX_TALENTE);

  const patchGueltig = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Synthetische Kultur Fünf Punkte', config: JSON.stringify(gueltig) }),
  });
  assert.equal(patchGueltig.status, 200, await patchGueltig.clone().text());

  // Nichts Regelwidriges wurde abgelegt.
  const liste = await (await app.request('/api/library/cultures')).json() as { name: string }[];
  const namen = liste.map(e => e.name);
  assert.ok(namen.includes('Synthetische Kultur Fünf Punkte'));
  assert.ok(!namen.includes('Synthetische Kultur Zu Viele Punkte'));
  assert.ok(!namen.includes('Synthetische Kultur Ungleichwertig'));
  assert.ok(!namen.includes('Synthetische Kultur Ueber Fuenf'));
  assert.ok(!namen.includes('Synthetische Kultur Anzahl Null'));
  assert.ok(!namen.includes('Synthetische Kultur Teure Staerke Anzahl Null'));
  assert.ok(!namen.includes('Synthetische Kultur Leere Seite'));
  assert.ok(!namen.includes('Synthetische Kultur Ohne Auswahl'));
  assert.ok(!namen.includes('Synthetische Kultur Staerken Null'));
} finally {
  db.$client.close();
}
