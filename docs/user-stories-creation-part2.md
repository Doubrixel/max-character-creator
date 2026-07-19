### US-13: Kultur & Kindheit – Freipunkte & Live-Counter (P0)
Als Spieler möchte ich oben auf der Seite einen Live-Counter sehen, der anzeigt, wie viele Freipunkte ich noch verfüge, um meine Punkte gezielt verteilen zu können.
- [ ] AC1: Counter zeigt initial die Gesamtzahl der Freipunkte an
- [ ] AC2: Counter aktualisiert sich live bei jeder Punktevergabe (Plus/Minus)
- [ ] AC3: Counter wird rot, wenn 0 Punkte übrig sind, und Plus-Buttons werden deaktiviert
- [ ] AC4: Counter berücksichtigt Punkte aus Stärken- und Meisterschaftsauswahl
- Frontend: `CultureChildhoodStep.tsx` → `FreipunkteCounter`-Komponente
- Backend: `GET /api/character/:id/freipunkte` (aktueller Stand), `POST /api/character/:id/freipunkte/allocate`

### US-14: Kultur & Kindheit – Skill-Tabelle (Talente, Waffen, Magie) (P0)
Als Spieler möchte ich eine Tabelle mit allen Talenten, Waffenskills und Magieschulen sehen, in der ich mit Plus/Minus meine Freipunkte verteilen kann, wobei der aktuelle Skill-Wert (ggf. aus Abstammung) angezeigt wird.
- [ ] AC1: Tabelle zeigt drei Sektionen: Talente, Waffenskills, Magieschulen
- [ ] AC2: Jede Zeile zeigt Skill-Name, aktuellen Basiswert (aus Abstammung), Plus-Button, Minus-Button
- [ ] AC3: Plus-Button erhöht Skill um 1, reduziert Freipunkte um 1
- [ ] AC4: Minus-Button reduziert Skill um 1, erhöht Freipunkte um 1 (nur wenn Skill > Basiswert aus Abstammung)
- [ ] AC5: Plus-Button ist deaktiviert, wenn Freipunkte = 0
- Frontend: `CultureChildhoodStep.tsx` → `SkillTable`-Komponente mit `SkillRow`-Subkomponente
- Backend: `GET /api/skills` (alle Talente/Waffen/Magie), `GET /api/character/:id/skills` (aktueller Stand), `POST /api/character/:id/skills/allocate`

### US-15: Kultur & Kindheit – Oberwert-Validierung (P0)
Als Spieler möchte ich, dass das System verhindert, dass ich Kampfskills/Talente über 6 und Magieschulen über die erlaubten Limits erhöhe.
- [ ] AC1: Kampfskills und Talente können maximal auf 6 erhöht werden (Oberwert 6)
- [ ] AC2: Eine einzige Magieschule darf auf maximal 3 erhöht werden
- [ ] AC3: Alle weiteren Magieschulen dürfen maximal auf 2 erhöht werden
- [ ] AC4: Magieschulen können auch bei 0 belassen werden (keine Pflichtwahl)
- [ ] AC5: Plus-Button wird deaktiviert, wenn Oberwert erreicht ist
- [ ] AC6: Backend validiert Oberwerte bei jeder Allocation und rejected ungültige Requests
- Frontend: `SkillTable` → Oberwert-Check pro Zeile, Button-Deaktivierung
- Backend: `POST /api/character/:id/skills/allocate` → Validierung: Kampf/Talent ≤ 6, 1x Magie ≤ 3, restliche Magie ≤ 2

