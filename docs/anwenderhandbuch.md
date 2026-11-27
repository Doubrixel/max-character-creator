# Anwenderhandbuch: Charaktererstellung

Dieses Handbuch beschreibt zwei Funktionen der Charaktererstellung in „Max Character
Creator". Es beschreibt nur stabiles, beobachtbares Anwenderverhalten.

Inhalt:

- Testmodus: Schritte schnell mit Zufallswerten überspringen (INT-000018 / SF-000010)
- Kultur mit Entweder/Oder-Alternativen wählen (INT-000016 / SF-000009)
- Geschwindigkeit (GES) als abgeleiteter Wert (INT-000019 / SF-000011)
- Passive Boni auf Attribute und abgeleitete Werte (INT-000020 / SF-000012)

Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).

---

## Testmodus: Schritte schnell mit Zufallswerten überspringen

Der Testmodus hilft beim Testen späterer Seiten: Auf dem gerade offenen Schritt füllt
er alle Felder mit zufälligen, gültigen Werten, sodass Sie nur noch „Weiter" klicken
müssen. Er ist **nur** auf Systemen aktiv, auf denen die Umgebungsvariable
`SYSTEM=TEST` gesetzt ist. Ohne diese Variable gibt es den Button nicht und die
Anwendung verhält sich wie gewohnt.

### Voraussetzungen

- Sie arbeiten auf einer Testinstanz, die mit `SYSTEM=TEST` gestartet wurde. In der
  App selbst gibt es keinen Schalter, um den Testmodus ein- oder auszuschalten.
- Wenn Sie prüfen möchten, ob der Modus aktiv ist, ruft die Instanz `/api/config` auf:
  `{"testMode":true}` bedeutet aktiv, `{"testMode":false}` bedeutet inaktiv.
- Sie haben „Creation" geöffnet und einen Erstellvorgang gestartet („Neuen Charakter
  erstellen").

### Schritt für Schritt überspringen

1. Klicken Sie auf dem gewünschten Schritt auf **„Zufällig ausfüllen"**. Der Button
   steht in der unteren Leiste links neben „Zurück"; er hat einen gestrichelten Rand
   und ist damit klar vom „Weiter"-Button zu unterscheiden.
2. Alle Felder dieses Schritts sind nun gefüllt und „Weiter" ist aktiv. Klicken Sie
   auf **„Weiter"**, um in den nächsten Schritt zu gelangen.
3. Wiederholen Sie das auf jedem Folgeschritt, bis Sie die Seite erreicht haben, die
   Sie eigentlich testen möchten. Sie können jederzeit auch manuell auswählen oder
   die Zufallswerte überschreiben.
4. Auf dem letzten Schritt „10. Name" schließen Sie den Charakter wie gewohnt mit
   **„Charakter fertigstellen"** ab.

### Erwartete Rückmeldungen

- Der Button erscheint auf allen zehn Schritten: 1. Schicksal, 2. Rasse,
  3. Abstammung, 4. Kultur, 5. Kindheit, 6. Ausbildung, 7. Attribute,
  8. Hobbybedarf, 9. Meisterschaften, 10. Name.
- Nach dem Klick sind die Felder des aktuellen Schritts gesetzt; eine
  Validierungsfehlermeldung erscheint nicht und „Weiter" ist aktiv.
- Es werden ausschließlich Felder des aktuellen Schritts gefüllt. Der folgende
  Schritt startet wieder ungesetzt, solange Sie dort nicht „Zufällig ausfüllen"
  geklickt haben.
- Ein erneuter Klick erzeugt neue Zufallswerte; in der Regel ändert sich mindestens
  ein Wert. Alle Werte bleiben gültig.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Der Button fehlt | Die Instanz läuft nicht mit `SYSTEM=TEST`, bzw. eine Änderung des Flags ist im laufenden Prozess noch nicht wirksam. Prüfen Sie `/api/config`. Ein clientseitiger Schalter existiert nicht. |
| „Weiter" bleibt nach dem Klick inaktiv | Sie haben anschließend ein Feld manuell ungültig gemacht (z. B. geleert) oder die Bibliotheksdaten laden noch. Klicken Sie erneut auf „Zufällig ausfüllen". |
| Klick direkt nach Seitenaufruf | Wenn Daten noch laden, wird Ihr Klick vorgemerkt und automatisch ausgeführt, sobald die Daten verfügbar sind. |
| Andere Zufallswerte gewünscht | Klicken Sie einfach erneut auf „Zufällig ausfüllen", oder korrigieren Sie die Felder manuell. |

