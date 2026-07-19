### US-01: Persistente linke Navigationsleiste mit 3 Tabs (P0)
Als Spieler möchte ich eine stets sichtbare linke Navigationsleiste mit den Tabs Creation, Chronik und Bibliothek, um zwischen den Hauptbereichen der Anwendung zu wechseln.
- [ ] AC1: Die Leiste ist am linken Rand fixiert und bleibt bei allen Ansichten sichtbar
- [ ] AC2: Drei klickbare Tabs sind vorhanden: Creation, Chronik, Bibliothek
- [ ] AC3: Klick auf einen Tab öffnet die zugehörige Ansicht im restlichen Fensterbereich
- [ ] AC4: Der aktive Tab ist visuell hervorgehoben
- Frontend: `SidebarNav`-Komponente mit Tab-State-Management
- Backend: Keiner

### US-02: Creation-Shell mit Zeitschritt-Leiste (P0)
Als Spieler möchte ich im Creation-Tab oben eine Zeitleiste mit allen Schritten sehen, um meinen Fortschritt im Charaktererstellungsprozess zu erkennen.
- [ ] AC1: Die Zeitschritt-Leiste zeigt alle 7 Schritte horizontal nebeneinander an (Schicksal, Rasse, Abstammung, Kultur & Kindheit, Ausbildung, Attributswerte, Meisterschaften & Spells)
- [ ] AC2: Der aktuelle Schritt ist visuell hervorgehoben
- [ ] AC3: Die Leiste bleibt während der gesamten Creation sichtbar
- [ ] AC4: Bereits besuchte Schritte sind als abgeschlossen markiert
- Frontend: `CreationTimeline`-Komponente
- Backend: Keiner

### US-03: Navigation Weiter/Zurück mit Autosave (P0)
Als Spieler möchte ich mit Weiter- und Zurück-Buttons unten links/rechts zwischen Schritten navigieren, wobei jeder Wechsel den aktuellen Stand automatisch speichert.
- [ ] AC1: Ein Weiter-Button ist unten rechts platziert und wird aktiv, sobald alle required Entscheidungen des aktuellen Schritts getroffen sind
- [ ] AC2: Ein Zurück-Button ist unten links platziert und navigiert zum vorherigen Schritt
- [ ] AC3: Bei jedem Wechsel (vor und zurück) wird der aktuelle Schritt-Zwischenstand automatisch gespeichert
- [ ] AC4: Beim Zurückkehren zu einem bereits besuchten Schritt sind alle vorherigen Eingaben wiederhergestellt
- [ ] AC5: Der Weiter-Button ist deaktiviert (grau/outlined), solange required Eingaben fehlen
- Frontend: `CreationShell` mit `NavigationButtons`-Komponente, Autosave-Logik im State-Management
- Backend: `POST /api/characters/:id/steps/:stepNumber` (Speichern eines Schritts), `GET /api/characters/:id/steps/:stepNumber` (Laden eines Schritts)

### US-04: Detail-Panel rechts (1/4 Breite) (P0)
Als Spieler möchte ich beim Auswählen eines Elements rechts ein Detail-Panel sehen, das ein Viertel der Breite einnimmt und ausführliche Informationen anzeigt.
- [ ] AC1: Das Detail-Panel erscheint am rechten Rand, sobald ein auswählbares Element (z.B. Schicksal, Rasse) angeklickt wird
- [ ] AC2: Das Panel belegt exakt 25% (1/4) der Fensterbreite
- [ ] AC3: Es zeigt den ausführlichen Regeltext und/oder Details zum ausgewählten Element
- [ ] AC4: Das Panel kann geschlossen werden (z.B. X-Button oder Klick außerhalb)
- [ ] AC5: Das Panel ist kontextsensitiv und zeigt je nach Schritt unterschiedliche Inhalte
- Frontend: `DetailPanel`-Komponente (Slide-in von rechts, 25% width)
- Backend: `GET /api/rules/:entityType/:entityId` (Regeltext abrufen)

### US-05: Schritt 1 – Schicksal auswählen (P0)
Als Spieler möchte ich im ersten Schritt mein Schicksal wählen können, indem ich zwischen Die Welt, Die Sonne, Der Mond und Die Sterne auswähle.
- [ ] AC1: Vier auswählbare Optionen werden angezeigt: Die Welt, Die Sonne, Der Mond, Die Sterne
- [ ] AC2: Klick auf eine Option markiert sie als ausgewählt
- [ ] AC3: Nach der Auswahl wird im rechten Detail-Panel (1/4 Breite) der ausführliche Regeltext zum gewählten Schicksal angezeigt
- [ ] AC4: Der Weiter-Button wird erst nach einer Auswahl aktiviert
- [ ] AC5: Nur eine Option kann gleichzeitig ausgewählt werden (Single-Select)
- Frontend: `SchicksalSelection`-Komponente mit 4 Auswahlkarten
- Backend: `GET /api/destinies` (Verfügbare Schicksale laden), `GET /api/destinies/:id/rules` (Regeltext für Detail-Panel)