### US-16: Kultur & Kindheit – Stärken Stufe 1 Auswahl (P0)
Als Spieler möchte ich unter der Skill-Tabelle alle verfügbaren Stärken der Stufe 1 sehen und genau eine davon auswählen können.
- [ ] AC1: Alle Stärken der Stufe 1 werden als klickbare Karten/Liste angezeigt
- [ ] AC2: Genau eine Stärke muss ausgewählt werden (Pflicht)
- [ ] AC3: Ausgewählte Stärke wird visuell hervorgehoben
- [ ] AC4: Weiter-Button ist deaktiviert, bis eine Stärke gewählt ist
- [ ] AC5: Auswahl kann geändert werden (Deselect → neue Selection)
- Frontend: `CultureChildhoodStep.tsx` → `StaerkeSelection`-Komponente
- Backend: `GET /api/staerken?stufe=1`, `POST /api/character/:id/staerken` (Body: `{ staerkeId, stufe: 1 }`)

### US-17: Kultur & Kindheit – Meisterschaft aus Skill ≥ 1 (P0)
Als Spieler möchte ich aus allen Skills, die mindestens 1 Punkt haben, einen auswählen und darin eine Meisterschaft wählen können.
- [ ] AC1: Nur Skills mit Wert ≥ 1 (Basis + verteilte Punkte) werden zur Meisterschaftsauswahl angeboten
- [ ] AC2: Genau ein Skill wird für Meisterschaft ausgewählt
- [ ] AC3: Nach Skill-Auswahl wird eine Liste der verfügbaren Meisterschaften für diesen Skill angezeigt
- [ ] AC4: Genau eine Meisterschaft wird ausgewählt
- [ ] AC5: Weiter-Button ist deaktiviert, bis Skill + Meisterschaft gewählt sind
- Frontend: `CultureChildhoodStep.tsx` → `MeisterschaftSelection`-Komponente (zweistufig: erst Skill, dann Meisterschaft)
- Backend: `GET /api/character/:id/eligible-skills` (Skills ≥ 1), `GET /api/meisterschaften?skillId=`, `POST /api/character/:id/meisterschaft`

### US-18: Kultur & Kindheit – Statblock-Panels (P0)
Als Spieler möchte ich oben auf der Seite eine Leiste mit vorerstellten Statblock-Panels sehen, die ich auswählen kann, um Punkte automatisch zu verteilen. Selbst erstellte Panels aus der Bibliothek sollen ebenfalls angezeigt werden.
- [ ] AC1: Panels werden horizontal oben auf der Seite angezeigt
- [ ] AC2: Klick auf ein Panel verteilt automatisch Punkte auf Skills gemäß Statblock-Definition
- [ ] AC3: Live-Counter und Skill-Tabelle aktualisieren sich nach Panel-Auswahl
- [ ] AC4: Selbst erstellte Statblöcke aus der Bibliothek erscheinen ebenfalls in der Panel-Leiste
- [ ] AC5: Spieler kann Panel-Auswahl überspringen und manuell in der Tabelle verteilen
- [ ] AC6: Panel-Auswahl kann rückgängig gemacht werden (Deselect → manuelle Verteilung)
- Frontend: `CultureChildhoodStep.tsx` → `StatblockPanelBar`-Komponente
- Backend: `GET /api/statblocks?category=kultur`, `GET /api/statblocks?source=library`, `POST /api/character/:id/apply-statblock`

### US-19: Kultur & Kindheit – Weiter-Navigation (P0)
Als Spieler möchte ich den Weiter-Button erst betätigen können, wenn alle Pflichtauswahlen (Stärke, Meisterschaft) getroffen sind.
- [ ] AC1: Weiter-Button ist deaktiviert solange keine Stärke gewählt ist
- [ ] AC2: Weiter-Button ist deaktiviert solange keine Meisterschaft gewählt ist
- [ ] AC3: Bei Klick auf Weiter wird der Charakter-Zwischenstand gespeichert
- [ ] AC4: Navigation zu Schritt 5 erfolgt
- Frontend: `CultureChildhoodStep.tsx` → `NavigationButtons`
- Backend: `POST /api/character/:id/save-step` (Body: `{ step: 4, data: {...} }`)

