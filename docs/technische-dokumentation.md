# Technische Dokumentation

Diese Datei bündelt die technische Dokumentation der Charaktererstellung von
„Max Character Creator" und beschreibt ausschließlich implementiertes und
geprüftes Verhalten. Anwendersicht: [`anwenderhandbuch.md`](anwenderhandbuch.md).
Kurzeinstieg: [`../README.md`](../README.md).

Inhalt:

- Entweder/Oder-Wahl der Kulturalternativen (INT-000016 / SF-000009)
- Testmodus „Zufällig ausfüllen" (INT-000018 / SF-000010)

---

## Entweder/Oder-Wahl der Kulturalternativen (INT-000016 / SF-000009)

Ziel-Ticket INT-000016 (SF-000009): Im Schritt „Kultur" der Charaktererstellung wählt
man je Entweder/Oder-Gruppe genau eine der beiden gleichwertigen Seiten; der Charakter
erhält genau die Einträge der gewählten Seite.
Stand: 25.11.2026. Dokumentiert ist ausschließlich das implementierte und QA-geprüfte
Verhalten (PR #4, gemergt 25.11.2026; automatisierte Tests grün seit 25.11.2026
14:59 UTC; QA-Testfälle TC-KULT-ALT-01 bis TC-KULT-ALT-09 bestanden).
Datenmodell und Gruppen stammen aus dem Vorgänger INT-000015:
[`KULTUREDITOR-REGELN.md`](KULTUREDITOR-REGELN.md). Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md).

### Zweck und Geltungsbereich

| Regel | Umsetzung im Schritt „Kultur" |
|---|---|
| R1 | Für die gewählte Kultur werden alle Entweder/Oder-Gruppen angezeigt; je Gruppe stehen beide Seiten inkl. aller Einträge und Werte zur Auswahl (AK2.1). |
| R2 | Je Gruppe wird genau eine Seite gewählt; die Einträge der gewählten Seite werden dem Charakter zugewiesen, die der Alternativseite nicht (AK2.2). Mehrere Gruppen sind unabhängig wählbar (AK2.3). |
| R3 | Die Wahl ist wertneutral: Die Gleichwertigkeit ist beim Speichern der Kultur geprüft worden (R4 des Vorgängertickets); die Erstellung führt keine zusätzliche Werteberechnung durch. |
| R4 | Kulturen ohne Alternativgruppen verhalten sich unverändert: keine Auswahlelemente, keine neuen Pflichtfelder (AK2.5). |

