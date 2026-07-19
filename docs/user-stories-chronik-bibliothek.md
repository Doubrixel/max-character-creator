# User Stories: Chronik & Bibliothek

## Chronik

### US-01: Charakter-Archiv Übersicht (P0)
Als Spieler möchte ich alle erstellten Charaktere in einer Liste sehen, um meinen Fortschritt zu verfolgen.
- [ ] AC1: Alle gespeicherten Charaktere werden in einer sortierbaren Liste angezeigt (Name, Erstellungsdatum, Level/XP)
- [ ] AC2: Ein neu erstellter Charakter erscheint automatisch nach dem Speichern im Chronik-Tab
- [ ] AC3: Jeder Charakter-Eintrag zeigt Name, Erstellungsdatum und aktuelle XP an
- Frontend: `ChronicleView` mit `CharacterList`-Komponente
- Backend: `GET /api/characters` – Liste aller Charaktere

### US-02: Charakter auswählen und einsehen (P0)
Als Spieler möchte ich einen Charakter aus der Liste auswählen, um sein Charaktersheet einzusehen.
- [ ] AC1: Klick auf einen Charakter öffnet das vollständige Charaktersheet
- [ ] AC2: Das Charaktersheet zeigt alle Attribute, abgeleitete Werte, Skills, Stärken, Ressourcen, Items, Meisterschaften und Spells
- [ ] AC3: Abgeleitete Werte werden live aus den Attributen berechnet und angezeigt
- [ ] AC4: Das Sheet ist read-only im reinen Ansichtsmodus
- Frontend: `CharacterSheet`-Komponente mit allen Sektionen
- Backend: `GET /api/characters/:id` – Einzelner Charakter mit allen Daten

### US-03: Charakter löschen (P0)
Als Spieler möchte ich einen Charakter löschen können, um nicht mehr benötigte Einträge zu entfernen.
- [ ] AC1: Löschen-Button ist im Charaktersheet oder in der Liste sichtbar
- [ ] AC2: Vor dem Löschen erscheint eine Bestätigungsabfrage
- [ ] AC3: Nach Bestätigung wird der Charakter aus der Datenbank und der Liste entfernt
- [ ] AC4: Gelöschte Charaktere können nicht wiederhergestellt werden
- Frontend: `DeleteCharacterModal`-Komponente
- Backend: `DELETE /api/characters/:id` – Charakter löschen

### US-04: XP hinzufügen (P1)
Als Spieler möchte ich einem Charakter XP hinzufügen können, um ihn nach Abenteuern zu steigern.
- [ ] AC1: XP-Hinzufügen-Button ist im Charaktersheet sichtbar
- [ ] AC2: Ein Dialog erlaubt die Eingabe einer XP-Menge (positiver Integer)
- [ ] AC3: Die XP werden zum bestehenden Pool addiert und angezeigt
- [ ] AC4: Der verbleibende XP-Pool wird nach der Eingabe aktualisiert
- Frontend: `AddXPDialog`-Komponente mit Input-Feld
- Backend: `POST /api/characters/:id/xp` – `{ amount: number }`

### US-05: 15 Start-XP automatisch vergeben (P0)
Als Spieler möchte ich, dass ein neuer Charakter automatisch 15 Start-XP erhält, um diese vor dem ersten Abenteuer auszugeben.
- [ ] AC1: Beim Speichern eines neuen Charakters werden automatisch 15 XP als Start-XP gesetzt
- [ ] AC2: Die 15 XP sind im Charaktersheet als verfügbarer Pool sichtbar
- [ ] AC3: Die Start-XP können vor dem ersten Abenteuer ausgegeben werden (Steigerung)
- [ ] AC4: Die Start-XP sind im Chronik-Tab als „Start-XP" gekennzeichnet
- Frontend: `CharacterSheet` zeigt XP-Pool mit Kennzeichnung „Start-XP"
- Backend: `POST /api/characters` erstellt Charakter mit `xp: 15`

### US-06: Charakter steigern im Einsehemodus (P1)
Als Spieler möchte ich einen Charakter direkt beim Einsehen steigern können, um schnell XP auszugeben.
- [ ] AC1: Ein „Steigern"-Button wechselt vom Ansichts- in den Steigerungsmodus
- [ ] AC2: Im Steigerungsmodus können Skills, Stärken, Ressourcen und Meisterschaften mit XP verbessert werden
- [ ] AC3: XP-Kosten werden für jede Steigerung angezeigt und vom Pool abgezogen
- [ ] AC4: Steigerungen werden validiert (Maximalwerte, XP-Kosten, Voraussetzungen)
- [ ] AC5: Änderungen werden gespeichert und der Charakter bleibt im Chronik-Tab aktualisiert
- Frontend: `CharacterSteigerungView` mit XP-Counter und Steigerungs-UI
- Backend: `PATCH /api/characters/:id` – Skill/Stat-Updates mit XP-Validierung

