# Technische Dokumentation

Diese Datei bündelt die technische Dokumentation der Charaktererstellung von
„Max Character Creator" und beschreibt ausschließlich implementiertes und
geprüftes Verhalten. Anwendersicht: [`anwenderhandbuch.md`](anwenderhandbuch.md).
Kurzeinstieg: [`../README.md`](../README.md).

Inhalt:

- Entweder/Oder-Wahl der Kulturalternativen (INT-000016 / SF-000009)
- Testmodus „Zufällig ausfüllen" (INT-000018 / SF-000010)
- Geschwindigkeit (GES = GK + GE) als abgeleiteter Wert (INT-000019 / SF-000011)
- Passive Attribut-/Wert-Boni für Meisterschaften und Vorteile (INT-000020 / SF-000012)
- Bonus-Eingabefelder nur mit Kürzeln beschriften (INT-000021)
- Passive Boni bereits im Attribut-Schritt sichtbar (INT-000022)
- Mehrfach wählbare Vorteile und Meisterschaften (INT-000023 / SF-000014)
- Kostenabzug bei wiederholter Auswahl mehrfach wählbare Stärken im Creation-Punkteschritt (INT-000027 / SF-000014)
- 1-Punkt-Budget für Stärken in „5. Kindheit" (INT-000028 / SF-000014)

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

---

## Geschwindigkeit (GES = GK + GE) als abgeleiteter Wert (INT-000019 / SF-000011)

