import assert from 'node:assert/strict';
import {
  ERGEBNIS_ZUSATZ,
  MSG_GRUPPE_GEMISCHT,
  MSG_GRUPPE_PUNKTE_UNGUELTIG,
  MSG_MAX_STAERKEN,
  MSG_MAX_TALENTE,
  MSG_PUNKTE_UNGUELTIG,
  MSG_STAERKE_STUFE,
  msgEintragUnvollstaendig,
  msgMehrfachZugeordnet,
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

  // K2c: gemischte Gruppe aus Stärke und Talent ist serverseitig unzulässig.
  const gemischt = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
          [gruppenEintrag('talente', 'athletik', 'Athletik', 1)],
        ],
      },
    ],
  }, 'Synthetische Kultur Gemischt');
  assert.equal(gemischt.status, 400, await gemischt.clone().text());
  assert.equal(await messageOf(gemischt), MSG_GRUPPE_GEMISCHT);

  // Review-Fund 3 (F3): negative bzw. nicht ganzzahlige Punkte umgehen R2/R5
  // nicht – auch nicht per direktem POST. Repro aus dem Review: −5 + 10 ergäbe 5.
  const negativ = await postKultur({
    talente: [
      { id: '', name: '', punkte: -5 },
      { id: 'athletik', name: 'Athletik', punkte: 10 },
    ],
  }, 'Synthetische Kultur Negativer Punkt');
  assert.equal(negativ.status, 400, await negativ.clone().text());
  assert.equal(await messageOf(negativ), MSG_PUNKTE_UNGUELTIG);

  // Nicht ganzzahlig, bereichsübergreifend (2,5 + 2,5 ergäbe 5).
  const bruchzahl = await postKultur({
    talente: [{ id: 'athletik', name: 'Athletik', punkte: 2.5 }],
    waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 2.5 }],
  }, 'Synthetische Kultur Halbzahl');
  assert.equal(bruchzahl.status, 400, await bruchzahl.clone().text());
  assert.equal(await messageOf(bruchzahl), MSG_PUNKTE_UNGUELTIG);

  // Als String übergeben, im dritten Bereich.
  const negativString = await postKultur({
    magieSchulen: [{ id: 'bannmagie', name: 'Bannmagie', punkte: '-1' }],
  }, 'Synthetische Kultur Negativer Punkt String');
  assert.equal(negativString.status, 400, await negativString.clone().text());
  assert.equal(await messageOf(negativString), MSG_PUNKTE_UNGUELTIG);

  // Basissumme in R5 bei einer Kultur mit Gruppe: −3 ließe sich mit jeder
  // noch so großen Gruppe kombinieren.
  const negativeBasis = await postKultur({
    talente: [{ id: 'handwerk', name: 'Handwerk', punkte: -3 }],
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
  }, 'Synthetische Kultur Negative Basis');
  assert.equal(negativeBasis.status, 400, await negativeBasis.clone().text());
  assert.equal(await messageOf(negativeBasis), MSG_PUNKTE_UNGUELTIG);

  // Unverändert zugelassen: ganze Zahlen ab 0 – auch der Wert 0.
  const nullPunkte = await postKultur({
    talente: [{ id: 'athletik', name: 'Athletik', punkte: 0 }],
  }, 'Synthetische Kultur Null Punkte');
  assert.equal(nullPunkte.status, 201, await nullPunkte.clone().text());

  // PO-Entscheidung G: Bruchwerte in einer Entweder/Oder-Gruppe („1,5 | 1,5") sind
  // per direktem POST unzulässig – obwohl beide Seiten gleich viel wert sind.
  const gruppeHalbzahlig = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 1.5)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1.5)],
        ],
      },
    ],
  }, 'Synthetische Kultur Gruppe Halbzahlig');
  assert.equal(gruppeHalbzahlig.status, 400, await gruppeHalbzahlig.clone().text());
  assert.equal(await messageOf(gruppeHalbzahlig), MSG_GRUPPE_PUNKTE_UNGUELTIG);

  // PO-Entscheidung H (R6): derselbe Eintrag zugleich in einer Gruppenseite und im Abschnitt.
  const doppelteZuordnung = await postKultur({
    talente: [{ id: 'akrobatik', name: 'Akrobatik', punkte: 1 }],
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
  }, 'Synthetische Kultur Doppelte Zuordnung');
  assert.equal(doppelteZuordnung.status, 400, await doppelteZuordnung.clone().text());
  assert.equal(await messageOf(doppelteZuordnung), msgMehrfachZugeordnet('Akrobatik'));

  // H: derselbe Eintrag in zwei Gruppen.
  const eintragInZweiGruppen = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'handwerk', 'Handwerk', 2)],
          [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 2)],
        ],
      },
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
  }, 'Synthetische Kultur Eintrag in Zwei Gruppen');
  assert.equal(eintragInZweiGruppen.status, 400, await eintragInZweiGruppen.clone().text());
  assert.equal(await messageOf(eintragInZweiGruppen), msgMehrfachZugeordnet('Akrobatik'));

  // Unverändert zulässig: dieselbe id auf den beiden Seiten derselben Gruppe
  // („Athletik 2 | Athletik 1 + Heimlichkeit 1") – der Eintrag gehört zu genau einer Gruppe.
  const beidseitig = await postKultur({
    alternativen: [
      {
        typ: 'talent',
        seiten: [
          [gruppenEintrag('talente', 'athletik', 'Athletik', 2)],
          [
            gruppenEintrag('talente', 'athletik', 'Athletik', 1),
            gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 1),
          ],
        ],
      },
    ],
  }, 'Synthetische Kultur Gleicher Eintrag Beidseitig');
  assert.equal(beidseitig.status, 201, await beidseitig.clone().text());

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

  // Review-Fund 1 über PATCH: Stärken mit Anzahl 0 umgehen R1 auch beim Bearbeiten nicht.
  const patchAnzahlNull = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        staerken: [
          { id: 'zaeh', name: 'Zäh', anzahl: 0 },
          { id: 'schnell', name: 'Schnell', anzahl: 0 },
        ],
      }),
    }),
  });
  assert.equal(patchAnzahlNull.status, 400);
  assert.equal(await messageOf(patchAnzahlNull), MSG_MAX_STAERKEN);

  const patchTeuerNull = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        staerken: [{ id: 'synth-teuer', name: 'Synthetische Teuerstärke', anzahl: 0 }],
      }),
    }),
  });
  assert.equal(patchTeuerNull.status, 400);
  assert.equal(await messageOf(patchTeuerNull), MSG_STAERKE_STUFE);

  const patchLeereSeite = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        alternativen: [
          { typ: 'talent', seiten: [[gruppenEintrag('talente', 'athletik', 'Athletik', 2)], []] },
        ],
      }),
    }),
  });
  assert.equal(patchLeereSeite.status, 400);
  assert.equal(await messageOf(patchLeereSeite), msgSeiteLeer(2));

  // Review-Fund 3 (F3) über PATCH: auch beim Bearbeiten werden negative bzw.
  // nicht ganzzahlige Punkte abgelehnt.
  const patchNegativ = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        talente: [
          { id: 'handwerk', name: 'Handwerk', punkte: -6 },
          { id: 'athletik', name: 'Athletik', punkte: 10 },
        ],
      }),
    }),
  });
  assert.equal(patchNegativ.status, 400);
  assert.equal(await messageOf(patchNegativ), MSG_PUNKTE_UNGUELTIG);

  const patchBruchzahl = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        waffenTalente: [{ id: 'klingenwaffen', name: 'Klingenwaffen', punkte: 1.5 }],
      }),
    }),
  });
  assert.equal(patchBruchzahl.status, 400);
  assert.equal(await messageOf(patchBruchzahl), MSG_PUNKTE_UNGUELTIG);

  // PO-Entscheidung G über PATCH: Bruchwerte in einer Gruppe werden auch beim
  // Bearbeiten abgelehnt (1,5 = 1 + 0,5 wäre gleichwertig).
  const patchGruppeHalbzahlig = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        alternativen: [
          {
            typ: 'talent',
            seiten: [
              [gruppenEintrag('talente', 'athletik', 'Athletik', 1.5)],
              [
                gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 1),
                gruppenEintrag('talente', 'heimlichkeit', 'Heimlichkeit', 0.5),
              ],
            ],
          },
        ],
      }),
    }),
  });
  assert.equal(patchGruppeHalbzahlig.status, 400);
  assert.equal(await messageOf(patchGruppeHalbzahlig), MSG_GRUPPE_PUNKTE_UNGUELTIG);

  // PO-Entscheidung H über PATCH: Eintrag zugleich in der Gruppe und im Abschnitt ...
  const patchDoppelteZuordnung = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        staerken: [{ id: 'schnell', name: 'Schnell', anzahl: 1 }],
        alternativen: [
          {
            typ: 'staerke',
            seiten: [
              [gruppenEintrag('staerken', 'zaeh', 'Zäh', 1)],
              [gruppenEintrag('staerken', 'schnell', 'Schnell', 1)],
            ],
          },
        ],
      }),
    }),
  });
  assert.equal(patchDoppelteZuordnung.status, 400);
  assert.equal(await messageOf(patchDoppelteZuordnung), msgMehrfachZugeordnet('Schnell'));

  // ... und derselbe Eintrag in zwei Gruppen.
  const patchEintragInZweiGruppen = await app.request(`/api/library/cultures/${gespeichert.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetische Kultur Fünf Punkte',
      config: JSON.stringify({
        alternativen: [
          {
            typ: 'talent',
            seiten: [
              [gruppenEintrag('talente', 'handwerk', 'Handwerk', 2)],
              [gruppenEintrag('talente', 'akrobatik', 'Akrobatik', 2)],
            ],
          },
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
      }),
    }),
  });
  assert.equal(patchEintragInZweiGruppen.status, 400);
  assert.equal(await messageOf(patchEintragInZweiGruppen), msgMehrfachZugeordnet('Akrobatik'));

  // Die abgelehnten PATCH-Aufrufe haben die gespeicherte Kultur nicht verändert.
  const nachPatch = await (await app.request(`/api/library/cultures/${gespeichert.id}`)).json() as { config: string };
  assert.equal(nachPatch.config, JSON.stringify(gueltig));

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
  assert.ok(!namen.includes('Synthetische Kultur Gemischt'));
  assert.ok(!namen.includes('Synthetische Kultur Negativer Punkt'));
  assert.ok(!namen.includes('Synthetische Kultur Halbzahl'));
  assert.ok(!namen.includes('Synthetische Kultur Negativer Punkt String'));
  assert.ok(!namen.includes('Synthetische Kultur Negative Basis'));
  assert.ok(!namen.includes('Synthetische Kultur Gruppe Halbzahlig'));
  assert.ok(!namen.includes('Synthetische Kultur Doppelte Zuordnung'));
  assert.ok(!namen.includes('Synthetische Kultur Eintrag in Zwei Gruppen'));
  // Ganze Zahl 0 bleibt zugelassen.
  assert.ok(namen.includes('Synthetische Kultur Null Punkte'));
  // Dieselbe id auf den beiden Seiten derselben Gruppe bleibt zugelassen (R6: eine Gruppe).
  assert.ok(namen.includes('Synthetische Kultur Gleicher Eintrag Beidseitig'));
} finally {
  db.$client.close();
}
