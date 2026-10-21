# Implementierungsplan

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
