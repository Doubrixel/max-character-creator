### TC-13: Live-Counter für Freipunkte (Referenz: US-13)
- **Vorbereitung:** Charaktererstellung bis Schritt 4 (Kultur & Kindheit) starten
- **Schritte:**
  1. Seite laden und oberen Bereich auf Freipunkte-Counter prüfen
  2. Einen Skill per Plus-Button erhöhen
  3. Einen Skill per Minus-Button verringern
  4. Freipunkte bis 0 aufbrauchen
- **Erwartetes Ergebnis:** Counter zeigt initial Gesamtzahl der Freipunkte, aktualisiert sich bei jeder Punktevergabe live, färbt sich rot bei 0 Punkten und Plus-Buttons werden deaktiviert
- **Status:** ⏳ Offen

### TC-14: Skill-Tabelle mit Punkteverteilung (Referenz: US-14)
- **Vorbereitung:** Schritt 4 (Kultur & Kindheit) öffnen
- **Schritte:**
  1. Skill-Tabelle auf drei Sektionen (Talente, Waffenskills, Magieschulen) prüfen
  2. Bei einem Talent den Plus-Button klicken
  3. Bei demselben Talent den Minus-Button klicken
  4. Prüfen, ob Basiswert aus Abstammung angezeigt wird
- **Erwartetes Ergebnis:** Tabelle zeigt drei Sektionen, jede Zeile zeigt Skill-Name, Basiswert, Plus/Minus-Buttons; Plus erhöht Skill und reduziert Freipunkte, Minus reduziert Skill und erhöht Freipunkte (nur wenn Skill > Basiswert)
- **Status:** ⏳ Offen

### TC-15: Oberwert-Validierung für Skills (Referenz: US-15)
- **Vorbereitung:** Schritt 4 öffnen und ausreichend Freipunkte haben
- **Schritte:**
  1. Einen Kampfskill/Talent durch Plus-Klicks auf Wert 6 erhöhen
  2. Versuch, denselben Skill auf 7 zu erhöhen
  3. Eine Magieschule auf 3 erhöhen und versuchen, sie auf 4 zu erhöhen
  4. Eine zweite Magieschule auf 2 erhöhen und versuchen, sie auf 3 zu erhöhen
- **Erwartetes Ergebnis:** Kampfskills/Talente können maximal 6 erreichen; eine Magieschule maximal 3, alle weiteren maximal 2; Plus-Buttons sind bei erreichten Limits deaktiviert
- **Status:** ⏳ Offen

### TC-16: Stärken Stufe 1 Auswahl (Referenz: US-16)
- **Vorbereitung:** Schritt 4 öffnen und bis zum Stärken-Bereich scrollen
- **Schritte:**
  1. Verfügbarkeitsliste der Stufe-1-Stärken prüfen
  2. Keine Stärke auswählen und Weiter-Button prüfen
  3. Eine Stärke auswählen
  4. Auswahl auf eine andere Stärke ändern
- **Erwartetes Ergebnis:** Alle Stufe-1-Stärken werden angezeigt; Weiter-Button ist deaktiviert ohne Auswahl; ausgewählte Stärke wird hervorgehoben; Auswahl kann geändert werden
- **Status:** ⏳ Offen

### TC-17: Meisterschaft aus Skill ≥ 1 (Referenz: US-17)
- **Vorbereitung:** Schritt 4 öffnen und mindestens einem Skill 1 Punkt zuweisen
- **Schritte:**
  1. Meisterschaftsauswahl öffnen und angezeigte Skills prüfen
  2. Einen Skill mit Wert ≥ 1 auswählen
  3. Liste der verfügbaren Meisterschaften prüfen
  4. Eine Meisterschaft auswählen und Weiter-Button prüfen
- **Erwartetes Ergebnis:** Nur Skills mit Wert ≥ 1 werden angeboten; nach Skill-Auswahl werden Meisterschaften angezeigt; Weiter-Button ist erst aktiv nach Wahl von Skill und Meisterschaft
- **Status:** ⏳ Offen

### TC-18: Statblock-Panels für automatische Punkteverteilung (Referenz: US-18)
- **Vorbereitung:** Schritt 4 öffnen
- **Schritte:**
  1. Obere Leiste auf Statblock-Panels prüfen
  2. Ein vorerstelltes Panel anklicken
  3. Live-Counter und Skill-Tabelle auf Aktualisierung prüfen
  4. Panel-Auswahl rückgängig machen (Deselect)
- **Erwartetes Ergebnis:** Panels werden horizontal angezeigt; Klick verteilt automatisch Punkte; Counter und Tabelle aktualisieren sich; Auswahl kann rückgängig gemacht werden
- **Status:** ⏳ Offen