### Speicherung

- Die Zufallswerte werden über den normalen Erstellvorgang gespeichert und erst mit
  „Charakter fertigstellen" im Charakter abgelegt – es gibt keine gesonderte
  Testmodus-Speicherung.
- Schließen Sie den Charakter nicht ab, bleiben die Werte im laufenden Erstellvorgang
  erhalten; „Neuer Charakter" setzt ihn wie bisher zurück.

### Grenzen

- Der Testmodus ist eine Test-Hilfe: Er ersetzt keine manuelle Prüfung und ändert
  keine Spielregeln oder Validierungsregeln.
- Er füllt nur den jeweils aktuellen Schritt – nicht alle Schritte mit einem Klick.
- Außerhalb von `SYSTEM=TEST` verhält sich die Anwendung wie gewohnt: kein Button,
  keine sonstigen Änderungen.
- Die erzeugten Werte sind synthetische Testdaten.

---

## Kultur mit Entweder/Oder-Alternativen wählen (INT-000016 / SF-000009)

Anwenderhandbuch zum Schritt „4. Kultur" bei der Charaktererstellung (Stand: 25.11.2026).
Es beschreibt, wie Sie bei einer Kultur mit Entweder/Oder-Alternativen je Gruppe genau
eine Seite wählen und was Ihr Charakter dadurch erhält.
Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).
Anlegen und Pflegen der Kulturen: [`ANWENDER-KULTUREDITOR.md`](ANWENDER-KULTUREDITOR.md).

### Worum es geht

