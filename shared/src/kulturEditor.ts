/**
 * Editor-Schritte des Bibliotheks-Kultureditors (SF-000009 / INT-000015).
 *
 * Reine Funktionen über den Configfeldern des Editors (die Abschnitte stehen
 * dort als JSON-Arrays in einem `Record<string, string>`): Jeder Schritt liefert
 * die neuen Felder und die sichtbare Meldung. Die React-Komponenten rufen sie
 * nur auf – damit ist der UI-Pfad (Stärke wählen, Anzahl setzen, Punkte setzen,
 * Alternative anlegen) ohne Browser mit Unit-Tests prüfbar.
 *
 * Live-Prüfungen beim Zuweisen (blockierend, die Meldung benennt das Limit):
 * - R1: höchstens eine zugewiesene Stärke. Zugewiesen ist eine Zeile mit
 *   gesetzter `id` – unabhängig vom Anzahl-Wert; ein Wert von 0 umgeht das
 *   Limit nicht (Review-Fund INT-000015). Eine gewählte Stärke steht direkt auf
 *   Stufe 1, und nur Stufe 1 mit Kosten 1 ist zulässig.
 * - R2: höchstens 5 Punkte über Talente, Waffentalente und Magieschulen.
 * - Mangel-3-Standard für Abschnitte (Review-Fund 1 und 2): Eine Zeile ohne
 *   vollständige Auswahl (id und name) nimmt keinen Wert > 0 an – mit derselben
 *   Meldung wie die Speicherprüfung. Wert 0 bleibt ohne Auswahl möglich.
 * Die vollständige Speicherprüfung bleibt `validateKultur`.
 */
import {
  MSG_MAX_STAERKEN,
  MSG_STAERKE_STUFE,
  STUFE_1,
  istZugewiesenerEintrag,
  leseAbschnitt,
  msgAbschnittEintragUnvollstaendig,
  parseKulturRegeln,
  pruefeStaerkeWert,
  pruefeTalentPunkte,
  type KulturAbschnittEintrag,
  type KulturAlternative,
  type KulturFeld,
} from './cultures'

/** Ergebnis eines Editor-Schritts: neue Configfelder und ggf. die sichtbare Meldung. */
export interface EditorSchritt {
  /** Bei einer Meldung unverändert oder um die frische Zeile bereinigt. */
  felder: Record<string, string>
  fehler: string | null
}

/** Ausgewählter Bibliothekseintrag (Stärke) beim „wählen". */
export interface Auswahl {
  id: string
  name: string
}

/** Zahleneingabe des Editors: positive ganze Zahl, sonst 0. */
export function eingabeWert(roh: string): number {
  const zahl = parseInt(roh, 10)
  return Number.isFinite(zahl) && zahl > 0 ? zahl : 0
}

/** Zugewiesen ist eine Zeile mit gesetzter `id` – unabhängig vom Wert (R1). */
function istZugewiesen(eintrag: KulturAbschnittEintrag): boolean {
  return typeof eintrag.id === 'string' && eintrag.id !== ''
}

/** Schreibt einen Abschnitt (JSON-Array) in die Configfelder zurück. */
function schreibeAbschnitt(
  configFelder: Record<string, string>,
  key: string,
  liste: KulturAbschnittEintrag[],
): Record<string, string> {
  return { ...configFelder, [key]: JSON.stringify(liste) }
}

/**
 * R1 beim Zuweisen im Abschnitt „Stärken": höchstens eine zugewiesene Stärke.
 * Die Zeile, die gerade geändert wird (Index `selbstIdx`), zählt nicht mit.
 * Jede andere Zeile mit gesetzter `id` zählt – unabhängig von ihrem
 * Anzahl-Wert (ein Wert von 0 umgeht das Limit nicht).
 */
export function pruefeStaerkenAbschnitt(
  liste: readonly KulturAbschnittEintrag[],
  selbstIdx: number,
): string | null {
  return liste.some((eintrag, i) => i !== selbstIdx && istZugewiesen(eintrag))
    ? MSG_MAX_STAERKEN
    : null
}

/**
 * „Stärke wählen" im Abschnitt „Stärken" (R1).
 *
 * Die Zuweisung steht direkt auf Stufe 1: Der Default einer neuen Zeile
 * (Anzahl 0) wird beim Wählen auf 1 gesetzt, sodass eine zugewiesene Stärke
 * nie mit Anzahl 0 stehen bleibt. Eine zweite zugewiesene Stärke wird
 * blockiert – eine frische, noch nicht zugewiesene Zeile wird dann wieder
 * entfernt, es bleibt nur die bereits zugewiesene Stärke (AK1.1). Stärken mit
 * Kosten ≠ 1 werden nicht zugewiesen (AK1.2).
 */
