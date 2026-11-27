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
Werte nach deren regulärer Berechnung obendrauf. Anwendersicht:
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