### US-07: Items und Ressourcen verwalten (P1)
Als Spieler möchte ich Items und Ressourcen eines Charakters im Chronik-Tab verwalten können.
- [ ] AC1: Eine Item/Ressourcen-Sektion ist im Charaktersheet sichtbar
- [ ] AC2: Items können hinzugefügt, bearbeitet und entfernt werden
- [ ] AC3: Ressourcenpunkte können erhöht und verringert werden
- [ ] AC4: Änderungen werden persistiert und sind beim nächsten Einsehen sichtbar
- Frontend: `ItemResourcePanel`-Komponente mit CRUD-UI
- Backend: `PATCH /api/characters/:id/items` und `PATCH /api/characters/:id/resources`

---

## Bibliothek

### US-08: Rassen CRUD (P0)
Als Spielleiter möchte ich Rassen erstellen, bearbeiten, lesen und löschen können, um das Spiel anzupassen.
- [ ] AC1: Neue Rasse kann mit Name, Beschreibung, Bild, Vorteilen, Nachteilen und Spezieslaw erstellt werden
- [ ] AC2: Bestehende Rassen können in allen Feldern bearbeitet werden
- [ ] AC3: Rassen können gelöscht werden (mit Warnung wenn in Charakteren verwendet)
- [ ] AC4: Alle Rassen werden in einer durchsuchbaren Liste angezeigt
- Frontend: `LibraryRaceManager` mit Formular und Listenansicht
- Backend: `GET /api/library/races`, `POST /api/library/races`, `PATCH /api/library/races/:id`, `DELETE /api/library/races/:id`

### US-09: Rassen-Panels mit Statblock und Popup (P0)
Als Spieler möchte ich im Creation-Tab jede Rasse als eigenes Panel mit Bild sehen und per Popup die Spezieslaw und den Statblock einsehen.
- [ ] AC1: Jede Rasse wird als eigenes Panel mit optionalem Bild dargestellt
- [ ] AC2: Klick auf eine Rasse öffnet ein Popup mit ausführlichem Spezieslaw-Text
- [ ] AC3: Das Popup zeigt den Statblock (Vorteile und Nachteile)
- [ ] AC4: Das Popup kann durchgescrollt und geschlossen werden
- [ ] AC5: Selbst erstellte Rassen aus der Bibliothek erscheinen ebenfalls als Panels
- Frontend: `RacePanelGrid`, `RaceDetailPopup` mit Statblock-Komponente
- Backend: `GET /api/library/races` liefert Bild-URL, Spezieslaw, Vorteile, Nachteile

### US-10: Kulturen CRUD (P0)
Als Spielleiter möchte ich Kulturen erstellen, bearbeiten, lesen und löschen können.
- [ ] AC1: Neue Kultur kann mit Name, Beschreibung, verfügbaren Talenten, Waffenskills, Magieschulen und Stärken (Stufe 1) erstellt werden
- [ ] AC2: Bestehende Kulturen können bearbeitet werden
- [ ] AC3: Kulturen können gelöscht werden (mit Warnung wenn verwendet)
- [ ] AC4: Alle Kulturen werden in einer Liste angezeigt
- Frontend: `LibraryCultureManager` mit Formular und Listenansicht
- Backend: `GET /api/library/cultures`, `POST /api/library/cultures`, `PATCH /api/library/cultures/:id`, `DELETE /api/library/cultures/:id`

### US-11: Ausbildungen CRUD (P0)
Als Spielleiter möchte ich Ausbildungen erstellen, bearbeiten, lesen und löschen können.
- [ ] AC1: Neue Ausbildung kann mit Name, Beschreibung, Stärken (2), Fertigkeiten (30 Punkte), Magieschulen-Regeln und Ressourcen (2) erstellt werden
- [ ] AC2: Bestehende Ausbildungen können bearbeitet werden
- [ ] AC3: Ausbildungen können gelöscht werden (mit Warnung wenn verwendet)
- [ ] AC4: Alle Ausbildungen werden in einer Liste angezeigt
- Frontend: `LibraryTrainingManager` mit Formular und Listenansicht
- Backend: `GET /api/library/trainings`, `POST /api/library/trainings`, `PATCH /api/library/trainings/:id`, `DELETE /api/library/trainings/:id`

### US-12: Meisterschaften CRUD (P0)
Als Spielleiter möchte ich Meisterschaften erstellen, bearbeiten, lesen und löschen können.
- [ ] AC1: Neue Meisterschaft kann mit Name, Beschreibung, Voraussetzung (Skill-Wert 6 oder Magieschule 1/3/6), Effekt und Kosten (3 Punkte) erstellt werden
- [ ] AC2: Bestehende Meisterschaften können bearbeitet werden
- [ ] AC3: Meisterschaften können gelöscht werden (mit Warnung wenn verwendet)
- [ ] AC4: Alle Meisterschaften werden in einer Liste angezeigt
- Frontend: `LibraryMasteryManager` mit Formular und Listenansicht
- Backend: `GET /api/library/masteries`, `POST /api/library/masteries`, `PATCH /api/library/masteries/:id`, `DELETE /api/library/masteries/:id`