export function staerkeWaehlen(
  configFelder: Record<string, string>,
  idx: number,
  auswahl: Auswahl,
  kostenById: Record<string, number>,
): EditorSchritt {
  const liste = leseAbschnitt(configFelder.staerken)
  const alt = liste[idx]
  if (!alt) return { felder: configFelder, fehler: null }

  // Auswahl zurückgenommen: Zuweisung der Zeile entfernen. Der Anzahl-Wert wird
  // ebenfalls auf 0 gesetzt (Review-Fund 2, Runde 6): Sonst bliebe eine Zeile
  // ohne Auswahl mit Wert stehen, die die Speicherprüfung der ansonsten
  // gültigen Kultur entgegen AK1.8 blockieren würde.
  if (auswahl.id === '') {
    return {
      felder: schreibeAbschnitt(
        configFelder,
        'staerken',
        liste.map((e, i) => (i === idx ? { ...e, id: '', name: '', anzahl: 0 } : e)),
      ),
      fehler: null,
    }
  }

  const kosten = kostenById[auswahl.id]
  if (kosten !== undefined && kosten !== STUFE_1) {
    return { felder: configFelder, fehler: MSG_STAERKE_STUFE }
  }
  // Ein bereits eingetragener Stufenwert der Zeile darf nur Stufe 1 sein.
  const vorhanden = typeof alt.anzahl === 'number' && Number.isFinite(alt.anzahl) ? alt.anzahl : 0
  if (vorhanden > 0 && pruefeStaerkeWert(auswahl.id, vorhanden, kostenById)) {
    return { felder: configFelder, fehler: MSG_STAERKE_STUFE }
  }
  const anzahl = vorhanden > 0 ? vorhanden : STUFE_1
  const neu = liste.map((e, i) =>
    i === idx ? { ...e, id: auswahl.id, name: auswahl.name, anzahl } : e,
  )
  const fehler = pruefeStaerkenAbschnitt(neu, idx)
  if (fehler) {
    return {
      felder: istZugewiesen(alt)
        ? configFelder
        : schreibeAbschnitt(
            configFelder,
            'staerken',
            liste.filter((_, i) => i !== idx),
          ),
      fehler,
    }
  }
  return { felder: schreibeAbschnitt(configFelder, 'staerken', neu), fehler: null }
}

/**
 * „Anzahl" (Stufe) einer Stärke ändern (R1). Eine zugewiesene Stärke steht nur
 * auf Stufe 1: 0 ist genauso unzulässig wie 2, der Wert wird nicht übernommen.
 * Es gilt dieselbe Abschnittsprüfung wie beim Wählen – neben einer zweiten
 * zugewiesenen Stärke wird die Änderung nicht akzeptiert.
 *
 * Mangel-3-Standard für Abschnitte (Review-Fund 1): Eine Zeile ohne vollständige
 * Auswahl (id und name) nimmt keinen Wert > 0 an – dieselbe Meldung wie bei der
 * Speicherprüfung. Eine Phantomzeile aus „+ Eintrag hinzufügen" mit gesetztem
 * Anzahl-Wert wäre weder anzeige- noch gewährend. Wert 0 (das Zurücksetzen)
 * bleibt ohne Zuweisung möglich; die Zeile bleibt dann als Platzhalter stehen
 * und der Editor ist ohne manuelles Zeilenlöschen speicherbar.
 */
export function staerkeAnzahlSetzen(
  configFelder: Record<string, string>,
  idx: number,
  roh: string,
  kostenById: Record<string, number>,
): EditorSchritt {
  const liste = leseAbschnitt(configFelder.staerken)
  const alt = liste[idx]
  if (!alt) return { felder: configFelder, fehler: null }
  const wert = eingabeWert(roh)
  if (wert > 0 && !istZugewiesenerEintrag(alt)) {
    return { felder: configFelder, fehler: msgAbschnittEintragUnvollstaendig('staerken') }
  }
  if (istZugewiesen(alt)) {
    const fehler = pruefeStaerkeWert(alt.id, wert, kostenById)
    if (fehler) return { felder: configFelder, fehler }
    const abschnittFehler = pruefeStaerkenAbschnitt(liste, idx)
    if (abschnittFehler) return { felder: configFelder, fehler: abschnittFehler }
  }
  return {
    felder: schreibeAbschnitt(
      configFelder,
      'staerken',
      liste.map((e, i) => (i === idx ? { ...e, anzahl: wert } : e)),
    ),
    fehler: null,
  }
}

/**
 * „Punkte" eines Talents setzen (R2) – gilt für Talente, Waffentalente und
 * Magieschulen gemeinsam. Ein Wert, der die Summe über 5 hebt, wird nicht
 * übernommen; eine frische Zeile ohne bisherigen Wert wird wieder entfernt.
 *
 * Mangel-3-Standard für Abschnitte (Review-Fund 2): Eine Zeile ohne vollständige
 * Auswahl (id und name) nimmt keinen Wert > 0 an – dieselbe Meldung wie bei der
 * Speicherprüfung („Ungültiger Eintrag im Abschnitt …"). Punkte auf einer
 * Phantomzeile würden beim Gewähren verloren gehen. Wert 0 (das Zurücksetzen)
 * bleibt ohne Auswahl möglich; die Zeile bleibt als Platzhalter stehen.
 */
