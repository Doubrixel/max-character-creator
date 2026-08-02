# Implementierungsplan

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
