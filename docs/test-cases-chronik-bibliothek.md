# Test Cases: Chronik & Bibliothek

## Chronik

### TC-01: Charakter-Archiv Übersicht anzeigen (Referenz: US-01)
- **Vorbereitung:** Mindestens 3 Charaktere mit unterschiedlichen Namen, Erstellungsdaten und XP-Werten sind gespeichert.
- **Schritte:**
  1. Chronik-Tab öffnen
  2. Liste der Charaktere betrachten
- **Erwartetes Ergebnis:** Alle gespeicherten Charaktere werden in einer sortierbaren Liste angezeigt, jeder Eintrag zeigt Name, Erstellungsdatum und aktuelle XP.
- **Status:** ⏳ Offen

### TC-02: Charakter aus Liste auswählen und Charaktersheet einsehen (Referenz: US-02)
- **Vorbereitung:** Ein Charakter mit vollständigen Attributen, Skills, Stärken, Ressourcen, Items, Meisterschaften und Spells ist gespeichert.
- **Schritte:**
  1. Chronik-Tab öffnen
  2. Auf den Charakter in der Liste klicken
- **Erwartetes Ergebnis:** Das vollständige Charaktersheet öffnet sich im read-only Modus und zeigt alle Attribute, abgeleitete Werte, Skills, Stärken, Ressourcen, Items, Meisterschaften und Spells. Abgeleitete Werte sind live berechnet.
- **Status:** ⏳ Offen

### TC-03: Charakter löschen mit Bestätigung (Referenz: US-03)
- **Vorbereitung:** Ein Charakter ist in der Chronik vorhanden.
- **Schritte:**
  1. Löschen-Button im Charaktersheet oder in der Liste klicken
  2. Bestätigungsabfrage mit „Ja" bestätigen
- **Erwartetes Ergebnis:** Vor dem Löschen erscheint eine Bestätigungsabfrage. Nach Bestätigung wird der Charakter aus der Datenbank und der Liste entfernt und ist nicht wiederherstellbar.
- **Status:** ⏳ Offen

### TC-04: XP zu einem Charakter hinzufügen (Referenz: US-04)
- **Vorbereitung:** Ein Charakter mit bestehendem XP-Pool ist im Chronik-Tab ausgewählt.
- **Schritte:**
  1. XP-Hinzufügen-Button im Charaktersheet klicken
  2. Im Dialog eine positive ganze Zahl eingeben und bestätigen
- **Erwartetes Ergebnis:** Die eingegebene XP-Menge wird zum bestehenden Pool addiert und der aktualisierte XP-Pool wird angezeigt.
- **Status:** ⏳ Offen

### TC-05: Neue Charakter erhält automatisch 15 Start-XP (Referenz: US-05)
- **Vorbereitung:** Kein spezifischer Vorbereitungsschritt.
- **Schritte:**
  1. Einen neuen Charakter erstellen und speichern
  2. Im Chronik-Tab den neuen Charakter auswählen
- **Erwartetes Ergebnis:** Der neue Charakter hat automatisch 15 XP als Start-XP, die im Charaktersheet als verfügbarer Pool mit Kennzeichnung „Start-XP" sichtbar sind.
- **Status:** ⏳ Offen

### TC-06: Charakter im Einsehemodus steigern (Referenz: US-06)
- **Vorbereitung:** Ein Charakter mit verfügbarem XP-Pool ist im Chronik-Tab im Ansichtsmodus geöffnet.
- **Schritte:**
  1. „Steigern"-Button klicken
  2. Einen Skill, eine Stärke, eine Ressource oder eine Meisterschaft mit XP verbessern
  3. Änderungen speichern
- **Erwartetes Ergebnis:** Steigerungsmodus wird aktiviert. XP-Kosten werden angezeigt und vom Pool abgezogen. Steigerungen werden validiert (Maximalwerte, XP-Kosten, Voraussetzungen). Änderungen werden gespeichert und der Charakter ist im Chronik-Tab aktualisiert.
- **Status:** ⏳ Offen

### TC-07: Items und Ressourcen eines Charakters verwalten (Referenz: US-07)
- **Vorbereitung:** Ein Charakter ist im Chronik-Tab geöffnet.
- **Schritte:**
  1. Item/Ressourcen-Sektion im Charaktersheet öffnen
  2. Ein neues Item hinzufügen
  3. Einen Ressourcenpunkt erhöhen
  4. Änderungen speichern
  5. Charakter erneut öffnen