### US-20: Ausbildung – Statblock-Panels oder manuelle Verteilung (P0)
Als Spieler möchte ich wie in Schritt 4 vorerstellte oder selbst erstellte Statblock-Panels auswählen ODER manuell Punkte verteilen können.
- [ ] AC1: Panel-Leiste wird oben angezeigt (gleiche UX wie Schritt 4)
- [ ] AC2: Panel-Auswahl verteilt Punkte automatisch auf Fertigkeiten
- [ ] AC3: Manuelle Verteilung bleibt jederzeit möglich
- [ ] AC4: Panel kann abgewählt werden für manuelle Verteilung
- Frontend: `AusbildungStep.tsx` → `StatblockPanelBar` (Wiederverwendung aus US-18)
- Backend: `GET /api/statblocks?category=ausbildung`, `POST /api/character/:id/apply-statblock`

### US-21: Ausbildung – 2 Stärken verteilen (P0)
Als Spieler möchte ich genau 2 Stärken-Punkte auf verfügbare Stärken verteilen können.
- [ ] AC1: 2 Stärken-Punkte sind verfügbar (Counter zeigt 2 initial)
- [ ] AC2: Stärken können frei gewählt werden (auch gleiche Stärke twice, falls erlaubt)
- [ ] AC3: Counter reduziert sich bei jeder Stärken-Wahl
- [ ] AC4: Weiter-Button deaktiviert bis beide Stärken-Punkte verteilt sind
- Frontend: `AusbildungStep.tsx` → `StaerkeAllocation`-Komponente mit Counter
- Backend: `POST /api/character/:id/staerken` (Body: `{ staerkeId, stufe }`), `GET /api/character/:id/staerken/remaining`

### US-22: Ausbildung – 30 FP auf Fertigkeiten verteilen (P0)
Als Spieler möchte ich 30 Freipunkte auf Fertigkeiten verteilen können, wobei kein Skill über 6 steigen darf.
- [ ] AC1: 30 FP Counter wird initial angezeigt
- [ ] AC2: Skill-Tabelle (Talente, Waffen, Magie) wird mit Plus/Minus angezeigt
- [ ] AC3: Kein Skill (Kampf/Talent) kann über 6 erhöht werden
- [ ] AC4: Magieschulen dürfen in diesem Schritt maximal 3 Punkte erhalten
- [ ] AC5: Magieschulen dürfen in diesem Schritt nicht über Wert 4 gesteigert werden
- [ ] AC6: Plus-Buttons deaktivieren sich bei Erreichen der Limits
- [ ] AC7: Weiter-Button deaktiviert bis alle 30 FP verteilt sind
- Frontend: `AusbildungStep.tsx` → `FertigkeitAllocation`-Komponente mit 30-FP-Counter
- Backend: `POST /api/character/:id/skills/allocate` → Validierung: Kampf/Talent ≤ 6, Magie ≤ 3 Punkte in diesem Schritt, Magie-Gesamtwert ≤ 4

### US-23: Ausbildung – Magie-Sonderregeln (P0)
Als Spieler möchte ich, dass Magieschulen in der Ausbildung speziellen Regeln folgen: max 3 Punkte in diesem Schritt und Gesamtwert max 4.
- [ ] AC1: Magieschule kann nicht um mehr als 3 Punkte in diesem Schritt erhöht werden
- [ ] AC2: Magieschule kann nicht über Gesamtwert 4 erhöht werden (Basis + bisherige + aktuelle Punkte)
- [ ] AC3: Beide Regeln werden client- und serverseitig validiert
- [ ] AC4: Fehlermeldung wird angezeigt, wenn Server-Validierung fehlschlägt
- Frontend: `FertigkeitAllocation` → Magie-spezifische Validierung pro Zeile
- Backend: `POST /api/character/:id/skills/allocate` → Magie-Validierung: `delta ≤ 3 && newValue ≤ 4`

