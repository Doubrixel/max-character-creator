# Architektur-Kritikpunkte

Gefunden beim Architektur-Review. Reihenfolge = Priorität.

## K1 — Reducer-Dopplung mit Drift

**Problem:** Die Charakter-Berechnung existiert zweimal:
- `backend/src/reducers/index.ts`
- `frontend/src/shared/reducers.ts`

Beide sind bereits auseinandergelaufen. Beispiele:
- Formeln Schritt 7: Backend `LP = 10 + KO*2`, Frontend `LP = (Groessenklasse + KON)*5`; Backend liefert `AP/MP/WP/AW`, Frontend `FK/SP/VTD/KW/GW/SS/INI`.
- Schritt 3 (Abstammung): Backend speichert das Delta nur, Frontend wertet die Wahlen in Skills/Ressourcen aus.

**Auswirkung:** Der Charakterbogen in der Chronik (vom Backend berechnet) kann andere Werte zeigen als die Live-Vorschau im Creator (vom Frontend berechnet). Ohne Fix driften die beiden Kopien weiter auseinander.

**Lösung:** Eine Single Source of Truth. Die Reducer + Herkunfts-Helfer wandern in ein gemeinsames Workspace-Package (`@mcc/shared`); Frontend und Backend importieren daraus.

**Status:** Behoben (02-08-2026).

---

## K2 — Schritt-8-Delta wird nicht geladen

**Problem:** `loadCharacter` in `frontend/src/context/AppContext.tsx` lädt nur die Schritte 1–7, Schritt 8 (Meisterschaften & Spells) fehlt.

**Auswirkung:** Nach dem Neuladen fehlen im Creator die im letzten Schritt getroffenen Entscheidungen; der Rechner-Status ignoriert Schritt 8.

**Status:** Behoben (02-08-2026) — `loadCharacter` lädt jetzt die Schritte 1–8.

---

## K2.1 — Off-by-one-Drift durch numerische Schritt-Indizes (Wurzelursache)

**Problem:** Schritte wurden als Zahlen (1–8) durchgereicht. Komponenten schrieben Deltas auf Index 5/5/6/7 statt 6/7/8; Reducer lasen `reducer[step]` aus einem hartkodierten Array. Ein einzelner Versatz verschiebt das gesamte System — durch eine Längenprüfung (`length: 8`) nicht erkennbar.

**Auswirkung:** Persistenz- und Rechenzustand drifteten; Schritt-8-Inhalt verschob sich in Schritt 7 u. ä. Der `length: 8`-Fix war wirkungslos, da die tatsächlichen Indizes falsch waren.

**Lösung:** Schritt-Indizes durch ein typisiertes StepKey-Schema ersetzt:
- `shared/src/steps.ts`: `STEP_ORDER` (semantische Schlüssel), `isStepKey()`, typisierte Deltas pro Schritt.
- `shared/src/reducers.ts`: `Record<StepKey, Reducer>` statt Array-Index.
- Backend-Persistenz auf `step_key` + Unique-Index `(character_id, step_key)`.
- `loadCharacter`/`saveStep`/`computeBaseStats` im Frontend auf StepKey umgestellt.

**Status:** Behoben (02-08-2026) — durch StepKey-Refactor strukturell unmöglich gemacht.

---

## K3 — API-Fehler werden geschluckt

**Problem:** Laden, Flushen und Speichern sind fire-and-forget mit `.catch(console.error)` bzw. `.catch(() => {})`. Fehler beim Persistieren fallen nicht auf.

**Auswirkung:** Persistenz-Probleme bleiben unentdeckt — der User glaubt, der Charakter sei gespeichert, ist es aber nicht (siehe AGENTS.md „Fehler nicht schlucken").

**Status:** Behoben (02-08-2026) — `apiError`/`reportApiError`/`clearApiError` im AppContext, globales `ErrorBanner` in `App.tsx`. Alle 14 Fehler-Swallows (AppContext, CreationView, ChronicleView, CharacterSheet, Step-Komponenten, Library-Views) melden jetzt über das Banner; Navigation blockiert bei Speicherfehler (`flushCurrentStep` → `Promise<boolean>`).

---

## K4 — Kein Unique-Constraint auf `(character_id, step_number)`

**Problem:** `character_steps` hat keinen Unique-Constraint; der Upsert in `POST /api/characters/:id/steps/:step` ist Select-then-Insert/Update. Race Conditions können doppelte Schritte erzeugen.

**Auswirkung:** Doppelte Deltas für denselben Schritt; der Recorder überschreibt je nach Laufreihenfolge.

**Status:** Behoben (02-08-2026) — Unique-Index `character_steps_character_id_step_key_unique` auf `(character_id, step_key)` eingeführt (Schema + Migration-Rebuild).
