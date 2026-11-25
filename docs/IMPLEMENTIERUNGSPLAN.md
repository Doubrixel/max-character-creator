# Implementierungsplan

## Schritt 24: Review-Nacharbeit Kultureditor – Runde 6: Mangel-3-Standard für Abschnitte (Review-Fund 1 und 2) (2026-11-24)

### Ausgangslage (INT-000015, Review PR #2 Runde 5, 24.11. 18:39 UTC)
Der Review hat zwei blockierende Funde benannt (beide: „Anzeige im Schritt „Kultur" und Gewährung im Reducer laufen auseinander"):
- Fund 1 (HIGH): `gewaehrteStaerken` filterte nur `anzahl > 0` – eine Phantomzeile aus „+ Eintrag hinzufügen" (leere `id`/`name`, gesetzter Anzahl-Wert) zählte mit und verdrängte die tatsächlich zugewiesene Stärke (`.slice(0, MAX_STAERKEN)` nimmt die erste Zeile). Die Stärke der Kultur ging in der Anzeige verloren, während der Reducer sie weiterhin gewährt.
- Fund 2 (MEDIUM): Der Mangel-3-Maßstab („Eintrag braucht `id`/`name`") galt nur für Gruppenseiten, nicht für die Abschnitte – Kulturen, deren Talentpunkte auf Phantomzeilen lagen, waren speicherbar, gewährten aber nichts (das komplette 5-Punkte-Budget ging verloren).

### Implementierte Änderungen

**shared/src/cultures.ts**
- `istZugewiesenerEintrag(eintrag)`: vollständig zugewiesen ist eine Zeile mit gesetzter `id` UND `name` (Mangel-3-Standard für Abschnitte).
- `msgAbschnittEintragUnvollstaendig(feld)`: „Ungültiger Eintrag im Abschnitt {Talente/Waffentalente/Magieschulen/Stärken}: Eintrag mit Wert braucht eine Auswahl (Skill bzw. Stärke)." – klare, Ursache und Abschnitt benennende Meldung.
- `gewaehrteStaerken` (Fund 1): filtert jetzt `istZugewiesenerEintrag && anzahl > 0` – eine Phantomzeile verdrängt keine zugewiesene Stärke mehr; Anzeige (Schritt „Kultur") und Kultur-Rechnung (Reducer) zeigen dasselbe.
- `validateKultur` (Fund 2): Completeness-Prüfung je Abschnittseintrag – ein Eintrag mit Wert ≠ 0 braucht `id` und `name`. POST und PATCH `/api/library/cultures` lehnen solche Kulturen mit 400 und der Meldung ab; Platzhalterzeilen ohne Wert (Wert 0) bleiben zulässig (sie gewähren nichts und werden nirgends angezeigt).

**shared/src/kulturEditor.ts (Live-Prüfung = Speicherprüfung)**
- `staerkeAnzahlSetzen` und `talentPunkteSetzen`: Ein Wert > 0 auf einer Zeile ohne vollständige Auswahl wird live mit derselben Meldung wie beim Speichern blockiert und nicht übernommen. Wert 0 (Zurücksetzen, auch für Altbestand) bleibt möglich; die Zeile bleibt ohne Wert als Platzhalter stehen – der Editor bleibt ohne manuelles Zeilenlöschen speicherbar.

**frontend/src/components/creation/KulturSelectStep.tsx**
- `parseEntries` führt die `id` der Einträge mit und filtert auf demselben Mangel-3-Standard (`id` und `name`). Ohne die `id` hätte der neue `gewaehrteStaerken`-Filter auf dem Anzeige-Pfad jede Stärke ausgeblendet (die Map-Ergebnisse hatten keine `id`); jetzt fällt die Anzeige für alle Abschnitte dasselbe Urteil wie die Gewährung.

**shared/src/reducers.ts**
- Talent-Punkte der Kultur werden nur für vollständig zugewiesene Einträge (`id` und `name`) gewährt – Altbestands-Phantomzeilen (aus der Zeit vor der Prüfung, A3: kein Rewrite) vergeben keine Punkte an eine leere `id` mehr; Anzeige und Gewährung zeigen dasselbe.

### Ergänzte und angepasste Tests
- `backend/src/cultures/cultures.test.ts`: „gewaehrteStaerken: Anzahl 0 und Phantomzeilen gewähren nichts, höchstens eine Stärke je Kultur" (erweitert: Phantomzeile verdrängt keine Stärke; unvollständige Einträge ohne `name` bzw. ohne `id` gewähren nichts), „Kultur-Rechnung gewährt Phantomzeilen keine Punkte und keine Stärke (Review-Fund 1 und 2)", „Review Fund 2: Abschnittseinträge mit Wert brauchen eine vollständige Auswahl" (alle vier Abschnitte, Platzhalter mit Wert 0 zulässig, vollständige Einträge zulässig).
- `backend/src/cultures/kultur-editor.test.ts`: „UI-Pfad: Stärke wählen steht direkt auf Stufe 1 …" (Anzahl > 0 ohne Zuweisung wird live blockiert; Altbestands-Phantom mit Wert beim Speichern abgelehnt und live blockiert; auf 0 zurücksetzen räumt auf), neu „UI-Pfad Review-Fund 2: Punkte auf einer Zeile ohne Auswahl werden live blockiert" (Talente frisch und Altbestand, Stärken-Abschnitt), „UI-Pfad F1 …" (freie Zeile: R1-Limitmeldung bleibt aus, stattdessen gilt der Mangel-3-Standard).
- `backend/src/routes/library-cultures-test-child.ts`: POST mit Phantom-Punkten (talente, waffenTalente mit id ohne name) → 400; POST mit Phantom-Stärke neben zugewiesener Stärke (Fund 1 auf API-Ebene) → 400; POST mit Platzhalterzeile (Wert 0, keine Auswahl) → 201; PATCH mit Phantomzeilen (staerken, talente) → 400; alle abgelehnten Namen fehlen in der Liste, der Platzhalter steht darin.

### Verifikation (lokal, Arbeitsstand vor der Übergabe)
- `npm test`: 47 Tests grün, Exit-Code 0 ✓
- Mutations-Check: Completeness-Prüfung in `validateKultur` aus → 4 Tests rot (Fund-2-Unit, zwei UI-Pfade, Route); `gewaehrteStaerken` ohne Mangel-3-Filter → 2 rot (Fund-1-Unit, Kultur-Rechnung); Live-Blockaden in `kulturEditor.ts` aus → 3 rot (UI-Pfade); Reducer ohne Filter → 1 rot (Kultur-Rechnung Phantomzeilen).
- `npm run typecheck --workspace=backend`: Exit-Code 0 ✓
- `npm run build --workspace=frontend`: Exit-Code 0 ✓ (Chunk-Größen-Hinweis > 500 kB besteht unverändert)

### Nicht geändert – Beobachtungen (kein Umfang dieser Runde)
- `frontend/tsconfig.tsbuildinfo` (PO-Entscheidung I): nicht geändert; der Build lässt die Datei unverändert.
- Die Listenzusammenfassung im Bibliotheks-Tab filtert Stärken weiterhin auf `anzahl > 0 && name` – Phantomzeilen (ohne `name`) erscheinen dort nicht; die Speicherprüfung verhindert neu angelegte Kulturen mit Phantomzeilen ohnehin.

## Schritt 23: Review-Nacharbeit Kultureditor – Runde 5: ganze Zahlen in Gruppen (G), R6 erzwungen (H) (2026-11-24)

### Ausgangslage (INT-000015, PO-Wiedereinstieg 24.11. 17:28)
Runde 4 hatte F3 umgesetzt und zwei „Nicht geändert"-Punkte benannt. Der PO hat daraus zwei verbindliche Entscheidungen gemacht; Umfang dieser Runde ist ausschließlich G und H:
- G: Gruppeneinträge mit Bruchwert („1,5 | 1,5") waren speicherbar, weil R4 nur die Wertesummen vergleicht.
- H: R6 („ein Eintrag gehört höchstens einer Gruppe an") war nicht erzwungen – dieselbe id zugleich in Gruppe und Abschnitt oder in zwei Gruppen war per API speicherbar. Im Editor ist die Doppelzuordnung ebenfalls erreichbar: „Alternative hinzufügen" löst nur den eigenen Eintrag in die Gruppe; die Skill-Auswahl einer Seite listet alle Skills, auch die noch im Abschnitt oder in einer anderen Gruppe stehen.

### Implementierte Änderungen

**G – Werte in Entweder/Oder-Gruppen sind ganze Zahlen ab 1**
- `shared/src/cultures.ts`: `MSG_GRUPPE_PUNKTE_UNGUELTIG` („Ungültiger Punktwert in einer Entweder/Oder-Gruppe: Werte müssen ganze Zahlen ab 1 sein."). `pruefeGruppe` prüft nach der Struktur jeden Eintrag auf `Number.isInteger` – vor R1 (Stufe) und R4 (Gleichwertigkeit). 0 und negative Werte behalten ihre bisherige Meldung („Eintrag ohne Auswahl oder Wert").
- Wirkung: POST und PATCH `/api/library/cultures` mit Bruchwerten in einer Gruppe → 400, nichts gespeichert – auch für „1,5 | 1,5", „2 | 1,5", Stärken-Gruppen („Zäh 1,5 | Schnell 1,5") und als String übergebene Werte.
- Der Editor kann keine Bruchwerte erzeugen (`eingabeWert` liefert ganze Zahlen); Altbestand bzw. per API angelegte Daten mit Bruchwert zeigen die Live-Meldung an der Gruppe.

**H – R6 erzwungen: ein Eintrag gehört höchstens einer Gruppe an**
- `shared/src/cultures.ts`: `msgMehrfachZugeordnet(name)` („Ungültige Gruppe: Eintrag {Name} ist mehrfach zugeordnet (Abschnitt oder mehrere Gruppen).") und `pruefeMehrfachZuordnung(regeln, index)`. Abgelehnt wird eine Gruppe, deren Eintrag (gleiche `id`) zugleich in einem Abschnitt steht (Talente, Waffentalente, Magieschulen oder Stärken – unabhängig vom Wert des Abschnittseintrags, wie bei R1) oder in einer weiteren Gruppe. Dieselbe id auf den beiden Seiten derselben Gruppe bleibt zulässig („Athletik 2 | Athletik 1 + Heimlichkeit 1"): Der Eintrag gehört zu genau dieser einen Gruppe, je Gruppe ist genau eine Seite aktiv (R5).
- Neue Funktion `pruefeGruppeImKontext(regeln, index, kostenById)`: `pruefeGruppe` (Struktur → Wertformat → R1 → R4), danach die Zuordnung (R6). `validateKultur` fragt je Gruppe genau diese Funktion ab – Live- und Speicherprüfung liefern für eine Gruppe dieselbe Meldung.
- `frontend/.../CultureAlternatives.tsx`: Die Live-Meldung an der Gruppe (`role="alert"`) kommt aus `pruefeGruppeImKontext`. Dafür erhält die Komponente statt `alternativen` die ganze Kultur (`regeln`) – die Abschnitte braucht die Prüfung für R6. `LibraryTable.tsx` übergibt `parseKulturRegeln(configFields)`.
- Wirkung: Steht ein Eintrag zugleich im Abschnitt und in einer Gruppe oder in zwei Gruppen, zeigt die Gruppe die Meldung sofort (bei zwei betroffenen Gruppen beide); POST und PATCH → 400, nichts gespeichert.

### Angepasster Test
- `backend/src/cultures/cultures.test.ts` „Parser akzeptiert doppelt kodierte JSON-Strings wie echte Arrays": Das Fixture hielt „Athletik 2" und „Akrobatik 1" zugleich im Abschnitt und in der Gruppe – eine Doppelzuordnung, die H nun ablehnt. Der Abschnitt enthält jetzt „Handwerk 3" (Summe unverändert 3, TC-11-Konstellation); der Testzweck (tolerantes Parsen) ist unverändert.

### Ergänzte Tests
- `backend/src/cultures/cultures.test.ts`: „PO G: …" (Bruchwert gleich- und ungleichwertig, Stärken-Gruppe, String; 0/negativ unverändert; ganze Zahlen zulässig), „PO H (R6): Eintrag zugleich in einer Gruppenseite und im Abschnitt …", „PO H (R6): Eintrag in zwei Gruppen … – Live-Meldung an beiden Gruppen", „PO G/H: Reihenfolge der Meldungen …".
- `backend/src/cultures/kultur-editor.test.ts`: „UI-Pfad PO G/H: Live-Meldung an der Gruppe …" (Editor-Pfad in beiden Richtungen: Auswahl auf Seite 2, später neu gewählter Abschnittseintrag; `eingabeWert` erzeugt keine Bruchwerte).
- `backend/src/routes/library-cultures-test-child.ts`: POST (Bruchwert, Doppelzuordnung Abschnitt, zwei Gruppen) → 400 mit Meldung; PATCH (Bruchwert, Doppelzuordnung, zwei Gruppen) → 400; die gespeicherte Kultur ist unverändert, keines der Beispiele steht in der Liste; gleiche id auf beiden Seiten derselben Gruppe → 201.

### Verifikation (lokal, Arbeitsstand vor der Übergabe)
- `npm test`: 44 Tests grün, Exit-Code 0 ✓
- Mutations-Check: ohne die G-Prüfung sind 4 Tests rot (Unit G, Reihenfolge, UI-Pfad, Route); ohne die H-Prüfung ebenfalls 4 (Unit H ×2, UI-Pfad, Route).
- `npm run typecheck --workspace=backend`: Exit-Code 0 ✓
- `npm run build --workspace=frontend`: Exit-Code 0 ✓ (Chunk-Größen-Hinweis > 500 kB besteht unverändert)

### Nicht geändert – Beobachtungen (kein Umfang dieser Runde)
- Dieselbe id zweimal auf derselben Seite einer Gruppe („… | Athletik 1 + Athletik 1") ist weder „Abschnitt und Gruppe" noch „zwei Gruppen" und bleibt speicherbar; die Seite ist im Folgeticket auflösbar.
- Doppelte Abschnittseinträge ohne Gruppen („Athletik 2, Athletik 1" im selben Abschnitt) sind unverändert zugelassen – bestehendes Verhalten, nicht Teil von R6.
- `frontend/tsconfig.tsbuildinfo` (PO-Entscheidung I): nicht geändert; der Build lässt die Datei unverändert (vorher/nachher identische Prüfsumme).

## Schritt 22: Review-Nacharbeit Kultureditor – Runde 4: Punkte als ganze Zahlen ab 0 (F3), UI-Test „Anzahl" (F1) (2026-11-24)

### Ausgangslage (INT-000015, PO-Wiedereinstieg 24.11. 17:07 nach dem Review 24.11. 17:00)
Das Review listet zehn Funde (F1–F10). Im Arbeitsstand (Schritte 19–21) sind F1, F2, F4 und F5 umgesetzt; F3 war offen. Die im Ticket gespeicherte Kopie des Reviewtextes bricht mitten in F5 ab – F6 bis F10 waren beim Umsetzen dieser Runde nicht lesbar (Rückfrage an den PO offen).

### Implementierte Änderungen

**F3 – negative bzw. nicht ganzzahlige Punkte umgingen R2/R5 über direktes POST/PATCH**
- `shared/src/cultures.ts`: `istGueltigerPunktwert(wert)` (ganze Zahl ab 0) und `MSG_PUNKTE_UNGUELTIG` („Ungültiger Punktwert: Punkte müssen ganze Zahlen ab 0 sein (Talente, Waffentalente und Magieschulen).").
- `validateKultur` prüft nach R1 jeden Abschnittseintrag der drei Talentbereiche – unabhängig von `id` und `name`. Prüfreihenfolge: R1 Anzahl der Stärken → R1 je Stärken-Eintrag → Punkte ganze Zahlen ab 0 → je Gruppe (R3/K2c/R1/R4) → R5 über alle Ergebnisse.
- Wirkung: POST und PATCH `/api/library/cultures` mit negativen oder nicht ganzzahligen Punkten antworten mit 400 und der Meldung, es wird nichts gespeichert – auch für die Basissumme von R5 bei Kulturen mit Gruppen (Review-Repro: −5 + 10 ergäbe 5). Ganze Zahlen ab 0 (einschließlich 0) bleiben unverändert zugelassen, die Summe 5 weiterhin zulässig.
- Der Editor kann solche Werte nicht erzeugen (`eingabeWert`); die Prüfung schließt den direkten API-Weg.

**F1 – Test für den UI-Pfad „Anzahl setzen"**
- Die Korrektur stand bereits aus Schritt 21 (`staerkeAnzahlSetzen` nutzt dieselbe Abschnittsprüfung wie das Wählen). Ergänzt ist der Test zum Review-Repro: Altbestand „Zäh" Anzahl 1 + „Schnell" Anzahl 0, bei „Schnell" Anzahl 1 eintragen → live „Maximal eine Stärke pro Kultur.", der Wert wird nicht übernommen.

### Ergänzte Tests
- `backend/src/cultures/cultures.test.ts` („Review F3 …"): Review-Repro, alle drei Bereiche, String-Werte, nicht ganzzahlig trotz passender Summe, Basissumme in R5, unverändert zulässige Werte, Wertprüfung selbst.
- `backend/src/cultures/kultur-editor.test.ts` („UI-Pfad F1 …").
- `backend/src/routes/library-cultures-test-child.ts`: POST (negativ, halbzahlig bereichsübergreifend, als String, negative Basis bei einer Gruppe) → 400; PATCH (negativ, halbzahlig) → 400; die gespeicherte Kultur ist unverändert, keines der regelwidrigen Beispiele steht in der Liste; eine Kultur mit 0 Punkten wird gespeichert (201).

### Verifikation (lokal, Arbeitsstand vor der Übergabe)
- `npm test`: 39 Tests grün, Exit-Code 0 ✓
- Mutations-Check: ohne die F3-Prüfung sind genau die beiden F3-Tests rot (Unit: `null` statt der Meldung; Route: `201 !== 400`).
- `npm run typecheck --workspace=backend`: Exit-Code 0 ✓
- `npm run build --workspace=frontend`: Exit-Code 0 ✓ (Chunk-Größen-Hinweis > 500 kB besteht unverändert)

### Nicht geändert – Beobachtungen (nicht Teil der lesbaren Review-Liste, Rückfrage offen)
- Gruppeneinträge mit positiver, nicht ganzzahliger Wertangabe (z. B. „1,5 | 1,5") bestehen die Speicherprüfung; negative Gruppeneinträge werden bereits abgelehnt („Eintrag ohne Auswahl oder Wert").
- R6 („ein Eintrag gehört höchstens einer Gruppe an") ist nicht erzwungen: derselbe Talent-Eintrag in Gruppe und Abschnitt oder in zwei Gruppen ist speicherbar (im Editor nicht anlegbar, nur per API).

## Schritt 21: Review-Nacharbeit Kultureditor – Runde 3: UI-Pfad testbar, Live-Meldung an der Gruppe (2026-11-24)

### Ausgangslage (INT-000015, PO-Wiedereinstieg 24.11. 14:42 mit Verifikations-Gate)
Die Review-Mängel 1–3 waren im Arbeitsstand behoben. Offen waren zwei Punkte aus dem PO-Umfang: Der UI-Pfad der Abschnitte (Fundort des HIGH-Befunds: Stärke wählen/Anzahl setzen in `LibraryTable.tsx`) war nur über die von den Handlern aufgerufenen Prüffunktionen getestet – die Handler selbst nicht –, und für unvollständige Gruppenseiten (MEDIUM 3) gab es nur die Speicherprüfung, keine Live-Prüfung im Editor. Zusätzlich war kein belegtes Ergebnis der Projektprüfungen vorhanden.

### Implementierte Änderungen

**1) UI-Pfad des Kultureditors als reine Editor-Schritte – `shared/src/kulturEditor.ts` (neu)**
- `staerkeWaehlen`, `staerkeAnzahlSetzen`, `talentPunkteSetzen`, `alternativeAnlegen`: reine Funktionen über den Configfeldern des Editors; jeder Schritt liefert `{ felder, fehler }` (neue Felder und die sichtbare Meldung). Die Live-Logik ist damit ohne Browser testbar.
- `pruefeStaerkenAbschnitt(liste, selbstIdx)` (aus `cultures.ts` hierher gewandert) zählt über den Zeilenindex: jede andere Zeile mit gesetzter `id` ist eine zugewiesene Stärke – unabhängig vom Anzahl-Wert. Auch die bereits zugewiesene Stärke ein zweites Mal (neue Zeile) wird live mit „Maximal eine Stärke pro Kultur." blockiert.
- `frontend/.../LibraryTable.tsx`: `setzeStaerke`, `setzeAnzahl`, `setzeTalentPunkte` und `alternativeHinzufuegen` sind nur noch Aufrufe der Editor-Schritte (`anwenden`); die Regellogik liegt nicht mehr in der Komponente.
- Unverändert gilt: Eine gewählte Stärke steht direkt auf Stufe 1; Anzahl ≠ 1 (auch 0) und Kosten ≠ 1 werden live, beim Speichern und serverseitig abgelehnt; `KulturSelectStep`/Reducer gewähren höchstens eine Stärke (`gewaehrteStaerken`); „Gruppe entfernen" stellt nur Seite 1 wieder her (`entferneGruppe`).

**2) Live-Meldung direkt an der Entweder/Oder-Gruppe (MEDIUM 3: Live- und Speicherprüfung)**
- `shared/src/cultures.ts`: `pruefeGruppeStruktur` (R3: jede Seite braucht mindestens einen vollständigen Eintrag; K2c: keine gemischte Gruppe) und `pruefeGruppe` (Struktur → R1 je Stärken-Eintrag → R4 Gleichwertigkeit); `msgUngleichwertig` und `MSG_GRUPPE_GEMISCHT`.
- `validateKultur` prüft jede Gruppe mit derselben `pruefeGruppe` – Live- und Speicherprüfung liefern für eine Gruppe dieselbe Meldung. Reihenfolge: R1 Anzahl der Stärken → R1 je Abschnitts-Eintrag → je Gruppe R3/K2c/R1/R4 → R5 über alle Ergebnisse.
- `frontend/.../CultureAlternatives.tsx`: Die Meldung steht mit `role="alert"` direkt unter der Gruppenzusammenfassung – z. B. unmittelbar nach „Alternative hinzufügen": „Ungültige Gruppe: Seite 2 ist leer – jede Seite braucht mindestens einen Eintrag." Steht dieselbe Meldung bereits im Formular-Banner (nach „Erstellen"/„Speichern"), wird sie an der Gruppe nicht wiederholt (Prop `formError`).

**3) Gemischte Gruppen (K2c) werden serverseitig abgelehnt**
- Im Editor nicht anlegbar; POST/PATCH mit Stärken- und Talent-Einträgen in einer Gruppe → 400 „Ungültige Gruppe: Stärken und Talente dürfen nicht in einer Gruppe gemischt werden." Bereichsübergreifende Talent-Gruppen (K2b) und Stärken-Gruppen (K2a) bleiben zulässig.

### Ergänzte Tests
- `backend/src/cultures/kultur-editor.test.ts` (neu, im `test`-Skript des Backends): 7 Fälle zum UI-Pfad mit `anzahl: 0`-Fixtures – zweite Stärke blockiert und frische Zeile entfernt (TC-04), zugewiesene Stärke mit Anzahl 0 blockiert (Review-Fund 1), Stärke wählen steht direkt auf Stufe 1 und Anzahl 0/2 wird nicht übernommen, Stufe 2/Kosten 2 (TC-05/TC-06), Talentpunkte bereichsübergreifend (TC-01/02/03), Alternative anlegen (TC-08/TC-10), „Gruppe entfernen" nach Stärkengruppe (Review-Fund 2).
- `backend/src/cultures/cultures.test.ts`: TC-04 auf die Zeilen-Sicht umgestellt; drei neue Fälle (Live-Prüfung `pruefeGruppe` für leere/unvollständige Seiten, R1/R4 je Gruppe, gemischte Gruppe).
- `backend/src/routes/library-cultures-test-child.ts`: gemischte Gruppe → 400; PATCH mit Anzahl 0, Kosten 2 (Anzahl 0) und leerer Seite → 400; die abgelehnten PATCH-Aufrufe verändern die gespeicherte Kultur nicht.

### Verifikation (lokal, Arbeitsstand vor der Übergabe)
- `npm test`: 37 Tests grün ✓
- `npm run typecheck --workspace=backend`: ohne Befund ✓
- `npm run build --workspace=frontend`: Build ohne Fehler ✓ (Chunk-Größen-Hinweis > 500 kB besteht unverändert)
- `npm audit --omit=dev --omit=peer` (CI-Schritt): 0 Schwachstellen ✓

## Schritt 20: Review-Nacharbeit Kultureditor – Runde 2 (2026-11-24)

### Ausgangslage (INT-000015, PO-Umfang nach Review zu PR #2)
Der PO gab die nächste Umsetzungsrunde mit drei verbindlichen Punkten frei: (1) R1 weiterhin über Stärken mit `anzahl` 0 umgehbar – zusätzlich `setzeAnzahl` und `KulturSelectStep`, (2) `gruppeEntfernen` ungetestet, (3) R4 ohne Seiten-Konkretheit.

### Implementierte Änderungen

**1) HIGH – R1-Umgehung über `setzeAnzahl` und Kultur-Gewährung**
- `frontend/.../LibraryTable.tsx` (`setzeAnzahl`): ruft zusätzlich `pruefeStaerkenAbschnitt` auf – eine danebenliegende zweite zugewiesene Stärke wird auch beim Ändern der Anzahl live mit „Maximal eine Stärke pro Kultur." abgelehnt (vorher nur `pruefeStaerkeWert`).
- `shared/src/cultures.ts`: neue Funktion `gewaehrteStaerken(eintraege)` – filtert Einträge mit `anzahl > 0` und begrenzt auf `MAX_STAERKEN` (1). Damit gewährt eine Kultur auch bei Altbestand mit mehreren Einträgen höchstens eine Stärke.
- `frontend/.../KulturSelectStep.tsx`: die Stärken-Sektion der Kulturanzeige läuft über `gewaehrteStaerken` – Anzahl 0 wird nicht mehr als gewährt angezeigt.
- `shared/src/reducers.ts` (`kulturReducer`): die Gewährung in den Charakterzustand läuft über `gewaehrteStaerken` – Anzahl-0-Einträge gewähren nichts, es wird höchstens eine Stärke weitergegeben.

**2) MEDIUM – „Gruppe entfernen" testbar gemacht**
- `shared/src/cultures.ts`: neue Funktion `entferneGruppe(configFelder, index)` – verlagert die bisher im Frontend versteckte Logik (Seite 1 zurück in die Abschnitte, Seite 2 und Gruppe entfallen) nach shared und ist damit unit-testbar; liefert `null` bei unbekanntem Index.
- `frontend/.../LibraryTable.tsx` (`gruppeEntfernen`): nur noch `setConfigFields(prev => entferneGruppe(prev, index) ?? prev)`.

**3) MEDIUM – R4/Seiten-Konkretheit** war in Runde 1 umgesetzt (`msgSeiteLeer`, `msgEintragUnvollstaendig` in `validateKultur`, frontend- wie backendseitig); unverändert.

### Ergänzte Tests (`backend/src/cultures/cultures.test.ts`)
- `entferneGruppe`: nur Seite 1 wird zurückgeschrieben, Gruppe entfällt, R1/R2 bleiben erfüllt; Stärkengruppe stellt genau eine Stärke her; Mehrfach-Gruppen: nur die gewählte Gruppe wird entfernt.
- `gewaehrteStaerken`: Anzahl 0 gewährt nichts, höchstens eine Stärke je Kultur.
- `recalculateStats` (KulturSelectStep-Pfad): eine Kultur mit zwei Stärken gewährt genau eine; Anzahl 0 gewährt keine; Talente bleiben unberührt.

### Verifikation
- `npm test`: 27 Tests grün ✓
- `npm run typecheck --workspace=backend`: ohne Befund ✓
- `npm run build --workspace=frontend`: Build ohne Fehler ✓

## Schritt 19: Review-Nacharbeit Kultureditor – Limits und Gruppenintegrität (2026-11-24)

### Ausgangslage (INT-000015, Review zu PR #2)
Der Review meldete drei belegbare Mängel: regelwidrige Kulturen konnten doch gespeichert bzw. der Editor in einen dauerhaft ungültigen Zustand gebracht werden.

### Implementierte Änderungen

**1) HIGH – R1 war über Stärken mit Anzahl 0 umgehbar**
- `shared/src/cultures.ts`: Eine Stärke gilt über ihre gesetzte `id` als zugewiesen – unabhängig vom Wert. Neu: `staerkenZuweisungen(regeln)` (zählende Variante, gespeist in `validateKultur` und `wahlmoeglichkeiten`); `pruefeStaerkenAbschnitt` filtert nicht mehr nach `wert > 0`; `pruefeStaerkeWert` verlangt für eine zugewiesene Stärke zwingend Wert 1 (auch 0 verstößt gegen AK1.2)
- `frontend/.../LibraryTable.tsx`: Beim Wählen einer Stärke wird die Anzahl sofort auf 1 gesetzt; das Anzahl-Feld blockiert jeden Wert ≠ 1 (auch 0/leer) live mit „Stärken nur mit Stufe 1 und Kosten 1."
- Wirkung: POST mit zwei Stärken `anzahl: 0` → 400 „Maximal eine Stärke pro Kultur."; teure Stärke mit `anzahl: 0` → 400 „Stärken nur mit Stufe 1 und Kosten 1."

**2) MEDIUM – „Gruppe entfernen" schrieb beide Seiten in die Abschnitte zurück**
- Neue Shared-Funktion `gruppeAufloesen(alternative)` liefert ausschließlich Seite 1; `gruppeEntfernen` in `LibraryTable.tsx` nutzt sie. Im wählbaren Ergebnis ist pro Gruppe genau eine Seite aktiv (R5) – beide Seiten gleichzeitig zurückzuschreiben erzeugte per Konstruktion zwei zugewiesene Stärken (R1-Verstoß).

**3) MEDIUM – R4 prüfte nur die Wertesummen**
- Jede Gruppenseite braucht jetzt mindestens einen vollständigen Eintrag (`id`, `name`, `wert > 0`); Meldungen: „Ungültige Gruppe: Seite X ist leer – jede Seite braucht mindestens einen Eintrag." bzw. „Ungültige Gruppe: Seite X hat einen Eintrag ohne Auswahl oder Wert." (`msgSeiteLeer`, `msgEintragUnvollstaendig`)
- Prüfreihenfolge in `validateKultur`: R1 Anzahl der Stärken → R3 Vollständigkeit der Seiten → R1 je Eintrag → R4 Gleichwertigkeit → R5 über alle Ergebnisse
- UI: „Alternative hinzufügen" erscheint nur bei Einträgen mit zugewiesenem Wert (R3); in einer Gruppe setzt die Stärken-Auswahl den Wert automatisch auf 1; strukturell defekte `alternativen`-Einträge ohne `seiten` werden beim Parsen übersprungen (tolerantes Parsing bleibt erhalten)

### Ergänzte Tests
- `backend/src/cultures/cultures.test.ts`: 4 neue Fälle (Anzahl 0 in Abschnitt/Ergebnis, leere Seite, Eintrag ohne Auswahl/Wert, „Gruppe entfernen" stellt nur Seite 1 wieder her) sowie TC-05 angepasst (zugewiesene Stärke mit Anzahl 0 ⇒ Fehler)
- `backend/src/routes/library-cultures-test-child.ts`: 5 neue Route-Fälle mit 400 plus Prüfung, dass keine dieser Kulturen persistiert wird

### Verifikation
- `npm test && npm run typecheck --workspace=backend`: 22 Tests grün ✓
- `npm run build --workspace=frontend`: Build ohne Fehler ✓

## Schritt 18: Kultureditor – Stärken-/Talentlimits und Entweder/Oder-Alternativen (2026-11-24)

### Anforderungen (SF-000009 / INT-000015, K1–K4 aus der PO-Klärung)
- R1: pro Kultur höchstens eine Stärke, Stufe (Anzahl) 1 und Kosten 1
- R2: höchstens 5 Punkte für Talente + Waffentalente + Magieschulen zusammen (Summe 5 zulässig, bereichsübergreifend)
- R3/R4: zu einer Zuweisung kann eine gleichwertige Alternative (Entweder/Oder-Gruppe mit „Seite 1"/„Seite 2") angelegt werden; die Wertesummen beider Seiten müssen gleich sein
- R5: jedes wählbare Ergebnis (je Gruppe genau eine Seite) muss R1 und R2 erfüllen
- Nicht im Umfang: Auswahl-UI im Schritt „Kultur" der Charaktererstellung (Folgeticket INT-000016)

### Implementierte Änderungen

**`shared/src/cultures.ts` (neu)**
- Zentrale, reine Regellogik für Editor und Backend: `parseKulturRegeln` (tolerant gegenüber doppelt kodierten JSON-Strings und echten Arrays), `pruefeTalentPunkte`, `pruefeStaerkenAbschnitt`, `pruefeStaerkeWert`, `validateKultur` (R1 je Eintrag → R4 Gleichwertigkeit → R5 über alle wählbaren Ergebnisse), `wahlmoeglichkeiten` (Aufzählung, ab 13 Gruppen äquivalenter Worst Case), `formatAlternative` („Athletik 2 | Akrobatik 1 + Heimlichkeit 1")
- Feste Meldungstexte: „Maximal 5 Punkte insgesamt für Talente, Waffentalente und Magieschulen.", „Maximal eine Stärke pro Kultur.", „Stärken nur mit Stufe 1 und Kosten 1.", „Ungleichwertig: Seite 1 = X Punkte, Seite 2 = Y Punkte", Zusatz „ (in einem wählbaren Ergebnis verletzt)"

**`backend/src/routes/library.ts`**
- POST/PATCH `cultures` validieren die Config gegen die Regeln und antworten mit 400 + `message`; regelwidrige Kulturen werden nicht abgelegt (auch wenn das Frontend umgangen wird)
- Kosten der Stärken kommen aus der Library-Tabelle `strengths` (`parseKosten`); unbekannte Kosten (Altbestand ohne Feld) werden nicht beanstandet

**`frontend/src/components/library/CultureAlternatives.tsx` (neu)**
- Block „Entweder/Oder-Gruppen" im Kulturformular: Zusammenfassung im Format „Athletik 2 | Akrobatik 1 + Heimlichkeit 1", Seiten als benannte Feldsets „Seite 1"/„Seite 2" mit Eintrags-Zeilen, „+ Eintrag hinzufügen" je Talentseite (Stärkenseiten führen genau eine Stärke, K2a), „Gruppe entfernen"

**`frontend/src/components/library/LibraryTable.tsx`**
- Live-Prüfung beim Zuweisen: Talentpunkte-Summe über alle drei Bereiche (blockiert + frische Zeile entfernt), zweite Stärke blockiert (Select revertiert), Stufe/Kosten ≠ 1 blockiert (Anzahl revertiert); Meldung im Formular mit `role="alert"`
- „Alternative hinzufügen" je Talent-/Stärkeneintrag: der Eintrag wandert in die Gruppe (Seite 1) und zählt nicht mehr im Abschnitt
- Speichern (`Erstellen`/`Speichern`) führt `validateKultur` aus und zeigt serverseitige 400-Meldungen; Zusammenfassung in der Liste enthält die Gruppen
- A11y: Abschnitte und Gruppenseiten als `fieldset`/`legend`, Eingaben mit `aria-label`, Name/Beschreibung label-gebunden

**`frontend/src/components/library/StrengthsView.tsx`**
- Felder des Stärken-Formulars label-gebunden (`htmlFor`/`id` für Name, Beschreibung, Kategorie, Unterkategorie, „Kosten (Punkte)"), damit QA das Feld über den Accessibility Tree eindeutig anspricht (Voraussetzung für AK1.2/TC-06: Stärke mit Kosten 2 anlegen bzw. setzen)

### Verifikation
- `npm test && npm run typecheck --workspace=backend`: 18 Tests grün (Regel-Unit-Tests TC-01–TC-14, Seed-Test, Route-Integrationstest mit Temp-Datenbank) ✓
- `npm run build --workspace=frontend`: Build ohne Fehler ✓

## Schritt 17: XP-System in der Chronik (Level-Balken, Sessions, Verlauf, Ausgeben) (2026-10-21)

### Anforderungen (Tester/Max)
- XP nach Session hinzufügen (Session-Name + Anzahl), Verlauf speichern
- Alle 100 XP Level-Aufstieg; Start Level 1 mit 15 XP; Level-Balken
- Level ist unabhängig vom Ausgeben: nur gesammelte XP (totalXp) zählen fürs Level
- Aufwerten/Neu erlernen, solange XP-Guthaben + Level-Cap es zulassen (Kosten folgen später)
- Letzten Verlaufseintrag entfernen können (sofern seit dem nichts „gelevelt" wurde)

### Implementierte Änderungen

**`backend/src/routes/characters.ts`**
- `GET /api/characters`: `totalXp` im Select
- `GET /api/characters/:id/xp`: Verlauf (`xp`, `totalXp`, Log neueste zuerst)
- `POST /characters`: Start-Log-Eintrag „Charakterstart" (+15, beide Branches)
- `POST /:id/xp`: Validierung (amount > 0, reason/Session-Name nicht leer)
- `DELETE /:id/xp/:logId`: Undo nur für den neuesten Eintrag, nur XP-Zugänge (amount > 0) und nur wenn das Level dadurch unverändert bleibt („seit dem nix gelevelt")
- `POST /:id/xp/spend`: XP ausgeben — senkt nur `xp`-Guthaben (Level-Basis `totalXp` unverändert), wendet die Änderung serverseitig auf den Charakter-State an (`skill_up`: Skill +1; `learn_skill`: neuer Skill = 1; `learn_strength`: Stärke anhängen), loggt negativen Eintrag

**`frontend/src/components/chronicle/xpkosten.ts` (neu)**
- Zentrale XP-Regeln: `XP_PER_LEVEL=100`, `START_XP=15`, `levelOf/levelProgress/xpToNextLevel`
- Platzhalter-Kosten (je 15 XP für skill_up/learn_skill/learn_strength) — später hier justieren
- `getLevelCap(level)`-Stub (null = keine Beschränkung) für das spätere Level-Cap

**`frontend/src/components/chronicle/XpPanel.tsx` (neu)**
- Level-Balken (Fortschritt `(totalXp % 100)/100`) + „X XP gesamt · Y bis Level N+1 · Verfügbar: Z"
- „+ XP hinzufügen": Inline-Form (Session-Name, XP-Zahl), Validierung im Frontend + Backend
- Aufklappbarer Verlauf: Datum · Session · ±XP (grün/rot); Undo-„×" nur am neuesten positiven Eintrag
- „XP ausgeben": Aktions- + Zieldropdown, Kostenanzeige, Inline-Bestätigung, Level-Cap-Hinweis
- API-Fehler immer via `reportApiError` (kein stiller Catch)

**`frontend/src/components/chronicle/CharacterSheet.tsx`**
- Fetch-Block zu `load()` refactored (Refresh nach XP-Änderungen); `XpPanel` oben im Bogen integriert
- Ziel-Listen abgeleitet: bekannte Skills (+Wert), nicht bekannte Skills, nicht genommene Stärken

**`frontend/src/components/chronicle/ChronicleView.tsx`**
- Karten zeigen `XpBar` (kompakt, Level + Fortschritt) + verfügbare XP

### Verifikation (End-to-End-Smoke, Wegwerf-Charakter)
Start-Log ✓ · +35 XP ✓ · Validierung 400 ✓ · Spend (xp 50→35, totalXp 50 konstant, State geändert) ✓ · Undo negativ 400 ✓ · Undo positiv ✓ · Level-Guard 400 ✓ · Aufräumen ✓ · `tsc`/Build ohne Fehler

## Schritt 16: Zauber-Meta (Dauer/Reichweite/Kosten) überall sichtbar (2026-10-21)

### Feedback (Tester)
- „Wann immer man Details zu Spells sieht, wären Sachen wie Reichweite, Kosten und Castdauer interessant"
- Befund: die Felder liegen in der Spell-Config vor, wurden aber an 3 Stellen nicht angezeigt

### Implementierte Änderungen

**`frontend/src/components/creation/ZauberStep.tsx`**
- `SpellInfo` um `schwierigkeit`/`kosten`/`zauberdauer`/`reichweite` erweitert (robuster Feld-Lese-Helper)
- Gewählter Zauber zeigt kompakte Meta-Zeile (`Schwierigkeit 15 · Kosten K1 · Dauer 1 Tick · Reichweite Berührung`), Felder nur wenn belegt
- Wirkungstext jetzt als Markdown gerendert

**`frontend/src/components/chronicle/CharacterSheet.tsx`**
- `spellMap` lädt jetzt `config` (bislang nur name+description → Meta war unsichtbar) und baut die Meta-Zeile
- `DetailInfo` um `meta?: string[]` erweitert; Popup zeigt „Zauberdaten"-Abschnitt über der Beschreibung
- Zauber-Eintrag klickbar, wenn Beschreibung **oder** Meta vorhanden

**`frontend/src/components/library/SpellsView.tsx`**
- Detailpanel-Meta vollständig: Typus, Schwierigkeit, Kosten, Dauer, Reichweite, Wirkungsdauer, Bereich (nur belegte Felder)
- Wirkungstext als Markdown gerendert

### Verifikation
- `tsc -b` + `vite build` ohne Fehler
- API-Smoke: Spells mit Reichweite/Kosten/Dauer vorhanden (Beispielzauber geprüft)
- Manuell: Zauber-Step → Zauber wählen (Meta-Zeile); Chronik → Zauber anklicken; Bibliothek → Spells

## Schritt 15: Weiter-Freigabe im KindheitStep korrigiert (2026-10-21)

### Feedback (Tester)
- „Beim 4. Step kann ich weiter, obwohl ich nicht alle Punkte vergeben hab"
- Ursache: `KindheitStep` validierte nur, dass eine Stärke gewählt wurde – die 20 Fertigkeits-Punkte (Restzähler) flossen nicht in die Weiter-Freigabe ein

### Implementierte Änderungen

**`frontend/src/components/creation/KindheitStep.tsx`**
- Validierung erweitert: `staerke !== '' && availablePoints <= 0` (alle Punkte müssen verteilt sein, gleiche Regel wie Ausbildung/Hobbybedarf)
- `availablePoints` in die Effect-Dependencies aufgenommen (frische Freigabe bei jeder Änderung; Rücknahme eines Punktes deaktiviert „Weiter" sofort wieder)

### Systemcheck aller Steps
Alle übrigen Steps validieren vollständig (Schicksal/Rasse/Kultur/Name: Auswahl; Abstammung: Phasen+Zeilen+Magie; Attribute: Pool+Verteilung; Ausbildung/Hobbybedarf: alle Zähler = 0; Zauber: Pflicht-Abdeckung). Der KindheitStep war die einzige Lücke.

### Verifikation
- `tsc -b` + `vite build` ohne Fehler
- Manuell prüfen: Stärke wählen ohne Punktevergabe → „Weiter" disabled; 20. Punkt verteilt → aktiv; Punkt zurückgenommen → wieder disabled

## Schritt 14: Kultur-Infofenster nutzbar gemacht (Statblock statt JSON-Dump) (2026-10-21)

### Feedback (Tester)
- „Bei der Wahl der Kultur ist das Infofenster useless – zeigt nicht an, mit dem man was anfangen kann"
- Ursache: das Panel zeigte die `config` als rohen JSON-Dump in einem `<pre>` (doppelt kodierte Arrays, maskierte Strings) – unlesbar

### Implementierte Änderungen

**`frontend/src/components/creation/KulturSelectStep.tsx`**
- Robuster Parser-Stack (`asArray`/`parseEntries`/`parseKulturConfig`): behandelt doppelt kodierte Strings, bereits geparste Arrays, kaputtes JSON, null und leere Einträge – **wirft nie**, filtert Einträge ohne Namen; numerische Felder werden String↔Number-sicher gelesen
- Panel zeigt statt des Dumps geordnete Abschnitte: **Talente** (`Handwerk +2`), **Waffentalente** (`Klingenwaffen +2`), **Magieschulen** (`Schutzmagie +2`), **Stärken** (`Zäh ×2`) – leere Abschnitte entfallen
- Beschreibung als Markdown gerendert (`.markdown`-Klasse, react-markdown + remark-gfm)
- Detailpanel 25 % → 35 % (+ `minWidth: 280`), konsistent zum RasseStep

**`frontend/src/components/creation/SchicksalStep.tsx`**
- Regeltext (`ruleText`) ebenfalls als Markdown gerendert (gleiches Plaintext-Muster wie zuvor Rasse/Kultur)

### Robustheits-Nachweis (Einmal-Test gegen 7 Fälle)
Stadthandwerker-Config (doppelt kodiert) ✓ · leere Namen/Einträge gefiltert ✓ · bereits geparste Arrays ✓ · kaputtes JSON ohne Crash ✓ · leere Strings ✓ · Punktzahlen als Strings ✓ · null ✓

### Verifikation
- `tsc -b` + `vite build` ohne Fehler
- Empfohlener manuelle Test: Schritt 1 (Schicksal) und Schritt 4 (Kultur) durchklicken; „Stadthandwerker" zeigt alle 4 Abschnitte

## Schritt 13: Markdown-Rendering für Regeltexte + Vollbild zentriert (2026-10-21)

### Feedback
- Vollbild bei der Rassenwahl: Inhalt lief randlos von Rand zu Rand
- Regeltexte sind als Markdown gespeichert, wurden aber als Rohtext angezeigt

### Implementierte Änderungen

**Abhängigkeiten (`frontend`)**
- `react-markdown@^10.1.0` + `remark-gfm@^4.0.1` (Tabellen, Listen, Strikethrough)

**`frontend/src/theme.css`**
- Neue `.markdown`-Klasse: Abstände für p/h1–h4/ul/ol, Code-, Blockquote-, Tabellen- und hr-Styles, Farbe erbt vom Kontext (`--detail-text`/`--text-primary`)

**`frontend/src/components/creation/RasseStep.tsx`**
- Beschreibung wird als Markdown gerendert (beide Modi); 200-Zeichen-Rohkürzung entfernt (führte sonst zu kaputtem Markdown am Schnitt)
- Vollbild: neuer `fullscreenContent`-Wrapper (`maxWidth: 880`, zentriert) – Inhalt nicht mehr von Rand zu Rand

**`frontend/src/components/library/RacesView.tsx`**
- Detailpanel rendert `cfg.beschreibung` als Markdown (dieselbe Datenquelle)

**`frontend/src/components/chronicle/CharacterSheet.tsx`**
- Feld-Fix: Rassen-Popup las `r.description` (Spalte, meist `null`) → liest jetzt `config.beschreibung`
- Detail-Popup (Beschreibung/Effekt) rendert Markdown

### Verifikation
- `tsc -b` + `vite build` ohne Fehler (Chunk-Warnung durch große Bibliotheksdaten, bereits vorhanden)
- Smoke: Elf-Rasse in der lokalen DB mit realistischem Markdown-Spezialgesetz versehen; `/api/library/races` liefert es korrekt

## Schritt 12: Rassenwahl-Feedback behoben + lokale Testdaten bereinigt (2026-10-21)

### Feedback-Ausgangslage
- „Bei der Rassenwahl sieht man nichts von Relevanz" → Ursache: `RasseStep` las `cfg.spezieslaw`, gespeichert wird aber `cfg.beschreibung` (Library-Formular) – der Detailtext war dadurch immer leer.
- „MaxWindow-Button fehl am Platz, bewirkt nichts" → der Vollbild-Toggle zeigte bei leerem Detailtext denselben (fast leeren) Inhalt; kryptische Fenster-Glyphen wirkten deplatziert.

### Implementierte Änderungen

**`frontend/src/components/creation/RasseStep.tsx`**
- Feld-Mismatch behoben: `cfg.beschreibung` wird gelesen (Fallback auf `r.description`), lokales Feld `speciesLaw` → `beschreibung` umbenannt
- Vollbild-Toggle bleibt (Nutzerentscheidung): klare Beschriftung „Vollbild"/„Verkleinern" statt Fenster-Glyphen, Vollbild zeigt vollständigen Text (Kürzung auf 200 Zeichen nur in der verkleinerten Ansicht), Escape schließt weiterhin
- Detailpanel 25 % → 35 % Breite (+ `minWidth: 280`), Größenklasse als Chip, Vorteile-/Nachteile-Abschnitte nur bei vorhandenen Einträgen, leere Strings werden beim Rendern gefiltert
- Rassen-Auswahlkarten bleiben bewusst schlank (Name + Icon), alle Infos im Detailpanel

**`backend/src/db/seed.ts`** (für frische Seeds)
- Race-Seed: `beschreibung` für Mensch/Elf ergänzt
- Kultur-Seed: Beschreibungen für Mittelreich/Waldelfen
- `RACE_STRENGTH_SEED`: Beschreibungen für Anpassungsfähig, Nachtsicht, Empfindlich gegen Eisen (bisher `null`)

### Lokale Testdaten (`backend/sqlite.db`, vorher gesichert als `sqlite.backup.db`)
- Gelöscht (referenzfrei, gegen `character_steps.delta` geprüft): Rassen „blubb" und „reeet", Kultur „fdfdgdrzr"
- Umbenannt: Kultur „handwer2klingenwaffen2schutzmagie2zäh2" → „Stadthandwerker" (+ Beschreibung; ID unverändert, damit Charakterbezüge halten)
- Testcharaktere „qwertz"/„qqqq" → „Testcharakter 1"/„Testcharakter 2"; eingebettete Kultur-Snapshots in `characters.state` und `character_steps.delta` mit sanitiert
- Beschreibungen ergänzt: Rassen Mensch/Elf, Kulturen Mittelreich/Waldelfen, Rassen-Stärken
- Hinweis: `sqlite.db` im Repo-Root ist vollständig leer (keine Tabellen, veraltete Rest-Datei) und kann bei Bedarf entfernt werden

### Verifikation
- `tsc -b` (frontend) und `tsc -p tsconfig.json` (backend) ohne Fehler
- Backend-Smoke-Test: `/api/library/races` liefert Rassen mit `config.beschreibung`, `/api/characters` liefert umbenannte Testcharaktere

## Schritt 11: Spells-Import aus Spells.md (2026-08-02)

### Ziel
Import-Button im Library-Reiter „Spells", der eine `.md`-Datei im Spells.md-Format parst und alle Einträge in die `spells`-Tabelle lädt.

### Format-Analyse (562 Einträge)
- Titel-Regex: `^\*\*(.+?)\s*\((Spruch|Ritus)\)\*\*` (Delimiter, nicht `---`)
- 19 Schulen-Kurznamen (Bann…Wind, Werte 0–5)
- Pflichtfelder: Schulen, Typus, Schwierigkeit, Kosten, Zauberdauer, Reichweite, Wirkung
- Optional: Wirkungsdauer (76%), Wirkungsbereich (14%), Erfolgsgrade (99.8%)
- Besonderheiten: mehrzeilige Wirkung, fehlende `---`-Trennlinie (Zauberschminke→Alarm), 1 unvollständiger Stub („Aura des klaren Geistes")

### Config-Schema (flat strings)
```json
{
  "typus": "Objekt",
  "schwierigkeit": "15",
  "kosten": "K1",
  "zauberdauer": "1 Tick",
  "reichweite": "Berührung",
  "artefakt": "Spruch",
  "schulen": "[{\"id\":\"staerkungsmagie\",\"name\":\"Stärkungsmagie\",\"wert\":1}]",
  "wirkungsdauer": "kanalisiert",
  "wirkungsbereich": "",
  "erfolgsgrade": "• ...\n• ...",
  "level": "1"
}
```

**Schulenwert-Berechnung:** Die Zahl im Markdown ist der Zaubergrad. Der benötigte Schulenwert wird berechnet:
- Grad 0 → Schulenwert 1
- Grad 1 → Schulenwert 3
- Grad 2 → Schulenwert 6
- Grad 3 → Schulenwert 9
- Grad 4 → Schulenwert 12
- Grad 5 → Schulenwert 15

Formel: `Grad 0 → 1`, sonst `Grad * 3`

**Wirkung:** Der Wirkungstext wird in das `description`-Feld geschrieben (Standard-Library-Feld), nicht in `config.wirkung`.

### Implementierte Änderungen

**`frontend/src/components/library/typeSchemas.ts`**
- `FieldSchema.type` um `'schoolValues'` erweitert
- `FULL_MAGIC_SKILLS` (20 Magie-Skills mit IDs) hinzugefügt
- `SCHOOL_SHORT_MAP` (19 Kurznamen → `{id, name}`) hinzugefügt
- `spells`-Schema-Felder ersetzt durch: typus, schwierigkeit, kosten, zauberdauer, reichweite, artefakt (select), schulen (schoolValues), wirkungsdauer, wirkungsbereich, erfolgsgrade (textarea), level (number)
- `wirkung`-Feld entfernt (Wirkungstext geht in `description`)

**`frontend/src/components/library/LibraryTable.tsx`**
- Import-Gate: `type === 'strengths'` → `type === 'strengths' || type === 'spells'`
- `parseSpellsFile(content)`: Split am Titel-Regex, Felder extrahieren, Schulen-Kurznamen mappen, config als flat strings
- `gradToSchulenwert(grad)`: Mapping-Funktion für Zaubergrad → Schulenwert (0→1, sonst grad*3)
- `handleImport`: Parser nach `type` wählen
- `schoolValues`-Renderer: Grid mit Number-Input (0–99) pro Magie-Skill, JSON-Array-String in config
- Wirkungstext wird in `description` geschrieben (statt `config.wirkung`)

### Duplikat-Logik
1. Unvollständige Stubs (kein Erfolgsgrade-Block) werden übersprungen
2. Gleichnamige Einträge (case-insensitiv) werden übersprungen

### Validierung
- `tsc -b` ✓
- `vite build` ✓

### Manueller Test (ausstehend)
- Spells.md importieren → 561 Einträge (1 Stub ohne Erfolgsgrade skippt)
- Reiter „Spells" zeigt Liste mit `typus · schwierigkeit · kosten`
- Spell bearbeiten ⇒ schulen/wirkungsdauer bleiben erhalten
- Beispiel „Anpassung": `Stärkung 0, Verwandlung 0` → `schulen: [{wert: 1}, {wert: 1}]`, `level: "1"`, `description: "Objekt passt Zauberer wie angegossen."`
