# Anwenderhandbuch: Charaktererstellung

Dieses Handbuch beschreibt zwei Funktionen der Charaktererstellung in „Max Character
Creator". Es beschreibt nur stabiles, beobachtbares Anwenderverhalten.

Inhalt:

- Testmodus: Schritte schnell mit Zufallswerten überspringen (INT-000018 / SF-000010)
- Kultur mit Entweder/Oder-Alternativen wählen (INT-000016 / SF-000009)
- Geschwindigkeit (GES) als abgeleiteter Wert (INT-000019 / SF-000011)
- Passive Boni auf Attribute und abgeleitete Werte (INT-000020 / SF-000012)
- Bonus-Felder nur mit Kürzeln beschriftet (INT-000021)
- Passive Boni schon im Schritt „7. Attribute" sehen (INT-000022)
- Vorteile und Meisterschaften mehrfach wählen (INT-000023 / SF-000014)
- Kosten und Punktbudget bei mehrfach gewählten Stärken in der Creation (INT-000027 / SF-000014)
- 1 Punkt für Stärken in „5. Kindheit" (INT-000028 / SF-000014)

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
4. Sie sehen zwanzig Felder, die ausschließlich mit den etablierten **Kürzeln**
   beschriftet sind: die zehn Attribute **MUT, KLU, INT, CHA, HIN, MYS, FF, GEW,
   KON, KRA** und die zehn abgeleiteten Werte **LP** (Lebenspunkte), **FK**
   (Focus), **SP** (Spirit), **VTD** (Verteidigung), **KW** (Körperlicher
   Widerstand), **GW** (Geistiger Widerstand), **SS** (Schadensschwelle), **INI**
   (Initiative), **GK** und **GES** (Geschwindigkeit). Vollständige Namen wie
   „Lebenspunkte" erscheinen hier nicht als Feldbezeichnung. Tragen Sie hinter
   dem gewünschten Kürzel die Zahl ein, z. B. bei MUT eine **2** und bei LP eine
   **5**. Nur ganze Zahlen sind möglich; ein leeres Feld oder 0 bedeutet keinen
   Bonus, negative Werte wirken als Malus.
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
- Jedes der zwanzig Felder trägt nur sein Kürzel (z. B. **LP** statt
   „Lebenspunkte", **KW** statt „Körperlicher Widerstand") — als sichtbare
   Beschriftung und für Screenreader als Name. Die Zuordnung Kürzel → Wert ist
   unverändert; es sind die im System etablierten Kürzel, wie sie auch im
   Charakterbogen verwendet werden.
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
- In der Bonus-Ansicht stehen nur die Kürzel als Feldbezeichnung; vollständige
   Langnamen der abgeleiteten Werte erscheinen dort nicht. Eingabe, Speichern und
   Anrechnung bleiben davon unberührt.
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

---

## Passive Boni schon im Schritt „7. Attribute" sehen (INT-000022)

Anwenderhandbuch zur Charaktererstellung (Stand: 27.11.2026). Haben Sie vor dem
Attribut-Schritt eine Stärke, einen Vorteil oder einen Rassenvorteil mit
passivem Bonus gewählt, ist der Bonus bereits bei der Attributvergabe in den
angezeigten Werten enthalten. Sie müssen nicht bis zum fertigen Charakterbogen
warten, um Ihre Punkteverteilung zu planen. Das Anlegen und Pflegen der Boni in
der Bibliothek bleibt unverändert (siehe vorheriger Abschnitt). Technische
Details: [`technische-dokumentation.md`](technische-dokumentation.md).

### Worum es geht

Ein passiver Bonus auf ein Attribut wird direkt auf den angezeigten Attributwert
addiert (z. B. Konstitution 14 + 2 = 16). Ein Bonus auf einen abgeleiteten Wert
kommt nach dessen regulärer Berechnung obendrauf (z. B. Lebenspunkte 25 + 5 =
30). Die Anzeige im Attribut-Schritt entspricht damit exakt dem Wert, der später
im Charakterbogen steht. Es wird nichts weiter verändert: Ein GEW-Bonus ändert
nicht die bereits berechnete Geschwindigkeit, ein KON-Bonus nicht die
Lebenspunkte.

### Voraussetzungen