Nicht im Umfang: Editor-Änderungen (Vorgängerticket INT-000015), Migration bestehender
Charaktere (Annahme A3: fertig erstellte Charaktere bleiben unverändert).

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/kulturWahl.ts` | Reine Funktionslogik der Wahl (siehe unten). |
| `frontend/src/components/creation/KulturSelectStep.tsx` | UI: Kulturkarten, Detailbereich mit Abschnitten, Entweder/Oder-Gruppen mit Seiten-Buttons, Wahlpflicht-Gating des „Weiter"-Buttons. |
| `shared/src/steps.ts` | `KulturDelta` mit neuem optionalem Feld `alternativWahl`. |
| `shared/src/reducers.ts` (`kulturReducer`) | Unverändert; weist die Einträge der wirksamen Config wie feste Einträge zu (AK2.4: keine zweite Zuweisungslogik). |
| `backend/src/cultures/kultur-wahl.test.ts` | Funktionale Tests (siehe „Prüfungen"). |

#### Reine Funktionen (`shared/src/kulturWahl.ts`)

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

#### UI (`KulturSelectStep.tsx`)

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

### Datenfluss

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

### Validierung

- **Kulturseitig (Bibliothek):** `validateKultur` beim Speichern (Backend
  `backend/src/routes/library.ts`): Limits R1/R2, Gleichwertigkeit R4,
  Ergebnis-Stabilität R5 – jede vollständige Seitenwahl ergibt eine gültige Kultur.
  Die Erstellung verlässt sich darauf und prüft keine Werte nach (R3).
- **Erstellungsseitig:** Nur die Vollständigkeit der Wahl (`istWahlVollstaendig`) als
  Gültigkeitsurteil des Schritts für den „Weiter"-Button.

### Fehlerverhalten

- Tolerantes Parsen wirft nie: Defekte Config → `wirksameKulturConfig` = `null`
  (Delta speichert `kulturConfig: null` wie bisher); defekte Wahl-Daten → `{}`.
- Unvollständige Wahl: Die wirksame Config gewährt keine Einträge ungewählter Gruppen;
  der „Weiter"-Button bleibt in diesem Zustand gesperrt (A1), der Schritt kann also
  nicht verlassen werden.
- Seitenwechsel ersetzt die Entscheidung je Gruppe – beide Seiten derselben Gruppe
  werden nie gleichzeitig zugewiesen (R2, QA TC-KULT-ALT-07).

### Persistenz

- Step-Delta `kultur`: `kulturId`, `kulturName`, `kulturDescription`, `kulturConfig`
  (wirksame Config) und `alternativWahl` (optional).
- `alternativWahl` ist optional und damit rückwärtskompatibel: Step-Deltas ohne das
  Feld bleiben lesbar („keine Wahl" ist nur bei Kulturen mit Gruppen relevant, und
  solche Kulturen blockieren den Schritt bis zur vollständigen Wahl).
- Bereits fertig erstellte Charaktere werden nicht verändert (Annahme A3).

### Sicherheitsgrenzen

- Keine neuen Endpunkte; die Wahl läuft über die bestehenden Bibliotheks- und
  Charakter-Routen.
- Die Gleichwertigkeit der Seiten wird serverseitig beim Speichern der Kultur erzwungen
  (`validateKultur` in `POST`/`PATCH /api/library/cultures`) – auch umgangene
  UI-Pfade können keine ungleichwertige Kultur ablegen.
- Tolerantes, niemals werfendes Parsing (`leseAlternativWahl`,
  `wirksameKulturConfig`) verhindert Crashes durch defekte oder manipulierte Daten;
  unbekannte Schlüssel/Werte werden verworfen statt angewendet.
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

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

---

## Testmodus „Zufällig ausfüllen" (INT-000018 / SF-000010)

Ziel: Das Durchklicken der Charaktererstellung für Tests beschleunigen. Auf jedem
Schritt des Wizards kann der Button „Zufällig ausfüllen" alle Felder **des aktuellen
Schritts** mit zufälligen, gültigen Werten (synthetische Daten) belegen, sodass nur
noch „Weiter" geklickt werden muss. Der Testmodus ist ausschließlich aktiv, wenn die
Umgebungsvariable `SYSTEM=TEST` im laufenden System gesetzt ist. Ohne die Variable
verhält sich die Anwendung unverändert; es gibt bewusst keinen clientseitigen Schalter.

Nicht im Umfang: Änderungen an Validierungsregeln, automatisches Durchlaufen aller
Schritte mit einem Klick, Persistenz von Testdaten über den normalen Flow hinaus,
weitere Test-Hilfsmittel über den Button hinaus.

### Gate und Datenfluss

1. Das Backend liest den Flag **serverseitig zum Request-Zeitpunkt** in
   `GET /api/config` (`backend/src/index.ts`): `{"testMode":true}` genau dann, wenn
   `process.env.SYSTEM === 'TEST'`. Abweichende Werte und eine fehlende Variable
   ergeben `{"testMode":false}`. Query-Parameter, Header und Client-Zustand können
   den Wert nicht beeinflussen.
2. `TestModeProvider` (`frontend/src/context/TestModeContext.tsx`) ruft `/api/config`
   einmal beim Start ab und setzt `testMode` ausschließlich aus der Antwort
   (`data.testMode === true`); bei Ladefehlern bleibt der Wert `false`. Der Flag ist
   Frontend-Status, aber nicht clientseitig umschaltbar.
3. `CreationView` rendert den Button nur bei `testMode` – in der Nav-Leiste links
   neben „Zurück", mit gestricheltem Rahmen und eigenem Tooltip, klar getrennt vom
   „Weiter"-Button. Der Klick ruft die in `stepFillRef` registrierte Füllfunktion des
   **aktuell sichtbaren** Schritts auf.
4. Jeder der zehn Schritte registriert seine Füllfunktion über `useStepFill`. Die
   Registrierung wird bei jedem Render aktualisiert, damit sie die aktuellen
   Komponenten-Werte und geladenen Bibliotheksdaten sieht; bei `testMode === false`
   bleibt sie wirkungslos (`stepFillRef.current = null`). Ist `ready === false`
   (Daten laden noch), wird ein Klick vorgemerkt und nach dem Laden nachgeholt.
5. Die Füllfunktion schreibt die Werte über `updateStepDelta` in die Step-Deltas –
   denselben Weg wie eine manuelle Eingabe. Die bestehende Schrittvalidierung
   (`onValid`) entscheidet unverändert, ob „Weiter" aktiv ist.

**Deployment des Gates:**

- Docker Compose reicht die Host-Variable als `SYSTEM=${SYSTEM:-}` an den Container
  weiter (`docker-compose.yml`); ohne Angabe bleibt sie leer → `testMode:false`.
- Native systemd-Installation: `ops/mcc-release-env.sh` schreibt die release-lokale
  `.release.env` ausschließlich aus der Aufruf-Umgebung – die Zeile `SYSTEM=TEST` nur
  beim exakten Wert `TEST` – mit Modus `0640` und `root:<APP_GROUP>`. Der Dienst liest
  die Datei per `EnvironmentFile` (`ops/systemd/max-character-creator.service`).
- Beim Re-Deploy desselben Commits verwendet `ops/deploy-commit.sh` die Aktion
  `refresh`: Sie schreibt `.release.env` neu und führt `systemctl restart` aus. Ein
  reines `start` wäre bei bereits aktivem Dienst ein No-op und ließe den alten Wert
  im laufenden Node-Prozess; erst der Neustart macht die geänderte Variable wirksam.
  Ein Timer-Update ohne `SYSTEM` entfernt die Zeile und setzt das Flag damit auch im
  laufenden Prozess zurück. Der Health-Check prüft zusätzlich `/api/config`.

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `backend/src/index.ts` | `GET /api/config` liefert `testMode` aus `process.env.SYSTEM === 'TEST'`; `/api/health` bleibt unverändert. |
| `frontend/src/context/TestModeContext.tsx` | `TestModeProvider` (Flag-Fetch), `useTestMode`, `useStepFill` (Registrierung der Füllfunktion des aktuellen Schritts inkl. `ready`/Pending-Logik). |
| `frontend/src/components/CreationView.tsx` | Button „Zufällig ausfüllen" nur bei `testMode`; ruft `stepFillRef.current()`; Navigation „Zurück"/„Weiter" unverändert. |
| `frontend/src/testmode/random.ts` | `pickRandom`, `shuffled`, `distributePoints` (Punkte exakt, mit Obergrenzen und Sicherheitsgrenze) und `pickExactCostSubset` (Stärken mit exakten Kosten, deterministischer Fallback). |
| `frontend/src/components/creation/*.tsx` | Je Schritt eine `fillRandomly`-Funktion via `useStepFill`; schreibt Step-Deltas wie manuelle Eingaben. |
| `backend/src/config.test.ts` | Automatisierte Prüfung von Gate, Client-Unschaltbarkeit, Compose-Weitergabe und Re-Deploy (Aktivieren/Zurücksetzen). |
| `docker-compose.yml`, `ops/mcc-release-env.sh`, `ops/deploy-commit.sh`, `ops/systemd/max-character-creator.service` | Weitergabe und Persistenz von `SYSTEM` sowie Neustart des Dienstes bei Änderung. |

### Zufallsfüllung je Schritt

Die Reihenfolge entspricht `STEP_ORDER` in `shared/src/steps.ts`. Jede Füllung setzt
ausschließlich den aktuellen Schritt; spätere Schritte bleiben ungesetzt, bis ihr
eigener Button betätigt wird.

| Schritt | Zufallsfüllung | Gültigkeitsurteil des Schritts |
|---|---|---|
| 1. Schicksal (`SchicksalStep`) | Zufällige Schicksalskarte. | Eine Karte gewählt. |
| 2. Rasse (`RasseStep`) | Zufällige geladene Rasse. | Eine Rasse gewählt. |
| 3. Abstammung (`AbstammungStep`) | Zufällige Klasse und Herkunft, alle Zeilen und nötigen Spezialisierungen; Magie-Spezialisierungen zeilenübergreifend eindeutig. Die Option „Magie" wird bewusst ausgelassen, damit der Zauber-Schritt keine fehlenden Einträge erzwingt. | Alle Zeilen entschieden, Spezialisierungen gesetzt, Magie eindeutig. |
| 4. Kultur (`KulturSelectStep`) | Zufällige, für die gewählte Rasse verfügbare Kultur; je Entweder/Oder-Gruppe zufällig genau eine Seite. | Kultur gewählt und alle Gruppen vollständig (bestehende Wahlpflicht). |
| 5. Kindheit (`KindheitStep`) | 20 Fertigkeitspunkte zufällig auf Fertigkeiten/Kampffertigkeiten (Magieschulen ausgelassen) und eine zulässige 1-Punkt-Stärke. | Punkte aufgebraucht, Stärke gewählt. |
| 6. Ausbildung (`AusbildungStep` / `PointDistributionStep`) | 30 Fertigkeitspunkte, 2 Stärken mit exakt zulässigen Kosten (≤ 2), 2 Ressourcenpunkte; Magieschulen ausgelassen. | Alle drei Zähler auf 0. |
| 7. Attribute (`AttributeStep`) | Neuer 4d6-Wurf (niedrigster Würfel entfällt) und Permutation der zehn Werte auf die zehn Attribute (eindeutige Slot-Zuordnung). | Alle Werte gesetzt und eindeutig zugeordnet. |
| 8. Hobbybedarf (`HobbybedarfStep` / `PointDistributionStep`) | 5 Talentpunkte, 3 Stärken mit exakt zulässigen Kosten (≤ 3), 1 Ressourcenpunkt; Magieschulen ausgelassen. | Alle drei Zähler auf 0. |
| 9. Meisterschaften (`ZauberStep`) | Für jede qualifizierende Fertigkeit (Wert ≥ 6) eine verfügbare Meisterschaft mit Schwelle 1; für jede Magieschule mit Wert ≥ 1 und jeden verfügbaren Grad einen verfügbaren, nicht doppelt verwendeten Zauber. | Alle Pflicht-Meisterschaften und Zaubergrade belegt. |
| 10. Name (`NameStep`) | Synthetischer Name aus festen Basen plus vierstelligem Zufallssuffix. | Namensfeld nicht leer. |

Magieschulen werden in den Punkteschritten bewusst nicht gefüllt: Andernfalls würde
der spätere Zauber-Schritt Zauberauswahlen erzwingen, für die die Bibliothek keine
passenden Einträge bereithält.

### Validierung

- Die Zufallsfüllung ersetzt keine Validierungsregel. Jede Füllung erfüllt das
  bestehende `onValid` ihres Schritts (siehe Tabelle); „Weiter" wird über genau
  diesen bestehenden Mechanismus aktiviert.
- Sind benötigte Bibliotheksdaten noch nicht geladen (`ready === false`), wird der
  Klick vorgemerkt und die Füllung nach dem Laden ausgeführt; eine Füllung mit
  unvollständigen Daten findet nicht statt.
- Die Füllung von Schritt 4 respektiert die Entweder/Oder-Wahlpflicht aus
  INT-000016: `wirksameKulturConfig` materialisiert die zufällig gewählten Seiten.

### Fehlerverhalten

- Ohne `SYSTEM=TEST` ist `stepFillRef.current` dauerhaft `null`; der Button existiert
  nicht, und es gibt kein Bedienelement, das den Testmodus clientseitig aktiviert.
- `/api/config` ist immer serverseitig: ein umgeleiteter oder manipulierter Request
  mit `?testMode=true` oder entsprechenden Headern ändert den Flag nicht; ein
  Fetch-Fehler führt zu `testMode:false`.
- Nach manueller Invalidierung eines Feldes greift die Bestandsvalidierung unverändert
  („Weiter" bleibt gesperrt); ein erneuter Klick auf „Zufällig ausfüllen" stellt die
  Gültigkeit des Schritts wieder her.
- Fehlen Bibliotheksdaten (z. B. keine passenden Stärken), bricht die jeweilige
  Füllfunktion ab, ohne ungültige Step-Deltas zu schreiben; der Pending-Mechanismus
  verarbeitet nur das Laden, nicht fehlende Daten.

### Persistenz

- Die Zufallswerte landen ausschließlich in den gewöhnlichen Step-Deltas und
  durchlaufen den normalen Flow. Beim Abschluss (`POST /api/characters`) werden sie
  wie manuell eingegebene Werte im Charakter gespeichert.
- Es gibt keine gesonderte Testmodus-Persistenz und keine eigenen Datenbankfelder;
  Datenmodell, Migrationen und `character_steps.delta` bleiben unverändert.
- Ohne Abschluss bleibt der Erstellvorgang mit den gesetzten Werten bestehen; ein
  Neustart der Erstellung setzt ihn wie bisher zurück.

### Sicherheitsgrenzen

- Der Gate ist serverseitig: `SYSTEM=TEST` wird beim Start bzw. zum Request-Zeitpunkt
  gelesen; der Flag enthält keine Geheimnisse und keine vertraulichen Daten.
- Keine neuen Endpunkte, keine neuen Berechtigungswege. `/api/config` liefert nur den
  booleschen Testmodus-Status; `/api/health` unverändert.
- Die `.release.env` wird mit `0640` und `root:<APP_GROUP>` geschrieben und vom
  Dienst als `EnvironmentFile` gelesen; sie enthält nur `APP_GIT_SHA` und optional
  `SYSTEM=TEST`.
- Ohne die Variable ist das Verhalten identisch zum Ist-Zustand (keine Regression).

### Prüfungen

- `backend/src/config.test.ts` prüft `TEST` → `true`, abweichenden Wert und fehlende
  Variable → `false`, die Unschaltbarkeit per Query/Header, die Weitergabe von
  `SYSTEM` in `docker-compose.yml` sowie den Re-Deploy desselben Commits mit
  Aktivierung, Zurücksetzen und tatsächlichem `systemctl restart`.
- Projektprüfungen laut Profil: `npm test` und
  `npm run typecheck --workspace=backend` (sowie `npm run build --workspace=frontend`).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die Bedienung des Buttons wird
  über manuelle QA-Fälle abgedeckt (Sichtbarkeit je Schritt, Zufälligkeit,
  Schrittisolierung, Kontrollinstanz ohne Variable, Bestandsvalidierung).