export function talentPunkteSetzen(
  configFelder: Record<string, string>,
  feld: KulturFeld,
  idx: number,
  roh: string,
): EditorSchritt {
  const liste = leseAbschnitt(configFelder[feld])
  const alt = liste[idx]
  if (!alt) return { felder: configFelder, fehler: null }
  const wert = eingabeWert(roh)
  if (wert > 0 && !istZugewiesenerEintrag(alt)) {
    return { felder: configFelder, fehler: msgAbschnittEintragUnvollstaendig(feld) }
  }
  const neu = liste.map((e, i) => (i === idx ? { ...e, punkte: wert } : e))
  const kandidat = schreibeAbschnitt(configFelder, feld, neu)
  const fehler = pruefeTalentPunkte(parseKulturRegeln(kandidat))
  if (fehler) {
    return {
      felder:
        (alt.punkte ?? 0) === 0
          ? schreibeAbschnitt(
              configFelder,
              feld,
              liste.filter((_, i) => i !== idx),
            )
          : configFelder,
      fehler,
    }
  }
  return { felder: kandidat, fehler: null }
}

/**
 * Skill wählen im Abschnitt einer Talentzeile (Talente, Waffentalente,
 * Magieschulen) – analog zu `staerkeWaehlen` (Review-Fund 1, Runde 6): Die
 * Komponente (`LibraryTable`) ruft nur diesen Schritt auf, die Regellogik
 * liegt in shared und ist ohne Browser testbar.
 *
 * - Abwahl (`auswahl.id === ''`): Die Punkte der Zeile werden auf 0 gesetzt –
 *   sonst bliebe eine Zeile ohne Auswahl mit Wert stehen („Phantomzeile mit
 *   Wert"), die die Speicherprüfung der ansonsten gültigen Kultur entgegen
 *   Schritt-24-Vorgabe und AK1.8 blockieren würde. Die Zeile bleibt als
 *   Platzhalter ohne Wert stehen; der Editor ist ohne manuelles
 *   Zeilenlöschen speicherbar.
 * - Auswahl: `id` und `name` werden gesetzt, ein bereits eingetragener Wert
 *   bleibt erhalten (auch die Wiederherstellung eines Altbestands-Phantoms).
 *   Danach gilt die R2-Prüfung über alle drei Bereiche – der Wert der
 *   vollständig zugewiesenen Zeile zählt jetzt mit.
 */
export function talentWaehlen(
  configFelder: Record<string, string>,
  feld: KulturFeld,
  idx: number,
  auswahl: Auswahl,
): EditorSchritt {
  const liste = leseAbschnitt(configFelder[feld])
  const alt = liste[idx]
  if (!alt) return { felder: configFelder, fehler: null }

  if (auswahl.id === '') {
    return {
      felder: schreibeAbschnitt(
        configFelder,
        feld,
        liste.map((e, i) => (i === idx ? { ...e, id: '', name: '', punkte: 0 } : e)),
      ),
      fehler: null,
    }
  }

  const neu = liste.map((e, i) =>
    i === idx ? { ...e, id: auswahl.id, name: auswahl.name } : e,
  )
  const kandidat = schreibeAbschnitt(configFelder, feld, neu)
  const fehler = pruefeTalentPunkte(parseKulturRegeln(kandidat))
  if (fehler) return { felder: configFelder, fehler }
  return { felder: kandidat, fehler: null }
}

/**
 * „Alternative hinzufügen" an einem Abschnittseintrag (R3): Der Eintrag wird
 * aus seinem Abschnitt herausgelöst und bildet Seite 1 einer neuen
 * Entweder/Oder-Gruppe; Seite 2 wird danach in der Alternativpflege gefüllt.
 * Liefert null, wenn der Eintrag nicht tragen kann (keine Auswahl oder kein
 * Wert).
 */
export function alternativeAnlegen(
  configFelder: Record<string, string>,
  feld: KulturFeld,
  idx: number,
): Record<string, string> | null {
  const liste = leseAbschnitt(configFelder[feld])
  const eintrag = liste[idx]
  if (!eintrag || !eintrag.id) return null
  const wert = feld === 'staerken' ? eintrag.anzahl ?? 0 : eintrag.punkte ?? 0
  if (wert <= 0) return null
  const alternativen: KulturAlternative[] = [
    ...parseKulturRegeln(configFelder).alternativen,
    {
      typ: feld === 'staerken' ? 'staerke' : 'talent',
      seiten: [[{ feld, id: eintrag.id, name: eintrag.name, wert }], []],
    },
  ]
  return {
    ...schreibeAbschnitt(
      configFelder,
      feld,
      liste.filter((_, i) => i !== idx),
    ),
    alternativen: JSON.stringify(alternativen),
  }
}
