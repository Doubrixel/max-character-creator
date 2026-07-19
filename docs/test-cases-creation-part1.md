### TC-01: Persistente linke Navigationsleiste mit 3 Tabs (Referenz: US-01)
- **Vorbereitung:** Anwendung im Browser öffnen
- **Schritte:**
  1. Prüfe, ob am linken Rand eine Navigationsleiste sichtbar ist
  2. Prüfe, ob die Tabs Creation, Chronik und Bibliothek vorhanden sind
  3. Klicke auf den Tab Chronik
  4. Prüfe, ob der aktive Tab visuell hervorgehoben ist
- **Erwartetes Ergebnis:** Die Leiste ist links fixiert, zeigt 3 klickbare Tabs, der geklickte Tab ist hervorgehoben und die Chronik-Ansicht wird angezeigt
- **Status:** ⏳ Offen

### TC-02: Creation-Shell mit Zeitschritt-Leiste (Referenz: US-02)
- **Vorbereitung:** Anwendung starten und Creation-Tab öffnen
- **Schritte:**
  1. Prüfe, ob oben eine horizontale Zeitschritt-Leiste sichtbar ist
  2. Prüfe, ob alle 7 Schritte angezeigt werden (Schicksal, Rasse, Abstammung, Kultur & Kindheit, Ausbildung, Attributswerte, Meisterschaften & Spells)
  3. Prüfe, ob der aktuelle Schritt hervorgehoben ist
- **Erwartetes Ergebnis:** Alle 7 Schritte sind horizontal sichtbar, der aktuelle Schritt ist visuell hervorgehoben
- **Status:** ⏳ Offen

### TC-03: Navigation Weiter/Zurück mit Autosave (Referenz: US-03)
- **Vorbereitung:** Creation-Prozess starten, im Schritt 1 eine gültige Auswahl treffen
- **Schritte:**
  1. Klicke auf den Weiter-Button (unten rechts)
  2. Prüfe, ob zum nächsten Schritt navigiert wird
  3. Klicke auf den Zurück-Button (unten links)
  4. Prüfe, ob die vorherige Eingabe aus Schritt 1 wiederhergestellt ist
- **Erwartetes Ergebnis:** Navigation funktioniert in beide Richtungen, Eingaben sind nach Rückkehr erhalten
- **Status:** ⏳ Offen

### TC-04: Detail-Panel rechts (1/4 Breite) (Referenz: US-04)
- **Vorbereitung:** Anwendung öffnen und ein auswählbares Element (z.B. Schicksal) anklicken
- **Schritte:**
  1. Klicke auf ein auswählbares Element
  2. Prüfe, ob rechts ein Detail-Panel erscheint
  3. Prüfe, ob das Panel ca. 25% der Fensterbreite einnimmt
  4. Klicke auf den Schließen-Button (X)
- **Erwartetes Ergebnis:** Detail-Panel erscheint rechts mit 1/4 Breite, zeigt Regeltext/Details und kann geschlossen werden
- **Status:** ⏳ Offen

### TC-05: Schritt 1 – Schicksal auswählen (Referenz: US-05)
- **Vorbereitung:** Creation-Prozess starten (Schritt 1: Schicksal)
- **Schritte:**
  1. Prüfe, ob die 4 Optionen angezeigt werden: Die Welt, Die Sonne, Der Mond, Die Sterne
  2. Klicke auf Die Sonne
  3. Prüfe, ob nur diese Option ausgewählt ist und der Weiter-Button aktiv wird
  4. Prüfe, ob im Detail-Panel der Regeltext zu Die Sonne angezeigt wird
- **Erwartetes Ergebnis:** Eine Option ist auswählbar, Weiter-Button wird aktiv, Detail-Panel zeigt Regeltext
- **Status:** ⏳ Offen

### TC-06: Schritt 2 – Rasse als Panels mit Bild (Referenz: US-06)
- **Vorbereitung:** Creation-Prozess starten und zu Schritt 2 (Rasse) navigieren
- **Schritte:**
  1. Prüfe, ob alle Rassen als einzelne Panels/Kacheln dargestellt werden
  2. Prüfe, ob jedes Panel ein kleines Bild und den Namen der Rasse zeigt
  3. Klicke auf ein Rassen-Panel
  4. Prüfe, ob das Detail-Panel rechts zusätzliche Rassen-Infos anzeigt
- **Erwartetes Ergebnis:** Rassen werden als Panels mit Bild und Name angezeigt, Klick öffnet Infos im Detail-Panel
- **Status:** ⏳ Offen

### TC-07: Schritt 2 – Rassen-Popup mit Spezieslaw und Statblock (Referenz: US-07)
- **Vorbereitung:** Zu Schritt 2 navigieren und auf ein Rassen-Panel klicken
- **Schritte:**
  1. Prüfe, ob ein Popup/Modal erscheint
  2. Prüfe, ob das Popup den Spezieslaw (scrollbar) und den Statblock mit Vor- und Nachteilen enthält
  3. Schließe das Popup über den X-Button
  4. Prüfe, ob die Rasse ausgewählt bleibt und der Weiter-Button aktiv ist
- **Erwartetes Ergebnis:** Popup zeigt Spezieslaw und Statblock, Rasse bleibt nach Schließen ausgewählt, Weiter-Button aktiv
- **Status:** ⏳ Offen