- **Erwartetes Ergebnis:** Items können hinzugefügt, bearbeitet und entfernt werden. Ressourcenpunkte können erhöht und verringert werden. Änderungen sind nach erneutem Öffnen persistiert.
- **Status:** ⏳ Offen

---

## Bibliothek

### TC-08: Rasse erstellen, bearbeiten und löschen (Referenz: US-08)
- **Vorbereitung:** Bibliothek ist geöffnet, Rassen-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neue Rasse mit Name, Beschreibung, Bild, Vorteilen, Nachteilen und Spezieslaw erstellen
  2. Erstellt Rasse bearbeiten und ein Feld ändern
  3. Rasse löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Rasse wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Rassen werden in einer durchsuchbaren Liste angezeigt. Beim Löschen einer in Charakteren verwendeten Rasse erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-09: Rassen-Panels mit Popup und Statblock einsehen (Referenz: US-09)
- **Vorbereitung:** Mindestens eine Rasse mit Bild, Spezieslaw, Vorteilen und Nachteilen ist vorhanden. Creation-Tab ist geöffnet.
- **Schritte:**
  1. Rasse als Panel mit Bild betrachten
  2. Auf die Rasse klicken
- **Erwartetes Ergebnis:** Jede Rasse wird als Panel mit optionalem Bild dargestellt. Klick öffnet ein Popup mit Spezieslaw-Text und Statblock (Vorteile/Nachteile). Popup ist scrollbar und schließbar. Selbst erstellte Rassen erscheinen ebenfalls als Panels.
- **Status:** ⏳ Offen

### TC-10: Kultur erstellen, bearbeiten und löschen (Referenz: US-10)
- **Vorbereitung:** Bibliothek ist geöffnet, Kulturen-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neue Kultur mit Name, Beschreibung, verfügbaren Talenten, Waffenskills, Magieschulen und Stärken (Stufe 1) erstellen
  2. Erstellt Kultur bearbeiten
  3. Kultur löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Kultur wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Kulturen werden in einer Liste angezeigt. Beim Löschen einer verwendeten Kultur erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-11: Ausbildung erstellen, bearbeiten und löschen (Referenz: US-11)
- **Vorbereitung:** Bibliothek ist geöffnet, Ausbildungen-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neue Ausbildung mit Name, Beschreibung, Stärken (2), Fertigkeiten (30 Punkte), Magieschulen-Regeln und Ressourcen (2) erstellen
  2. Erstellt Ausbildung bearbeiten
  3. Ausbildung löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Ausbildung wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Ausbildungen werden in einer Liste angezeigt. Beim Löschen einer verwendeten Ausbildung erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-12: Meisterschaft erstellen, bearbeiten und löschen (Referenz: US-12)
- **Vorbereitung:** Bibliothek ist geöffnet, Meisterschaften-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neue Meisterschaft mit Name, Beschreibung, Voraussetzung (Skill-Wert 6 oder Magieschule 1/3/6), Effekt und Kosten (3 Punkte) erstellen
  2. Erstellt Meisterschaft bearbeiten
  3. Meisterschaft löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Meisterschaft wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Meisterschaften werden in einer Liste angezeigt. Beim Löschen einer verwendeten Meisterschaft erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-13: Spell erstellen, bearbeiten, löschen und filtern (Referenz: US-13)
- **Vorbereitung:** Bibliothek ist geöffnet, Spells-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neuen Spell mit Name, Beschreibung, Level (0/1/2), Magieschule-Zugehörigkeit, Kosten und Effekt erstellen
  2. Erstellt Spell bearbeiten
  3. Spells nach Level und Magieschule filtern
  4. Spell löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Spell wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Spells werden in einer Liste angezeigt und sind nach Level und Magieschule filterbar. Beim Löschen eines verwendeten Spells erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-14: Bestehende Bibliothek-Einträge anpassen (Referenz: US-14)
- **Vorbereitung:** Mindestens ein Eintrag jedes Typs (Rasse, Kultur, Ausbildung, Meisterschaft, Spell) ist vorhanden.
- **Schritte:**
  1. In der Listenansicht eines Eintragstyps den Bearbeiten-Button klicken
  2. Formular mit vorausgefüllten Daten betrachten und ein Feld ändern
  3. Änderungen speichern
  4. Im Creation-Tab oder Chronik-Tab prüfen, ob Änderung sichtbar ist
- **Erwartetes Ergebnis:** Bearbeiten-Button ist vorhanden. Formular ist vorausgefüllt. Änderungen werden gespeichert und sind sofort in Creation und Chronik-Tab verfügbar. Bei Änderungen wird eine Warnung angezeigt, dass bestehende Charaktere betroffen sein können.
- **Status:** ⏳ Offen