### US-06: Schritt 2 – Rasse als Panels mit Bild (P0)
Als Spieler möchte ich alle verfügbaren Rassen als einzelne Panels mit kleinem Bild sehen, um eine visuelle Übersicht zu haben.
- [ ] AC1: Alle Rassen werden als einzelne Panels/Kacheln in einer Grid- oder Listenansicht dargestellt
- [ ] AC2: Jedes Panel zeigt ein kleines Bild der Rasse
- [ ] AC3: Jedes Panel zeigt den Namen der Rasse
- [ ] AC4: Klick auf ein Panel wählt die Rasse aus und öffnet ein Popup
- [ ] AC5: Das rechte Detail-Panel (1/4 Breite) zeigt zusätzliche Rassen-Infos an
- Frontend: `RasseGrid`-Komponente mit `RasseCard`-Subkomponenten
- Backend: `GET /api/races` (Alle Rassen mit Bild-URL laden), `GET /api/races/:id` (Rassendetails)

### US-07: Schritt 2 – Rassen-Popup mit Spezieslaw und Statblock (P0)
Als Spieler möchte ich nach Auswahl einer Rasse ein Popup sehen, das den ausführlichen Spezieslaw und den Statblock (Vor- und Nachteile) enthält, um die Regeln zu verstehen.
- [ ] AC1: Ein Popup/Modal erscheint nach Klick auf ein Rassen-Panel
- [ ] AC2: Das Popup enthält den ausführlichen Spezieslaw (Regeltext), den der Spieler durchlesen kann (scrollbar)
- [ ] AC3: Das Popup enthält den Statblock der Rasse, bestehend aus Vor- und Nachteilen
- [ ] AC4: Das Popup kann geschlossen werden (X-Button oder Klick außerhalb)
- [ ] AC5: Nach Schließen des Popups bleibt die Rasse ausgewählt
- [ ] AC6: Der Weiter-Button wird nach Rassenauswahl aktiviert
- Frontend: `RassePopup`-Modal-Komponente mit Tabs/Bereichen für Spezieslaw und Statblock
- Backend: `GET /api/races/:id/species-law` (Spezieslaw-Text), `GET /api/races/:id/statblock` (Vor- und Nachteile)

### US-08: Schritt 3 – Abstammung 2d6 manuell eingeben (P0)
Als Spieler möchte ich zwei gewürfelte d6-Werte manuell in Eingabefelder eintragen können, um meine Abstammung zu bestimmen.
- [ ] AC1: Zwei separate Eingabefelder sind sichtbar (für Würfel 1 und Würfel 2)
- [ ] AC2: Jedes Feld akzeptiert nur ganzzahlige Werte von 1 bis 6
- [ ] AC3: Nach Eingabe beider Werte wird die erwürfelte Herkunft als Text/Ergebnis angezeigt
- [ ] AC4: Die Eingabefelder sind validiert (keine Werte <1 oder >6, keine Buchstaben)
- Frontend: `AbstammungInput`-Komponente mit zwei nummerierten Input-Feldern
- Backend: `GET /api/lineages/2d6/:value1/:value2` (Herkunft basierend auf 2d6 Ergebnis ermitteln)

### US-09: Schritt 3 – Abstammung 2d6 automatisch würfeln (P1)
Als Spieler möchte ich einen Button neben den Eingabefeldern drücken können, um zwei Zufallswerte vom PC würfeln zu lassen.
- [ ] AC1: Ein Auto-Würfel-Button ist neben den Eingabefeldern platziert
- [ ] AC2: Klick auf den Button generiert zwei zufällige Werte zwischen 1 und 6
- [ ] AC3: Die generierten Werte werden automatisch in die Eingabefelder übernommen
- [ ] AC4: Die erwürfelte Herkunft wird nach dem Auto-Wurf angezeigt
- [ ] AC5: Der Spieler kann die auto-gewürfelten Werte manuell überschreiben
- Frontend: `AutoRollButton`-Komponente innerhalb von `AbstammungInput`
- Backend: `POST /api/dice/roll-2d6` (Optional, kann auch clientseitig erfolgen)