### US-24: Ausbildung – 2 Ressourcen steigern (P0)
Als Spieler möchte ich nach der Fertigkeitsverteilung noch 2 Ressourcen steigern können.
- [ ] AC1: Liste aller verfügbaren Ressourcen wird angezeigt
- [ ] AC2: Genau 2 Ressourcen-Punkte müssen verteilt werden
- [ ] AC3: Counter zeigt verbleibende Ressourcen-Punkte
- [ ] AC4: Weiter-Button deaktiviert bis beide Punkte verteilt sind
- [ ] AC5: Ressourcen-Auswahl kann geändert werden (Rückgängig)
- Frontend: `AusbildungStep.tsx` → `ResourceAllocation`-Komponente
- Backend: `GET /api/resources`, `POST /api/character/:id/resources/allocate`

### US-25: Ausbildung – Weiter-Navigation (P0)
Als Spieler möchte ich den Weiter-Button erst betätigen können, wenn alle Ausbildungsauswahlen getroffen sind.
- [ ] AC1: Weiter-Button deaktiviert bis 2 Stärken verteilt sind
- [ ] AC2: Weiter-Button deaktiviert bis 30 FP verteilt sind
- [ ] AC3: Weiter-Button deaktiviert bis 2 Ressourcen verteilt sind
- [ ] AC4: Bei Klick wird Charakter-Zwischenstand gespeichert
- [ ] AC5: Navigation zu Schritt 6
- Frontend: `AusbildungStep.tsx` → `NavigationButtons`
- Backend: `POST /api/character/:id/save-step` (Body: `{ step: 5, data: {...} }`)

### US-26: Attribute – 10x 4d6 Würfeln (P0)
Als Spieler möchte ich 10 Attributswerte erwürfeln, wobei für jedes Attribut 4d6 geworfen und die höchsten 3 addiert werden.
- [ ] AC1: 10 Eingabefelder werden angezeigt (für 10 Attribute)
- [ ] AC2: Auto-Würfel-Button wirft 10x 4d6 und zeigt je die höchsten 3 addiert an
- [ ] AC3: Manuelle Eingabe der 10 Würfelwerte ist alternativ möglich
- [ ] AC4: Jeder Wurf zeigt die 4 Einzelwürfel und die Summe der höchsten 3
- [ ] AC5: Würfel-Animation oder visuelles Feedback beim Auto-Wurf
- Frontend: `AttributeStep.tsx` → `DiceRoller`-Komponente mit `4d6DropLowest`-Logik
- Backend: `POST /api/character/:id/roll-attributes` (optional, serverseitiger Wurf), Response: `{ rolls: [[d1,d2,d3,d4], ...], sums: [sum1, ..., sum10] }`

### US-27: Attribute – Werte Attributen zuordnen (P0)
Als Spieler möchte ich die 10 erwürfelten Werte frei den 10 Attributen zuordnen können.
- [ ] AC1: 10 erwürfelte Werte werden als Pool angezeigt
- [ ] AC2: 10 Attribute werden als Ziel-Slots angezeigt
- [ ] AC3: Drag & Drop oder Klick-Zuordnung: Wert aus Pool → Attribut-Slot
- [ ] AC4: Jeder Wert kann nur einmal zugeordnet werden
- [ ] AC5: Zuordnung kann rückgängig gemacht werden (Wert zurück in Pool)
- [ ] AC6: Weiter-Button deaktiviert bis alle 10 Werte zugeordnet sind
- Frontend: `AttributeStep.tsx` → `AttributeAssignment`-Komponente (Drag & Drop)
- Backend: `POST /api/character/:id/attributes/assign` (Body: `{ attributeId: wert, ... }`)

### US-28: Attribute – Abgeleitete Werte live berechnen (P0)
Als Spieler möchte ich unter den Attributen die abgeleiteten Werte mit deren Berechnungsformeln sehen, die sich live aktualisieren wenn ich Attributswerte zuordne.
- [ ] AC1: Liste aller abgeleiteten Werte wird unter den Attributen angezeigt
- [ ] AC2: Jeder abgeleitete Wert zeigt die Berechnungsformel
- [ ] AC3: Werte aktualisieren sich live bei jeder Attribut-Zuordnung
- [ ] AC4: Formel wird mit eingesetzten Attributswerten angezeigt (z.B. `Lebenspunkte = 10 + MU * 2`)
- Frontend: `AttributeStep.tsx` → `DerivedValues`-Komponente mit Live-Berechnung
- Backend: `GET /api/derived-values/formulas` (Formel-Definitionen), `POST /api/character/:id/derived-values/calculate`

