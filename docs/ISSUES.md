# Issues — Max's Character Creator

**Stand:** 2026-07-19
**Quelle:** Manuelles Testprotokoll (TC-01 bis TC-38)

---

## BUG-01: Detail-Panel kann nicht geschlossen werden
- **Betroffen:** TC-04 (Detail-Panel rechts)
- **Beschreibung:** Das Detail-Panel erscheint nach Auswahl, hat aber keinen Schließen-Button (X) oder reagiert nicht auf Klick außerhalb.
- **Schweregrad:** Mittel (UX-Problem)
- **Zusatz:** Panel erscheint nur in Schritt 1 und 2, nicht in späteren Schritten.

## BUG-02: Schritt 3 Entscheidungen — Undo-Logik fehlerhaft
- **Betroffen:** TC-10, TC-12 (Abstammungs-Entscheidungen)
- **Beschreibung:** Wenn man eine frühere Entscheidung rückgängig macht, bleiben spätere Entscheidungen erhalten und sind bearbeitbar. Die UI zeigt inkonsistente Zustände.
- **Schweregrad:** Mittel (Logik-Fehler) — *Fix versucht, Verhalten bleibt aber laut Tester nicht kritisch.*

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

## BUG-08: Schritt 6 Würfel-Pool Manipulation
- **Betroffen:** TC-28 (Attributswürfel)
- **Beschreibung:** Manuelle Eingabe in die Attribut-Felder *nach* der Zuordnung manipuliert den Würfel-Pool inkonsistent.
- **Schweregrad:** Mittel (UX/Logik)

## BUG-09: Schritt 7 Meisterschaften/Spells Logik fehlt
- **Betroffen:** TC-32, TC-33 (Meisterschaften & Spells)
- **Beschreibung:** Es gibt keine Skills mit Wert 6 (da Schritte 4 & 5 nicht korrekt verknüpft sind) und keine Skill-spezifische Meisterschaftsliste. Magie-Schwellenwerte und Spells fehlen komplett.
- **Schweregrad:** Hoch (Feature fehlt / Datenfluss defekt)

## BUG-10: Schritt 7 Talentpunkte & UI-Verwirrung
- **Betroffen:** TC-34, TC-35, TC-38 (Schritt 7 UI)
- **Beschreibung:** 
  - Talentpunkte starten bei 0, man kann sie mit 5 Punkten nicht auf 6 erhöhen.
  - UI zeigt zwei Buttons ("Weiter" + "Fertigstellen") statt einem sich ändernden Button.
  - 3-Punkt-Meisterschaften zwingen zur Auswahl aller 3.
- **Schweregrad:** Mittel (UX/Logik)

## BUG-11: State-Konsistenz über Creation-Schritte
- **Betroffen:** Generelle Anmerkung im Testprotokoll
- **Beschreibung:** Jeder Schritt tut so, als wäre Punkteverteilung etwas Neues, und "vergisst" was in vorherigen Schritten vergeben wurde. Skills/Werte aus Schritt 4/5 sollten in Schritt 7 sichtbar sein.
- **Schweregrad:** Hoch (Architektur/State-Management)

---

## Anmerkungen aus Tests
- **TC-02:** Zeitschritt-Leiste ist funktional, aber optisch verbesserungswürdig.
- **TC-07:** Rassen-Popup wird als "nervig" empfunden (UX-Feedback).
- **TC-19:** Aktuell nur eine Meisterschaft für Elementarmagie vorhanden (Seed-Daten unvollständig).