### TC-19: Weiter-Navigation Schritt 4 (Referenz: US-19)
- **Vorbereitung:** Schritt 4 öffnen
- **Schritte:**
  1. Weiter-Button ohne getroffene Auswahl prüfen
  2. Nur Stärke auswählen, Meisterschaft offen lassen
  3. Nur Meisterschaft auswählen, Stärke offen lassen
  4. Beide Pflichtauswahlen treffen und Weiter klicken
- **Erwartetes Ergebnis:** Weiter-Button ist deaktiviert solange Stärke oder Meisterschaft fehlen; bei vollständiger Auswahl wird Zwischenstand gespeichert und zu Schritt 5 navigiert
- **Status:** ⏳ Offen

### TC-20: Statblock-Panels in Ausbildung (Referenz: US-20)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen
- **Schritte:**
  1. Obere Leiste auf Statblock-Panels prüfen
  2. Ein Panel anklicken und Punkteverteilung beobachten
  3. Panel abwählen
  4. Manuell Punkte in der Tabelle verteilen
- **Erwartetes Ergebnis:** Panel-Leiste wird angezeigt; Panel-Auswahl verteilt Punkte automatisch; manuelle Verteilung bleibt möglich; Panel kann abgewählt werden
- **Status:** ⏳ Offen

### TC-21: 2 Stärken-Punkte in Ausbildung (Referenz: US-21)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen
- **Schritte:**
  1. Counter auf initiale Anzeige von 2 Stärken-Punkten prüfen
  2. Ersten Stärken-Punkt verteilen
  3. Zweiten Stärken-Punkt verteilen
  4. Weiter-Button vor und nach Verteilung prüfen
- **Erwartetes Ergebnis:** Counter zeigt initial 2; reduziert sich bei jeder Wahl; Weiter-Button ist deaktiviert bis beide Punkte verteilt sind
- **Status:** ⏳ Offen

### TC-22: 30 Freipunkte auf Fertigkeiten (Referenz: US-22)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen
- **Schritte:**
  1. Counter auf initiale Anzeige von 30 FP prüfen
  2. Kampfskill/Talent durch Plus-Klicks auf 6 erhöhen und auf 7 versuchen
  3. Magieschule um 3 Punkte erhöhen und auf 4. Punkt versuchen
  4. Magieschule auf Gesamtwert 4 erhöhen und auf 5 versuchen
  5. Alle 30 FP verteilen und Weiter-Button prüfen
- **Erwartetes Ergebnis:** 30 FP Counter angezeigt; Kampf/Talent max 6; Magie max 3 Punkte in diesem Schritt und Gesamtwert max 4; Plus-Buttons deaktivieren sich bei Limits; Weiter-Button aktiv nach Verteilung aller 30 FP
- **Status:** ⏳ Offen

### TC-23: Magie-Sonderregeln in Ausbildung (Referenz: US-23)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen
- **Schritte:**
  1. Magieschule auswählen und um 4 Punkte in einem Schritt erhöhen versuchen
  2. Magieschule mit Basiswert 2 auf Gesamtwert 5 erhöhen versuchen
  3. Gültige Erhöhung durchführen und dann Server-Validierung durch ungültigen Request prüfen
- **Erwartetes Ergebnis:** Magieschule kann nicht um mehr als 3 Punkte erhöht werden; Gesamtwert kann 4 nicht überschreiten; beide Regeln werden client- und serverseitig validiert; Fehlermeldung bei Server-Validierungsfehler
- **Status:** ⏳ Offen

### TC-24: 2 Ressourcen steigern in Ausbildung (Referenz: US-24)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen und Fertigkeitsverteilung abschließen
- **Schritte:**
  1. Liste der verfügbaren Ressourcen prüfen
  2. Ersten Ressourcen-Punkt verteilen
  3. Zweiten Ressourcen-Punkt verteilen
  4. Eine Auswahl rückgängig machen und Counter prüfen
- **Erwartetes Ergebnis:** Alle Ressourcen werden angezeigt; Counter zeigt verbleibende Punkte; Weiter-Button ist deaktiviert bis beide Punkte verteilt sind; Auswahl kann geändert werden
- **Status:** ⏳ Offen

### TC-25: Weiter-Navigation Schritt 5 (Referenz: US-25)
- **Vorbereitung:** Schritt 5 (Ausbildung) öffnen
- **Schritte:**
  1. Weiter-Button ohne Verteilung prüfen
  2. Nur 2 Stärken verteilen, FP und Ressourcen offen lassen
  3. Nur 30 FP verteilen, Stärken und Ressourcen offen lassen
  4. Nur 2 Ressourcen verteilen, Stärken und FP offen lassen
  5. Alle drei Verteilungen abschließen und Weiter klicken
