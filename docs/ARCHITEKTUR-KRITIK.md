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

**Status:** Offen.

---

## K3 — API-Fehler werden geschluckt

**Problem:** Laden, Flushen und Speichern sind fire-and-forget mit `.catch(console.error)` bzw. `.catch(() => {})`. Fehler beim Persistieren fallen nicht auf.

**Auswirkung:** Persistenz-Probleme bleiben unentdeckt — der User glaubt, der Charakter sei gespeichert, ist es aber nicht (siehe AGENTS.md „Fehler nicht schlucken").

**Status:** Offen.

---

## K4 — Kein Unique-Constraint auf `(character_id, step_number)`

**Problem:** `character_steps` hat keinen Unique-Constraint; der Upsert in `POST /api/characters/:id/steps/:step` ist Select-then-Insert/Update. Race Conditions können doppelte Schritte erzeugen.

**Auswirkung:** Doppelte Deltas für denselben Schritt; der Recorder überschreibt je nach Laufreihenfolge.

**Status:** Offen.
