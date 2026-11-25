# Kulturen pflegen: Talente, Stärken und Entweder/Oder-Alternativen

Anwenderhandbuch zum Bibliotheks-Kultureditor (Stand: 25.11.2026).
Es beschreibt, wie Sie eine Kultur mit den erlaubten Talenten und Stärken anlegen und
dazu gleichwertige Alternativen definieren.

## Worum es geht

Eine Kultur vergibt Talente und höchstens eine Stärke. Für jede Zuweisung kann statt
einer festen Vorgabe eine **Entweder/Oder-Alternative** angelegt werden – z. B.
„Athletik 2 **oder** Akrobatik 1 **und** Heimlichkeit 1". Wichtig: Beide Seiten einer
Alternative müssen **gleichwertig** sein, also dieselbe Punktsumme haben. Das System
verhindert, dass regelwidrige Kulturen gespeichert werden.

## Voraussetzungen

- Sie haben Zugriff auf die App und öffnen in der Seitenleiste **„Bibliothek"** und
  dort den Tab **„Kulturen"**.
- Für Stärken: Die Stärke muss im Tab „Stärken" mit **„Kosten (Punkte)" = 1** geführt
  werden. Prüfen Sie das dort vorab (Anzeige „Kosten: 1") und passen Sie es bei Bedarf
  über „Bearbeiten" an – sonst wird die Zuweisung abgelehnt.

## Kultur anlegen oder bearbeiten

1. Klicken Sie im Tab „Kulturen" auf **„+ Neu"** (oder bei einer bestehenden Kultur
   auf **„Bearbeiten"**).
2. Tragen Sie im Feld **„Name *"** einen Namen ein; „Beschreibung" ist optional.
3. Weisen Sie unten Talente und/oder eine Stärke zu (nächste Abschnitte).
4. Klicken Sie auf **„Erstellen"** (neue Kultur) bzw. **„Speichern"** (Änderung).

## Talente zuweisen (maximal 5 Punkte)

1. Klicken Sie im Bereich **„Talente"**, **„Waffentalente"** oder **„Magieschulen"**
   auf **„+ Eintrag hinzufügen"**.
2. Wählen Sie im Select der neuen Zeile den gewünschten Skill („Skill wählen...").
3. Tragen Sie im Feld **„Punkte"** einen Wert ein.

Regeln:

- Die **Gesamtsumme** über alle drei Bereiche darf **höchstens 5 Punkte** betragen
  (5 genau ist erlaubt). Bei Überschreitung erscheint die Meldung „Maximal 5 Punkte
  insgesamt für Talente, Waffentalente und Magieschulen." – der Wert wird nicht
  übernommen, eine gerade neu angelegte Zeile wird automatisch wieder entfernt.
- Punkte sind ganze Zahlen ab 0.

## Stärke zuweisen (genau eine)

1. Klicken Sie im Bereich **„Stärken"** auf **„+ Eintrag hinzufügen"**.
2. Wählen Sie im Select der Zeile die gewünschte Stärke („Stärke wählen...").
3. Die Stärke steht automatisch auf **Anzahl 1** (= Stufe 1). Ein anderer Wert wird
   mit der Meldung „Stärken nur mit Stufe 1 und Kosten 1." abgelehnt.

Regeln:

- **Höchstens eine Stärke** pro Kultur. Beim Versuch einer zweiten erscheint
  „Maximal eine Stärke pro Kultur."; die zweite Zeile wird automatisch wieder entfernt.
- Die Stärke muss im Tab „Stärken" **Kosten 1** haben; teurere Stärken werden nicht
  zugewiesen.

## Entweder/Oder-Alternative anlegen

Voraussetzung: Der Eintrag hat einen **Skill bzw. eine Stärke gewählt** und einen
**Wert größer 0** – nur dann erscheint am Eintrag der Button **„Alternative
hinzufügen"**.

1. Klicken Sie am Eintrag auf **„Alternative hinzufügen"**. Der Eintrag wandert aus
   seinem Bereich auf **„Seite 1"** der neuen Gruppe; sein Bereich listet ihn danach
   nicht mehr.
2. Füllen Sie **„Seite 2"** im Block „Entweder/Oder-Gruppen": Klicken Sie dort auf
   „+ Eintrag hinzufügen", wählen Sie Skill bzw. Stärke und setzen Sie die Punkte
   bzw. Anzahl.
   - **Talent-Alternative:** Jede Seite kann ein oder mehrere Einträge haben, z. B.
     Seite 1 = „Athletik 2", Seite 2 = „Akrobatik 1" + „Heimlichkeit 1". Einträge
     dürfen dabei aus allen drei Talentbereichen gemischt kommen.
   - **Stärken-Alternative:** Jede Seite enthält genau eine Stärke – es wird also
     „Stärke gegen Stärke" gewählt (z. B. „Zäh 1 | Schnell 1"). Beide Stärken müssen
     Kosten 1 haben.
3. Achten Sie auf **Gleichwertigkeit**: Die Punktsumme beider Seiten muss gleich
   sein. Solange sie es nicht ist, zeigt die Gruppe direkt die Meldung
   „Ungleichwertig: Seite 1 = X Punkte, Seite 2 = Y Punkte" an – passen Sie die Werte
   an, bis die Summen übereinstimmen (z. B. 2 = 1 + 1).

Anzeige: Gespeicherte Gruppen erscheinen im Format „Athletik 2 | Akrobatik 1 +
Heimlichkeit 1" – innerhalb einer Seite sind Einträge mit „+" verbunden, die Seiten
sind mit „|" getrennt.

Grenzen von Gruppen:

- Stärken und Talente dürfen **nicht in einer Gruppe gemischt** werden.
- Jeder Eintrag gehört **höchstens einer Gruppe** an und steht nicht zugleich als
  normale Zeile in seinem Bereich. Dieselbe Stärke/derselbe Skill darf aber auf den
  beiden Seiten **derselben** Gruppe stehen.
- Gruppen wirken unabhängig voneinander: In jedem denkbaren Ergebnis wird je Gruppe
  genau eine Seite gewählt – deshalb müssen **alle** Kombinationen die Limits
  (eine Stärke, 5 Talentpunkte) einhalten. Verstößt eine Kombination dagegen, meldet
  das Speichern das verletzte Limit mit dem Zusatz „(in einem wählbaren Ergebnis
  verletzt)".

## Gruppe entfernen

Klicken Sie in der Gruppe auf **„Gruppe entfernen"**. Die Einträge der **Seite 1**
kehren in ihren ursprünglichen Bereich zurück; die Einträge von Seite 2 werden mit
der Gruppe entfernt. Der Editor bleibt dadurch ohne manuelles Aufräumen speicherbar.

## Abwählen und Zeilen pflegen

- Wählen Sie im Select einer Talent- oder Stärkenzeile wieder den Platzhalter
  („Skill wählen..."/„Stärke wählen..."), wird der **Wert der Zeile automatisch auf
  0 geräumt**. Die leere Zeile bleibt als Platzhalter stehen und blockiert das
  Speichern nicht – Sie müssen sie nicht von Hand löschen.
- Eine Zeile ganz entfernen Sie über das **„×"** am Zeilenende.
- In einer Gruppe gilt: Ein Eintrag ohne Auswahl oder ohne Wert erzeugt die Meldung
  „Ungültige Gruppe: Seite X hat einen Eintrag ohne Auswahl oder Wert." – wählen Sie
  dort erneut aus oder entfernen Sie den Eintrag mit „×".

## Speichern und Fehlermeldungen auflösen

Klicken Sie auf „Erstellen" bzw. „Speichern". Gelingt das Speichern nicht, erscheint
die Meldung in einem roten Banner über dem Formular; die Kultur wird **nicht**
angelegt bzw. nicht geändert. Bedeutung und Lösung:

| Meldung | Bedeutung | Lösung |
|---|---|---|
| „Maximal 5 Punkte insgesamt für Talente, Waffentalente und Magieschulen." | Die Punktsumme der drei Bereiche liegt über 5. | Verringern Sie Punkte, bis die Summe höchstens 5 ist. |
| „Maximal eine Stärke pro Kultur." | Mehr als eine Stärke zugewiesen. | Entfernen Sie überzählige Stärken-Zeilen („×"), bis genau eine zugewiesen ist (oder keine). |
| „Stärken nur mit Stufe 1 und Kosten 1." | Anzahl ≠ 1 oder die Stärke hat im Tab „Stärken" Kosten ≠ 1. | Lassen Sie „Anzahl" auf 1 und setzen Sie im Tab „Stärken" die „Kosten (Punkte)" auf 1. |
| „Ungleichwertig: Seite 1 = X Punkte, Seite 2 = Y Punkte" | Die beiden Seiten der Gruppe haben unterschiedliche Punktsummen. | Erhöhen oder senken Sie Werte, bis beide Summen gleich sind. |
| „(in einem wählbaren Ergebnis verletzt)" (Zusatz) | Erst eine Kombination der Alternativseiten verletzt ein Limit. | Sorgen Sie dafür, dass jede Kombination höchstens eine Stärke und höchstens 5 Talentpunkte enthält. |
| „Ungültige Gruppe: Seite X ist leer – jede Seite braucht mindestens einen Eintrag." | Eine Gruppenseite hat keinen Eintrag. | Füllen Sie die Seite („+ Eintrag hinzufügen") oder entfernen Sie die Gruppe. |
| „Ungültige Gruppe: Seite X hat einen Eintrag ohne Auswahl oder Wert." | Ein Gruppeneintrag ohne gewählten Skill/Stärke oder ohne Wert. | Treffen Sie die Auswahl, setzen Sie einen Wert über 0 oder entfernen Sie den Eintrag („×"). |
| „Ungültige Gruppe: Stärken und Talente dürfen nicht in einer Gruppe gemischt werden." | Die Gruppe mischt Stärken- und Talent-Einträge. | Bilden Sie getrennte Gruppen: Stärke gegen Stärke bzw. Talente gegen Talente. |
| „Ungültiger Punktwert: Punkte müssen ganze Zahlen ab 0 sein (Talente, Waffentalente und Magieschulen)." | Negativer oder nicht ganzzahliger Punktwert. | Tragen Sie eine ganze Zahl ab 0 ein. |
| „Ungültiger Punktwert in einer Entweder/Oder-Gruppe: Werte müssen ganze Zahlen ab 1 sein." | Nicht ganzzahliger Wert in einer Gruppe. | Tragen Sie eine ganze Zahl ab 1 ein. |
| „Ungültige Gruppe: Eintrag {Name} ist mehrfach zugeordnet (Abschnitt oder mehrere Gruppen)." | Derselbe Eintrag steht zugleich in einem Bereich und in einer Gruppe – oder in zwei Gruppen. | Behalten Sie ihn nur an einem Ort: in der Gruppe oder als normale Zeile. |
| „Ungültiger Eintrag im Abschnitt {Talente|Waffentalente|Magieschulen|Stärken}: Eintrag mit Wert braucht eine Auswahl (Skill bzw. Stärke)." | Eine Zeile hat einen Wert, aber keine gewählte Stärke/keinen gewählten Skill. | Wählen Sie den Eintrag aus oder setzen Sie den Wert auf 0 / entfernen Sie die Zeile („×"). |