- **Erwartetes Ergebnis:** Weiter-Button ist deaktiviert bis alle drei Bedingungen erfüllt sind (2 Stärken, 30 FP, 2 Ressourcen); bei Klick wird Zwischenstand gespeichert und zu Schritt 6 navigiert
- **Status:** ⏳ Offen

### TC-26: 10x 4d6 Attributswürfeln (Referenz: US-26)
- **Vorbereitung:** Schritt 6 (Attribute) öffnen
- **Schritte:**
  1. 10 Eingabefelder für Attribute prüfen
  2. Auto-Würfel-Button klicken
  3. Für jeden Wurf die 4 Einzelwürfel und die Summe der höchsten 3 prüfen
  4. Alternative manuelle Eingabe in einem Feld testen
- **Erwartetes Ergebnis:** 10 Eingabefelder angezeigt; Auto-Wurf wirft 10x 4d6; jeder Wurf zeigt 4 Einzelwürfel und Summe der höchsten 3; manuelle Eingabe ist alternativ möglich
- **Status:** ⏳ Offen

### TC-27: Attributswerte zuordnen (Referenz: US-27)
- **Vorbereitung:** Schritt 6 öffnen und 10 Werte erwürfeln oder manuell eingeben
- **Schritte:**
  1. Pool der 10 erwürfelten Werte und 10 Attribut-Slots prüfen
  2. Einen Wert aus dem Pool einem Attribut zuordnen (Drag & Drop oder Klick)
  3. Versuch, denselben Wert einem zweiten Attribut zuzuordnen
  4. Zuordnung rückgängig machen (Wert zurück in Pool)
  5. Alle 10 Werte zuordnen und Weiter-Button prüfen
- **Erwartetes Ergebnis:** Werte-Pool und Attribut-Slots angezeigt; Zuordnung funktioniert; jeder Wert kann nur einmal zugeordnet werden; Zuordnung kann rückgängig gemacht werden; Weiter-Button aktiv nach vollständiger Zuordnung
- **Status:** ⏳ Offen

### TC-28: Abgeleitete Werte live berechnen (Referenz: US-28)
- **Vorbereitung:** Schritt 6 öffnen und erste Attributwerte zuordnen
- **Schritte:**
  1. Bereich unter den Attributen auf abgeleitete Werte prüfen
  2. Berechnungsformeln bei jedem abgeleiteten Wert prüfen
  3. Einen Attributwert ändern und abgeleitete Werte auf Live-Aktualisierung prüfen
  4. Formel-Anzeige mit eingesetzten Attributwerten prüfen (z.B. `Lebenspunkte = 10 + MU * 2`)
- **Erwartetes Ergebnis:** Alle abgeleiteten Werte werden angezeigt; jeder zeigt Berechnungsformel; Werte aktualisieren sich live bei Attribut-Zuordnung; Formel wird mit eingesetzten Werten angezeigt
- **Status:** ⏳ Offen

### TC-29: Weiter-Navigation Schritt 6 (Referenz: US-29)
- **Vorbereitung:** Schritt 6 (Attribute) öffnen
- **Schritte:**
  1. Weiter-Button ohne Zuordnung prüfen
  2. 9 von 10 Werten zuordnen und Weiter-Button prüfen
  3. Alle 10 Werte zuordnen und Weiter-Button prüfen
  4. Weiter klicken
- **Erwartetes Ergebnis:** Weiter-Button ist deaktiviert bis alle 10 Attribute belegt sind; bei Klick wird Zwischenstand gespeichert und zu Schritt 7 navigiert
- **Status:** ⏳ Offen

### TC-30: Meisterschaft für Skill Wert 6 (Referenz: US-30)
- **Vorbereitung:** Schritt 7 (Meisterschaften & Spells) öffnen mit mindestens einem Skill mit Wert 6
- **Schritte:**
  1. Liste der Skills mit Wert 6 prüfen (auswählbar markiert)
  2. Auf einen Skill mit Wert 6 klicken
  3. Skill-spezifische Meisterschaftsliste prüfen
  4. Eine Meisterschaft auswählen und im Charakterbogen prüfen
- **Erwartetes Ergebnis:** Skills mit Wert 6 sind als auswählbar markiert; Meisterschafts-Auswahl öffnet sich; gewählte Meisterschaft wird im Charakterbogen angezeigt
- **Status:** ⏳ Offen

