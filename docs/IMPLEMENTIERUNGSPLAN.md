# Implementierungsplan — Max's Character Creator

## Reihenfolge
1. **DB-Schema** — Drizzle ORM + SQLite, alle Entitäten aus User Stories ✅ ABGESCHLOSSEN
   - 1a. Infrastruktur (drizzle.config.ts, db/index.ts, Scripts) ✅
   - 1b. Character-Tabellen (characters, character_steps) ✅
   - 1c. Library-Tabellen (9 Tabellen) ✅
   - 1d. Character-Mappings (5 Tabellen) ✅
   - 1e. Schema-Update (skills, character_xp_log, DATABASE_URL, Migration on Startup) ✅
   - Migrationen generiert ✅ (18 Tabellen)
2. **Seed-Script** — Initiale Beispieldaten zum Testen ⏳ IN ARBEIT
3. **API-Grundgerüst** — CRUD Endpoints (Characters, Library, Derived Values)
4. **UI-Shell** — React Layout, 3 Tabs, Navigation, State Management
5. **Creation Schritt 1-3** — Schicksal, Rasse, Abstammung
6. **Creation Schritt 4-5** — Kultur & Kindheit, Ausbildung
7. **Creation Schritt 6-7** — Attribute, Meisterschaften & Spells
8. **Chronik** — Archiv, XP, Steigerung, Items/Ressourcen
9. **Bibliothek** — CRUD pro Typ (iterativ)

## Offene Design-Entscheidungen
- ~~**Skills als Library-Tabelle?**~~ ✅ Erledigt — `skills` Tabelle angelegt
- ~~**XP-Log Tabelle?**~~ ✅ Erledigt — `character_xp_log` angelegt
- ~~**DB-Pfad**~~ ✅ Erledigt — `DATABASE_URL` Umgebungsvariable

## Wichtige Informationen in jedem Sub-Agent-Prompt

### Muss enthalten sein
- **Welche User Stories** referenziert werden (Dateiname + US-Nummer)
- **Tech-Stack** (React/Vite/TS Frontend, Hono Backend, SQLite/Drizzle ORM)
- **Verzeichnisstruktur** (frontend/, backend/, docs/)
- **Bestehende Dateien** die gelesen/angepasst werden dürfen
- **Format-Vorgabe** (Nur Code, keine Erklärungen)
- **Schreibrecht-Hinweis** ("Du darfst Dateien schreiben/überschreiben")

### Optional je nach Task
- **Seed-Daten** falls Testdaten nötig
- **API-Endpoints** die bereits existieren
- **UI-Komponenten** die wiederverwendet werden sollen
- **Validierungsregeln** aus den User Stories

### Vermeiden
- Zu viel Kontext auf einmal (Token-Limit)
- Unklare Dateipfade
- Implizite Annahmen über bestehende Struktur

## Bekannte Fallstricke
- **Polymorphe Tabellen** — SQLite不支持, separate Tabellen pro Library-Typ
- **Dynamische Validierung** — Regeln aus DB lesen, nicht hardcoden
- **State Management** — Creation-Flow braucht sauberes Design (Zustand/Context)
- **Formel-Parser** — `mathjs` oder ähnlich für abgeleitete Werte nutzen
- **Token-Limits** — Jeder Task klein halten (max 1-2 Komponenten + API)