- Sie haben in der Seitenleiste **„Creation"** einen Erstellvorgang gestartet und
  bis zum Schritt **„7. Attribute"** geführt.
- In einem früheren Schritt haben Sie eine Stärke bzw. einen Vorteil mit
  aktivem passiven Bonus gewählt (z. B. in „5. Kindheit" oder „6. Ausbildung"),
  oder Ihre Rasse gewährt einen Rassenvorteil mit Bonus.
- Der Bonus ist im Bibliothekseintrag aktiviert und mit einer ganzen Zahl
  hinterlegt; nur ganze Zahlen (auch negative) wirken.

### Bonus bei der Attributvergabe ablesen

1. Gelangen Sie mit **„Weiter"** in den Schritt **„7. Attribute"**. Die Boni der
   bereits getroffenen Auswahlen sind automatisch geladen; Sie müssen nichts
   zusätzlich einstellen.
2. Würfeln oder tragen Sie Werte im Bereich **„Werte-Pool"** ein und ordnen Sie
   unter **„Attribute zuordnen"** jedem Attribut einen Wert zu.
3. Lesen Sie den Wert im jeweiligen Attributblock ab — er enthält den Bonus
   bereits. Beispiel: Haben Sie eine Stärke mit **KON +2** gewählt und ordnen
   **14** zu, zeigt der Block **„KON Konstitution"** den Wert **16**, nicht 14.
4. Scrollen Sie zum Abschnitt **„Abgeleitete Werte"**. Auch dort sind die Boni
   schon enthalten: Mit einem zusätzlichen Bonus **LP +5** zeigt die Kachel
   **„Lebenspunkte"** (Formel „( GK + KON ) * 5") den Wert **30** statt 25.