Kulturen können feste Zuweisungen enthalten (z. B. „Wahrnehmung 1") und
**Entweder/Oder-Gruppen** wie „Athletik 2 **oder** Akrobatik 1 + Heimlichkeit 1".
Beide Seiten einer Gruppe sind gleichwertig (gleiche Punktsumme – das prüft bereits die
Bibliothek beim Speichern). In der Charaktererstellung entscheiden Sie je Gruppe, welche
Seite Ihr Charakter erhält: Er bekommt genau die Einträge der gewählten Seite, die
Einträge der anderen Seite nicht.

### Voraussetzungen

- Sie haben Zugriff auf die App und öffnen in der Seitenleiste **„Creation"**.
- Sie haben einen neuen Erstellvorgang gestartet („Neuen Charakter erstellen") und die
  Schritte „1. Schicksal", „2. Rasse" und „3. Abstammung" abgeschlossen.
- Es existiert eine Kultur im Bibliothek-Tab „Kulturen", die „Gängig für" Ihre gewählte
  Rasse ist. Kulturen mit Alternativen legen Sie gemäß
  [`ANWENDER-KULTUREDITOR.md`](ANWENDER-KULTUREDITOR.md) an.

### Kultur wählen und Seite aussuchen

1. Klicken Sie im Schritt **„4. Kultur"** auf die Karte der gewünschten Kultur. Der
   Detailbereich rechts zeigt Name, Beschreibung, die festen Zuweisungen (Bereiche
   „Talente", „Waffentalente", „Magieschulen", „Stärken") und – wenn die Kultur
   Alternativen enthält – den Block **„Entweder/Oder-Gruppen"**.
2. Vergleichen Sie in jeder Gruppe beide Seiten („Seite 1"/„Seite 2") mit allen
   Einträgen und Werten, z. B. „Athletik 2" gegen „Akrobatik 1" + „Heimlichkeit 1".
3. Klicken Sie auf die gewünschte Seite. Sie erhält die Markierung **„✓ Seite X"** und
   eine Hervorhebung; die Markierung der anderen Seite entfällt.
4. Sie können die Entscheidung jederzeit ändern: Ein Klick auf die andere Seite ersetzt
   die bisherige Wahl – beide Seiten gelten nie gleichzeitig.
5. Enthält die Kultur mehrere Gruppen, wählen Sie jede Gruppe unabhängig voneinander.
6. Klicken Sie auf **„Weiter"**. Der Button ist aktiv, sobald eine Kultur gewählt ist
   **und** in jeder Gruppe eine Seite gewählt wurde.

### Erwartete Rückmeldungen

- **Keine Vorbelegung:** Nach der Kulturwahl ist zunächst keine Seite markiert und
  „Weiter" bleibt inaktiv, bis Sie je Gruppe entschieden haben.
- **Sichtbare Entscheidung:** Die gewählte Seite ist mit „✓ Seite X" und Hervorhebung
  markiert – bevor Sie den Schritt verlassen und jederzeit kontrollierbar.
- **Werte im Folgeschritt:** In „5. Kindheit" zeigen die Tabellen die Werte der
  gewählten Seite (Beispiel: Athletik 2 – oder bei Wahl der anderen Seite Akrobatik 1
  und Heimlichkeit 1, die ungewählte Seite bleibt 0).
- **Charakterbogen:** Im fertigen Charakter („Chronik") stehen die Einträge der
  gewählten Seite in „Fähigkeiten" bzw. „Stärken"; die Info-Zeile nennt die Kultur.

### Tastaturbedienung

- Mit der **Tab-Taste** erreichen Sie alle Seiten-Buttons der Gruppen sowie „Weiter".
- Mit **Leertaste** oder **Eingabe-Taste** wählen Sie die fokussierte Seite; die
  Markierung erscheint sofort. Alles ist auch ohne Maus bedienbar.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| „Weiter" bleibt inaktiv | Es ist keine Kultur gewählt oder in mindestens einer Gruppe fehlt die Entscheidung. Wählen Sie je Gruppe eine Seite. |
| Falsche Seite gewählt | Klicken Sie einfach auf die andere Seite – nur die zuletzt gewählte Seite zählt. |
| Verklickt bei der Kultur | Ein erneuter Klick auf dieselbe Kultur-Karte ändert nichts; Ihre Gruppenwahl bleibt erhalten. Erst der Wechsel zu einer anderen Kultur setzt die Gruppenwahl zurück. |
| Eintrag fehlt im Charakter | Der Charakter erhält genau die gewählte Seite. Prüfen Sie im Schritt „4. Kultur", welche Seite „✓" trägt, und ändern Sie die Wahl gegebenenfalls, bevor Sie abschließen. |

### Speicherung

- Die Wahl wird mit dem Schritt „Kultur" gespeichert und beim Abschluss
  („Charakter fertigstellen") mit dem Charakter abgelegt.
- Ihr Charakter erhält die Einträge der gewählten Seite genauso, als wären sie feste
  Kultureinträge – es gibt keinen Unterschied in den Werten des Charakterbogens.

### Grenzen

- **Wahlpflicht:** Je Gruppe muss genau eine Seite gewählt werden; der Schritt lässt
  sich nicht abschließen, solange eine Entscheidung fehlt (keine Überspring-Option).
  Im Testmodus kann „Zufällig ausfüllen" diese Wahl abnehmen (siehe oben).
- **Kulturen ohne Gruppen** zeigen keine Auswahlelemente und keine neuen Pflichtfelder;
  sie verhalten sich wie bisher („Weiter" ist direkt nach der Kulturwahl aktiv).
- **Keine Werteberechnung in der Erstellung:** Die Gleichwertigkeit beider Seiten ist
  in der Bibliothek erzwungen; die Erstellung rechnet die Werte nicht neu.
- **Bestand:** Bereits fertig erstellte Charaktere werden durch diese Funktion nicht
  geändert; die Wahl gilt für neue Erstellungs- und Bearbeitungsvorgänge.

---

## Geschwindigkeit (GES) als abgeleiteter Wert (INT-000019 / SF-000011)

Anwenderhandbuch zur Geschwindigkeit in der Charaktererstellung, in der Chronik und
in der Bibliothek (Stand: 27.11.2026). Die Geschwindigkeit wird **`GES`** genannt
und immer als **GES = GK + GE** berechnet: Größenklasse der gewählten Rasse plus
Modifikator des Attributs Gewandheit. Sie ist ein abgeleiteter Wert — Sie geben ihn
nicht selbst ein, er ändert sich automatisch, wenn sich GK oder GE ändern.
Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).

### Worum es geht

Die Größenklasse (GK) kommt aus der gewählten Rasse (z. B. Mensch 3, Elf 2).
Gewandheit (GEW) ist eines der zehn Attribute; maßgeblich für GES ist nicht der
Attributwert selbst, sondern sein Modifikator: 18 → +4, 14 → +2, 12 → +1,
10/11 → 0, 9/8 → −1. Beispiel: Mensch mit GK 3 und Gewandheit 18 (+4) ergibt
**GES 7**.

### Voraussetzungen

- Sie haben die App geöffnet und in der Seitenleiste **„Creation"** einen
  Erstellvorgang gestartet und bis zum Schritt **„7. Attribute"** geführt; dabei
  ist in „2. Rasse" eine Rasse gewählt (damit die Größenklasse feststeht).
- Für die Chronik: Ein fertiggestellter Charakter ist in **„Chronik"** vorhanden.
- Für die Bibliothek: Die Seitenleiste mit dem Tab **„Abgeleitete Werte"** ist
  erreichbar.

### Geschwindigkeit in der Erstellung ablesen und beeinflussen

1. Öffnen Sie im Erstellvorgang den Schritt **„7. Attribute"** und scrollen Sie
   unter die Attributzuordnung zum Abschnitt **„Abgeleitete Werte"**.
2. Suchen Sie die Kachel **„Geschwindigkeit"** (auch „GES" möglich). Sie zeigt die
   Formel **„GK + GE"** und darunter den Wert.
3. Ordnen Sie im Bereich „Attribute zuordnen" dem Kasten **„GEW Gewandheit"**
   einen Wert aus dem Werte-Pool zu, z. B. **18**. Neben dem Attributwert erscheint
   der Modifikator „+4", und die Geschwindigkeits-Kachel zeigt sofort **7** — ohne
   dass Sie die Seite neu laden.
4. Um den Wert zu ändern, ändern Sie eine der beiden Eingangsgrößen: Wählen Sie
   für GEW z. B. **14** (Modifikator „+2" → GES **5**), oder wechseln Sie in
   „2. Rasse" zu **Elf** (Größenklasse 2 → GES **4**). Die Kachel passt sich sofort
   an.

### Geschwindigkeit in Chronik und Bibliothek finden

- **Chronik:** Öffnen Sie den Charakter, sodass der Charakterbogen sichtbar wird.
  Im Abschnitt **„Abgeleitete Werte"** steht der Eintrag **„GES"** mit dem Wert.
  Er ist identisch zu dem Wert, den Sie in der Erstellung gesehen haben. Auch
  Charaktere, die schon vor der Einführung der Geschwindigkeit angelegt wurden,
  zeigen ihn — Sie müssen dafür nichts nachtragen.
- **Bibliothek:** Öffnen Sie den Tab **„Abgeleitete Werte"**. Der Eintrag
  **„Geschwindigkeit"** (Beschreibung „Bewegungsrate eines Charakters im Kampf")
  zeigt in der kursiven Zeile die Formel **„GK + GE"**. Die übrigen Einträge und
  Formeln bleiben unverändert.

### Erwartete Rückmeldungen

- Die Kachel in der Erstellung zeigt Beschriftung, Formel „GK + GE" und den
  berechneten Wert (Mensch/GEW 18 → „7").
- Jede Änderung an Gewandheit oder Rasse wirkt sofort und ohne Neuladen.
- Der Charakterbogen zeigt denselben GES-Wert wie die Erstellung.
- Die bereits bekannten abgeleiteten Werte (z. B. Lebenspunkte, Verteidigung,
  Initiative) und ihre Formeln sind weiterhin vorhanden und unverändert.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Die Kachel zeigt „—" statt einer Zahl | Gewandheit ist noch nicht zugeordnet. Ordnen Sie im Werte-Pool einen Wert dem Kasten „GEW Gewandheit" zu. Ein Wert, der nur im Pool liegt, aber keinem Attribut zugeordnet ist, reicht nicht. |
| Der GES-Wert scheint falsch | Prüfen Sie die Größenklasse der gewählten Rasse und den Modifikator von Gewandheit (18→+4, 14→+2, 12→+1, 10/11→0, 9/8→−1). GES ist immer GK + dieser Modifikator, nie der Rohwert der Gewandheit. |
| Sie möchten den Wert direkt korrigieren | Das geht bewusst nicht: GES ist abgeleitet. Ändern Sie stattdessen die Rasse (GK) oder den Gewandheitswert (GE). |
| Der Eintrag fehlt in der Bibliothek | Die Bibliothek ergänzt den Eintrag „Geschwindigkeit" beim Start der Instanz automatisch. Laden Sie die Seite nach einem Update neu. |

### Speicherung

- Schließen Sie den Charakter mit **„Charakter fertigstellen"** ab, wird GES mit
  ihm gespeichert und in der Chronik angezeigt.
- Für Bestandscharaktere wird GES automatisch aus deren vorhandenen Werten
  (Größenklasse und Gewandheit) berechnet. Sie müssen ältere Charaktere weder
  neu speichern noch nachträglich bearbeiten; ihre übrigen Werte bleiben
  unverändert.

### Grenzen

- **Nicht manuell editierbar:** Es gibt für GES kein Eingabefeld, keinen Zähler
  und keine Auswahlliste — weder in der Erstellung noch im Charakterbogen.
- **Platzhalter statt Zahl:** Solange Gewandheit nicht zugeordnet ist, steht „—".
  Es wird weder „0" noch die Größenklasse allein angezeigt.
- **Formelanzeige:** Die Formel „GK + GE" erscheint dort, wo auch die anderen
  abgeleiteten Werte ihre Formel zeigen (Erstellung und Bibliothek). Im
  Charakterbogen steht nur der Wert unter dem Kürzel „GES".
- **Keine Regression:** Bestehende abgeleitete Werte und Formeln bleiben
  unverändert; es werden keine vorhandenen Charakterdaten umgeschrieben.

---

## Passive Boni auf Attribute und abgeleitete Werte (INT-000020 / SF-000012)

Anwenderhandbuch für die Bibliothek, die Charaktererstellung und die Chronik.
Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).

### Worum es geht

Meisterschaften und Vorteile/Stärken — auch rassenspezifische Vorteile — können
einen passiven Bonus auf ein Attribut oder einen abgeleiteten Wert erhalten.
Wählen Sie einen solchen Eintrag bei der Charaktererstellung oder vergeben Sie ihn
in der Chronik, wird der Bonus automatisch addiert: Bei Attributen direkt auf den
Wert, bei abgeleiteten Werten nach deren regulärer Berechnung obendrauf. Sie
müssen den Bonus nicht selbst im Charakterbogen eintragen.

### Voraussetzungen

- Sie erreichen in der Seitenleiste **„Bibliothek"** und dort die Unterreiter
  **„Meisterschaften"** und **„Stärken"**.
- Zum Anlegen/Bearbeiten: Ein Eintrag kann neu erstellt oder über die Karte und
  **„Bearbeiten"** geöffnet werden.
- Zum Erhalten des Bonus: Sie führen einen Erstellvorgang bis zur Wahl der Stärke
  („5. Kindheit") bzw. der Meisterschaft („9. Meisterschaften"), oder Sie öffnen
  in der **„Chronik"** einen fertigen Charakter mit verfügbaren XP.

### Passiven Bonus in der Bibliothek festlegen

1. Öffnen Sie **Bibliothek → Meisterschaften** oder **Bibliothek → Stärken** und
   klicken Sie auf **„+ Neu"** (oder wählen Sie eine Karte und **„Bearbeiten"**).
2. Füllen Sie die gewohnten Felder aus (z. B. „Name", „Effekt" bzw.
   „Beschreibung"). Bei Stärken wählen Sie als Kategorie **„Stärke"** oder
   **„Rassenvorteil/-nachteil"** mit Unterkategorie **„Vorteil"**.
3. Aktivieren Sie die Checkbox **„Passiver Bonus"**. Das Formular klappt unten
   die Ansicht **„Passive Boni"** auf.
4. Sie sehen zwanzig Felder: die zehn Attribute **MUT, KLU, INT, CHA, HIN, MYS,
   FF, GEW, KON, KRA** und die zehn abgeleiteten Werte **Lebenspunkte, Focus,
   Spirit, Verteidigung, Körperlicher Widerstand, Geistiger Widerstand,
   Schadensschwelle, Initiative, GK, Geschwindigkeit**. Tragen Sie hinter dem
   gewünschten Wert die Zahl ein, z. B. bei MUT eine **2** und bei Lebenspunkten
   eine **5**. Nur ganze Zahlen sind möglich; ein leeres Feld oder 0 bedeutet
   keinen Bonus, negative Werte wirken als Malus.
5. Klicken Sie auf **„Erstellen"** bzw. **„Speichern"**. Öffnen Sie den Eintrag
   erneut mit **„Bearbeiten"**, stehen Aktivierung und Werte wieder im Formular.

### Bonus bei der Charaktererstellung erhalten

- Wählen Sie in „5. Kindheit" eine Stärke mit passivem Bonus. Im fertigen
  Charakter ist das Attribut entsprechend erhöht (Beispiel: KON-Bonus +2 aus
  einer Stärke → Konstitution 14 wird zu 16).
- Rassenvorteile mit Bonus wirken ebenfalls, wenn die Rasse diese Vorteile
  gewährt.
- In „9. Meisterschaften" erscheint für jede Fertigkeit ab Wert 6, für die eine
  passende Meisterschaft mit Schwelle 1 verfügbar ist, ein Auswahlfeld
  **„Meisterschaft für {Fertigkeit}"**. Wählen Sie die Meisterschaft; ihr Bonus
  wird angerechnet (Beispiel: MUT-Bonus +2 → Mut 14 wird zu 16).
- Schließen Sie mit **„Charakter fertigstellen"** ab. In der Chronik sehen Sie
  die erhöhten Werte.

### Bonus in der Chronik vergeben

1. Öffnen Sie in der **Chronik** den Charakter und den Bereich **„XP ausgeben"**.
2. Wählen Sie als Aktion **„Neu erlernen: Stärke"** und als Ziel den Vorteil mit
   dem passiven Bonus.
3. Klicken Sie auf **„Ausgeben (… XP)"** und bestätigen Sie mit
   **„Ja, ausgeben"**.
4. Die betroffenen Werte im Charakterbogen sind nun erhöht (Beispiel: KON +3 und
   LP +5). Der Vorteil erscheint unter **„Stärken"**. Die Erhöhung bleibt auch
   nach dem Verlassen und erneuten Öffnen des Charakters sichtbar.

### Erwartete Rückmeldungen

- Die Checkbox „Passiver Bonus" klappt die Werte-Ansicht auf; ohne Haken bleibt
   sie verborgen und es werden keine Boni gespeichert.
- Nach dem Speichern erscheinen die gesetzten Werte beim erneuten „Bearbeiten"
   wieder im Formular; geänderte Werte ersetzen die vorherigen.
- Im Charakterbogen stehen die verbonusten Endwerte unter **„Attribute"** und
   **„Abgeleitete Werte"**; die gewählte Meisterschaft bzw. Stärke steht unter
   **„Meisterschaften"** bzw. **„Stärken"**.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Eine Dezimalzahl wird nicht übernommen | Es sind nur ganze Zahlen möglich. Aus „1,5" wird kein Dezimalbonus; geben Sie stattdessen eine ganze Zahl ein. |
| Ein bestehender Wert lässt sich nicht negativ machen | Markieren Sie den Wert, tippen Sie zuerst „-" und dann die Ziffer. Das Minus bleibt beim Ändern erhalten. |
| In „9. Meisterschaften" fehlt das Auswahlfeld | Die Fertigkeit erreicht den Wert 6 nicht, oder es ist keine Meisterschaft mit Schwelle 1 ohne blockierende Voraussetzung verfügbar. Lesen Sie den Hinweistext im Schritt und legen Sie die Meisterschaft ggf. entsprechend an. |
| Der Bonus wirkt nicht im Charakter | Prüfen Sie im Bibliotheksformular, ob „Passiver Bonus" aktiv ist und ein Wert hinter dem Stat steht. Nur aktive Einträge mit Werten wirken, und nur bei Wahl/Erlernen des Eintrags. |

### Speicherung

- Die Boni werden mit dem Bibliothekseintrag gespeichert und beim Bearbeiten
   wieder geladen.
- Bei der Wahl oder Vergabe werden sie einmalig in den Charakter übernommen und
   mit ihm gespeichert. Die ursprünglich eingegebenen Rohwerte bleiben erhalten;
   ein erneutes Berechnen zählt den Bonus dadurch nicht doppelt.

### Grenzen

- Es sind ausschließlich ganze Zahlen möglich; die zwanzig Attribute und
   abgeleiteten Werte sind fest vorgegeben, es kommen keine neuen Werte hinzu.
- Boni wirken nur bei Wahl (Erstellung) oder XP-Vergabe (Chronik). Bereits fertig
   erstellte Charaktere werden nicht nachträglich verändert.
- Bei abgeleiteten Werten kommt der Bonus nach der regulären Berechnung
   obendrauf; er verändert nicht die Berechnungsgrundlage anderer Werte. Ein
   KON-Bonus verändert z. B. die Lebenspunkte nicht, ein GEW-Bonus lässt die
   bereits berechnete Geschwindigkeit unverändert.
- Der Charakterbogen zeigt die Endwerte, aber keine gesonderte Liste der
   vergebenen Boni; die Zusätze sind in den angezeigten Werten enthalten.
- Passive Boni werden im Bibliotheksformular gepflegt; der Dateiimport legt
   keine passiven Boni an.
