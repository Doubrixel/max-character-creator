# K3 — API-Fehler nicht mehr schlucken: Batch-Plan

**Status:** Umsetzung abgeschlossen (02-08-2026). Alle Batches 1–4 erledigt, `tsc` grün.

**Ziel:** Alle 14 Fehler-Swallows (`catch(() => {})`) durch sichtbare Fehler ersetzen. Globales Banner, Navigation bei Speicherfehler blockiert.

**Mechanik (Batch 1, Neu):**
- `AppContext`: State `apiError: string | null` + `reportApiError(message)` + `clearApiError()`.
- Neu `frontend/src/components/ErrorBanner.tsx`: schließbares Banner (CSS-Vars `--danger`/`--bg-error`).
- `App.tsx`: `<ErrorBanner />` in `<main>` oberhalb `<AppContent />`.

**Prinzip:** Fehler werden nie still geschluckt. `reportApiError()` setzt Banner + `console.error`. `!res.ok` gilt als Fehler (nicht nur Netzwerkfehler).

---

## Batch 1 — Mechanik + Persistenz (Kern)

**`frontend/src/context/AppContext.tsx`**
- `flushCurrentStep` → `Promise<boolean>`; bei Netzwerkfehler oder `!res.ok` → `reportApiError('Speichern fehlgeschlagen: …')` + `return false`.
- `saveStep` → `Promise<boolean>`; gleiche Logik.
- `loadCharacter`: pro Schritt `res.ok` prüfen (kein stilles `d.delta || {}`); fehlgeschlagene zählen → `reportApiError('N Schritt(e) konnten nicht geladen werden')`; erfolgreiche anwenden. Äußeres catch → `reportApiError`.
- `createCharacter`: try/catch → `reportApiError`.
- `validateStep`: bei Fehler → `reportApiError` + `{ valid: false, errors: ['Validierung nicht möglich'] }`.
- Initial-`useEffect` (Charakterliste): `res.ok` prüfen + catch → `reportApiError`.
- `reportApiError`/`clearApiError` im Provider-Value.

**Neu `frontend/src/components/ErrorBanner.tsx`**
- Nutzt `useAppContext()` → `apiError`, `clearApiError`.
- Rendert nichts bei `null`; sonst rotes Banner mit Schließen-Button.

**`frontend/src/App.tsx`**
- `<ErrorBanner />` einbinden (unter AppProvider).

**`frontend/src/components/CreationView.tsx`**
- `handleNext`/`handleBack`/`handleStepClick`: `if (!(await flushCurrentStep())) return` — kein Schrittwechsel bei Speicherfehler.

---

## Batch 2 — Chronik

**`frontend/src/components/chronicle/ChronicleView.tsx`**
- Listen-Load: `res.ok` prüfen + catch → `reportApiError('Chronik konnte nicht geladen werden')`.
- `handleDelete`: `else`-Zweig bei `!res.ok` → `reportApiError('Löschen fehlgeschlagen')` (aktuell silent).

**`frontend/src/components/chronicle/CharacterSheet.tsx`**
- Load-catch → `reportApiError('Charakter konnte nicht geladen werden')` + lokales Error-Flag (unterscheidet Ladefehler von 404 „nicht gefunden").
- `handleDelete`: `else`-Zweig → `reportApiError`.

---

## Batch 3 — Step-Daten-Fetches

- **`frontend/src/components/creation/RasseStep.tsx`** (Z. 54): catch → `reportApiError('Bibliotheksdaten konnten nicht geladen werden')`.
- **`frontend/src/components/creation/KulturSelectStep.tsx`** (Z. 32): catch → `reportApiError`.
- **`frontend/src/components/creation/KindheitStep.tsx`** (Z. 80): catch → `reportApiError`.
- **`frontend/src/components/creation/AusbildungStep.tsx`** (Z. 67): catch → `reportApiError`.

---

## Batch 4 — Library-Views

- **`frontend/src/components/library/LibraryTable.tsx`** (Z. 66, 73): catch → `reportApiError`.
- **`frontend/src/components/library/MasteriesView.tsx`** (Z. 186): catch → `reportApiError`.
- **`frontend/src/components/library/SkillsView.tsx`** (Z. 50): catch → `reportApiError`.
- **`frontend/src/components/library/StrengthsView.tsx`** (Z. 40): catch → `reportApiError`.
- **`frontend/src/components/library/RasseForm.tsx`** (Z. 62): catch → `reportApiError`.

---

## Verifikation (nach Batch 4)

1. `npx tsc -p frontend/tsconfig.json --noEmit`
2. Manuell: Backend gestoppt → App laden → Banner erscheint, Weiter blockiert; Backend starten → Banner schließen → Retry speichert. Bibliothek-/Chronik-Tab bei gestopptem Backend: Banner statt leerer Listen.