## Speicherung

- Nach dem Speichern erscheint die Kultur in der Liste des Tabs „Kulturen". Die
  Kurzzeile unter dem Namen zeigt die zugewiesenen Werte und die Gruppen (z. B.
  „Athletik 2 | Akrobatik 1 + Heimlichkeit 1").
- Gespeicherte Kulturen stehen anschließend in der Charaktererstellung im Schritt
  „Kultur" zur Auswahl. Dort werden die Abschnitts-Talente und höchstens eine Stärke
  der gewählten Kultur angezeigt und übernommen.

## Grenzen und Besonderheiten

- **Alternativwahl bei der Charaktererstellung:** Im Schritt „Kultur" wählen Sie je
  Gruppe genau eine Seite; Ihr Charakter erhält genau die Einträge der gewählten Seite.
  Details: [`anwenderhandbuch.md`](anwenderhandbuch.md).
- **Bestand:** Kulturen, die vor dieser Neuerung gespeichert wurden, werden nicht
  automatisch angepasst. Die Regeln greifen, sobald die Kultur im Editor gespeichert
  wird. Ein solcher Bestand kann im Schritt „Kultur" daher vorübergehend mehrere bzw.
  mehrstufige Stärken zeigen.
- **Stärken-Kosten:** Die Kosten einer Stärke werden im Tab „Stärken" gepflegt. Nur
  Stärken mit Kosten 1 sind im Kultureditor zuweisbar; Stärken ohne Kostenangabe
  werden nicht beanstandet.