### US-13: Spells CRUD (P0)
Als Spielleiter möchte ich Spells erstellen, bearbeiten, lesen und löschen können.
- [ ] AC1: Neuer Spell kann mit Name, Beschreibung, Level (0/1/2), Magieschule-Zugehörigkeit, Kosten und Effekt erstellt werden
- [ ] AC2: Bestehende Spells können bearbeitet werden
- [ ] AC3: Spells können gelöscht werden (mit Warnung wenn verwendet)
- [ ] AC4: Alle Spells werden in einer Liste angezeigt, filterbar nach Level und Magieschule
- Frontend: `LibrarySpellManager` mit Formular, Listenansicht und Filtern
- Backend: `GET /api/library/spells`, `POST /api/library/spells`, `PATCH /api/library/spells/:id`, `DELETE /api/library/spells/:id`

### US-14: Bestehende Einträge anpassen (P1)
Als Spielleiter möchte ich alle bestehenden Bibliothek-Einträge (Rassen, Kulturen, Ausbildungen, Meisterschaften, Spells) anpassen können, um das Regelwerk zu verfeinern.
- [ ] AC1: Jeder Eintragstyp hat einen Bearbeiten-Button in der Listenansicht
- [ ] AC2: Das Bearbeitungsformular ist vorausgefüllt mit den bestehenden Daten
- [ ] AC3: Änderungen werden gespeichert und sind sofort in der Creation und im Chronik-Tab verfügbar
- [ ] AC4: Bei Änderungen an bestehenden Einträgen wird eine Warnung angezeigt, dass bereits erstellte Charaktere betroffen sein können
- Frontend: Edit-Modus in allen `Library*Manager`-Komponenten
- Backend: `PATCH`-Endpoints aktualisieren bestehende Einträge

### US-15: Selbst erstellte Einträge in Creation wählbar (P0)
Als Spieler möchte ich im Creation-Tab selbst erstellte Rassen, Kulturen, Ausbildungen, Meisterschaften und Spells auswählen können.
- [ ] AC1: Selbst erstellte Einträge erscheinen neben den vordefinierten Einträgen in der Creation
- [ ] AC2: Kein visueller Unterschied zwischen vordefinierten und selbst erstellten Einträgen
- [ ] AC3: Alle Bibliothek-Funktionen (Panels, Popups, Statblocks) funktionieren für selbst erstellte Einträge
- Frontend: Creation-Komponenten laden Einträge aus `GET /api/library/*` ohne Filterung nach Quelle
- Backend: `GET /api/library/*` liefert alle Einträge (vordefiniert + benutzerdefiniert)

### US-16: Statblock-Panels in der Bibliothek (P0)
Als Spieler möchte ich in der Bibliothek vorerstellte Statblöcke (DSA-artig) als Panels sehen und auswählen können.
- [ ] AC1: Statblock-Panels zeigen eine Zusammenfassung von Attributen, Skills und Vorteilen/Nachteilen
- [ ] AC2: Panels sind in einer übersichtlichen Rasteransicht angeordnet
- [ ] AC3: Klick auf ein Panel zeigt die vollständigen Details des Statblocks
- [ ] AC4: Selbst erstellte Statblöcke aus der Bibliothek erscheinen ebenfalls in der Panel-Ansicht
- [ ] AC5: Statblöcke können in Creation (Schritte 4 Kultur, 5 Ausbildung) als Alternative zur manuellen Punktverteilung gewählt werden
- Frontend: `StatblockPanelGrid`, `StatblockDetailView`
- Backend: `GET /api/library/statblocks`, `POST /api/library/statblocks`, `PATCH /api/library/statblocks/:id`, `DELETE /api/library/statblocks/:id`

### US-17: Bibliothek-Hauptnavigation (P1)
Als Spielleiter möchte ich in der Bibliothek zwischen den verschiedenen Eintragstypen navigieren können.
- [ ] AC1: Die Bibliothek hat Tabs oder eine Seitenleiste für Rassen, Kulturen, Ausbildungen, Meisterschaften, Spells und Statblöcke
- [ ] AC2: Jeder Tab zeigt die entsprechende Liste mit CRUD-Operationen
- [ ] AC3: Eine Suchfunktion filtert Einträge im aktuellen Tab
- Frontend: `LibraryView` mit Tab-Navigation und Suchleiste
- Backend: Keine zusätzlichen Endpoints, nutzt bestehende `GET /api/library/*`
