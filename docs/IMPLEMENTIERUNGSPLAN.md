# Implementierungsplan — Max's Character Creator

## Reihenfolge
1. **DB-Schema** — Drizzle ORM + SQLite, alle Entitäten aus User Stories ✅ ABGESCHLOSSEN
   - 1a-1e: Infrastruktur, Tabellen, Migrationen, Env Var, Migration on Startup ✅
2. **Seed-Script** — Initiale Beispieldaten zum Testen ✅ ABGESCHLOSSEN
3. **API-Grundgerüst**
   - 3a. Character CRUD (GET/POST/PATCH/DELETE, XP-Log) ✅
   - 3b. Library CRUD (10 Tabellen, generische Factory) ✅
   - 3c. **Step-Endpoints** (`GET/POST /api/characters/:id/steps/:step`) ⏳ **FEHLT** — war nie implementiert
   - 3d. Derived Values (Formel-Parser + Berechnung) ⏳ FEHLT
4. **UI-Shell** ✅ ABGESCHLOSSEN
   - 4a. Layout + Navigation (Sidebar, 3 Tabs, Zeitschritt-Leiste) ✅
   - 4b. API Integration (Character erstellen, Step Navigation, Save/Load) ✅
5. **Creation Schritt 1-3** ✅ ABGESCHLOSSEN
   - Schritt 1: Schicksal ✅
   - Schritt 2: Rasse ✅
   - Schritt 3: Abstammung ✅
6. **Creation Schritt 4-5** ✅ ABGESCHLOSSEN
   - Schritt 4: Kultur & Kindheit ✅
   - Schritt 5: Ausbildung ✅
7. **Creation Schritt 6-7** ✅ ABGESCHLOSSEN
   - Schritt 6: Attribute ✅
   - Schritt 7: Meisterschaften & Spells ✅
8. **Chronik** — Archiv, XP, Steigerung, Items/Ressourcen ⏳ FEHLT
9. **Bibliothek** — CRUD pro Typ (iterativ) ⏳ FEHLT

## Offene Design-Entscheidungen
- ~~**Skills als Library-Tabelle?**~~ ✅ Erledigt — `skills` Tabelle angelegt
- ~~**XP-Log Tabelle?**~~ ✅ Erledigt — `character_xp_log` angelegt
- ~~**DB-Pfad**~~ ✅ Erledigt — `DATABASE_URL` Umgebungsvariable

## Wichtige Informationen in jedem Sub-Agent-Prompt
- **Welche User Stories** referenziert werden (Dateiname + US-Nummer)
- **Tech-Stack** (React/Vite/TS Frontend, Hono Backend, SQLite/Drizzle ORM)
- **Verzeichnisstruktur** (frontend/, backend/, docs/)
- **Bestehende Dateien** die gelesen/angepasst werden dürfen
- **Format-Vorgabe** (Nur Code, keine Erklärungen)
- **Schreibrecht-Hinweis** ("Du darfst Dateien schreiben/überschreiben")
- **Lösung offen lassen** — Problem und Constraints definieren, aber Lösung dem Agenten überlassen

## Nächste Schritte
1. **Step-Endpoints implementieren** (`GET/POST /api/characters/:id/steps/:step`) — Persistenz war nie implementiert
2. **Manuelle Tests** (38 Testfälle in `docs/TESTPROTOKOLL.md`)
3. **Chronik-Tab** (Archiv, XP, Steigerung)
4. **Bibliothek-Tab** (CRUD für alle Typen)

## Bekannte Fallstricke
- **Polymorphe Tabellen** — SQLite不支持, separate Tabellen pro Library-Typ
- **Dynamische Validierung** — Regeln aus DB lesen, nicht hardcoden
- **State Management** — Creation-Flow braucht sauberes Design (Zustand/Context)
- **Formel-Parser** — `mathjs` oder ähnlich für abgeleitete Werte nutzen
- **Token-Limits** — Jeder Task klein halten (max 1-2 Komponenten + API)