### US-10: Schritt 3 – Abstammungs-Entscheidungen (binär, eingeblendet) (P0)
Als Spieler möchte ich nach Bestimmung meiner Abstammung eine Reihe von binären Entscheidungen sehen, die nacheinander eingeblendet werden, um Skills und Ressourcen zu wählen.
- [ ] AC1: Nach Eingabe/Wurf der 2d6-Werte werden die Abstammungs-Entscheidungen unterhalb der Herkunftsausgabe eingeblendet
- [ ] AC2: Jede Entscheidung zeigt genau zwei Optionen (binär)
- [ ] AC3: Entscheidungen werden sequentiell angezeigt (eine nach der anderen)
- [ ] AC4: Die Anzahl der Entscheidungen variiert je nach Abstammung
- [ ] AC5: Entscheidungen betreffen Skills und Ressourcen
- Frontend: `AbstammungDecisions`-Komponente mit sequentiellem Entscheidungs-Renderer
- Backend: `GET /api/lineages/:id/decisions` (Entscheidungen für eine bestimmte Herkunft laden)

### US-11: Schritt 3 – Nicht gewählte Option ausgrauen (P1)
Als Spieler möchte ich, dass die nicht gewählte Option einer binären Entscheidung ausgegraut wird, um meinen bisherigen Weg visuell nachvollziehen zu können.
- [ ] AC1: Nach Treffen einer Entscheidung wird die nicht gewählte Option visuell ausgegraut/deaktiviert dargestellt
- [ ] AC2: Die gewählte Option bleibt hervorgehoben/aktiv
- [ ] AC3: Der visuelle Zustand ist klar unterscheidbar (ausgegraut vs. aktiv)
- Frontend: `BinaryChoice`-Komponente mit disabled/grayed-out Styling für nicht gewählte Option
- Backend: Keiner

### US-12: Schritt 3 – Entscheidung rückgängig machen (P0)
Als Spieler möchte ich eine getroffene Entscheidung rückgängig machen können, um die alternative Option wählen zu können.
- [ ] AC1: Ein Rückgängig-Button (Undo) ist bei jeder getroffenen Entscheidung verfügbar
- [ ] AC2: Klick auf Rückgängig setzt die Entscheidung zurück und beide Optionen sind wieder wählbar
- [ ] AC3: Das Ausgrauen der nicht gewählten Option wird entfernt
- [ ] AC4: Nach Rückgängigmachen kann die andere Option gewählt werden
- [ ] AC5: Mehrere Entscheidungen können nacheinander rückgängig gemacht werden (in umgekehrter Reihenfolge)
- Frontend: `UndoButton` innerhalb von `BinaryChoice`, Undo-History im State-Management
- Backend: `PATCH /api/characters/:id/steps/3/decisions/:decisionId` (Entscheidung zurücksetzen)

### US-13: Schritt 3 – Weiter nach allen Abstammungs-Entscheidungen (P0)
Als Spieler möchte ich den Weiter-Button betätigen können, sobald ich alle Abstammungs-Entscheidungen durch habe.
- [ ] AC1: Der Weiter-Button ist deaktiviert, solange nicht alle required Entscheidungen getroffen sind
- [ ] AC2: Der Weiter-Button wird aktiviert, sobald alle Entscheidungen der aktuellen Abstammung abgeschlossen sind
- [ ] AC3: Klick auf Weiter speichert den Schritt und navigiert zu Schritt 4 (Kultur & Kindheit)
- Frontend: `NavigationButtons` mit Validierungslogik für Schritt 3
- Backend: `POST /api/characters/:id/steps/3` (Schritt 3 abschließend speichern)

### US-14: Creation-Schritt Autosave bei Wechsel (P0)
Als Spieler möchte ich, dass sich jede Seite beim Wechsel (vor und zurück) zwischenspeichert, damit keine Eingaben verloren gehen.
- [ ] AC1: Beim Klick auf Weiter wird der aktuelle Schritt automatisch gespeichert
- [ ] AC2: Beim Klick auf Zurück wird der aktuelle Schritt ebenfalls gespeichert bevor navigiert wird
- [ ] AC3: Gespeicherte Daten werden beim erneuten Laden des Schritts vollständig wiederhergestellt
- [ ] AC4: Das Autosave erfolgt transparent ohne manuellen Speichern-Button
- [ ] AC5: Bei Netzwerkfehlern wird der Spieler benachrichtigt und der lokale State bleibt erhalten
- Frontend: Autosave-Hook/Service im Creation-State-Management
- Backend: `POST /api/characters/:id/steps/:stepNumber` (Persistenz in SQLite)