### TC-31: Spells nach Magie-Schwellenwerten (Referenz: US-31)
- **Vorbereitung:** Schritt 7 öffnen mit Magieschulen mit Werten 1, 3 und 6
- **Schritte:**
  1. Magieschule mit Wert ≥ 1 auf Lvl-0-Spells prüfen
  2. Magieschule mit Wert ≥ 3 auf Lvl-1-Spells prüfen
  3. Magieschule mit Wert ≥ 6 auf Lvl-2-Spells prüfen
  4. Pro Schwellenwert einen Spell auswählen und Details (Name, Wirkung, Kosten) prüfen
- **Erwartetes Ergebnis:** Magieschulen zeigen Spells entsprechend Schwellenwert (1→Lvl 0, 3→Lvl 1, 6→Lvl 2); pro Schwellenwert ein Spell wählbar; Spell-Modal zeigt Details
- **Status:** ⏳ Offen

### TC-32: 3-Punkt-Meisterschaften verteilen (Referenz: US-32)
- **Vorbereitung:** Schritt 7 öffnen
- **Schritte:**
  1. Counter auf 3 Meisterschafts-Punkte prüfen
  2. Erste Meisterschaft auswählen
  3. Zweite und dritte Meisterschaft auswählen
  4. Weiter-Button vor und nach Verteilung prüfen
- **Erwartetes Ergebnis:** 3 Punkte Counter angezeigt; jede Meisterschaft kostet 1 Punkt; Counter reduziert sich; Weiter-Button deaktiviert bis alle 3 Punkte verteilt sind
- **Status:** ⏳ Offen

### TC-33: 5 Talentpunkte verteilen (Referenz: US-33)
- **Vorbereitung:** Schritt 7 öffnen
- **Schritte:**
  1. Counter auf 5 Talentpunkte prüfen
  2. Talent-Liste mit Plus/Minus-Buttons prüfen
  3. Ein Talent durch Plus-Klicks auf 6 erhöhen und auf 7 versuchen
  4. Alle 5 Punkte verteilen und Weiter-Button prüfen
- **Erwartetes Ergebnis:** 5 Talentpunkte Counter angezeigt; Talente mit Plus/Minus; kein Talent über 6 möglich; Plus-Buttons bei Wert 6 deaktiviert; Weiter-Button aktiv nach Verteilung aller 5 Punkte
- **Status:** ⏳ Offen

### TC-34: 1 Ressourcenpunkt verteilen (Referenz: US-34)
- **Vorbereitung:** Schritt 7 öffnen
- **Schritte:**
  1. Counter auf 1 Ressourcenpunkt prüfen
  2. Liste der verfügbaren Ressourcen prüfen
  3. Eine Ressource auswählen
  4. Weiter-Button vor und nach Verteilung prüfen
- **Erwartetes Ergebnis:** 1 Ressourcenpunkt Counter angezeigt; Ressourcenliste verfügbar; Ressource kann ausgewählt werden; Weiter-Button deaktiviert bis Punkt verteilt ist
- **Status:** ⏳ Offen

### TC-35: Charakter fertigstellen und speichern (Referenz: US-35)
- **Vorbereitung:** Alle vorherigen Schritte (1-7) abschließen
- **Schritte:**
  1. "Charakterbogen fertigstellen"-Button prüfen
  2. Button klicken und Validierung beobachten
  3. Speicherung und Status "fertiggestellt" prüfen
  4. Chroniken-Tab auf neuen Charakter prüfen
  5. Start-XP (15 XP) im Charakterbogen prüfen
- **Erwartetes Ergebnis:** Button ist aktiv bei abgeschlossenen Schritten; Charakter wird validiert und gespeichert; erscheint im Chroniken-Tab; erhält 15 Start-XP; Erfolgs-Feedback wird angezeigt; Navigation zu Chroniken oder Charakter-Sheet
- **Status:** ⏳ Offen

### TC-36: Weiter-Navigation Schritt 7 (Referenz: US-36)
- **Vorbereitung:** Schritt 7 (Meisterschaften & Spells) öffnen
- **Schritte:**
  1. Weiter-Button ohne jegliche Auswahl prüfen
  2. Nur Skill-6-Meisterschaften wählen, restliche offen lassen
  3. Nur Magie-Spells wählen, restliche offen lassen
  4. Nur 3 Meisterschaftspunkte verteilen, restliche offen lassen
  5. Nur 5 Talentpunkte verteilen, restliche offen lassen
  6. Nur 1 Ressourcenpunkt verteilen, restliche offen lassen
  7. Alle Bedingungen erfüllen und Button-Änderung zu "Charakterbogen fertigstellen" prüfen
- **Erwartetes Ergebnis:** Weiter-Button ist deaktiviert bis alle fünf Bedingungen erfüllt sind; bei Erfüllung ändert sich Button zu "Charakterbogen fertigstellen"
- **Status:** ⏳ Offen
