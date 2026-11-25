# Technische Dokumentation: Entweder/Oder-Wahl der Kulturalternativen

Ziel-Ticket INT-000016 (SF-000009): Im Schritt „Kultur" der Charaktererstellung wählt
man je Entweder/Oder-Gruppe genau eine der beiden gleichwertigen Seiten; der Charakter
erhält genau die Einträge der gewählten Seite.
Stand: 25.11.2026. Dokumentiert ist ausschließlich das implementierte und QA-geprüfte
Verhalten (PR #4, gemergt 25.11.2026; automatisierte Tests grün seit 25.11.2026
14:59 UTC; QA-Testfälle TC-KULT-ALT-01 bis TC-KULT-ALT-09 bestanden).
Datenmodell und Gruppen stammen aus dem Vorgänger INT-000015:
[`KULTUREDITOR-REGELN.md`](KULTUREDITOR-REGELN.md). Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md).

## Zweck und Geltungsbereich

| Regel | Umsetzung im Schritt „Kultur" |
|---|---|
| R1 | Für die gewählte Kultur werden alle Entweder/Oder-Gruppen angezeigt; je Gruppe stehen beide Seiten inkl. aller Einträge und Werte zur Auswahl (AK2.1). |
| R2 | Je Gruppe wird genau eine Seite gewählt; die Einträge der gewählten Seite werden dem Charakter zugewiesen, die der Alternativseite nicht (AK2.2). Mehrere Gruppen sind unabhängig wählbar (AK2.3). |
| R3 | Die Wahl ist wertneutral: Die Gleichwertigkeit ist beim Speichern der Kultur geprüft worden (R4 des Vorgängertickets); die Erstellung führt keine zusätzliche Werteberechnung durch. |
| R4 | Kulturen ohne Alternativgruppen verhalten sich unverändert: keine Auswahlelemente, keine neuen Pflichtfelder (AK2.5). |

Nicht im Umfang: Editor-Änderungen (Vorgängerticket INT-000015), Migration bestehender
Charaktere (Annahme A3: fertig erstellte Charaktere bleiben unverändert).

## Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/kulturWahl.ts` | Reine Funktionslogik der Wahl (siehe unten). |
| `frontend/src/components/creation/KulturSelectStep.tsx` | UI: Kulturkarten, Detailbereich mit Abschnitten, Entweder/Oder-Gruppen mit Seiten-Buttons, Wahlpflicht-Gating des „Weiter"-Buttons. |
| `shared/src/steps.ts` | `KulturDelta` mit neuem optionalem Feld `alternativWahl`. |
| `shared/src/reducers.ts` (`kulturReducer`) | Unverändert; weist die Einträge der wirksamen Config wie feste Einträge zu (AK2.4: keine zweite Zuweisungslogik). |
| `backend/src/cultures/kultur-wahl.test.ts` | Funktionale Tests (siehe „Prüfungen"). |

### Reine Funktionen (`shared/src/kulturWahl.ts`)

- `AlternativWahl = Partial<Record<number, 0 | 1>>` – gewählte Seite je Gruppenindex
  (0 = „Seite 1", 1 = „Seite 2"); Gruppen ohne Eintrag sind ungewählt.
- `leseAlternativWahl(wert)` – tolerantes Lesen aus Step-Daten: String-Schlüssel nach
  einem JSON-Round-Trip werden akzeptiert, unbekannte Schlüssel/Werte verworfen.
  Wirft nie – unlesbare Daten bedeuten „keine Wahl getroffen".
- `istWahlVollstaendig(regeln, wahl)` – Wahlpflicht (Annahme A1): jede Gruppe hat
  Seite 0 oder 1 gewählt; Kulturen ohne Gruppen sind ohne Wahl vollständig (AK2.5).
- `wirksameKulturConfig(config, wahl)` – materialisiert die Wahl in die Config:
  Die Einträge der gewählten Seiten werden als normale Abschnittseinträge
  (Speicherformat des Editors: `punkte` für Talente, `anzahl` für Stärken) hinter die
  festen Einträge geschrieben; `alternativen` entfällt; übrige Config-Felder (z. B.
  `gaengigFuer`) bleiben unverändert. Kultur ohne Gruppen: unveränderte, geparste
  Config. Unlesbare Config (defektes JSON): `null` – der Schritt speichert dann wie
  bisher `kulturConfig: null`.

### UI (`KulturSelectStep.tsx`)

- Gruppen werden mit `parseKulturRegeln` gelesen – dieselbe tolerante Parsung wie im
  Bibliotheks-Editor; nur sichtbar bei `alternativen.length > 0`.
- Je Gruppe ein `fieldset` mit zwei nativen Buttons („Seite 1"/„Seite 2"); die Buttons
  listen alle Einträge mit Werten, tragen `aria-pressed`, die ✓-Markierung und eine
  Akzent-Hervorhebung der gewählten Seite – per Tastatur (Tab/Leertaste/Eingabe)
  bedienbar (AK2.6).
- Kulturwechsel setzt die Wahl ohne Vorbelegung zurück; erneuter Klick auf die
  bereits gewählte Karte ist ein No-Op und erhält die getroffene Wahl.
- Beim erneuten Betreten des Schritts wird die Wahl aus dem Step-Delta
  (`alternativWahl`) wiederhergestellt.
- „Weiter" ist aktiv, sobald eine Kultur gewählt ist **und** `istWahlVollstaendig`
  gilt (`onValid(selectedId !== null && wahlVollstaendig)`).

## Datenfluss

1. `GET /api/library/cultures` liefert die Kulturen (Config als JSON-String); gefiltert
   wird nach `gaengigFuer` der im Schritt „Rasse" gewählten Rasse.
2. Wahl einer Seite: `seiteWaehlen` aktualisiert `wahl` und schreibt über
   `schreibeKulturDelta` das Step-Delta `kultur` mit
   `kulturConfig = wirksameKulturConfig(config, wahl)` und `alternativWahl = wahl`.
3. Der `kulturReducer` (innerhalb `recalculateStats`) liest die wirksame Config und
   weist die Einträge der gewählten Seiten über denselben Codepfad zu wie feste
   Einträge: Talentpunkte je gesetzter `id` (`punkte > 0`), höchstens eine Stärke über
   `gewaehrteStaerken` (`anzahl > 0`). Die Anzeige ab Schritt „5. Kindheit" und der
   Charakterbogen beruhen darauf.
4. Abschluss: `POST /api/characters` → `buildFinalCharacter` berechnet den Endzustand;
   `characters.state` speichert ihn als JSON, die Step-Deltas (inkl. `alternativWahl`)
   landen je Schritt in `characterSteps.delta`.

## Validierung

- **Kulturseitig (Bibliothek):** `validateKultur` beim Speichern (Backend
  `backend/src/routes/library.ts`): Limits R1/R2, Gleichwertigkeit R4,
  Ergebnis-Stabilität R5 – jede vollständige Seitenwahl ergibt eine gültige Kultur.
  Die Erstellung verlässt sich darauf und prüft keine Werte nach (R3).
- **Erstellungsseitig:** Nur die Vollständigkeit der Wahl (`istWahlVollstaendig`) als
  Gültigkeitsurteil des Schritts für den „Weiter"-Button.

## Fehlerverhalten

- Tolerantes Parsen wirft nie: Defekte Config → `wirksameKulturConfig` = `null`
  (Delta speichert `kulturConfig: null` wie bisher); defekte Wahl-Daten → `{}`.
- Unvollständige Wahl: Die wirksame Config gewährt keine Einträge ungewählter Gruppen;
  der „Weiter"-Button bleibt in diesem Zustand gesperrt (A1), der Schritt kann also
  nicht verlassen werden.
- Seitenwechsel ersetzt die Entscheidung je Gruppe – beide Seiten derselben Gruppe
  werden nie gleichzeitig zugewiesen (R2, QA TC-KULT-ALT-07).

## Persistenz

- Step-Delta `kultur`: `kulturId`, `kulturName`, `kulturDescription`, `kulturConfig`
  (wirksame Config) und `alternativWahl` (optional).
- `alternativWahl` ist optional und damit rückwärtskompatibel: Step-Deltas ohne das
  Feld bleiben lesbar („keine Wahl" ist nur bei Kulturen mit Gruppen relevant, und
  solche Kulturen blockieren den Schritt bis zur vollständigen Wahl).
- Bereits fertig erstellte Charaktere werden nicht verändert (Annahme A3).

## Sicherheitsgrenzen

- Keine neuen Endpunkte; die Wahl läuft über die bestehenden Bibliotheks- und
  Charakter-Routen.
- Die Gleichwertigkeit der Seiten wird serverseitig beim Speichern der Kultur erzwungen
  (`validateKultur` in `POST`/`PATCH /api/library/cultures`) – auch umgangene
  UI-Pfade können keine ungleichwertige Kultur ablegen.
- Tolerantes, niemals werfendes Parsing (`leseAlternativWahl`,
  `wirksameKulturConfig`) verhindert Crashes durch defekte oder manipulierte Daten;
  unbekannte Schlüssel/Werte werden verworfen statt angewendet.
- Keine Geheimnisse oder sensiblen Daten betroffen.

## Prüfungen

- Funktionale Tests: `backend/src/cultures/kultur-wahl.test.ts` – deckt TC-KULT-ALT-01
  bis -09 auf Funktionsebene ab, inkl. Reducer-Integration (AK2.2/AK2.4),
  Altbestandstoleranz (echte Arrays statt JSON-Strings), bereichsübergreifender Gruppen
  (K2b) und R5-Ergebnisstabilität.
- Projektprüfungen: `npm test`, `npm run typecheck --workspace=backend`,
  `npm run build --workspace=frontend` – grün (automatisierte Tests seit
  25.11.2026 14:59 UTC).
- Manuelle QA: TC-KULT-ALT-01 bis -09 am 25.11.2026 vollständig bestanden (Anzeige und
  Zuweisung beider Seiten inkl. Wechsel, zwei unabhängige Gruppen gleichzeitig, fester
  Eintrag zusätzlich zur Gruppe, Tastaturbedienbarkeit, Negativprüfungen „nur eine
  Seite je Gruppe" und „Weiter erst nach vollständiger Wahl").
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über die
  manuellen Testfälle.