5. Schließen Sie den Charakter wie gewohnt ab. Im Charakterbogen (**„Chronik"**)
   stehen unter **„Attribute"** und **„Abgeleitete Werte"** dieselben Werte wie
   in der Vorschau.

### Erwartete Rückmeldungen

- Die verbonusten Werte erscheinen direkt in den Attributblöcken und
  Wert-Kacheln; es gibt kein gesondertes Bonus-Feld und keine Extra-Bestätigung.
- Ändern Sie einen zugeordneten Wert, passt sich die Anzeige sofort an — mit dem
  Bonus obendrauf. Ein Zurückspringen in frühere Schritte ist nicht nötig.
- Der im Attribut-Schritt abgelesene Wert und der Wert im fertigen
  Charakterbogen sind identisch (z. B. KON 16 in beiden Ansichten, LP 30 in
  beiden Ansichten).
- Ohne ausgewählten Bonus bleibt alles unverändert (KON 14, Lebenspunkte 25).

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Der Bonus fehlt im Attribut-Schritt | Prüfen Sie, ob die Bonusquelle in einem früheren Schritt tatsächlich gewählt wurde („5. Kindheit", „6. Ausbildung") bzw. ob Ihre Rasse den Rassenvorteil gewährt. Nur bis dahin bereits ausgewählte Quellen fließen ein. |
| Der Bonus wirkt grundsätzlich nicht | Öffnen Sie den Eintrag in **Bibliothek → Stärken/Meisterschaften** mit **„Bearbeiten"**: Die Checkbox „Passiver Bonus" muss aktiv sein und hinter dem Kürzel muss eine ganze Zahl stehen. |
| Der Wert ist überraschend hoch | Mehrere Bonusquellen addieren sich. Prüfen Sie Ihre gewählten Stärken/Vorteile und die von der Rasse gewährten Vorteile; inaktive oder leere Einträge zählen nicht. |
| Fehlermeldung „Passive Boni konnten nicht geladen werden" | Laden Sie den Schritt erneut. Bis die Boni verfügbar sind, erscheinen die unveränderten Rohwerte; es werden keine falschen Werte gespeichert. |
| Ein GEW-Bonus verändert die Geschwindigkeit nicht | Das ist erwartet: GES wird aus dem Rohwert der Gewandheit berechnet; der Bonus erhöht nur den angezeigten GEW-Wert. |

### Speicherung

- Die Vorschau ist nur eine Anzeige: Sie speichert nichts und verändert Ihre
  eingegebenen Rohwerte nicht. Sie können die Attributvergabe beliebig oft
  ändern.
- Mit **„Charakter fertigstellen"** werden die Boni wie gewohnt in den Charakter
  übernommen und mit ihm gespeichert. Der Bonus wird dabei nicht doppelt
  gezählt.
- Bereits fertig erstellte Charaktere werden durch die Vorschau nicht verändert.

### Grenzen

- Es zählen nur Bonusquellen, die bis zum Attribut-Schritt bereits ausgewählt
  sind. Meisterschaften werden im Wizard üblicherweise erst in
  „9. Meisterschaften" gewählt und können daher in der Vorschau noch nicht
  erscheinen; ihr Bonus wird bei der Wahl berücksichtigt.
- Der Charakterbogen zeigt die Endwerte, aber keine gesonderte Liste der
  vergebenen Boni.
- Es gibt keine Eingabefelder für Boni im Attribut-Schritt: Die Werte sind
  abgeleitet und nur ablesbar.
- Inaktive, leere oder ungültige Bonusangaben wirken nicht; negative ganze
  Zahlen wirken als Malus.

---

## Vorteile und Meisterschaften mehrfach wählen (INT-000023 / SF-000014)

Anwenderhandbuch für Bibliothek, Charaktererstellung und Chronik (Stand: 28.11.2026).
Ein Vorteil/eine Stärke oder eine Meisterschaft kann als **mehrfach wählbar**
angelegt werden. Bis zur festgelegten Obergrenze können Sie ihn ganz normal erneut
wählen und bezahlen; im Charakterbogen erscheint er nur einmal mit römischer Zahl
(„Flink II"), und passive Boni werden für jede Auswahl addiert.
Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).

### Worum es geht

Normalerweise kann ein Vorteil oder eine Meisterschaft nur einmal gewählt werden.
Ist ein Eintrag in der Bibliothek als „mehrfach wählbar" markiert, bleibt er in der
Auswahl, bis die eingestellte Obergrenze erreicht ist. Jede weitere Auswahl kostet
genau das Gleiche wie die erste. Statt mehrerer gleichnamiger Zeilen zeigt der
Charakterbogen einen einzigen Eintrag mit römischer Zählung: „Flink" wird bei der
zweiten Auswahl zu „Flink II", bei der dritten zu „Flink III". Passive Boni werden
ebenfalls je Auswahl addiert: Gibt „Flink" **KON +1**, ergibt „Flink II" **KON +2**.

### Voraussetzungen

- Sie erreichen in der Seitenleiste **„Bibliothek"** und dort die Unterreiter
  **„Stärken"** und **„Meisterschaften"**, um die Mehrfachauswahl festzulegen.
- Für die Chronik: Ein fertiggestellter Charakter mit verfügbaren XP.
- Für die Erstellung: Ein Erstellvorgang bis zur Stärkenwahl („5. Kindheit")
  bzw. bis zu „9. Meisterschaften".

### Mehrfachauswahl in der Bibliothek festlegen

1. Öffnen Sie **Bibliothek → Stärken** oder **Bibliothek → Meisterschaften** und
   klicken Sie auf **„+ Neu"** (oder wählen Sie eine Karte und **„Bearbeiten"**).
2. Füllen Sie die gewohnten Felder aus (Name, Kosten, Beschreibung/Effekt usw.).
3. Aktivieren Sie die Checkbox **„mehrfach wählbar"**. Daraufhin erscheint das
   Textfeld **„maximale Auswahl-Obergrenze"** mit dem Hinweis
   „Nur ganze positive Zahlen (1, 2, 3, …).".
4. Tragen Sie die gewünschte Obergrenze ein, z. B. **3**. Es sind nur ganze
   positive Zahlen erlaubt — keine 0, keine negativen Zahlen, keine Dezimalzahlen
   und kein Text.
5. Klicken Sie auf **„Erstellen"** bzw. **„Speichern"**. Die Karte zeigt nun den
   Zusatz **„mehrfach wählbar (max 3)"**. Öffnen Sie den Eintrag erneut mit
   **„Bearbeiten"**, stehen Haken und Obergrenze wieder im Formular.

### Mehrfach in der Chronik erwerben

1. Öffnen Sie in der **Chronik** den Charakter und den Bereich **„XP ausgeben"**.
2. Wählen Sie als Aktion **„Neu erlernen: Stärke"** und als Ziel z. B. **„Flink"**.
   Die Schaltfläche **„Ausgeben (… XP)"** zeigt den regulären Preis.
3. Klicken Sie auf **„Ausgeben (… XP)"** und bestätigen Sie mit
   **„Ja, ausgeben"**.
4. Solange die Obergrenze nicht erreicht ist, bleibt das Ziel unter
   **„— Ziel wählen —"** vorhanden und kostet bei jedem Kauf gleich viel. Ist die
   Obergrenze erreicht, verschwindet es aus der Liste.
5. Im **„XP-Verlauf"** steht für jeden Kauf ein eigener Eintrag mit demselben
   XP-Betrag.

### Mehrfach bei der Charaktererstellung wählen

1. In Schritt **„5. Kindheit"** wählen Sie die Stärke per Klick aus; ein erneuter
   Klick auf die gewählte Karte wählt sie wieder ab (Toggle). Der Button zeigt
   den Stand, z. B. **„Auswahl 1 / 2"** bei Obergrenze 2. Hier stehen nur
   **1 Punkt** zur Verfügung (siehe Abschnitt „1 Punkt für Stärken in ‚5.
   Kindheit'" unten): Bei Kosten 1 ist damit nur eine Auswahl möglich, auch wenn
   die Obergrenze 2 wäre. Danach erscheint keine zweite Karte.
   In den Schritten **„6. Ausbildung"** und **„8. Hobbybedarf"** erscheint nach
   der ersten Auswahl eine identische, ebenfalls anklickbare Karte direkt
   darunter; jede weitere Auswahl erzeugt eine weitere Karte, bis Obergrenze oder
   Budget erschöpft sind. Eine gesonderte Hervorhebung, ein Bereich über dem
   Fenster und ein Kreuz zum Entfernen gibt es dabei nicht.
2. In Schritt **„9. Meisterschaften"** wählen Sie im Feld
   **„Meisterschaft für {Fertigkeit}"** die mehrfach wählbare Meisterschaft. Sie
   bleibt in den Auswahlfeldern, bis die Obergrenze erreicht ist; danach wird sie
   nicht mehr angeboten. Die Obergrenze gilt dabei für den ganzen Charakter, auch
   wenn Sie die Meisterschaft für mehrere Fertigkeiten gewählt haben.
3. Schließen Sie den Wizard wie gewohnt mit **„Charakter fertigstellen"** ab.

Hinweis: In den Punkteschritten **„6. Ausbildung"** und **„8. Hobbybedarf"** kostet jede weitere Auswahl einer mehrfach wählbaren Stärke erneut Punkte; das Punktbudget begrenzt die Auswahl zusätzlich zur Obergrenze. Auch **„5. Kindheit"** hat inzwischen ein Punktbudget (1 Punkt) — siehe die Abschnitte „Mehrfach wählbar: Kosten und Punktbudget in der Creation" und „1 Punkt für Stärken in ‚5. Kindheit'" unten.

### Darstellung und Boni im Charakterbogen

- Unter **„Stärken"** bzw. **„Meisterschaften"** steht genau **ein** Eintrag mit
  römischem Suffix: nach zwei Auswahlen „Flink II" statt zwei Zeilen „Flink".
- Passive Boni werden je Auswahl addiert: „Flink" mit **KON +1** ergibt bei zwei
  Auswahlen **KON +2**. Bei einem Rohwert von 14 zeigt der Charakterbogen also
  **16**, nicht 15. Dasselbe gilt für abgeleitete Werte.
- Die Vorschau im Schritt **„7. Attribute"** zeigt bereits die summierten Boni
  (siehe Abschnitt „Passive Boni schon im Schritt ‚7. Attribute' sehen").

### Erwartete Rückmeldungen

- Die Checkbox blendet das Obergrenzen-Feld ein; die Karte weist auf
  „mehrfach wählbar (max N)" hin.
- Bei einer ungültigen Obergrenze erscheint die Meldung
  „Maximale Auswahl-Obergrenze: bitte eine positive ganze Zahl eingeben (z. B. 3)."
  und es wird nichts gespeichert.
- Der Eintrag bleibt bis zur Obergrenze auswählbar und kostet bei jeder Auswahl
  den regulären Preis; danach ist er aus der Auswahl verschwunden.
- Der Charakterbogen zeigt einen einzigen Eintrag mit römischer Zählung und die
  summierten Boni; der XP-Verlauf listet jede Auswahl einzeln.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Die Obergrenze wird nicht übernommen | Nur ganze positive Zahlen sind erlaubt. Aus „0", „-2", „1,5" oder „abc" wird keine gültige Obergrenze; geben Sie z. B. „3" ein. |
| Die Checkbox ist gesetzt, das Feld fehlt | Aktivieren Sie „mehrfach wählbar" im Erstellungs-/Bearbeitungsformular; das Feld „maximale Auswahl-Obergrenze" erscheint dann. |
| Der Eintrag verschwindet zu früh oder bleibt zu lange | Prüfen Sie im Bibliothekseintrag, ob „mehrfach wählbar" aktiv ist und welche Obergrenze eingestellt ist. |
| Der Preis wirkt ungewöhnlich | Jede Auswahl kostet den regulären Preis wie beim ersten Mal; die Obergrenze verändert den Preis nicht. |
| Zwei gleichnamige Einträge im Charakterbogen | Mehrfach gewählte Einträge werden zu einem Eintrag mit römischer Zahl zusammengefasst. Prüfen Sie die Obergrenze, wenn mehr Auswahlen als erwartet möglich sind. |
| Der Bonus fehlt oder ist zu niedrig | Die Checkbox „Passiver Bonus" muss aktiv sein und eine ganze Zahl enthalten; jeder Kauf zählt genau einmal. |

### Speicherung

- Die Mehrfach-Konfiguration wird mit dem Bibliothekseintrag gespeichert und beim
  erneuten „Bearbeiten" wieder angezeigt.
- Jede Auswahl wird einzeln gespeichert und im XP-Verlauf einzeln protokolliert;
  die Zusammenfassung zu „Flink II" ist nur die Anzeige, die Rohauswahlen bleiben
  erhalten.
- Passive Boni werden mit dem Charakter gespeichert. Bereits fertig erstellte
  Charaktere werden durch eine geänderte Konfiguration nicht nachträglich
  verändert; sie wirkt erst bei der nächsten Wahl bzw. dem nächsten Kauf.

### Grenzen

- Die Obergrenze gilt pro Eintrag. Bei Meisterschaften im Schritt „9. Meisterschaften"
  wird sie characterweit über alle Fertigkeiten hinweg gezählt.
- Es sind ausschließlich ganze positive Zahlen erlaubt; 0, negative und dezimale
  Werte sowie Text werden abgewiesen.
- Einträge ohne „mehrfach wählbar" behalten das bisherige Verhalten: Nach einem
  Kauf werden sie nicht erneut angeboten.
- Der Dateiimport der Bibliothek legt keine Mehrfach-Konfiguration an; stellen Sie
  sie bei Bedarf über „Bearbeiten" ein.
- Bestehende, bereits fertig erstellte Charaktere werden nicht nachträglich
  umgeschrieben.

---

## Mehrfach wählbar: Kosten und Punktbudget in der Creation (INT-000027 / SF-000014)

Anwenderhandbuch für die Punkteschritte der Charaktererstellung (Stand: 28.11.2026). Wählen Sie eine mehrfach wählbare Stärke in einem Schritt mit Punktbudget erneut, kostet das jedes Mal den regulären Preis. Das verbleibende Punktbudget und die maximale Auswahl-Obergrenze begrenzen die Auswahl gemeinsam. Technische Details: [`technische-dokumentation.md`](technische-dokumentation.md).

Hinweis: „5. Kindheit" hat inzwischen ebenfalls ein Punktbudget, aber nur 1 Punkt — siehe Abschnitt „1 Punkt für Stärken in ‚5. Kindheit'" unten. Die Schritte 6 und 8 bleiben wie hier beschrieben (2 bzw. 3 Punkte).

### Worum es geht

Eine mehrfach wählbare Stärke (z. B. „Flink", Kosten 1, Obergrenze 2) bleibt in der Auswahl, bis die Obergrenze erreicht ist. In den Schritten **„6. Ausbildung"** („Stärken-Punkte: 2") und **„8. Hobbybedarf"** („Stärken-Punkte: 3") wird jeder Auswahl — auch der zweiten und jeder weiteren — der Preis vom Punktbudget abgezogen. Sind die Punkte aufgebraucht, können Sie nichts weiter auswählen, selbst wenn die Obergrenze noch frei wäre. Umgekehrt bleibt ein Punkt übrig, wenn die Obergrenze zuerst erreicht ist; den können Sie für eine andere Stärke ausgeben.

### Voraussetzungen

- Sie führen einen Erstellvorgang bis **„6. Ausbildung"** oder **„8. Hobbybedarf"**; der Zähler **„Stärken-Punkte"** und der Abschnitt **„N Stärken wählen"** sind sichtbar.
- In **Bibliothek → Stärken** ist eine Stärke als **„mehrfach wählbar"** mit positiver Obergrenze und einem Kostenwert angelegt (siehe Abschnitt „Vorteile und Meisterschaften mehrfach wählen").

### Schritt für Schritt: mehrfach wählen und Punkte beachten

1. Lesen Sie den Zähler **„Stärken-Punkte"** ab, z. B. **2**.
2. Klicken Sie auf die Karte der mehrfach wählbaren Stärke, z. B. **„Flink"**, **„1 Punkt"**. Die Karte bleibt als gewählte Karte im Abschnitt „2 Stärken wählen" stehen (zugänglich als gedrückt erkennbar), der Zähler sinkt auf **1**, und direkt darunter erscheint eine identische, ebenfalls auswählbare Karte **„Flink"**.
3. Klicken Sie auf die darunter erschienene zweite Karte **„Flink"**. Der Zähler sinkt auf **0**; jetzt stehen zwei identische Karten **„Flink"**, beide weiterhin anklickbar. Eine dritte Karte erscheint nicht, weil die Obergrenze 2 erreicht ist. Die Bezeichnung **„Flink II"** gibt es nur im fertigen Charakterbogen, nicht im Auswahlbereich.
4. Hätten Sie mehr Punkte als die Obergrenze zulässt, bliebe der Restpunkt für eine andere Stärke; ist das Budget vor der Obergrenze aufgebraucht, erscheint keine weitere identische Karte und ein Klick auf die zusätzliche Karte wird nicht angenommen.
5. Möchten Sie eine Auswahl zurücknehmen, klicken Sie die betreffende gewählte Karte **„Flink"** erneut an. Pro Klick wird genau eine Auswahl abgewählt und genau ein Punkt erstattet (Zähler 0 → 1 → 2). Die Kartenanzahl folgt weiterhin derselben Regel wie bei der Auswahl: Je verbleibender Auswahl steht eine Karte, und solange Obergrenze **und** Restbudget eine weitere Auswahl erlauben, bleibt eine identische, auswählbare Karte darunter. Nach dem Abwählen von zwei auf eine Auswahl stehen daher weiterhin zwei Karten (eine gewählt, eine identisch auswählbar); erst wenn die letzte Auswahl zurückgenommen ist, bleibt eine einzelne Karte. Es gibt weder ein Kreuz noch eine Schaltfläche **„Flink entfernen"** noch eine gesonderte Darstellung über dem Auswahlbereich.

### Erwartete Rückmeldungen

- Nach **jeder** Auswahl sinkt „Stärken-Punkte" um den Kostenwert; „Fertigkeits-Punkte" und „Ressourcen-Punkte" bleiben unverändert.
- Im Auswahlbereich steht **je Auswahl eine identische Karte** mit dem einfachen Namen („Flink"), nicht „Flink II". Die römische Zählung und die summierten Boni erscheinen nur im Ergebnis bzw. Charakterbogen.
- Ist die Obergrenze erreicht **oder** das Budget aufgebraucht, wird keine weitere Karte angeboten; eine Fehlermeldung erscheint nicht.
- Ein erneuter Klick auf eine gewählte Karte nimmt genau eine Auswahl zurück und erstattet den Punkt. Die Kartenanzahl richtet sich weiterhin nach Auswahlzahl, Obergrenze und Restbudget: Bei einer verbleibenden Auswahl und ausreichendem Restbudget bleiben zwei identische Karten sichtbar (eine gewählt, eine auswählbar); nach der letzten Abwahl bleibt eine einzelne Karte.
- „Weiter" ist erst aktiv, wenn alle drei Zähler (Fertigkeiten, Ressourcen, Stärken) auf 0 sind.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Die zusätzliche Karte erscheint nicht, obwohl „Auswahl 2 / 3" noch frei ist | Das Punktbudget ist aufgebraucht. Wählen Sie eine andere Auswahl ab oder schließen Sie den Schritt mit den verfügbaren Punkten ab. |
| Die zusätzliche Karte erscheint nicht, obwohl noch Punkte übrig sind | Die maximale Auswahl-Obergrenze ist erreicht. Geben Sie den Restpunkt für eine andere Stärke aus. |
| Sie sehen „Flink II" im Auswahlbereich | Das sollte nicht passieren; dort stehen ausschließlich Karten mit dem einfachen Namen. „Flink II" erscheint nur im Charakterbogen. |
| Ein Klick wird nicht angenommen | Entweder Budget oder Obergrenze ist erschöpft. Die zusätzliche Karte ist dann nicht auswählbar; es gibt keine Fehlermeldung. |
| Ein Punkt wurde nicht erstattet | Klicken Sie die betreffende gewählte Karte erneut an; pro Klick wird genau eine Auswahl abgewählt und ein Punkt erstattet. |

### Speicherung

- Die Auswahlen werden im laufenden Erstellvorgang gespeichert und mit **„Charakter fertigstellen"** in den Charakter übernommen. Es gibt keinen gesonderten Kosten-Eintrag.
- Die Zusammenfassung zu „Flink II" betrifft nur die Anzeige; die einzelnen Auswahlen bleiben erhalten, und passive Boni werden pro Auswahl addiert.

### Grenzen

- Die Kostenabzugswirkung gibt es in allen Schritten mit einem Stärken-Punktzähler: **„5. Kindheit"** mit 1 Punkt (Bezeichnung **„Stärken Punkte:"**, INT-000028), **„6. Ausbildung"** mit 2 und **„8. Hobbybedarf"** mit 3 Punkten. In „5. Kindheit" ist wegen des 1-Punkt-Budgets auch bei mehrfach wählbaren Stärken mit Obergrenze ≥ 2 nur eine Auswahl möglich.
- Der Preis entspricht dem in der Bibliothek konfigurierten Kostenwert; die Obergrenze verändert den Preis nicht.
- Bereits fertig erstellte Charaktere werden nicht nachträglich geändert; Chronik-Käufe zum regulären Preis bleiben unverändert.
- Die Änderung betrifft nur die Auswahl in der Creation; Konfiguration, römische Zählung und Bonus-Aggregation bleiben wie beschrieben.

---

## 1 Punkt für Stärken in „5. Kindheit" (INT-000028 / SF-000014)

Anwenderhandbuch für den Creation-Schritt „5. Kindheit" (Stand: 28.11.2026).
Hier steht für die Stärkenwahl genau **1 Punkt** zur Verfügung. Die Überschrift
heißt jetzt **„Stärken Punkte: 1"** (nicht mehr „Stärken gewählt"). Jede Auswahl
kostet ihren regulären Preis; bei einer Stärke mit Kosten 1 können Sie daher nur
**eine** Stärke wählen — auch wenn sie mehrfach wählbar ist und eine Obergrenze
von 2 oder mehr hat. Technische Details:
[`technische-dokumentation.md`](technische-dokumentation.md).

### Worum es geht

In Schritt „5. Kindheit" verteilen Sie wie gewohnt 20 Fertigkeitspunkte. Zusätzlich
wählen Sie eine Stärke, und dafür haben Sie genau 1 Punkt. Klicken Sie auf eine
Stärke mit Kosten 1, sinkt der Zähler auf **„Stärken Punkte: 0"**. Danach ist keine
weitere Stärke auswählbar — weder dieselbe mehrfach wählbare Stärke noch eine
andere. Der vorherige Text „Stärken gewählt" gibt es in diesem Schritt nicht mehr.

### Voraussetzungen

- Sie führen einen Erstellvorgang bis zum Schritt **„5. Kindheit"**; die Zähler
  **„Stärken Punkte: 1"** und **„Fertigkeits-Punkte: 20"** sind sichtbar.
- In **Bibliothek → Stärken** ist mindestens eine Stärke mit einem Kostenwert
  angelegt. Stärken, die mehr als 1 Punkt kosten, sind in diesem Schritt nicht
  auswählbar.

### Schritt für Schritt: eine Stärke wählen

1. Lesen Sie den Zähler **„Stärken Punkte: 1"** ab.
2. Klicken Sie im Bereich **„Stärke wählen"** auf die gewünschte Stärke, z. B.
   **„Flink"** mit **„1 Punkt"**. Ist sie mehrfach wählbar, zeigt die Karte
   **„Auswahl 0 / 2"**.
3. Der Zähler sinkt auf **„Stärken Punkte: 0"**. Es bleibt bei genau einer
   ausgewählten Karte **„Flink"**; wegen des 1-Punkt-Budgets erscheint keine
   zweite identische Karte — auch bei Obergrenze 2 nicht und kein
   **„Auswahl 2 / 2"**.
4. Möchten Sie die Stärke wechseln, klicken Sie die gewählte Karte **„Flink"**
   erneut an. Der Punkt wird vollständig erstattet (**„Stärken Punkte: 1"**),
   die Karte ist wieder ungewählt und erneut auswählbar. Es gibt keine
   Schaltfläche **„{Name} entfernen"** und kein Kreuz.
5. Verteilen Sie die 20 Fertigkeitspunkte und klicken Sie auf **„Weiter"**. Der
   Button ist erst aktiv, wenn beide Zähler auf 0 sind.

### Erwartete Rückmeldungen

- Der Zähler zeigt **„Stärken Punkte: 1"** bzw. nach der Auswahl **„Stärken Punkte: 0"**;
  „Stärken gewählt" erscheint nicht mehr. „Fertigkeits-Punkte" bleibt unverändert.
- Nach der Auswahl bleibt genau eine ausgewählte Karte; eine weitere identische
  Karte erscheint nicht, weil der 1 Punkt aufgebraucht ist. Eine Fehlermeldung
  erscheint nicht.
- Bei einer mehrfach wählbaren Stärke steht **„Auswahl 1 / 2"**, nie **„Auswahl 2 / 2"**.
- Ein erneuter Klick auf die gewählte Karte wählt sie ab; der Punkt ist wieder
  verfügbar und die Karte erneut auswählbar.

### Fehlerbehebung

| Situation | Bedeutung / Lösung |
|---|---|
| Eine zweite Auswahl wird nicht angenommen | In Schritt 5 reicht der 1 Punkt nur für eine Stärke. Klicken Sie die gewählte Karte erneut an, um eine andere zu wählen. |
| „Auswahl 2 / 2" fehlt | Erwartet: Die Obergrenze wäre zwar frei, das 1-Punkt-Budget verhindert die zweite Auswahl. Zwei Auswahlen sind weiterhin in „6. Ausbildung" und „8. Hobbybedarf" möglich. |
| Die gewünschte Stärke wird nicht angeboten | Ihre Kosten liegen über 1 Punkt. In Schritt 5 sind nur Stärken mit Kosten 1 wählbar. |
| Der Punkt ist nach dem Abwählen noch 0 | Klicken Sie die betreffende Karte erneut an; pro Klick wird genau eine Auswahl abgewählt und ein Punkt erstattet. |

### Speicherung

- Die Auswahl wird im laufenden Erstellvorgang gespeichert und mit
  **„Charakter fertigstellen"** in den Charakter übernommen. Es gibt keinen
  gesonderten Kosten-Eintrag.
- Bereits fertig erstellte Charaktere werden nicht nachträglich verändert.

### Grenzen

- Schritt 5 hat genau **1 Punkt**; eine zweite Auswahl — auch einer mehrfach
  wählbaren Stärke — ist hier nicht möglich.
- Nur Stärken mit Kosten 1 sind in diesem Schritt wählbar; der Preis entspricht
  dem in der Bibliothek konfigurierten Kostenwert.
- Die Schritte **„6. Ausbildung"** (2 Punkte) und **„8. Hobbybedarf"** (3 Punkte)
  sowie Chronik-Käufe, römische Zählung und summierte Boni bleiben unverändert.