### US-29: Attribute – Weiter-Navigation (P0)
Als Spieler möchte ich den Weiter-Button erst betätigen können, wenn alle 10 Attributswerte zugeordnet sind.
- [ ] AC1: Weiter-Button deaktiviert bis alle 10 Attribute belegt sind
- [ ] AC2: Bei Klick wird Charakter-Zwischenstand gespeichert
- [ ] AC3: Navigation zu Schritt 7
- Frontend: `AttributeStep.tsx` → `NavigationButtons`
- Backend: `POST /api/character/:id/save-step` (Body: `{ step: 6, data: {...} }`)

### US-30: Meisterschaften – Skill 6 → Meisterschaft wählen (P0)
Als Spieler möchte ich für jede Fähigkeit, in der ich Wert 6 erreicht habe, eine Meisterschaft wählen können.
- [ ] AC1: Alle Skills mit Wert 6 werden als auswählbar markiert
- [ ] AC2: Für jeden Skill mit Wert 6 kann eine Meisterschaft aus der Skill-spezifischen Liste gewählt werden
- [ ] AC3: Meisterschaft-Auswahl-Modal/Panel öffnet sich bei Klick auf Skill
- [ ] AC4: Gewählte Meisterschaft wird im Charakterbogen angezeigt
- Frontend: `MeisterschaftSpellStep.tsx` → `MeisterschaftSelection`-Komponente
- Backend: `GET /api/character/:id/skills-with-value-6`, `GET /api/meisterschaften?skillId=`, `POST /api/character/:id/meisterschaft`

### US-31: Meisterschaften & Spells – Magie 1/3/6 → Spell Lvl 0/1/2 (P0)
Als Spieler möchte ich je nach erreichtem Wert in einer Magieschule (1/3/6) einen Spell der entsprechenden Stufe (Lvl 0/1/2) wählen können.
- [ ] AC1: Magieschulen mit Wert ≥ 1 zeigen verfügbare Lvl-0-Spells
- [ ] AC2: Magieschulen mit Wert ≥ 3 zeigen verfügbare Lvl-1-Spells
- [ ] AC3: Magieschulen mit Wert ≥ 6 zeigen verfügbare Lvl-2-Spells
- [ ] AC4: Pro Schwellenwert (1, 3, 6) kann je ein Spell gewählt werden
- [ ] AC5: Spell-Auswahl-Modal zeigt Spell-Details (Name, Wirkung, Kosten)
- Frontend: `MeisterschaftSpellStep.tsx` → `SpellSelection`-Komponente
- Backend: `GET /api/character/:id/magic-thresholds`, `GET /api/spells?level=0|1|2&magicSchoolId=`, `POST /api/character/:id/spells`

### US-32: Meisterschaften – 3-Punkt-Meisterschaften (P0)
Als Spieler möchte ich zusätzliche Meisterschaften im Wert von 3 Punkten verteilen können.
- [ ] AC1: 3 Meisterschafts-Punkte werden als Counter angezeigt
- [ ] AC2: Meisterschaften können aus verfügbaren Listen gewählt werden
- [ ] AC3: Jede gewählte Meisterschaft kostet 1 Punkt
- [ ] AC4: Counter reduziert sich bei jeder Wahl
- [ ] AC5: Weiter-Button deaktiviert bis alle 3 Punkte verteilt sind
- Frontend: `MeisterschaftSpellStep.tsx` → `BonusMeisterschaftAllocation` mit 3-Pkt-Counter
- Backend: `GET /api/meisterschaften?available=true`, `POST /api/character/:id/meisterschaft/bonus`