### TC-15: Selbst erstellte Einträge in Creation wählbar (Referenz: US-15)
- **Vorbereitung:** Mindestens eine selbst erstellte Rasse, Kultur, Ausbildung, Meisterschaft und ein Spell sind in der Bibliothek vorhanden.
- **Schritte:**
  1. Creation-Tab öffnen
  2. Bei den jeweiligen Schritten die Auswahlmöglichkeiten prüfen
- **Erwartetes Ergebnis:** Selbst erstellte Einträge erscheinen neben vordefinierten Einträgen ohne visuellen Unterschied. Alle Bibliothek-Funktionen (Panels, Popups, Statblocks) funktionieren für selbst erstellte Einträge.
- **Status:** ⏳ Offen

### TC-16: Statblock-Panels in der Bibliothek ansehen und in Creation wählen (Referenz: US-16)
- **Vorbereitung:** Mindestens ein Statblock mit Attributen, Skills und Vorteilen/Nachteilen ist vorhanden.
- **Schritte:**
  1. Bibliothek öffnen und Statblock-Panels betrachten
  2. Auf ein Statblock-Panel klicken
  3. Im Creation-Tab (Schritt 4 Kultur oder 5 Ausbildung) Statblock als Alternative prüfen
- **Erwartetes Ergebnis:** Statblock-Panels zeigen Zusammenfassung von Attributen, Skills und Vorteilen/Nachteilen in einer Rasteransicht. Klick zeigt vollständige Details. Selbst erstellte Statblöcke erscheinen ebenfalls. Statblöcke sind in Creation als Alternative zur manuellen Punktverteilung wählbar.
- **Status:** ⏳ Offen

### TC-17: Bibliothek-Hauptnavigation und Suchfunktion (Referenz: US-17)
- **Vorbereitung:** Bibliothek ist geöffnet, Einträge aller Typen sind vorhanden.
- **Schritte:**
  1. Tabs oder Seitenleiste für Rassen, Kulturen, Ausbildungen, Meisterschaften, Spells, Statblöcke, Ressourcen, Items und Abgeleitete Werte prüfen
  2. Zwischen Tabs navigieren
  3. Suchbegriff in Suchleiste eingeben
- **Erwartetes Ergebnis:** Navigation zeigt alle Eintragstypen. Jeder Tab zeigt die entsprechende Liste mit CRUD-Operationen. Suchfunktion filtert Einträge im aktuellen Tab.
- **Status:** ⏳ Offen

### TC-18: Ressource erstellen, bearbeiten und löschen (Referenz: US-18)
- **Vorbereitung:** Bibliothek ist geöffnet, Ressourcen-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neue Ressource mit Name, Beschreibung, Startwert und Maximalwert erstellen
  2. Erstellt Ressource bearbeiten
  3. Ressource löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Ressource wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Ressourcen werden in einer Liste angezeigt. Beim Löschen einer verwendeten Ressource erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-19: Item erstellen, bearbeiten, löschen und filtern (Referenz: US-19)
- **Vorbereitung:** Bibliothek ist geöffnet, Items-Verwaltung ist ausgewählt.
- **Schritte:**
  1. Neues Item mit Name, Beschreibung, Typ, Gewicht, Kosten und Effekt erstellen
  2. Erstellt Item bearbeiten
  3. Item-Liste filtern/suchen
  4. Item löschen (ohne Verwendung in Charakteren)
- **Erwartetes Ergebnis:** Item wird erfolgreich erstellt, bearbeitet und gelöscht. Alle Items werden in einer durchsuchbaren/filterbaren Liste angezeigt. Beim Löschen eines verwendeten Items erscheint eine Warnung.
- **Status:** ⏳ Offen

### TC-20: Abgeleitete Werte mit Formel konfigurieren (Referenz: US-20)
- **Vorbereitung:** Bibliothek ist geöffnet, Verwaltung abgeleiteter Werte ist ausgewählt.
- **Schritte:**
  1. Neuen abgeleiteten Wert mit Name, Formel (z.B. `Lebenspunkte = 10 + MU * 2`) und Beschreibung erstellen
  2. Formel bearbeiten
  3. Im Creation-Schritt 6 oder Charaktersheet prüfen, ob Wert live berechnet wird
- **Erwartetes Ergebnis:** Abgeleiteter Wert wird erstellt. Formel nutzt Attribute als Variablen. Formel kann bearbeitet werden. Werte werden im Creation-Schritt 6 und im Charaktersheet live berechnet.
- **Status:** ⏳ Offen
