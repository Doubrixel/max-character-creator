# Anwenderhandbuch: Charaktererstellung

Dieses Handbuch beschreibt zwei Funktionen der Charaktererstellung in „Max Character
Creator". Es beschreibt nur stabiles, beobachtbares Anwenderverhalten.

Inhalt:

- Testmodus: Schritte schnell mit Zufallswerten überspringen (INT-000018 / SF-000010)
- Kultur mit Entweder/Oder-Alternativen wählen (INT-000016 / SF-000009)

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