Ziel-Ticket INT-000019 (SF-000011): Charaktere erhalten den abgeleiteten Wert
„Geschwindigkeit" (GES) mit der verbindlichen Formel **GES = GK + GE** —
Größenklasse plus Modifikator des Attributs Gewandheit (GEW). Er wird in der
Charaktererstellung (Schritt „7. Attribute"), in der Chronik (Charakterbogen) und
in der Bibliothek (Tab „Abgeleitete Werte") angezeigt.
Stand: 27.11.2026. Dokumentiert ist ausschließlich das implementierte und
QA-geprüfte Verhalten (PR #11, gemergt 27.11.2026; automatisierte Tests grün seit
27.11.2026 09:33 UTC; QA-Testfälle TC-GES-01 bis TC-GES-08 bestanden).
Anwendersicht: [`anwenderhandbuch.md`](anwenderhandbuch.md).

Nicht im Umfang: eine manuell pflegbare GES-Eingabe, eine eigene Datenbankspalte
bzw. Datenmigration und Änderungen an bestehenden abgeleiteten Werten oder deren
Formeln.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Erstellung | Schritt „7. Attribute", Abschnitt „Abgeleitete Werte": Kachel „Geschwindigkeit" mit Formel „GK + GE" und berechnetem Wert. |
| Chronik | Charakterbogen, Abschnitt „Abgeleitete Werte": Eintrag „GES" mit dem Wert — auch für Bestandscharaktere. |
| Bibliothek | Tab „Abgeleitete Werte": Eintrag „Geschwindigkeit" mit der Formel „GK + GE" in der Zusammenfassungszeile. |
| Ableitung | GES = GK + GE-Modifikator; `GE` bedeutet den Modifikator von `GEW`, nicht den Rohwert. Rein abgeleitet, nicht manuell editierbar, aktualisiert sich automatisch bei Änderung von GK oder GE. |

Beispiele: Mensch (GK 3) mit GEW 18 (Modifikator +4) → GES 7; mit GEW 14 (+2) →
GES 5; Elf (GK 2) mit GEW 14 → GES 4. Der Modifikator folgt
`Math.floor((Wert − 10) / 2)` (18→+4, 14→+2, 12→+1, 10/11→0, 9/8→−1).
Die Formel wird dort angezeigt, wo auch die übrigen abgeleiteten Werte ihre
Formel zeigen (Erstellungskachel und Bibliothekszeile); der Charakterbogen zeigt
den Wert unter dem Kürzel „GES".

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/character.ts` | `geschwindigkeit(gk, gewandheit)` — zentrale Berechnung `GK + attributeModifier(GEW)`; `DerivedValues`-Interface und `ZERO_DERIVED` um `GES` ergänzt. Fehlt `gewandheit`, wird der Durchschnittswert 10 (Modifikator 0) angenommen. |
| `shared/src/attributes.ts` | `attributeModifier(value)` = `Math.floor((value − 10) / 2)` — dieselbe Modifikatorregel wie bei allen anderen Formeln. |
| `shared/src/formula.ts` | `evaluateFormula` wertet die Kachelformel „GK + GE" aus; `GE` ist über `ATTRIBUTE_ALIASES` auf `GEW` abgebildet. Fehlt der Wert, liefert sie `{ value: null, display: '—' }`. |
| `shared/src/reducers.ts` | `attributeReducer` setzt `derived.GES = geschwindigkeit(gk, attr.GEW)`; `buildFinalCharacter` übernimmt `derived` in den Endzustand. |
| `backend/src/routes/characters.ts` | `POST /api/characters` persistiert `derived` inkl. GES; `GET /api/characters/:id/state` berechnet `derived.GES` beim Lesen aus GK/GEW neu, ohne den gespeicherten Zustand zu verändern. |
| `backend/src/db/seed.ts` | `DERIVED_VALUE_SEED` mit „Geschwindigkeit" / „GK + GE"; `syncDerivedValues` ergänzt fehlende Einträge bei jedem Start. |
| `frontend/src/components/creation/AttributeStep.tsx` | Lädt `/api/library/derived-values`, zeigt die Kachel mit Name, Formel und Wert; reiner Anzeigetext ohne Eingabeelement. |
| `frontend/src/components/chronicle/CharacterSheet.tsx` | Gibt `derived` generisch im Abschnitt „Abgeleitete Werte" aus. |
| `backend/src/routes/characters-ges.test.ts`, `characters-ges-test-child.ts` | Automatisierte Prüfung von Seed, Formelbeispielen, Persistenz und Legacy-Fall (siehe „Prüfungen"). |

### Datenfluss

1. **Bibliothek/Seed:** `seedIfNeeded` ruft bei jedem Serverstart `syncDerivedValues`. Fehlt der Eintrag „Geschwindigkeit", wird er mit `config = {"formel":"GK + GE"}` und der Beschreibung „Bewegungsrate eines Charakters im Kampf" angelegt; vorhandene Einträge bleiben unberührt.
2. **Erstellung:** `AttributeStep` lädt die abgeleiteten Werte aus der Bibliothek und zeigt die Kachel „Geschwindigkeit" mit Formel „GK + GE". Die Größenklasse stammt aus dem Schritt „Rasse" (`groessenklasse`, sonst 3), `GE` aus dem Modifikator des zugeordneten GEW-Werts. `evaluateFormula` liefert z. B. 3 + 4 = 7. Ohne GEW-Zuordnung bleibt der Wert `null` und die Anzeige „—". Jede Änderung an GEW oder an der Rasse löst eine Neuberechnung aus — ohne Neuladen der Seite.
3. **Abschluss:** `POST /api/characters` → `buildFinalCharacter` → `attributeReducer` schreibt `derived.GES = geschwindigkeit(GK, GEW)` in den gespeicherten Zustand des Charakters.
4. **Chronik:** `GET /api/characters/:id/state` liest den Zustand und setzt `derived.GES` aus `groessenklasse` (bzw. `rasse.groessenklasse`, sonst 3) und `attribute.GEW` neu. Neue und Bestandscharaktere liefern damit denselben Wert; der gespeicherte Zustand wird nicht überschrieben. `CharacterSheet` stellt den Eintrag „GES" im Abschnitt „Abgeleitete Werte" dar.

### Validierung

- Es gibt keine eigene Eingabe- oder Grenzwertvalidierung für GES: der Wert ist ausschließlich aus GK und GEW abgeleitet und nirgends manuell setzbar.
- In der Erstellung gilt ein Wert nur als auswertbar, wenn GEW zugeordnet ist; andernfalls zeigt `evaluateFormula` den Platzhalter „—" statt einer Zahl (TC-GES-08).
- Die Bibliotheksdefinition wird nur ergänzt, nie überschrieben; die Formeln und Werte der übrigen abgeleiteten Werte bleiben unverändert (TC-GES-01, TC-GES-05).

### Fehlerverhalten

- **Ohne GEW in der Erstellung:** Die Kachel zeigt „—", weder „0" noch die Größenklasse allein. Ein im Werte-Pool liegender, aber nicht zugeordneter Wert zählt nicht als GEW (TC-GES-08).
- **Ohne GEW im gespeicherten Zustand:** `geschwindigkeit` fällt auf den Attributwert 10 (Modifikator 0) zurück, d. h. GES = GK; es entsteht kein Fehler und kein leerer Wert.
- **Unvollständige/defekte gespeicherte Daten:** `GET /api/characters/:id/state` prüft die Typen von `derived`, `groessenklasse` und `attribute.GEW`; fehlende oder falsche Typen führen zum Default (GK 3 bzw. `undefined`), nicht zu einem Absturz.
- **Manipulationsversuche:** Die Kachel und der Charakterbogen sind reiner Text ohne `textbox`, `spinbutton` oder `combobox`; Direkteingaben ändern den Wert nicht (TC-GES-07). Änderungen entstehen ausschließlich über GK oder GE.

### Persistenz

- **Neue Charaktere:** GES wird als Teil von `derived` im JSON-Zustand (`characters.state`) gespeichert (`buildFinalCharacter`).
- **Bestandscharaktere:** Kein gespeichertes GES, keine eigene Spalte, keine Datenmigration. Der Wert wird bei jedem Lesen über `/api/characters/:id/state` aus den vorhandenen Daten GK/GEW berechnet und nur in der Antwort ergänzt; der Datenbankzustand bleibt unverändert (automatisiert geprüft).
- **Bibliothek:** Der Eintrag liegt in `derived_values` mit `config.formel = "GK + GE"` und wird durch `syncDerivedValues` auch in bestehenden Datenbanken beim Serverstart nachgetragen.

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; GES wird über die bestehenden Bibliotheks- und Charakter-Routen ausgeliefert.
- Der Wert ist rein abgeleitet: Es gibt kein clientseitiges Setzen von `derived.GES` und keine editierbare UI-Fläche.
- Bestandsdaten werden nicht umgeschrieben; die Ergänzung erfolgt ausschließlich in der Leseantwort (keine destruktive Migration).
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/routes/characters-ges.test.ts` (in `backend/package.json` registriert und damit über `npm test` lauffähig): prüft den Seed und die Formel „GK + GE", die Beispiele 3+4=7, 3+2=5, 2+2=4 und 3+1=4, den Platzhalter „—" ohne GEW, die Persistenz (GES 7), den Legacy-Fall (GES 4 zur Laufzeit, übrige Werte unverändert, gespeicherter Zustand ohne GES) sowie die Unverändertheit von LP/VTD/INI und der Verteidigungsformel.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend` — grün (automatisierte Tests seit 27.11.2026 09:33 UTC).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über TC-GES-01 bis TC-GES-08 (Anzeige und Formel in Erstellung/Bibliothek, sofortige Aktualisierung bei GE/GK, Chronik neu und Bestand, Nicht-Editierbarkeit, Platzhalter). Alle Fälle am 27.11.2026 bestanden.

---

## Passive Attribut-/Wert-Boni für Meisterschaften und Vorteile (INT-000020 / SF-000012)

Ziel-Ticket INT-000020 (SF-000012): Meisterschaften sowie Vorteile/Stärken —
sowohl reguläre als auch rassenspezifische — können im Bibliotheksformular einen
passiven Bonus auf Attribute oder abgeleitete Werte definieren. Bei Wahl bzw.
Vergabe des Eintrags in der Charaktererstellung oder in der Chronik wird der
Bonus additiv angerechnet: auf Attribute direkt auf ihren Wert, auf abgeleitete
Werte nach deren regulärer Berechnung obendrauf. Die Anzeige dieser Boni bereits
im Attribut-Schritt der Erstellung beschreibt INT-000022 (siehe unten); die
Anrechnungslogik selbst bleibt unverändert. Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg:
[`../README.md`](../README.md).

Nicht im Umfang: neue Attribute oder abgeleitete Werte, Änderungen an bestehenden
Formeln, passive Boni per Dateiimport und eine nachträgliche Änderung bereits
fertig erstellter Charaktere.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Bibliothek | Im Erstellungs-/Bearbeitungsformular von Meisterschaften und Stärken/Vorteilen (Kategorie „Stärke" und „Rassenvorteil/-nachteil" mit Unterkategorie „Vorteil") aktiviert die Checkbox „Passiver Bonus" die Werte-Ansicht „Passive Boni". |
| Werte-Ansicht | Zehn Attribute (MUT, KLU, INT, CHA, HIN, MYS, FF, GEW, KON, KRA) und zehn abgeleitete Werte (Lebenspunkte/LP, Focus/FK, Spirit/SP, Verteidigung/VTD, Körperlicher Widerstand/KW, Geistiger Widerstand/GW, Schadensschwelle/SS, Initiative/INI, GK, Geschwindigkeit/GES), je mit einem Eingabefeld. Die Felder sind ausschließlich mit den Kürzeln beschriftet (INT-000021, siehe unten). |
| Eingabe | Nur ganze Zahlen (auch negative); ein leeres Feld oder 0 bedeutet keinen Bonus. |
| Erstellung | Bei Wahl der Stärke/des Vorteils, des Rassenvorteils oder der Meisterschaft werden die gespeicherten Boni einmalig auf den fertigen Charakter angewendet. |
| Chronik | Beim XP-Erlernen einer Stärke werden deren passive Boni auf den gespeicherten Zustand angewendet. |
| Meisterschaftswahl | Im Schritt „9. Meisterschaften" erhält jede Talent-, Kampf- oder Magie-Fertigkeit ab Wert 6, für die eine passende Pflicht-Meisterschaft (Schwelle 1) verfügbar ist, ein Auswahlfeld. |

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/passiveBonus.ts` | Zentrale Definition der 20 Stat-Keys, `isIntegerInput`/`sanitizeIntegerInput`, `readPassiveBonusConfig`, `buildBonusCatalog`, `collectPassiveBonuses` und `applyPassiveBonuses` — die einzige Stelle mit Lese-/Anwendungslogik, damit Bibliothek, Erstellung und Chronik dieselbe Semantik haben. `passiveStatFieldLabel()` liefert als Feldbezeichnung ausschließlich den Stat-Key (Kürzel). |
| `frontend/src/components/library/PassiveBonusFields.tsx` | Checkbox „Passiver Bonus" und Werte-Ansicht; `IntegerField` hält den Zwischenzustand „-" im Entwurf, sodass bestehende Werte negativ gemacht werden können. Verwendet `passiveStatFieldLabel()` für den `label`-Prop; `IntegerField` setzt ihn als sichtbares `<label>` und als `aria-label`. |
| `frontend/src/components/library/MasteriesView.tsx` | Schreibt bei aktivem Bonus `passive_bonus_aktiv` und `passive_bonus` in das Meisterschafts-`config`; liest die Werte beim „Bearbeiten" über `readPassiveBonusConfig` zurück. |
| `frontend/src/components/library/StrengthsView.tsx` | Dasselbe für Stärken und Rassenvorteile. |
| `shared/src/meisterschaftWahl.ts` | Zentrale Matching-Logik des Schritts „9. Meisterschaften" (`masteryMatchesSkill`, `MEISTERSCHAFTS_SKILL_SCHWELLE = 6`), inkl. grenzwertiger skill-basierter Voraussetzungen. |
| `frontend/src/components/creation/ZauberStep.tsx` | Bietet je qualifizierender Fertigkeit ein Auswahlfeld mit `aria-label` „Meisterschaft für {Fertigkeit}" an und schreibt die Wahl in das Step-Delta `Zauber`. |
| `shared/src/reducers.ts` | `attributeReducer` berechnet die abgeleiteten Werte aus den Rohattributen; `buildFinalCharacter` übernimmt sie in den Endzustand. |
| `backend/src/routes/characters.ts` | `POST /api/characters` und `POST /api/characters/:id/xp/spend` (Aktion `learn_strength`) wenden die Boni serverseitig an; `GET /api/characters/:id/state` liefert den gespeicherten Zustand. |
| `backend/src/routes/library.ts`, `backend/src/db/schema.ts` | Speicherung der Boni im bestehenden `config`-JSON der Tabellen `masteries` und `strengths`; keine neuen Spalten. |
| `backend/src/bonus/passive-bonus.test.ts`, `passive-bonus-test-child.ts`, `backend/src/meisterschaft/meisterschaft-wahl.test.ts` | Automatisierte Prüfungen (siehe „Prüfungen"). |

### Datenfluss

1. **Bibliothek:** Ist die Checkbox aktiv, speichert `buildConfig`/`handleSubmit` das `config` mit `passive_bonus_aktiv: 'true'` und `passive_bonus: { KEY: ganze Zahl }`. Nicht gesetzte Felder und der Wert 0 erscheinen nicht im Objekt. Beim „Bearbeiten" werden Aktivierung und Werte über `readPassiveBonusConfig` wieder in das Formular geladen.
2. **Katalog:** `loadBonusCatalog` baut aus allen `strengths`- und `masteries`-Zeilen einen Katalog mit Id- und Namensindex. `collectPassiveBonuses` summiert die Boni der Referenzen; Id- und Namensverweise auf denselben Eintrag zählen nur einmal (Deduplizierung über `nameById`).
3. **Erstellung:** `POST /api/characters` berechnet mit `buildFinalCharacter` den Rohzustand, sammelt die Boni der gewählten Stärken, Rassenvorteile und Meisterschaften und wendet sie mit `applyPassiveBonuses` an. Der verbonuste Endzustand wird in `characters.state` gespeichert; die Step-Deltas bleiben die Roheingaben.
4. **Chronik:** Bei `learn_strength` in `/api/characters/:id/xp/spend` wird der Katalog geladen, der Bonus des Ziels (Id, sonst normalisierter Name) gesammelt und auf den gespeicherten Zustand angewendet. Das erneute Lesen zeigt die erhöhten Werte.
5. **Meisterschaftswahl:** `ZauberStep` filtert Fertigkeiten mit `istMeisterschaftsRelevanteKategorie` und Wert ≥ 6 und bietet für jede Fertigkeit mit passendem `masteryMatchesSkill`-Pool ein Auswahlfeld an. Die Auswahl landet in `steps.Zauber.pflicht` und wird als `meisterschaften` in den Endzustand übernommen.
6. **Lesen:** `GET /api/characters/:id/state` gibt den gespeicherten (bereits verbonusten) Zustand zurück. `derived.GES` wird nur nachgeholt, wenn kein GES gespeichert ist (Bestandscharaktere); bei neuen Charakteren bleibt der bei der Erstellung berechnete Wert maßgeblich.

### Validierung

- **Eingabe:** `isIntegerInput` erlaubt nur optionale Minus-Zeichen und Ziffern; `sanitizeIntegerInput` und `toInteger` akzeptieren ausschließlich sichere ganze Zahlen. Dezimal- und sonstige Nicht-Ganzzahl-Eingaben werden verworfen; der Zwischenzustand „-" bleibt im Eingabefeld erhalten, wird aber nicht gespeichert.
- **Config:** `readPassiveBonusConfig` aktiviert Boni nur bei `passive_bonus_aktiv === true` bzw. `'true'`, übernimmt ausschließlich bekannte Stat-Keys und ganze Zahlen und ignoriert den Wert 0. Defekte oder unlesbare Configs werden tolerant als „kein Bonus" behandelt.
- **Katalog:** Nur aktive Einträge mit mindestens einem Wert fließen ein. Die Sammlung verhindert Doppelzählung bei Id- und Namensverweisen.
- **Anwendung:** `applyPassiveBonuses` klont `attribute` und `derived` vor dem Anwenden, prüft sichere ganze Zahlen und bekannte Keys und lässt die vom Request stammenden Step-Deltas unverändert. Ein Bonus auf `GK` wirkt zusätzlich auf `groessenklasse` und die daraus abgeleitete Geschwindigkeit.
- **Meisterschaftswahl:** Wählbar sind nur Meisterschaften mit Schwelle `'1'`. Skill-basierte Voraussetzungen (`skill >= wert` / `magie >= wert`) werden grenzwertig geprüft (`skillValue >= minWert`, Zuordnung über Skill-Id oder -Name). Andere Voraussetzungstypen blockieren die Auswahl; der Hinweistext „keine Fertigkeit erreicht den Wert" erscheint nur, wenn tatsächlich keine Schwellenfertigkeit vorhanden ist.

### Fehlerverhalten

- **Nicht-Ganzzahl-Eingaben:** Eine Dezimaleingabe wie „1,5" wird nicht als Dezimalbonus übernommen; gespeichert wird kein Dezimalwert. Ein bestehender positiver Wert lässt sich durch Markieren und Eingabe von „-" negativ machen, ohne dass das Minus durch den Wert-Reset verloren geht.
- **Defekte Daten:** Unlesbares `config` oder unbekannte/ungültige Werte führen zu „kein Bonus", nicht zu einem Fehler oder Absturz.
- **Inaktive oder leere Einträge:** Eintrag ohne Aktivierung oder ohne Werte bleibt wirkungslos; die übrigen Werte des Charakters sind unverändert.
- **Keine wählbare Meisterschaft:** Fehlt für eine Fertigkeit eine qualifizierende Meisterschaft, zeigt der Schritt einen zutreffenden Hinweis; „Weiter" bleibt nur gesperrt, solange eine Pflicht-Meisterschaft tatsächlich fehlt.
- **Konsistenz Erstellung/Chronik:** Ein GEW-Attributbonus erhöht den GEW-Wert, wirkt aber nicht erneut auf die bereits berechnete Geschwindigkeit; Erstellung und Chronik zeigen denselben GES-Wert. Ebenso verändert ein KON-Bonus die aus dem Rohwert berechneten Lebenspunkte nicht.

### Persistenz

- Es gibt keine neuen Datenbankspalten: Die Boni liegen im `config`-JSON der bestehenden Einträge in `masteries` und `strengths`.
- Die angewendeten Boni sind Teil des gespeicherten Endzustands in `characters.state`; zusätzlich hält der Zustand die Summe der angewandten Boni in `passiveBonusStats` fest.
- Die persistierten `character_steps.delta` enthalten die Roheingaben. `applyPassiveBonuses` mutiert diese Referenzen nicht, sodass eine spätere Neuberechnung nicht doppelt zählt.
- Bereits fertig erstellte Charaktere werden nicht nachträglich geändert; ein Bonus wirkt nur bei Wahl (Erstellung) oder XP-Vergabe (Chronik).

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; die Boni laufen über bestehende Bibliotheks- und Charakter-Routen.
- Die Anwendung erfolgt serverseitig beim Erstellen und bei der XP-Ausgabe. Clientseitig gibt es keine Möglichkeit, abgeleitete Werte oder Bonuswerte direkt zu setzen.
- Das Lesen der Config ist tolerant und whitelist-basiert (bekannte Stat-Keys, sichere ganze Zahlen); manipulierte oder defekte Configs können keine ungültigen Werte anwenden.
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/bonus/passive-bonus.test.ts` (mit `passive-bonus-test-child.ts`, isolierte SQLite-DB, in `backend/package.json` registriert): prüft Ganzzahl-Validierung und Config-Lesen, Deduplizierung von Id-/Namensverweisen, Nicht-Mutation der Eingabewerte, Bonusanwendung für Vorteil/Rassenvorteil/Meisterschaft in der Erstellung und bei Chronik-Vergabe, Bestehenbleiben des GES-Bonus beim Lesen, GEW/GES-Konsistenz sowie die Wirkungslosigkeit inaktiver Boni.
- `backend/src/meisterschaft/meisterschaft-wahl.test.ts`: prüft die Sichtbarkeits-/Schwellenlogik — Fertigkeit exakt auf Schwellenwert, formularerstellte Meisterschaft ohne Voraussetzung, skill-basierte Voraussetzungen, blockierende Voraussetzungstypen, Schwelle ungleich 1, Kampf-/Magie-Gruppenlogik inkl. Schuss-/Wurfwaffen-Ausnahme und Hilfsfunktionen.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend`.
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über manuelle Testfälle für Anlegen und Bearbeiten von Boni in Meisterschaften, Stärken und Rassenvorteilen, die Nur-Ganzzahl-Eingabe sowie die Anwendung in Erstellung und Chronik.

---

## Bonus-Eingabefelder nur mit Kürzeln beschriften (INT-000021)

Ziel-Ticket INT-000021: In der Bibliothek zeigt die Bonus-Ansicht („Passive Boni")
beim Erstellen und Bearbeiten von Meisterschaften und Vorteilen (regulär und
rassenspezifisch) die Eingabefelder ausschließlich mit den im System etablierten
Kürzeln beschriftet — nie mit den vollständigen Langnamen. Stand: 27.11.2026.
Dokumentiert ist ausschließlich das implementierte und QA-geprüfte Verhalten
(PR #16, gemergt 27.11.2026 22:14 UTC; automatisierte Tests grün seit
27.11.2026 22:13 UTC; QA-Testfälle INT21-TC-01 bis -08 bestanden). Baut auf
INT-000020 auf; die Bonilogik selbst ist unverändert. Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg:
[`../README.md`](../README.md).

Nicht im Umfang: neue oder geänderte Kürzel, Änderungen an Eingabe, Speicherung
oder Anrechnung der Boni sowie Änderungen an Anzeigen außerhalb der Bonus-Ansicht.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Bonus-Ansicht | Die 20 Eingabefelder der Gruppe „Passive Boni" tragen als sichtbare Beschriftung und als zugänglichen Namen ausschließlich das Kürzel: MUT, KLU, INT, CHA, HIN, MYS, FF, GEW, KON, KRA, LP, FK, SP, VTD, KW, GW, SS, INI, GK, GES. |
| Geltung | Meisterschaften sowie reguläre und rassenspezifische Vorteile/Stärken, jeweils im Erstellungs- und Bearbeitungsformular der Bibliothek (dieselbe geteilte Komponente). |
| Zuordnung | Jedes Kürzel steht bei demselben Wert wie zuvor; `key` bleibt zugleich der Schlüssel im `config`-JSON. |

Die Langnamen (z. B. „Lebenspunkte", „Körperlicher Widerstand", „Schadensschwelle")
bleiben in den Stat-Definitionen als `label` hinterlegt und erscheinen dort, wo
Werte mit Namen ausgewiesen werden (z. B. Bibliothek-Tab „Abgeleitete Werte");
sie sind nur nicht mehr Feldbezeichnung der Bonus-Eingabe.

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/passiveBonus.ts` | `passiveStatFieldLabel(stat)` gibt `stat.key` (das Kürzel) zurück; exportiert über `shared/src/index.ts`. Das `label` der Stat-Definitionen bleibt als Langname erhalten, wird aber für die Bonus-Felder nicht verwendet. |
| `frontend/src/components/library/PassiveBonusFields.tsx` | Nutzt `passiveStatFieldLabel()` für den `label`-Prop von `IntegerField`. Die geteilte Komponente wird von `MasteriesView` und `StrengthsView` für Meisterschaften sowie reguläre und rassenspezifische Vorteile verwendet. |
| `IntegerField` (in derselben Datei) | Setzt den übergebenen Wert sowohl als sichtbares `<label htmlFor>` als auch als `aria-label` des `<input>` — damit Langnamen weder als Beschriftung noch als zugänglicher Name auftreten. |

### Datenfluss

1. `PassiveBonusFields` iteriert über `[...PASSIVE_ATTRIBUTE_STATS, ...PASSIVE_DERIVED_STATS]` (20 Einträge in fester Reihenfolge) und berechnet je Stat `label = passiveStatFieldLabel(stat)` = `stat.key`.
2. Der Wert geht als `label` an `IntegerField`, der ihn in `<label>` und `aria-label` schreibt; die `id` bleibt `${idPrefix}-passive-${stat.key}`.
3. Die Eingabe läuft unverändert über `setValue(stat.key, …)` in das `werte`-Objekt; der gespeicherte Schlüssel ist weiterhin der Stat-Key, unabhängig von der Anzeige.

### Validierung

- Die Anzeige ändert keine Validierung: `isIntegerInput`, `sanitizeIntegerInput`, `readPassiveBonusConfig` und `applyPassiveBonuses` bleiben unverändert (Nur-Ganzzahl-Eingabe, Whitelist bekannter Keys, sichere ganze Zahlen).
- Die Beschriftung ist rein aus `stat.key` abgeleitet; es gibt keine separate pflegbare Label-Eingabe und keine neuen Kürzel.

### Fehlerverhalten

- Es gibt keine unbekannten oder manipulierbaren Labels: Die Liste stammt ausschließlich aus den 20 festen Stat-Definitionen. Defekte `config`-Werte werden wie zuvor tolerant als „kein Bonus" behandelt; die Anzeige bleibt eingabebereit, ohne Fehlermeldung.
- Leeres Feld, Wert 0 und Nicht-Ganzzahl-Eingaben verhalten sich unverändert (siehe Abschnitt „Passive Attribut-/Wert-Boni" oben).

### Persistenz

- Keine Änderung: Die Boni liegen weiter im `config`-JSON von `masteries`/`strengths`; gespeichert wird Stat-Key → ganze Zahl. Die Umstellung betrifft nur die Beschriftung, nicht das Format — bestehende Einträge und fertig erstellte Charaktere bleiben unverändert.

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; keine clientseitige Möglichkeit, Bonuswerte oder abgeleitete Werte direkt zu setzen.
- Die Anzeige verwendet ausschließlich fest definierte Kürzel ohne externe Daten; keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/bonus/passive-bonus.test.ts` (in `backend/package.json` registriert): prüft Reihenfolge und Kürzelliste der 20 Felder, die Whitespace-freie Beschriftung (`passiveStatFieldLabel(stat) === stat.key`) sowie, dass kein Langname als Feldbezeichnung erscheint.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend` — grün (automatisierte Tests seit 27.11.2026 22:13 UTC).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über INT21-TC-01 bis -08 (Erstellen und Bearbeiten von Meisterschaften sowie regulären und rassenspezifischen Vorteilen, Kürzel als zugänglicher Name und sichtbares Label, Negativprüfung auf Langnamen, Ganzzahl-Eingabe, Zuordnung/Persistenz). Alle Fälle am 27.11.2026 auf Commit `f987acf` bestanden.

---

## Passive Boni bereits im Attribut-Schritt sichtbar (INT-000022)

Ziel-Ticket INT-000022: Passive Boni aus Vorteilen/Stärken (regulär und
rassenspezifisch) und Meisterschaften, die zu diesem Zeitpunkt bereits
ausgewählt wurden, werden bereits im Schritt „7. Attribute" in den angezeigten
Attribut- und abgeleiteten Werten berücksichtigt — nicht erst im fertigen
Charakterbogen. Dadurch kann die Punkteverteilung in Kenntnis der tatsächlichen
Endwerte geplant werden. Stand: 27.11.2026. Baut fachlich auf INT-000020 auf;
Datenmodell, Bonus-Config und Anrechnungslogik bleiben unverändert. Dokumentiert
ist ausschließlich das implementierte und QA-geprüfte Verhalten (PR #18, gemergt
27.11.2026; automatisierte Tests grün seit 27.11.2026 22:38 UTC; QA-Testfälle
INT22-TC-01 bis -07 bestanden). Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg:
[`../README.md`](../README.md).

Nicht im Umfang: neue Bonusquellen oder -werte, eine Änderung der Anrechnung
und eine nachträgliche Veränderung bereits fertiger Charaktere. Bonusquellen,
die erst nach dem Attribut-Schritt gewählt werden (z. B. Meisterschaften in
„9. Meisterschaften"), können naturgemäß noch nicht in der Vorschau erscheinen;
sie werden bei ihrer Wahl wie gewohnt auf den Endzustand angerechnet.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Schritt „7. Attribute" | Angezeigte Attributwerte und abgeleitete Werte enthalten die passiven Boni aller bis dahin bereits ausgewählten Bonusquellen. |
| Attribute | Bonus additiv auf den angezeigten Attributwert (Grundwert + Bonus), z. B. KON 14 + 2 = 16. |
| Abgeleitete Werte | Bonus nach der regulären Berechnung obendrauf (konsistent mit INT-000020), z. B. Lebenspunkte 25 + 5 = 30. |
| Bonusquellen | Reguläre Stärken/Vorteile, über die Rasse gewährte Rassenvorteile und Meisterschaften, soweit sie in den Step-Deltas bereits vorhanden sind. |
| Konsistenz | Vorschau im Attribut-Schritt und fertiger Charakterbogen verwenden dieselbe Bonusermittlung und -anwendung; keine Abweichung. |
| Roheingaben | Werte-Pool, Slot-Zuordnung und `steps.attribute.attribute` bleiben unverändert; die Vorschau ist eine reine Anzeige. |

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/passiveBonus.ts` | Neu: `collectCreationPassiveBonuses(catalog, steps)` ermittelt die Bonusmenge über `buildFinalCharacter` und dieselbe Referenzauflösung wie beim Fertigstellen (Ids und Namen, inkl. Rassenvorteile und Meisterschaften, mit Deduplizierung). `previewStatsWithBonuses(stats, bonuses)` klont die Anzeigewerte und wendet `applyPassiveBonuses` unverändert an. `CreationPreviewStats` bündelt `attribute`, `derived` und `groessenklasse`. Exportiert über `shared/src/index.ts`. |
| `backend/src/routes/characters.ts` | Neuer read-only-Endpoint `POST /api/characters/preview-bonuses` liefert `{ bonuses }` aus den Step-Deltas; `bonusesForSteps(steps)` bündelt Katalog und Sammlung und wird auch von `POST /api/characters` verwendet — Vorschau und Fertigstellung teilen damit dieselbe Bonusermittlung. |
| `frontend/src/components/creation/AttributeStep.tsx` | Lädt die Boni beim Betreten des Schritts über `preview-bonuses`, berechnet die `preview` mit `previewStatsWithBonuses` aus Rohattributen und Kachelwerten und zeigt `preview.attribute` / `preview.derived` an. Der `bonusSourceKey` aus den Bonusquellen der Step-Deltas verhindert Refetches bei Attribut-Eingaben. |
| `backend/src/bonus/creation-preview.test.ts`, `creation-preview-test-child.ts` | Automatisierte Prüfung der Vorschau und ihrer Übereinstimmung mit dem fertigen Charakter (siehe „Prüfungen"). |

### Datenfluss

1. Beim Rendern von „7. Attribute" bildet `AttributeStep` den `bonusSourceKey` aus
   `rasse.statblock.vorteile`, `kultur.kulturConfig`, `kindheit.staerke`,
   `ausbildung.staerken`, `Hobbybedarf.staerken` und `Zauber.pflicht`. Änderungen
   an Werte-Pool oder Slot-Zuordnung verändern den Schlüssel nicht, sodass pro
   Attribut-Eingabe kein Refetch stattfindet.
2. `POST /api/characters/preview-bonuses` erhält `{ steps: stepDeltas }`. Das
   Backend lädt den Bibliothekskatalog aus `strengths` und `masteries`, ermittelt
   über `buildFinalCharacter('', steps)` die Referenzen (Ids und Namen,
   einschließlich Rassenvorteile und Meisterschaften) und liefert die summierte
   Bonusmenge. Der Endpoint schreibt nichts.
3. Das Frontend berechnet aus den zugeordneten Rohattributen die Modifikatoren
   und die Kachelwerte der abgeleiteten Werte aus den Bibliotheksformeln (z. B.
   „( GK + KON ) * 5"), bildet daraus `CreationPreviewStats` und ruft
   `previewStatsWithBonuses` auf. Diese Funktion klont `attribute` und `derived`
   und wendet `applyPassiveBonuses` an — dieselbe Funktion wie beim Fertigstellen
   des Charakters.
4. Anzeige: Bei zugeordneten Attributen zeigt der Block den verbonusten Wert
   (KON 16), bei abgeleiteten Werten wird der berechnete Kachelwert um den Bonus
   ersetzt (Lebenspunkte 30). Ohne Bonus bleibt die Anzeige unverändert.
5. Abschluss: `POST /api/characters` nutzt `bonusesForSteps(steps)` — exakt
   dieselbe Bonusermittlung — und wendet sie auf den Endzustand an. Daher
   stimmen Vorschau und Charakterbogen überein (INT22-TC-04, INT22-TC-07).

### Validierung

- Die Bonusmenge durchläuft `readPassiveBonusConfig` / `collectPassiveBonuses`:
  nur aktive Einträge mit Werten, Whitelist bekannter Stat-Keys, sichere ganze
  Zahlen und Deduplizierung von Id- und Namensverweisen. Ungültige oder
  inaktive Einträge liefern keinen Bonus (INT22-TC-03).
- `previewStatsWithBonuses` verändert die Eingabe nicht: `attribute` und
  `derived` werden geklont; die Step-Deltas behalten die Roheingaben, sodass eine
  spätere Neuberechnung nicht doppelt zählt.
- Die Anrechnung entspricht INT-000020: Attribute additiv, abgeleitete Werte
  nach regulärer Berechnung, GK-Sonderfall unverändert. Ein GEW-Attributbonus
  wirkt nicht erneut auf die bereits berechnete Geschwindigkeit, ein KON-Bonus
  nicht auf die Lebenspunkte (INT22-TC-05).

### Fehlerverhalten

- Schlägt der Fetch von `/api/characters/preview-bonuses` fehl, bleibt die
  Bonusmenge leer; `reportApiError('Passive Boni konnten nicht geladen werden')`
  meldet den Fehler, und die Anzeige zeigt die unveränderten Rohwerte — kein
  Absturz und kein erfundener Bonus.
- Fehlen Bonusquellen oder sind ihre Boni inaktiv beziehungsweise ungültig,
  zeigt der Attribut-Schritt dieselben Werte wie ohne Bonus (INT22-TC-03);
  keine Regression.
- Erst nach dem Attribut-Schritt gewählte Bonusquellen (z. B. Meisterschaften
  in Schritt 9) sind in der bereits durchlaufenen Vorschau nicht enthalten; der
  finale Charakter erhält ihren Bonus dennoch bei Wahl.

### Persistenz

- Die Vorschau ist read-only: `POST /api/characters/preview-bonuses` speichert
  nichts; es gibt keine neuen Datenbankspalten oder Step-Deltas.
- Die angezeigten verbonusten Werte werden nicht in `character_steps.delta`
  geschrieben. Dort bleiben Werte-Pool, Slot-Zuordnung und der Rohwert
  `steps.attribute.attribute` erhalten.
- Erst mit „Charakter fertigstellen" werden die Boni wie unter INT-000020
  beschrieben in `characters.state` (und `passiveBonusStats`) persistiert;
  bereits fertig erstellte Charaktere bleiben unverändert.

### Sicherheitsgrenzen

- Keine neuen Berechtigungswege: Der neue Endpoint ist read-only, nutzt die
  vorhandenen Bibliotheksdaten und liefert ausschließlich die Bonusmenge;
  Client-Eingaben (`steps`) werden über die bestehende Whitelist-Logik
  ausgewertet.
- Die Anzeige im Attribut-Schritt ist rein lesend; es gibt keine Eingabefläche
  für Bonuswerte und keine clientseitige Möglichkeit, abgeleitete Werte direkt
  zu setzen.
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/bonus/creation-preview.test.ts` (mit
  `creation-preview-test-child.ts`, isolierte SQLite-DB, in
  `backend/package.json` registriert): prüft den Vorschau-Endpoint und die
  Übereinstimmung von Vorschau und fertigem Charakter für KON +2 (TC-01/04),
  LP +5 (TC-02/07), den inaktiven Neutralfall (TC-03), GEW/GES (TC-05), den
  namensbasierten Rassenvorteil (TC-06), eine Meisterschaft sowie die
  Nicht-Mutation der Roheingaben.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend`
  und `npm run build --workspace=frontend` — grün (automatisierte Tests seit
  27.11.2026 22:38 UTC).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt
  über INT22-TC-01 bis -07 (Anzeige von Attribut- und abgeleiteten Boni im
  Attribut-Schritt, Negativfall ohne Bonus, Übereinstimmung mit dem Charakterbogen,
  GEW/GES, Rassenvorteil). Alle Fälle am 27.11.2026 auf dem QA-Commit bestanden.

---

## Mehrfach wählbare Vorteile und Meisterschaften (INT-000023 / SF-000014)

Ziel-Ticket INT-000023 (SF-000014): Vorteile/Stärken und Meisterschaften lassen
sich in der Bibliothek als mehrfach wählbar markieren und mit einer positiven
Obergrenze versehen. In Chronik und Charaktererstellung bleiben sie bis zu dieser
Grenze wiederholt zum regulären Preis erwerbbar; die Anzeige nutzt römische
Zählung statt doppelter Einträge, passive Boni werden je Auswahl summiert.
Stand: 28.11.2026. Dokumentiert ist ausschließlich das implementierte und
QA-geprüfte Verhalten (Rework-PR #21, gemergt 28.11.2026; automatisierte Tests
grün; manuelle QA MCC-001 bis MCC-010 bestanden). Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg:
[`../README.md`](../README.md).

Nicht im Umfang: neue Datenbankspalten oder Migration, Änderung der
Kosten-/Preislogik, nachträgliche Bearbeitung fertiger Charaktere und der
Dateiimport der Mehrfach-Konfiguration.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Bibliothek | Im Erstellungs-/Bearbeitungsformular von Stärken/Vorteilen und Meisterschaften aktiviert die Checkbox „mehrfach wählbar" das Textfeld „maximale Auswahl-Obergrenze". |
| Obergrenze | Nur ganze positive Zahlen (1, 2, 3, …); 0, negative, dezimale und Texteingaben werden abgewiesen. Ohne Checkbox bleibt das Feld verborgen und wirkungslos. |
| Chronik | „Neu erlernen: Stärke" bietet einen mehrfach wählbaren Eintrag bis zur Obergrenze erneut zum regulären Preis an; danach verschwindet er aus „— Ziel wählen —". |
| Creation | „5. Kindheit" (Stärken, zusätzlich auf das 1-Punkt-Budget begrenzt — INT-000028) und „9. Meisterschaften" (Meisterschaften) bieten den Eintrag bis zur Obergrenze erneut an; danach nicht mehr. |
| Darstellung | Wiederholte Auswahlen erscheinen als ein Eintrag mit römischem Suffix („Flink" → „Flink II"), nicht als mehrere gleichnamige Einträge. |
| Passive Boni | Pro Auswahl wird genau ein Bonus addiert („Flink" KON +1 → „Flink II" KON +2), ohne Id-/Namens-Doppelzählung. |
| Bestand/Regression | Einträge ohne „mehrfach wählbar" verhalten sich wie zuvor (nach einem Kauf nicht erneut wählbar); Altbestand mit nur `staerke` bleibt erhalten. |

Hinweis: In den Creation-Schritten mit Stärken-Punktbudget begrenzt zusätzlich das Punktbudget die wiederholte Auswahl — in „5. Kindheit" mit 1 Punkt (INT-000028), in „6. Ausbildung" mit 2 und in „8. Hobbybedarf" mit 3 Punkten (INT-000027); siehe die beiden Abschnitte unten.

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/mehrfachAuswahl.ts` | Zentrale Logik: `parsePositiveInteger`/`isPositiveIntegerInput` (Obergrenze), `readMehrfachConfig`/`istMehrfachWaehlbar`/`maxAuswahlVon` (Lesen), `validateMehrfachConfig` (Speicherprüfung), `zaehleAuswahlen`/`zaehleMeisterschaftAuswahlen`/`istMeisterschaftNochWaehlbar`/`filterVerfuegbareMeisterschaften` (Zählung und Verfügbarkeit), `toRoman`/`displayNameWithCount` (römische Anzeige). Über `shared/src/index.ts` exportiert. |
| `frontend/src/components/library/StrengthsView.tsx`, `MasteriesView.tsx` | Checkbox „mehrfach wählbar" und Textfeld „maximale Auswahl-Obergrenze" (Hinweis „Nur ganze positive Zahlen (1, 2, 3, …)."), Vorvalidierung mit `isPositiveIntegerInput`, Anzeige „mehrfach wählbar (max N)", Wiederherstellung beim „Bearbeiten". |
| `backend/src/routes/library.ts` | `mehrfachSpeicherFehler` ruft `validateMehrfachConfig` für POST und PATCH auf `/api/library/strengths` und `/api/library/masteries` auf; ungültige Konfiguration → HTTP 400. |
| `backend/src/routes/characters.ts` | `xp/spend` (`learn_strength`) liest `readMehrfachConfig`, zählt mit `zaehleAuswahlen` und sperrt je nach Flag entweder nach einem Kauf oder beim Erreichen von `max`; `collectPassiveBonusesForSelections` addiert den Bonus je neuem Kauf. |
| `frontend/src/components/chronicle/CharacterSheet.tsx` | Nutzt `readMehrfachConfig`, `zaehleAuswahlen` und `displayNameWithCount`: blendet Einträge nach Erreichen der Obergrenze aus und zeigt die zusammengefasste Bezeichnung. |
| `frontend/src/components/creation/ZauberStep.tsx` | Schritt „9. Meisterschaften": `poolForSkill`/`availablePool` auf Basis von `filterVerfuegbareMeisterschaften`; characterweite Obergrenze für mehrfach wählbare Meisterschaften, je Fertigkeit höchstens eine Auswahl für alle übrigen. `fillRandomly` prüft gegen den gefüllten Zwischenstand. |
| `backend/src/mehrfach/mehrfach-auswahl.test.ts`, `mehrfach-auswahl-test-child.ts` | Automatisierte Prüfung (isolierte SQLite-DB im Kindprozess), siehe „Prüfungen". |

### Datenfluss

1. **Bibliothek:** Ist die Checkbox aktiv, speichert `buildConfig`/`handleSubmit` im `config`-JSON `mehrfach_waehlbar: 'true'` und `max_auswahl: <Zeichenkette>`; ohne Checkbox werden beide Schlüssel nicht geschrieben. „Bearbeiten" liest Flag und Wert über `readMehrfachConfig` zurück. Die Liste zeigt „mehrfach wählbar (max N)".
2. **Speicherprüfung:** POST/PATCH der Tabellen `strengths` und `masteries` weisen eine gesetzte Checkbox ohne gültige positive Obergrenze mit HTTP 400 zurück; bei „mehrfach wählbar" muss die maximale Auswahl-Obergrenze eine positive ganze Zahl sein. Das Frontend meldet vorab „Maximale Auswahl-Obergrenze: bitte eine positive ganze Zahl eingeben (z. B. 3)." und lässt das Formular offen.
3. **Chronik:** `POST /api/characters/:id/xp/spend` mit `kind: 'learn_strength'` lädt die Bibliothekskonfiguration, zählt vorhandene Auswahlen (Id oder normalisierter Name) und erlaubt den Kauf zum regulären, unveränderten Preis (`kosten`), solange `anzahl < max` gilt. Bei jedem Kauf wird genau ein passiver Bonus auf den gespeicherten Zustand angewendet; der XP-Verlauf protokolliert jede Ausgabe einzeln.
4. **Creation Stärken:** In „5. Kindheit" bleibt die Stärke auswählbar, solange die Auswahlzahl unter `max` liegt (Anzeige „Auswahl n / N") **und** das Budget den regulären Preis deckt. Seit INT-000028 beträgt dieses Budget 1 Punkt, womit bei Kosten 1 trotz Obergrenze ≥ 2 nur eine Auswahl möglich ist; danach ist die Karte deaktiviert. Beim Abschluss übernimmt `buildFinalCharacter` alle Auswahlen (inkl. Altbestand-Fallback von `staerke`), und die Boni werden einmal pro Auswahl angewendet.
5. **Creation Meisterschaften:** In „9. Meisterschaften" filtert `filterVerfuegbareMeisterschaften` den Pool je Auswahlfeld. Für mehrfach wählbare Meisterschaften zählt `zaehleMeisterschaftAuswahlen` characterweit über alle Fertigkeiten — die Obergrenze gilt pro Eintrag, nicht pro Fertigkeit. Nach Erreichen der Obergrenze verschwindet die Option aus allen Auswahlfeldern und wird vom `onChange` (`pool.find`) nicht mehr akzeptiert. Alle übrigen Einträge behalten das je-Fertigkeit-Verhalten.
6. **Darstellung:** `displayNameWithCount` hängt ab der zweiten Auswahl das römische Suffix an (2 → II, 3 → III, …). Der Charakterbogen fasst wiederholte Auswahlen zu genau einem Eintrag zusammen; Vorschau und Bonusanrechnung verwenden dieselbe Zählsemantik.

### Validierung

- **Obergrenze:** `isPositiveIntegerInput` erlaubt nur `^[1-9]\d*$`; `parsePositiveInteger` akzeptiert ausschließlich sichere ganze Zahlen ≥ 1. `0`, negative und dezimale Werte sowie Text werden verworfen (`null`).
- **Konfiguration:** `readMehrfachConfig` ist tolerant (JSON-String oder Objekt, boolean oder `'true'`; unlesbare Werte → `flag:false`/`max:null`). `aktiv` ist nur wahr, wenn Checkbox **und** gültige positive Obergrenze vorliegen. `validateMehrfachConfig` verlangt bei gesetzter Checkbox eine gültige Obergrenze; ohne Checkbox bleibt der Wert der Obergrenze unerheblich.
- **Kauf (Chronik):** Nicht mehrfach wählbare Einträge werden nach dem ersten Kauf gesperrt; mehrfach wählbare beim Erreichen von `max` (Antwort „Maximale Auswahl-Obergrenze (N) erreicht"). Pro Kauf wird genau ein Bonus gezählt, Id- und Namensverweise auf denselben Eintrag zählen nicht doppelt.
- **Meisterschaften (Creation):** Die Obergrenze wird characterweit durchgesetzt; bereits getroffene Auswahlen für andere Fertigkeiten zählen mit. Verweise in Altbeständen mit Namen statt Id werden normalisiert mitgezählt.

### Fehlerverhalten

- **Ungültige Obergrenze:** Das Formular bleibt offen, zeigt den Alert „Maximale Auswahl-Obergrenze: bitte eine positive ganze Zahl eingeben (z. B. 3)." und speichert nichts. Eine umgangene UI wird serverseitig mit HTTP 400 abgewiesen.
- **Obergrenze erreicht:** Der Eintrag wird nicht mehr in der Auswahl angeboten (Chronik „— Ziel wählen —", Creation „Stärke wählen"/Meisterschafts-Comboboxen). Ein direkter Kaufversuch in der Chronik wird mit der Obergrenzen-Meldung abgelehnt.
- **Defekte/unlesbare Konfiguration:** Wird tolerant als „nicht mehrfach wählbar" behandelt; es entsteht kein Fehler und kein ungültiger Bonus.
- **Altbestand:** Einträge mit nur `staerke` (alte Step-Deltas) bleiben erhalten; nicht mehrfach wählbare Einträge verhalten sich unverändert. Namen statt Id werden normalisiert, sodass Bestandsauswahlen korrekt mitgezählt werden.
- **Mehrfachauswahl-Meisterschaft:** Der zuvor gemeldete Fall, dass „Meisterflink" nach zwei Auswahlen in Schritt 9 weiter angeboten und eine dritte Auswahl akzeptiert wurde, ist behoben (MCC-010).

### Persistenz

- Die Konfiguration liegt im bestehenden `config`-JSON der Tabellen `strengths` und `masteries`; keine neuen Spalten und keine Migration.
- Wiederholte Auswahlen werden als mehrere Verweise (Id oder Name) in den bestehenden Strukturen gespeichert (`state.staerken`, Step-Delta `kindheit.staerken` mit Altbestand-Fallback auf `staerke`, `steps.Zauber.pflicht` für Meisterschaften). Die Zusammenfassung zu „Flink II" ist eine Anzeige; die Rohauswahlen bleiben erhalten.
- Der XP-Verlauf in `characterXpLog` enthält pro Kauf einen eigenen Eintrag zum regulären Preis; die passiven Boni werden mit `characters.state` gespeichert.
- Bereits fertig erstellte Charaktere werden nicht nachträglich verändert; eine neue Konfiguration wirkt erst bei erneutem Kauf/Erlernen.

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; Bibliotheks- und Charakterrouten bleiben unverändert.
- Die Speicherprüfung `validateMehrfachConfig` läuft serverseitig für POST und PATCH, auch wenn das Frontend umgangen wird; nur sichere ganze Zahlen und bekannte Konfigurationsschlüssel werden übernommen.
- Die Filter-/Zähllogik ist rein clientseitig bzw. liegt in `@mcc/shared`; sie ändert keine Preise und führt keine privilegierten Operationen aus. Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/mehrfach/mehrfach-auswahl.test.ts` (mit Kindprozess und isolierter SQLite-DB, in `backend/package.json` registriert): prüft Nur-positive-Ganzzahl-Validierung und Config-Lesen, römische Zählung und Auswahlzählung, die characterweite Meisterschafts-Obergrenze (MCC-010) inkl. Altbestand/Namensverweise und Nicht-Mehrfach-Fälle sowie Bibliothek-/Chronik-/Erstellungs-Integration.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend` — grün.
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über die manuellen Testfälle MCC-001 bis MCC-010 (Konfiguration und ungültige Obergrenzen, Kauf bis Obergrenze in Chronik und Creation, römische Zählung, summierte Boni, Meisterschaftsobergrenze in Schritt 9) — am 28.11.2026 alle bestanden.

---

## Kostenabzug bei wiederholter Auswahl mehrfach wählbare Stärken im Creation-Punkteschritt (INT-000027 / SF-000014)

Ziel-Ticket INT-000027 (SF-000014): In Creation-Schritten mit einem Stärken-Punktbudget kostet auch die zweite und jede weitere Auswahl einer mehrfach wählbaren Stärke den in der Bibliothek konfigurierten regulären Preis. Punktbudget und maximale Auswahl-Obergrenze wirken gemeinsam als Begrenzung. Stand: 28.11.2026. Dokumentiert ist ausschließlich das implementierte und QA-geprüfte Verhalten (PR #23, gemergt 28.11.2026; automatisierte Tests grün seit 28.11.2026 08:27 UTC; manuelle QA MCC-027-01 bis -11 bestanden). Baut auf INT-000023 auf; Konfiguration, römische Zählung, summierte Boni und Chronik-Kauflogik bleiben unverändert. Anwendersicht: [`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg: [`../README.md`](../README.md).

Nicht im Umfang: neue Konfigurationsfelder oder Datenbankspalten, eine Änderung der Preise selbst und eine nachträgliche Änderung fertiger Charaktere. Der Kostenabzug in „5. Kindheit" mit 1 Punkt ist Gegenstand von INT-000028 (nächster Abschnitt); er verwendet dieselben geteilten Helper.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Punkteschritte | „6. Ausbildung" („Stärken-Punkte: 2") und „8. Hobbybedarf" („Stärken-Punkte: 3") rendern über `PointDistributionStep`; die Änderung wirkt damit generisch in beiden Schritten. |
| Kosten | Jede Auswahl — auch die zweite und jede weitere derselben mehrfach wählbaren Stärke — zieht den regulären Kostenwert vom verfügbaren Punktbudget ab. |
| Begrenzung | Eine weitere Auswahl wird nur angeboten und akzeptiert, wenn die Obergrenze noch nicht erreicht ist **und** das Restbudget für den Preis reicht. |
| Zähler | „Stärken-Punkte" sinkt nach jeder Auswahl um den Kostenwert; das Entfernen einer Auswahl erstattet ihn. |
| „5. Kindheit" | Zum Zeitpunkt von INT-000027 ohne Punktbudget; seit INT-000028 zeigt auch dieser Schritt „Stärken Punkte: 1" mit Kostenabzug, sodass bei Kosten 1 nur eine Auswahl möglich ist (MCC-028-01 bis -06). Die geteilten Helper bleiben identisch; der frühere Fall MCC-027-10 (zwei Auswahlen in Schritt 5) ist damit nicht mehr erreichbar. |
| Chronik / Boni | Chronik-XP-Käufe zum regulären Preis, römische Zählung („Flink II") und summierte passive Boni aus INT-000023 bleiben unverändert (MCC-027-11). |

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `shared/src/mehrfachAuswahl.ts` | Neu: `staerkenPunkteVerbrauch(auswahlen, kostenVon)` summiert den Preis über **alle** Auswahlen (Fallback 1 bei unbekanntem/ungültigem Wert), `zaehleStaerkenAuswahlen`, `maxAuswahlVonEintrag` (1 bei nicht mehrfach wählbar) und `istStaerkeNochWaehlbar(eintrag, auswahlen, verfuegbarePunkte)` — die gemeinsame Bedingung „Obergrenze **und** Budget". `StaerkenWahlEintrag` bündelt `id`, `kosten`, `mehrfach`, `max`. Über `shared/src/index.ts` exportiert. |
| `frontend/src/components/creation/PointDistributionStep.tsx` | Lädt Stärken inkl. `kosten`, `mehrfach`, `max`; berechnet `staerkenUsed` und `staerkenAvailable`; steuert Zähler, `onValid`, Button-Deaktivierung, `handleStaerke` und `fillRandomly`. |
| `frontend/src/components/creation/AusbildungStep.tsx`, `HobbybedarfStep.tsx` | Nutzen `PointDistributionStep` für „6. Ausbildung" bzw. „8. Hobbybedarf"; unverändert. |
| `backend/src/mehrfach/mehrfach-auswahl.test.ts` | Neue Unit-Tests der Helper-Logik (siehe „Prüfungen"). |

### Datenfluss

1. **Laden:** `PointDistributionStep` liest `/api/library/strengths` und übernimmt je Stärke `kosten` (aus `config`, Fallback 1), `mehrfach` und `max` aus `readMehrfachConfig`. `eligibleStaerken` enthält Stärken innerhalb der Kosten-Grenze; mehrfach wählbare mit erreichter Obergrenze fallen heraus.
2. **Verbrauch:** `staerkenUsed = staerkenPunkteVerbrauch(staerken, kostenVon)` zählt jeden Eintrag der Auswahlliste, also auch Wiederholungen derselben Stärke; `staerkenAvailable = staerkenPoints − staerkenUsed`. Der Zähler „Stärken-Punkte" zeigt `staerkenAvailable`; `onValid` verlangt `staerkenAvailable === 0` (neben Fertigkeits- und Ressourcenpunkten).
3. **Auswahl:** `handleStaerke` akzeptiert eine weitere Auswahl nur bei `istStaerkeNochWaehlbar` (Obergrenze nicht erreicht **und** `verfuegbarePunkte >= kosten`) und speichert die Id in `steps.<Schritt>.staerken`; nicht mehrfach wählbare Stärken bleiben per Toggle abwählbar.
4. **Anzeige/Sperre:** Der Stärken-Button ist deaktiviert, sobald `istStaerkeNochWaehlbar` false ist — also bei erreichter Obergrenze **oder** fehlendem Budget. Mehrfach gewählte Stärken erscheinen als ein Eintrag mit römischem Suffix („Flink II") und einer Schaltfläche zum Entfernen einer einzelnen Auswahl.
5. **Entfernen:** `removeOneStaerke` entfernt genau eine Auswahl; der Verbrauch wird neu berechnet und die Punkte werden erstattet (MCC-027-06).
6. **Zufällig ausfüllen:** `fillRandomly` erlaubt Wiederholungen bis zur Obergrenze, wählt mit `pickExactCostSubset` gegen das verbleibende Budget und hängt an bestehende Auswahlen an.

### Validierung

- `istStaerkeNochWaehlbar` verlangt gleichzeitig `zaehleStaerkenAuswahlen < maxAuswahlVonEintrag` und `verfuegbarePunkte >= kosten`. `maxAuswahlVonEintrag` liefert 1, wenn die Stärke nicht mehrfach wählbar ist.
- Kosten sind der konfigurierte Bibliothekswert; bei fehlenden, nicht finiten oder ungültigen Werten greift Fallback 1 (Altbestand). Nur `kosten > 0` zählt.
- `onValid` des Schritts bleibt unverändert: „Weiter" ist erst aktiv, wenn alle drei Budgets (Fertigkeiten, Ressourcen, Stärken) auf 0 sind.

### Fehlerverhalten

- **Budget aufgebraucht vor Obergrenze:** z. B. Obergrenze 3, Kosten 1, 2 Punkte → genau zwei Auswahlen, danach „Auswahl 2 / 3" und deaktivierter Button; kein „FlinkDrei III", keine Fehlermeldung (MCC-027-07).
- **Obergrenze erreicht vor Budget:** Obergrenze 2, Kosten 1, 3 Punkte → zwei Auswahlen, 1 Punkt verbleibend; die Stärke wird nicht mehr angeboten, der Restpunkt kann für eine andere Stärke ausgegeben werden (MCC-027-08).
- **Beide Grenzen erreicht:** Bei „Stärken-Punkte: 0" werden auch andere Stärken nicht angeboten (MCC-027-05).
- **Entfernen:** Jede Entfernung erstattet den Preis und macht die Option wieder verfügbar, solange Budget und Obergrenze es erlauben (MCC-027-06).
- **Regression:** Nicht mehrfach wählbare Stärken bleiben abwählbar (MCC-027-09); der frühere Fall MCC-027-10 (zwei Auswahlen einer Kosten-1-Stärke in „5. Kindheit") ist durch INT-000028 ersetzt — dort ist nur noch eine Auswahl möglich. Chronik-Käufe, römische Zählung und summierte Boni bleiben erhalten (MCC-027-11).

### Persistenz

- Keine neuen Datenbankspalten und keine Migration. Die wiederholten Auswahlen liegen als mehrere Ids im bestehenden Step-Delta `staerken` (bzw. `staerke`-Fallback in „5. Kindheit"); die Zusammenfassung zu „Flink II" ist eine Anzeige.
- Der Verbrauch wird nicht separat gespeichert, sondern bei jedem Render aus den Auswahlen und den Bibliothekskosten neu berechnet; `updateStepDelta` schreibt nur die Auswahlliste.
- Fertig erstellte Charaktere und der XP-Verlauf der Chronik werden nicht verändert.

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; die Bibliotheks- und Charakterrouten bleiben unverändert.
- Die Begrenzung ist reine Client-/`@mcc/shared`-Logik; sie ändert keine Preise serverseitig und führt keine privilegierten Operationen aus. Ungültige Kostenwerte fallen tolerant auf 1 zurück; es entsteht kein Fehler und kein negativer Verbrauch.
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/mehrfach/mehrfach-auswahl.test.ts` (in `backend/package.json` registriert): neue INT-000027-Tests — „jede Auswahl … kostet den regulären Preis" (2 Punkte/Kosten 1/Obergrenze 2 ⇒ genau zwei Auswahlen, danach 0; Fallback 1), „Punktbudget und Obergrenze wirken gemeinsam" (Budget blockiert vor Obergrenze, Obergrenze lässt 1 Punkt für eine andere Stärke) sowie „höherer Preis, Entfernen und nicht mehrfach wählbare Stärken bleiben unverändert".
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend` — grün (automatisierte Tests seit 28.11.2026 08:27 UTC).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über die manuellen Testfälle MCC-027-01 bis -11 (Konfiguration und Kosten in Bibliothek, Kostenabzug und Zähler in „6. Ausbildung" und „8. Hobbybedarf", Budget- und Obergrenzen-Grenzen, Entfernen/Erstattung, Nicht-Mehrfach-Regression, „5. Kindheit", Chronik) — am 28.11.2026 auf Commit `9b3c1ed` alle bestanden.

---

## 1-Punkt-Budget für Stärken in „5. Kindheit" (INT-000028 / SF-000014)

Ziel-Ticket INT-000028 (SF-000014): Der Creation-Schritt „5. Kindheit" erhält
für Stärken ein Punktbudget von genau 1 Punkt. Die Überschrift heißt jetzt
**„Stärken Punkte: 1"** (statt „Stärken gewählt"), und jede Auswahl — auch einer
mehrfach wählbaren Stärke — kostet ihren regulären Preis vom Budget. Bei Kosten 1
ist damit genau eine Auswahl möglich, selbst wenn die Obergrenze ≥ 2 wäre.
Stand: 28.11.2026. Dokumentiert ist ausschließlich das implementierte und
QA-geprüfte Verhalten (PR #25, gemergt 28.11.2026; automatisierte Tests grün seit
28.11.2026 12:15 UTC; manuelle QA MCC-028-01 bis -08 bestanden). Baut auf
INT-000027 auf und verwendet dessen geteilte Helper; die Punkteschritte
„6. Ausbildung" und „8. Hobbybedarf" bleiben unverändert. Anwendersicht:
[`anwenderhandbuch.md`](anwenderhandbuch.md). Kurzeinstieg:
[`../README.md`](../README.md).

Nicht im Umfang: Änderungen an Konfiguration, Preisen, römischer Zählung,
summierten Boni, Chronik-Kauflogik oder den Punkteschritten 6 und 8; keine
neuen Datenbankspalten und keine nachträgliche Änderung fertiger Charaktere.

### Zweck und Geltungsbereich

| Bereich | Verhalten |
|---|---|
| Schritt „5. Kindheit" | Zähler **„Stärken Punkte: N"** mit Startwert 1; der Text „Stärken gewählt" kommt nicht mehr vor. |
| Kosten | Jede Auswahl zieht den in der Bibliothek konfigurierten Kostenwert vom 1-Punkt-Budget ab (Fallback 1 bei unbekanntem Wert). |
| Begrenzung | Eine weitere Auswahl wird nur angeboten und akzeptiert, wenn Obergrenze **und** Restbudget den Preis zulassen. |
| Kosten 1 | Genau eine Auswahl — auch bei mehrfach wählbarer Stärke mit Obergrenze ≥ 2 und auch einer anderen Stärke. Danach „Stärken Punkte: 0" und keine weitere Auswahl. |
| Entfernen | Eine Auswahl lässt sich über „<Name> entfernen" zurücknehmen; der Punkt wird vollständig erstattet. |
| Fertigkeitspunkte | Der zweite Zähler „Fertigkeits-Punkte: 20" und die 20-Punkte-Verteilung bleiben unverändert. |
| Regression | „6. Ausbildung" (2 Punkte) und „8. Hobbybedarf" (3 Punkte), Chronik, römische Zählung („Flink II") und summierte Boni bleiben wie in INT-000023/INT-000027. |

### Komponenten

| Komponente | Aufgabe |
|---|---|
| `frontend/src/components/creation/KindheitStep.tsx` | `STAERKEN_PUNKTE = 1`; Zähler „Stärken Punkte: {staerkenAvailable}"; `eligibleStaerken` (Preis ≤ Budget), `staerkenVerbrauch`/`staerkenAvailable`, `handleStaerke`, `removeOneStaerke`, Button-Deaktivierung und `onValid`. Übernimmt zugänglichen Namen und Entfernen-Muster aus Schritt 6/8. |
| `shared/src/mehrfachAuswahl.ts` | Unverändert wiederverwendet: `staerkenPunkteVerbrauch`, `zaehleStaerkenAuswahlen`, `maxAuswahlVonEintrag`, `istStaerkeNochWaehlbar` (Obergrenze **und** Budget) sowie `displayNameWithCount`. |
| `backend/src/mehrfach/mehrfach-auswahl.test.ts` | Neuer automatisierter Test der 1-Punkt-Fälle (siehe „Prüfungen"). |

### Datenfluss

1. **Laden:** `KindheitStep` liest `/api/library/skills` und `/api/library/strengths`; je Stärke werden `kosten` (Fallback 1), `mehrfach` und `max` aus `readMehrfachConfig` übernommen. Wiederhergestellt werden gespeicherte `staerken` (bzw. Altbestand `staerke`).
2. **Verbrauch:** `staerkenAvailable = 1 − staerkenPunkteVerbrauch(staerken, kostenVon)`; der Zähler zeigt diesen Wert. Nur Stärken mit `kosten ≤ 1` sind überhaupt wählbar.
3. **Auswahl:** `handleStaerke` akzeptiert eine weitere Auswahl nur bei `istStaerkeNochWaehlbar` (Obergrenze nicht erreicht **und** `verfuegbarePunkte ≥ kosten`); nicht mehrfach wählbare Stärken bleiben per Toggle abwählbar.
4. **Anzeige/Sperre:** Ist das Budget aufgebraucht (oder die Obergrenze erreicht), ist die Karte deaktiviert und eine weitere Auswahl wird nicht akzeptiert. Mehrfach gewählte Stärken erscheinen als ein Eintrag mit römischem Suffix und „<Name> entfernen".
5. **Gültigkeit:** `onValid` verlangt `staerkenAvailable ≤ 0` **und** `availablePoints ≤ 0`; „Weiter" ist erst aktiv, wenn beide Budgets auf 0 sind.
6. **Entfernen:** `removeOneStaerke` entfernt genau eine Auswahl; der Verbrauch wird neu berechnet und der Punkt erstattet.

### Validierung

- `istStaerkeNochWaehlbar` verlangt gleichzeitig `zaehleStaerkenAuswahlen < maxAuswahlVonEintrag` und `verfuegbarePunkte ≥ kosten`. Bei einer Kosten-1-Stärke ist nach der ersten Auswahl `verfuegbarePunkte = 0`, damit ist die Bedingung für jede weitere Auswahl false.
- Kosten sind der konfigurierte Bibliothekswert; ungültige, nicht finite oder nicht positive Werte fallen auf 1 zurück. Es entsteht kein negativer Verbrauch.
- Die Bezeichnung „Stärken Punkte:" wird aus dem laufenden UI übernommen (Accessibility Tree), entsprechend dem Muster aus Schritt 6; es wird kein eigenes Etikett erfunden.

### Fehlerverhalten

- **Zweite Auswahl trotz Obergrenze:** Bei Obergrenze 2 und Kosten 1 bleibt die Karte nach der ersten Auswahl deaktiviert („Auswahl 1 / 2", „Stärken Punkte: 0"); „Auswahl 2 / 2" erscheint nicht und ein Klick wird nicht angenommen (MCC-028-03/-04). Wie in Schritt 6/8 bleibt die Karte als deaktivierter Button im DOM, ist aber nicht auswählbar.
- **Andere Stärke nach Verbrauch:** Auch andere Bibliotheksstärken sind bei „Stärken Punkte: 0" deaktiviert; es bleibt bei genau einer ausgewählten Stärke (MCC-028-05).
- **Entfernen:** „<Name> entfernen" gibt den Punkt vollständig zurück; die Karte wird erneut mit „Auswahl 0 / 2" angeboten (MCC-028-06).
- **Regression:** Schritt 6 zeigt weiter zwei, Schritt 8 drei Auswahlen zu je 1 Punkt inkl. „Flink II" (MCC-028-07/-08); Chronik-Käufe und Boni bleiben unverändert. Defekte Bibliotheksdaten werden wie zuvor über `reportApiError('Bibliotheksdaten konnten nicht geladen werden')` gemeldet.

### Persistenz

- Keine neuen Datenbankspalten und keine Migration. Das 1-Punkt-Budget wird nicht gespeichert, sondern bei jedem Render aus der Auswahlliste und den Bibliothekskosten neu berechnet.
- Das Step-Delta `kindheit` enthält weiterhin `skills`, `staerke` (Altbestand-Fallback) und `staerken` als Liste; `saveDelta` schreibt ausschließlich diese Auswahlliste.
- Fertig erstellte Charaktere und der XP-Verlauf der Chronik werden nicht verändert; die Zusammenfassung zu „Flink II" bleibt eine Anzeige.

### Sicherheitsgrenzen

- Keine neuen Endpunkte und keine neuen Berechtigungswege; die Bibliotheks- und Charakterrouten bleiben unverändert.
- Die Begrenzung ist reine Client-/`@mcc/shared`-Logik; sie ändert keine Preise serverseitig und führt keine privilegierten Operationen aus. Ungültige Kostenwerte fallen tolerant auf 1 zurück; es entsteht kein negativer Verbrauch.
- Keine Geheimnisse oder sensiblen Daten betroffen.

### Prüfungen

- `backend/src/mehrfach/mehrfach-auswahl.test.ts` (in `backend/package.json` registriert): neuer INT-000028-Test — 1 Punkt, Kosten 1, Obergrenze 2 ⇒ genau eine Auswahl; nach dieser ist `istStaerkeNochWaehlbar` für dieselbe **und** eine andere Stärke false; Entfernen gibt den Punkt zurück; eine nicht mehrfach wählbare Stärke verbraucht ebenfalls den einen Punkt.
- Projektprüfungen laut Profil: `npm test`, `npm run typecheck --workspace=backend` und `npm run build --workspace=frontend` — grün (automatisierte Tests seit 28.11.2026 12:15 UTC).
- Das Frontend besitzt keine Unit-Test-Infrastruktur; die UI-Abnahme erfolgt über die manuellen Testfälle MCC-028-01 bis -08 (Anzeige „Stärken Punkte: 1/0" ohne „Stärken gewählt", eine Auswahl bei Kosten 1 trotz Obergrenze 2, Ablehnung der zweiten Auswahl und anderer Stärken, Erstattung beim Entfernen, unveränderte Schritte 6 und 8) — am 28.11.2026 auf Commit `447f7a9a` alle bestanden.
