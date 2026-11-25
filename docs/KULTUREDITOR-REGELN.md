# Kultureditor: Regeln und Gültigkeitsprüfung

Technische Dokumentation zu SF-000009 / INT-000015 („Entweder/Oder bei der Kulturwahl")
und INT-000017 (Angebotssteuerung der Stärken-Dropdowns).
Stand: 25.11.2026. Dokumentiert ist ausschließlich das implementierte und QA-geprüfte
Verhalten (PR #2, QA-Testfälle TC-01–TC-14 bestanden; PR #6, QA-Testfälle
TC-KULTFILT-01–08 bestanden).
Anwendersicht: siehe [`ANWENDER-KULTUREDITOR.md`](ANWENDER-KULTUREDITOR.md).

## Zweck und Geltungsbereich

Der Bibliotheks-Editor für Kulturen (Tab „Kulturen") begrenzt Zuweisungen und ermöglicht
gleichwertige Entweder/Oder-Alternativen. Die Regellogik liegt zentral in
`shared/src/cultures.ts` und wird von drei Stellen identisch genutzt:

1. **Live-Prüfung im Editor** – blockierend direkt bei der Eingabe; Meldung im
   Formular-Banner (`role="alert"`) bzw. direkt an der Entweder/Oder-Gruppe.
2. **Speicherprüfung** – `validateKultur` beim Klick auf „Erstellen"/„Speichern".
3. **Backend** – `POST`/`PATCH /api/library/cultures` antworten bei Verstoß mit
   `400` und `{ "message": <Meldungstext> }`; eine regelwidrige Kultur wird nie abgelegt.

## Fachliche Regeln

| Regel | Inhalt |
|---|---|
| R1 | Höchstens **eine Stärke** pro Kultur. Zugewiesen zählt eine Zeile mit gesetzter `id` – unabhängig vom Wert (`anzahl` = 0 umgeht das Limit nicht). Die Stärke muss **Stufe (Anzahl) 1** und **Kosten 1** haben. |
| R2 | Höchstens **5 Punkte** insgesamt über Talente + Waffentalente + Magieschulen (bereichsübergreifend). Summe = 5 ist zulässig. |
| R3 | Eine Entweder/Oder-Gruppe hat **zwei Seiten**; jede Seite trägt 1..n Einträge. Jede Seite braucht mindestens einen vollständig zugewiesenen Eintrag (`id`, `name`, `wert > 0`), sonst wäre sie im Folgeticket nicht wählbar. |
| R4 | **Gleichwertigkeit**: Die Wertesummen beider Seiten einer Gruppe müssen gleich sein. |
| R5 | **Ergebnis-Stabilität**: Jedes wählbare Ergebnis (je Gruppe genau eine Seite) muss R1 und R2 erfüllen. |
| R6 | Gruppen sind paarweise und unabhängig. Ein Eintrag (gleiche `id`) gehört höchstens **einer** Gruppe an und steht nicht zugleich in einer Gruppenseite und in einem Abschnitt. Dieselbe `id` auf beiden Seiten derselben Gruppe ist zulässig (je Gruppe ist genau eine Seite aktiv). |

Ergänzende Wertregeln (Review/PO-Entscheidungen):

- **F3** – Punkte in den drei Talentbereichen sind ganze Zahlen ≥ 0 (je Eintrag,
  unabhängig von `id`/`name`). Negative oder Bruchwerte würden R2 und die Basissumme
  von R5 per direktem API-Aufruf umgehen (−5 + 10 = 5).
- **G** – Werte in Entweder/Oder-Gruppen sind ganze Zahlen ≥ 1 („1,5 | 1,5" wäre
  gleichwertig, aber kein gültiger Punktwert).
- **Mangel-3-Standard für Abschnitte** – ein Abschnittseintrag mit Wert ≠ 0 braucht
  eine vollständige Auswahl (`id` und `name`). Platzhalterzeilen mit Wert 0 bleiben
  zulässig: sie gewähren nichts und werden nirgends angezeigt.
- **K2a/K2b/K2c** – Stärken-Gruppen führen je Seite genau eine Stärke; Talent-Gruppen
  dürfen bereichsübergreifend sein (z. B. Talente + Magieschulen); gemischte
  Stärken-/Talent-Gruppen werden abgelehnt.

## Dreistufige Gültigkeitsprüfung

### Prüfungsreihenfolge (`validateKultur`)

1. R1 Anzahl: zugewiesene Stärken über gesetzte `id` gezählt, höchstens eine.
2. R1 je Stärken-Eintrag des Abschnitts: `anzahl = 1`, bekannte Kosten = 1.
3. F3: Punkte der drei Talentbereiche sind ganze Zahlen ≥ 0.
4. Mangel-3: Eintrag mit Wert ≠ 0 braucht `id` und `name` (alle vier Abschnitte).
5. Je Gruppe `pruefeGruppeImKontext` = `pruefeGruppe` (Struktur R3/K2c → Wertformat G
   → R1 je Stärken-Eintrag → R4) plus `pruefeMehrfachZuordnung` (R6). Diese Funktion
   liefert **identisch** die Live-Meldung an der Gruppe – Live- und Speicherprüfung
   urteilen für eine Gruppe gleich.
6. R5: `wahlmoeglichkeiten` bildet die Basissumme aus den Abschnitten und addiert je
   Gruppe die gewählte Seite – geprüft werden **alle** Seitenkombinationen. Ab 13
   Gruppen wird rechnerisch der Worst Case je Gruppe (maximale Seite) verwendet; für
   die monotonen Grenzen R1/R2 ist das gleichwertig und verhindert eine
   Kombinationsexplosion. Ein Verstoß liefert die Limit-Meldung mit dem Zusatz
   „ (in einem wählbaren Ergebnis verletzt)" (nur bei Kulturen mit Gruppen).

### Live-Prüfung im Editor (`shared/src/kulturEditor.ts`)

Die Abschnitts-Schritte sind reine Funktionen (`{ felder, fehler }`); die Komponenten
(`LibraryTable.tsx`) rufen nur auf:

- `staerkeWaehlen` – Auswahl setzt `id`/`name` und stellt direkt auf Stufe 1 (Default
  0 → 1); Kosten ≠ 1 und eine zweite zugewiesene Stärke werden abgelehnt (eine frische
  Zeile wird dabei entfernt). **Abwahl** („Stärke wählen...") setzt `id`/`name` leer
  und `anzahl` auf 0 – die Zeile bleibt als Platzhalter ohne Wert stehen.
- `staerkeAnzahlSetzen` – bei zugewiesener Stärke ist nur 1 gültig (auch 0 wird
  abgelehnt, der Wert wird nicht übernommen); dieselbe Abschnittsprüfung wie beim
  Wählen (Zählung über Zeilenindex); Zeile ohne vollständige Auswahl nimmt keinen
  Wert > 0 an (Mangel-3-Meldung).
- `talentPunkteSetzen` – R2 über alle drei Bereiche; bei Überschreitung wird der Wert
  nicht übernommen und eine frische Zeile (bisheriger Wert 0) entfernt.
- `talentWaehlen` – Auswahl setzt `id`/`name`, behält einen bereits eingetragenen Wert
  und prüft danach R2 (der Wert zählt jetzt mit). **Abwahl** setzt die Punkte auf 0
  (Platzhalter bleibt stehen).
- `alternativeAnlegen` – nur bei gesetzter `id` und Wert > 0; der Eintrag wandert aus
  dem Abschnitt auf **Seite 1** der neuen Gruppe.
- `CultureAlternatives.tsx` – rendert die Gruppen („Seite 1"/„Seite 2"), zeigt die
  Live-Meldung mit `role="alert"` direkt an der Gruppe (Dedup gegen das Banner) und
  setzt bei Stärken-Gruppen den Wert einer gewählten Stärke automatisch auf 1.

Jede erfolgreiche Editor-Änderung leert eine überholte Banner-Meldung, damit die
Live-Meldung an der Gruppe nicht durch Alt-Text unterdrückt wird.

### Backend (`backend/src/routes/library.ts`)

`kulturSpeicherFehler` lädt die Kosten aller Stärken aus der Library-Tabelle
`strengths` (`config.kosten`, `parseKosten`) und ruft dieselbe `validateKultur` auf.
`POST` und `PATCH /api/library/cultures` antworten bei Verstoß mit `400` und
`message`; nichts wird gespeichert. Ein `PATCH` ohne `config`-Feld prüft die
gespeicherte Config (siehe Altbestand). Unbekannte Kosten (Stärke ohne Kostenfeld)
werden nicht beanstandet.

## Angebotssteuerung der Stärken-Dropdowns (INT-000017)

Die Stärken-Auswahl im Kultureditor bietet nur noch Stärken an, die gewählt werden
dürfen (PR #6). Das ergänzt die dreistufige Prüfung – es ersetzt sie nicht.

- **Filterkriterium „wählbar"** (`istWaehlbareStaerke` in `shared/src/kulturEditor.ts`):
  wählbar ist eine Stärke mit **Kosten 1** oder **ohne gesetzte Kosten**
  (`null`/`undefined`, Legacy-Seed, Anzeige „Kosten: ?"). Stärken mit bekanntem
  Kosten ≠ 1 sind nicht wählbar – auch **Kosten 0** (Rassen-Vorteile). Das Kriterium
  stimmt mit der bestehenden Stärke-Prüfung überein (`pruefeStaerkeWert` mit Stufe 1):
  genau die Stärken, die diese Prüfung nicht ablehnen würde, werden angeboten; ein
  Eigenschaftstest sichert diese Konsistenz ab.
- **Zentrale Optionsliste** (`staerkenOptionen(staerken, zugewieseneId)`): filtert das
  Angebot aus der Bibliothekstabelle `strengths` (Kosten via `parseKosten`). Nicht
  wählbare Stärken fehlen in der Optionsliste **vollständig** – es gibt keine
  deaktivierte Anzeige. Die bereits der Zeile zugewiesene Stärke bleibt ausschließlich
  für diese Zeile als Option erhalten (R6 Altbestand, auch mit Kosten ≠ 1; fehlt sie
  in der Bibliothek, erscheint sie nicht). Dubletten entstehen nicht.
- **Geltungsbereich**: dieselbe Quelle an beiden Auswahlorten – Abschnitt „Stärken"
  (`LibraryTable.tsx`, Select „Stärke wählen…") und Eintrag-Auswahl der
  Entweder/Oder-Gruppenpflege (`CultureAlternatives.tsx`, „Seite 1"/„Seite 2").
  Überall, wo im Kultureditor eine Stärke gewählt wird, gilt dasselbe Angebot.
- **Verteidigung in der Tiefe bleibt**: Live-Prüfung (`staerkeWaehlen`,
  `staerkeAnzahlSetzen`, `eintragWaehlen`/`wertSetzen`), `validateKultur` und das
  Backend (POST/PATCH → 400 mit message) sind unverändert; alle Meldungstexte sind
  wörtlich unverändert. Der Filter steuert nur das Angebot neuer Auswahloptionen.
- **Unverändert bleiben**: die Dropdowns für Talente, Waffentalente und Magieschulen,
  der Tab „Stärken" (Verwaltung, höhere Kosten dort legitim) und die Charaktererstellung.

## Meldungstexte (wörtlich)

| Meldung | Auslöser |
|---|---|
| `Maximal 5 Punkte insgesamt für Talente, Waffentalente und Magieschulen.` | R2 überschritten |
| `Maximal eine Stärke pro Kultur.` | R1: mehr als eine zugewiesene Stärke |
| `Stärken nur mit Stufe 1 und Kosten 1.` | R1 je Eintrag: Anzahl ≠ 1 (auch 0) oder bekannte Kosten ≠ 1 |
| `Ungleichwertig: Seite 1 = X Punkte, Seite 2 = Y Punkte` | R4: Wertesummen der Seiten unterschiedlich |
| ` (in einem wählbaren Ergebnis verletzt)` | Zusatz zu den beiden Limit-Meldungen, wenn erst eine Alternativkombination R1/R2 verletzt (R5) |
| `Ungültige Gruppe: Seite X ist leer – jede Seite braucht mindestens einen Eintrag.` | R3: Gruppenseite ohne Eintrag |
| `Ungültige Gruppe: Seite X hat einen Eintrag ohne Auswahl oder Wert.` | R3: Gruppeneintrag mit leerer `id`/`name` oder Wert ≤ 0 |
| `Ungültige Gruppe: Stärken und Talente dürfen nicht in einer Gruppe gemischt werden.` | K2c: gemischte Gruppe |
| `Ungültiger Punktwert: Punkte müssen ganze Zahlen ab 0 sein (Talente, Waffentalente und Magieschulen).` | F3: negativer oder nicht ganzzahliger Punktwert |
| `Ungültiger Punktwert in einer Entweder/Oder-Gruppe: Werte müssen ganze Zahlen ab 1 sein.` | G: nicht ganzzahliger Gruppeneintrag |
| `Ungültige Gruppe: Eintrag {Name} ist mehrfach zugeordnet (Abschnitt oder mehrere Gruppen).` | R6: gleiche `id` in Abschnitt + Gruppe oder in zwei Gruppen |
| `Ungültiger Eintrag im Abschnitt {Talente|Waffentalente|Magieschulen|Stärken}: Eintrag mit Wert braucht eine Auswahl (Skill bzw. Stärke).` | Mangel-3: Abschnittseintrag mit Wert ohne vollständige Auswahl |

Die Meldungsreihenfolge folgt der Prüfungsreihenfolge oben und ist deterministisch.

## Komponenten und Datenfluss

- `shared/src/cultures.ts` – reine Regellogik: tolerantes Parsen (`parseKulturRegeln`
  akzeptiert echte Arrays wie doppelt kodierte JSON-Strings; defekte Einträge werden
  übersprungen), Limits und Meldungstexte, Gruppenprüfung, `wahlmoeglichkeiten`,
  `gewaehrteStaerken`, `entferneGruppe`, `formatAlternative`.
- `shared/src/kulturEditor.ts` – Editor-Schritte der Abschnitte (siehe oben) und die
  Angebotssteuerung der Stärken-Auswahl (`istWaehlbareStaerke`, `staerkenOptionen`;
  INT-000017).
- `frontend/src/components/library/LibraryTable.tsx` – Kulturformular: Bereiche
  „Talente", „Waffentalente", „Magieschulen" und „Stärken" mit „+ Eintrag hinzufügen",
  Selects „Skill wählen..."/„Stärke wählen...", Zahlenfeldern „Punkte"/„Anzahl",
  Button „Alternative hinzufügen" (nur bei zugewiesenem Eintrag mit Wert > 0),
  „Gruppe entfernen", „Erstellen"/„Speichern"; Banner mit `role="alert"`. Das
  Stärken-Select bietet nur das gefilterte Angebot an (`staerkenOptionen`, INT-000017).
- `frontend/src/components/library/CultureAlternatives.tsx` – Alternativpflege
  („Entweder/Oder-Gruppen") mit Seiten „Seite 1"/„Seite 2", je Seite „+ Eintrag
  hinzufügen" (Stärkenseiten: genau ein Eintrag) und Live-Meldung an der Gruppe; die
  Stärken-Eintrag-Auswahl nutzt dasselbe gefilterte Angebot (INT-000017).
- `backend/src/routes/library.ts` – serverseitige Speicherprüfung (siehe oben).

**Persistenz:** Kulturen liegen in der `cultures`-Tabelle (SQLite via Drizzle); die
`config`-Spalte enthält JSON mit `talente`, `waffenTalente`, `magieSchulen`,
`staerken` (je `{ id, name, punkte | anzahl }`) und `alternativen`
(`{ typ: 'talent' | 'staerke', seiten: [[...], [...]] }`).

**Gewährung in der Charaktererstellung:** Der Schritt „Kultur"
(`KulturSelectStep.tsx`) zeigt nur vollständig zugewiesene Einträge (`id` und `name`)
und höchstens eine Stärke an; seit INT-000016 werden zusätzlich die Entweder/Oder-
Gruppen mit Seitenwahl angezeigt (siehe unten). Die Kultur-Rechnung
(`shared/src/reducers.ts`) gewährt Talentpunkte für Einträge mit gesetzter `id`
(`punkte > 0`) und höchstens eine Stärke (`gewaehrteStaerken`: `id` gesetzt,
`anzahl > 0`, erste in gespeicherter Reihenfolge). `name` ist nur für die Anzeige
maßgeblich – Altbestand mit `id` ohne `name` verliert keinen Wert.

**„Gruppe entfernen":** `entferneGruppe`/`gruppeAufloesen` schreiben ausschließlich
**Seite 1** in die Abschnitte zurück; Seite 2 und die Gruppe entfallen. Beide Seiten
gleichzeitig zurückzuschreiben erzeugte per Konstruktion einen regelwidrigen Zustand
(z. B. zwei zugewiesene Stärken).

## Altbestand (A3)

- Bereits gespeicherte Kulturen werden nicht automatisch umgeschrieben; die Limits
  greifen beim **nächsten Speichern** im Editor. Ein `PATCH`, der die `config`
  unverändert lässt (z. B. reine Umbenennung), validiert die gespeicherte Config und
  kann Altbestand daher ablehnen.
- Die Gewährung hängt an der `id`: Altbestand mit gesetzter `id` gewährt weiterhin,
  Phantomzeilen ohne `id` gewähren nichts. Altbestand mit mehreren Stärken oder
  `anzahl > 1` wird bis zum nächsten Speichern unverändert gewährt.

## Sicherheitsgrenzen

- Das Backend prüft unabhängig vom Frontend – auch umgangene UI-Pfade (direkte
  POST/PATCH-Aufrufe) können keine regelwidrige Kultur speichern.
- F3 und G schließen Summen-Umgehungen über negative und Bruchwerte; die R1-Zählung
  über die `id` schließt die `anzahl = 0`-Umgehung.
- R5 wird über alle Seitenkombinationen geprüft; ab 13 Gruppen sichert der Worst-Case-Pfad
  die Laufeit (keine Kombinationsexplosion).
- Das tolerante Parsing wirft nie: defekte `alternativen`-Einträge ohne Seitenangabe
  werden übersprungen, eine vorhandene aber leere Seitenangabe bleibt erhalten und
  wird bei der Speicherprüfung als unvollständige Gruppe beanstandet.

## Auswahl im Schritt „Kultur" (INT-000016)

Im Schritt „Kultur" der Charaktererstellung wird je Entweder/Oder-Gruppe genau eine
Seite gewählt; die Einträge der gewählten Seiten werden über die wirksame Config
(`shared/src/kulturWahl.ts`, `wirksameKulturConfig`) wie feste Einträge zugewiesen.
Die technische Dokumentation dazu: [`technische-dokumentation.md`](technische-dokumentation.md);
die Anwendersicht: [`anwenderhandbuch.md`](anwenderhandbuch.md).

## Prüfungen

- Unit-Tests Regellogik: `backend/src/cultures/cultures.test.ts`
- Unit-Tests Editor-Schritte/UI-Pfade: `backend/src/cultures/kultur-editor.test.ts`
  (inkl. INT-000017-Block: gefiltertes Angebot, Sichtbarkeit zugewiesener
  Alt-Einträge, Gruppenpflege, Konsistenz mit `pruefeStaerkeWert`)
- Route-Integrationstests (POST/PATCH gegen Temp-DB):
  `backend/src/routes/library-cultures-test-child.ts`, `backend/src/routes/library-cultures.test.ts`
- Projektprüfungen: `npm test`, `npm run typecheck --workspace=backend`,
  `npm run build --workspace=frontend`
- QA: TC-01–TC-14 (Limits, Gruppen, Meldungstexte, Unabhängigkeit der Gruppen) am
  25.11.2026 erfolgreich ausgeführt.
- QA INT-000017: TC-KULTFILT-01–08 (Angebotssteuerung der Stärken-Dropdowns bei
  „+ Neu" und „Bearbeiten", gefilterte Eintrag-Auswahl in Entweder/Oder-Gruppen,
  Bestandsschutz für Stärken ohne Kostenangabe, Ausschluss von Kosten ≠ 1 inkl.
  Kosten 0, Regression: Talente/Waffentalente/Magieschulen, Tab „Stärken" und
  bestehende Prüfungen) am 25.11.2026 erfolgreich ausgeführt.
