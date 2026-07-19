# Issues — Max's Character Creator

**Stand:** 2026-07-19
**Quelle:** Manuelles Testprotokoll (TC-01 bis TC-27)

---

## BUG-01: Detail-Panel kann nicht geschlossen werden
- **Betroffen:** TC-04 (Detail-Panel rechts)
- **Beschreibung:** Das Detail-Panel erscheint nach Auswahl, hat aber keinen Schließen-Button (X) oder reagiert nicht auf Klick außerhalb.
- **Schweregrad:** Mittel (UX-Problem)
- **Zusatz:** Panel erscheint nur in Schritt 1 und 2, nicht in späteren Schritten.

## BUG-02: Schritt 3 Entscheidungen — Undo-Logik fehlerhaft
- **Betroffen:** TC-10, TC-12 (Abstammungs-Entscheidungen)
- **Beschreibung:** Wenn man eine frühere Entscheidung rückgängig macht, bleiben spätere Entscheidungen erhalten und sind bearbeitbar. Die UI zeigt inkonsistente Zustände (z.B. ausgegraute Optionen die trotzdem aktiv sind).
- **Schweregrad:** Hoch (Logik-Fehler)

## BUG-03: Kein Basiswert aus Abstammung in Skill-Tabelle
- **Betroffen:** TC-16 (Skill-Tabelle mit Punkteverteilung)
- **Beschreibung:** Die Skill-Tabelle zeigt keinen Basiswert aus Schritt 3 (Abstammung) an. Jede Zeile sollte den aktuellen Skill-Wert inkl. eventueller Boni aus der Abstammung anzeigen.
- **Schweregrad:** Mittel (Feature fehlt)

## BUG-04: Meisterschaft-Auswahl wird nach Neuladen nicht angezeigt
- **Betroffen:** TC-21 (Weiter-Navigation Schritt 4)
- **Beschreibung:** Nach Browser-Refresh wird im Meisterschafts-Bereich nicht angezeigt, dass eine Meisterschaft gewählt wurde. Der Weiter-Button bleibt trotzdem aktiv.
- **Schweregrad:** Mittel (Persistenz/Visualisierung)

## BUG-05: Statblock-Panels fehlen in Schritt 4 und 5
- **Betroffen:** TC-20, TC-22 (Statblock-Panels)
- **Beschreibung:** Die Statblock-Panels für automatische Punkteverteilung sind in Schritt 4 (Kultur) und Schritt 5 (Ausbildung) nicht sichtbar.
- **Schweregrad:** Mittel (Feature fehlt)

## BUG-06: Magie-Oberwert-Validierung in Schritt 5 fehlerhaft
- **Betroffen:** TC-24, TC-25 (Magie-Sonderregeln)
- **Beschreibung:** In Schritt 5 kann Magie auf 4 und 3 gleichzeitig gestellt werden (Summe 7 statt max 4). Die Regel "max 3 Punkte pro Schritt, max Gesamtwert 4" wird nicht korrekt durchgesetzt.
- **Schweregrad:** Hoch (Validierungs-Fehler)

## BUG-07: Fertigkeitspunkte lassen sich nach Neuladen nicht zurücknehmen
- **Betroffen:** TC-27 (Weiter-Navigation Schritt 5)
- **Beschreibung:** Nach Browser-Refresh lassen sich verteilte Fertigkeitspunkte nicht mehr per Minus-Button zurücknehmen. Die Weiter-Logik (Button deaktiviert bis alle verteilt) funktioniert aber.
- **Schweregrad:** Mittel (Persistenz/Interaktion)

---

## Anmerkungen aus Tests
- **TC-02:** Zeitschritt-Leiste ist funktional, aber optisch verbesserungswürdig.
- **TC-07:** Rassen-Popup wird als "nervig" empfunden (UX-Feedback).
- **TC-19:** Aktuell nur eine Meisterschaft für Elementarmagie vorhanden (Seed-Daten unvollständig).