### US-33: Meisterschaften & Spells – 5 Talentpunkte (P0)
Als Spieler möchte ich 5 Punkte auf Talente verteilen können, bis zu einem Maximum von 6 pro Talent.
- [ ] AC1: 5 Talentpunkte werden als Counter angezeigt
- [ ] AC2: Talente werden in einer Liste/Tabelle mit Plus/Minus angezeigt
- [ ] AC3: Kein Talent kann über 6 erhöht werden
- [ ] AC4: Plus-Buttons deaktivieren bei Wert 6
- [ ] AC5: Weiter-Button deaktiviert bis alle 5 Punkte verteilt sind
- Frontend: `MeisterschaftSpellStep.tsx` → `BonusTalentAllocation` mit 5-Pkt-Counter
- Backend: `POST /api/character/:id/skills/allocate` → Validierung: Talent ≤ 6

### US-34: Meisterschaften & Spells – 1 Ressourcenpunkt (P0)
Als Spieler möchte ich einen zusätzlichen Ressourcenpunkt verteilen können.
- [ ] AC1: 1 Ressourcenpunkt wird als Counter angezeigt
- [ ] AC2: Liste der verfügbaren Ressourcen wird angezeigt
- [ ] AC3: Ressource kann ausgewählt und erhöht werden
- [ ] AC4: Weiter-Button deaktiviert bis Ressourcenpunkt verteilt ist
- Frontend: `MeisterschaftSpellStep.tsx` → `BonusResourceAllocation`
- Backend: `POST /api/character/:id/resources/allocate`

### US-35: Charakter fertigstellen & speichern (P0)
Als Spieler möchte ich auf "Charakterbogen fertigstellen" klicken können, um den Charakter zu speichern und im Chroniken-Tab einsehen zu können.
- [ ] AC1: "Charakterbogen fertigstellen"-Button ist aktiv, wenn alle vorherigen Schritte abgeschlossen sind
- [ ] AC2: Bei Klick wird der vollständige Charakter validiert
- [ ] AC3: Charakter wird in der Datenbank gespeichert (Status: fertiggestellt)
- [ ] AC4: Charakter erscheint automatisch im Chroniken-Tab
- [ ] AC5: Charakter erhält automatisch 15 Start-XP (vor erstem Abenteuer)
- [ ] AC6: Erfolgs-Feedback wird dem Spieler angezeigt
- [ ] AC7: Navigation zum Chroniken-Tab oder Charakter-Sheet-Ansicht
- Frontend: `MeisterschaftSpellStep.tsx` → `FinishCharacterButton`
- Backend: `POST /api/character/:id/finalize` → Validierung, Speichern, XP-Zuweisung (15 XP), Response: `{ characterId, status: 'completed', xp: 15 }`

### US-36: Schritt 7 – Weiter-Navigation & Abschluss (P0)
Als Spieler möchte ich den Weiter/Fertigstellen-Button erst betätigen können, wenn alle Schritt-7-Auswahlen getroffen sind.
- [ ] AC1: Weiter-Button deaktiviert bis alle Skill-6-Meisterschaften gewählt sind
- [ ] AC2: Weiter-Button deaktiviert bis alle Magie-Schwellenwert-Spells gewählt sind
- [ ] AC3: Weiter-Button deaktiviert bis 3 Meisterschaftspunkte verteilt sind
- [ ] AC4: Weiter-Button deaktiviert bis 5 Talentpunkte verteilt sind
- [ ] AC5: Weiter-Button deaktiviert bis 1 Ressourcenpunkt verteilt ist
- [ ] AC6: Bei Erfüllung aller Bedingungen wird Button zu "Charakterbogen fertigstellen"
- Frontend: `MeisterschaftSpellStep.tsx` → `NavigationButtons` mit Bedingungs-Checks
- Backend: `POST /api/character/:id/save-step` (Body: `{ step: 7, data: {...} }`)