### TC-08: Schritt 3 – Abstammung 2d6 manuell eingeben (Referenz: US-08)
- **Vorbereitung:** Zu Schritt 3 (Abstammung) navigieren
- **Schritte:**
  1. Prüfe, ob zwei separate Eingabefelder für Würfel 1 und Würfel 2 sichtbar sind
  2. Trage in Feld 1 den Wert 3 und in Feld 2 den Wert 5 ein
  3. Versuche, einen ungültigen Wert (z.B. 0 oder 7 oder Buchstaben) einzugeben
  4. Prüfe, ob die erwürfelte Herkunft als Text angezeigt wird
- **Erwartetes Ergebnis:** Zwei Eingabefelder akzeptieren nur Werte 1-6, Herkunft wird nach gültiger Eingabe angezeigt
- **Status:** ⏳ Offen

### TC-09: Schritt 3 – Abstammung 2d6 automatisch würfeln (Referenz: US-09)
- **Vorbereitung:** Zu Schritt 3 navigieren
- **Schritte:**
  1. Klicke auf den Auto-Würfel-Button neben den Eingabefeldern
  2. Prüfe, ob zwei zufällige Werte (1-6) in die Eingabefelder übernommen werden
  3. Prüfe, ob die erwürfelte Herkunft angezeigt wird
  4. Überschreibe einen auto-gewürfelten Wert manuell
- **Erwartetes Ergebnis:** Auto-Würfel generiert zufällige Werte, Herkunft wird angezeigt, manuelles Überschreiben ist möglich
- **Status:** ⏳ Offen

### TC-10: Schritt 3 – Abstammungs-Entscheidungen (Referenz: US-10)
- **Vorbereitung:** Zu Schritt 3 navigieren und gültige 2d6-Werte eingeben
- **Schritte:**
  1. Prüfe, ob nach der Eingabe die Abstammungs-Entscheidungen eingeblendet werden
  2. Prüfe, ob jede Entscheidung genau zwei Optionen (binär) zeigt
  3. Prüfe, ob Entscheidungen sequentiell (eine nach der anderen) angezeigt werden
  4. Triff eine Entscheidung und prüfe, ob die nächste erscheint
- **Erwartetes Ergebnis:** Binäre Entscheidungen werden sequentiell eingeblendet, nächste Entscheidung erscheint nach Auswahl
- **Status:** ⏳ Offen

### TC-11: Schritt 3 – Nicht gewählte Option ausgrauen (Referenz: US-11)
- **Vorbereitung:** Zu Schritt 3 navigieren, 2d6-Werte eingeben und erste binäre Entscheidung anzeigen lassen
- **Schritte:**
  1. Triff eine Auswahl bei der ersten binären Entscheidung
  2. Prüfe, ob die gewählte Option hervorgehoben bleibt
  3. Prüfe, ob die nicht gewählte Option ausgegraut/deaktiviert dargestellt wird
- **Erwartetes Ergebnis:** Gewählte Option aktiv, nicht gewählte Option ausgegraut, visueller Unterschied klar erkennbar
- **Status:** ⏳ Offen

### TC-12: Schritt 3 – Entscheidung rückgängig machen (Referenz: US-12)
- **Vorbereitung:** Zu Schritt 3 navigieren, 2d6-Werte eingeben und mindestens eine binäre Entscheidung treffen
- **Schritte:**
  1. Klicke auf den Rückgängig-Button bei der getroffenen Entscheidung
  2. Prüfe, ob beide Optionen wieder wählbar sind
  3. Prüfe, ob das Ausgrauen entfernt wurde
  4. Wähle die alternative Option
- **Erwartetes Ergebnis:** Entscheidung wird zurückgesetzt, beide Optionen wieder wählbar, alternative Wahl möglich
- **Status:** ⏳ Offen

### TC-13: Schritt 3 – Weiter nach allen Abstammungs-Entscheidungen (Referenz: US-13)
- **Vorbereitung:** Zu Schritt 3 navigieren, 2d6-Werte eingeben und alle binären Entscheidungen treffen
- **Schritte:**
  1. Prüfe, ob der Weiter-Button deaktiviert ist, solange nicht alle Entscheidungen getroffen sind
  2. Triff die letzte fehlende Entscheidung
  3. Prüfe, ob der Weiter-Button aktiv wird
  4. Klicke auf Weiter
- **Erwartetes Ergebnis:** Weiter-Button wird nach allen Entscheidungen aktiv, Klick speichert Schritt und navigiert zu Schritt 4
- **Status:** ⏳ Offen

### TC-14: Creation-Schritt Autosave bei Wechsel (Referenz: US-14)
- **Vorbereitung:** Creation-Prozess starten und in Schritt 1 eine Auswahl treffen
- **Schritte:**
  1. Klicke auf Weiter und prüfe, ob automatisch gespeichert wird (ohne manuellen Speichern-Button)
  2. Klicke auf Zurück und prüfe, ob ebenfalls gespeichert wird
  3. Lade die Seite neu oder navigiere zurück zum Schritt
  4. Prüfe, ob alle Eingaben vollständig wiederhergestellt sind
- **Erwartetes Ergebnis:** Autosave erfolgt transparent bei jedem Wechsel, Daten werden bei Rückkehr vollständig wiederhergestellt
- **Status:** ⏳ Offen
