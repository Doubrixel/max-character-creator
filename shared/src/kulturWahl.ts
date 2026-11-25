/**
 * Entweder/Oder-Wahl der Kulturalternativen im Schritt „Kultur" der
 * Charaktererstellung (SF-000009 / INT-000016; Datenmodell und Gruppen stammen
 * aus dem Vorgänger INT-000015, `shared/src/cultures.ts`).
 *
 * R1 Im Schritt „Kultur" werden für die gewählte Kultur alle Entweder/Oder-
 *    Gruppen angezeigt; je Gruppe stehen die beiden Seiten (Seite = 1..n
 *    Einträge) zur Auswahl.
 * R2 Je Gruppe wird genau eine Seite gewählt; die Einträge der gewählten
 *    Seite werden dem Charakter zugewiesen, die Einträge der anderen Seite
 *    nicht. Eine bereits getroffene Wahl wird durch die Wahl der anderen
 *    Seite ersetzt (nie beide Seiten gleichzeitig).
 * R3 Die Wahl ist wertneutral: Beide Seiten sind gleichwertig (R4 des
 *    Vorgängertickets, geprüft beim Speichern der Kultur). Es gibt keine
 *    zusätzliche Werteberechnung in der Erstellung.
 * R4 Kulturen ohne Alternativgruppen verhalten sich unverändert: Die
 *    wirksame Config ist die unveränderte Config der Kultur.
 *
 * Umsetzung von R2/AK2.4 („vorhandenes Zuweisungsverhalten wiederverwenden"):
 * `wirksameKulturConfig` schreibt die Einträge der gewählten Seiten als
 * normale Abschnittseinträge (Speicherformat des Kultur-Editors) in die
 * Kultur-Config und entfernt `alternativen`. Der `kulturReducer`
 * (`shared/src/reducers.ts`) weist die gewählten Einträge damit über
 * denselben Codepfad zu wie die festen Einträge – es gibt keine zweite
 * Zuweisungslogik. Der Schritt „Kultur" speichert genau diese wirksame
 * Config im Step-Delta; die angezeigten Statblöcke und die Entweder/Oder-
 *    Gruppen liest er weiterhin aus der unveränderten Config der Bibliothek.
 *
 * Wahlpflicht (Annahme A1 des internen Tickets): Ohne vollständige Wahl je
 * Gruppe kann der Schritt „Kultur" nicht abgeschlossen werden –
 * `istWahlVollstaendig` liefert dafür das Urteil, das der Schritt für den
 * „Weiter"-Button abfragt. Kulturen ohne Gruppen sind ohne Wahl vollständig
 * (AK2.5, unverändertes Verhalten).
 */
import {
  ABSCHNITT_FELDER,
  parseKulturRegeln,
  type KulturFeld,
  type KulturGruppenEintrag,
  type KulturRegeln,
} from './cultures'

/**
 * Gewählte Seite je Entweder/Oder-Gruppe: Index der Gruppe → 0 („Seite 1")
 * oder 1 („Seite 2"). Gruppen ohne Eintrag in der Wahl sind noch ungewählt.
 */
export type AlternativWahl = Partial<Record<number, 0 | 1>>

/**
 * Tolerantes Lesen der Wahl aus Step-Daten: Nach einem JSON-Round-Trip sind
 * die Schlüssel Strings, unbekannte Werte werden verworfen. Liefert nie `null`
 * und wirft nie – unlesbare Daten bedeuten „keine Wahl getroffen".
 */
export function leseAlternativWahl(wert: unknown): AlternativWahl {
  const wahl: AlternativWahl = {}
  if (wert === null || wert === undefined || typeof wert !== 'object' || Array.isArray(wert)) {
    return wahl
  }
  for (const [schluessel, value] of Object.entries(wert as Record<string, unknown>)) {
    const index = Number(schluessel)
    if (!Number.isInteger(index) || index < 0) continue
    if (value === 0 || value === '0') wahl[index] = 0
    else if (value === 1 || value === '1') wahl[index] = 1
  }
  return wahl
}

/**
 * Wahlpflicht (A1): Jede Entweder/Oder-Gruppe der Kultur hat eine gewählte
 * Seite. Kulturen ohne Gruppen sind ohne Wahl vollständig (AK2.5) – der
 * Schritt „Kultur" ist wie bisher abschließbar.
 */
export function istWahlVollstaendig(
  regeln: Pick<KulturRegeln, 'alternativen'>,
  wahl: AlternativWahl,
): boolean {
  return regeln.alternativen.every((_, index) => wahl[index] === 0 || wahl[index] === 1)
}

/** Liest die Kultur-Config als Objekt (String oder bereits geparst), sonst null. */
function alsConfigObjekt(config: unknown): Record<string, unknown> | null {
  if (typeof config === 'string') {
    const trimmed = config.trim()
    if (!trimmed) return {}
    try {
      return alsConfigObjekt(JSON.parse(trimmed))
    } catch {
      return null
    }
  }
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, unknown>
  }
  return null
}

/**
 * Liest einen Abschnitt tolerant – echte Arrays (Altbestand) ebenso wie
 * JSON-Strings (Speicherformat des Kultur-Editors). Defekte Einträge werden
 * übersprungen, niemals geworfen.
 */
function leseRoheAbschnittsliste(wert: unknown): Record<string, unknown>[] {
  let roh: unknown
  if (typeof wert === 'string') {
    const trimmed = wert.trim()
    if (!trimmed) return []
    try {
      roh = JSON.parse(trimmed)
    } catch {
      return []
    }
  } else {
    roh = wert
  }
  if (!Array.isArray(roh)) return []
  return roh.filter((eintrag): eintrag is Record<string, unknown> =>
    eintrag !== null && typeof eintrag === 'object' && !Array.isArray(eintrag))
}

/**
 * Liefert die wirksame Kultur-Config für die getroffene Entweder/Oder-Wahl:
 *
 * - Die Einträge der gewählten Seiten stehen als normale Abschnittseinträge
 *   in ihren Abschnitten (Speicherformat des Editors: `punkte` für Talente,
 *   `anzahl` für Stärken) – hinter den festen Einträgen der Kultur.
 * - `alternativen` entfällt: Die Gruppen sind über die Wahl aufgelöst.
 * - Abschnitte ohne gewählte Einträge und alle übrigen Config-Felder (z. B.
 *   `gaengigFuer`) bleiben unverändert.
 * - Kultur ohne Gruppen (R4/AK2.5): unveränderte, geparste Config.
 *
 * Der `kulturReducer` weist die Einträge der gewählten Seiten damit genauso
 * zu wie die festen Einträge (AK2.4). Unvollständige Wahlen liefern die
 * Abschnitte ohne die Einträge der ungewählten Gruppen – der Schritt „Kultur"
 * blockiert „Weiter" in diesem Zustand (A1).
 *
 * Bei einer unlesbaren Config (defektes JSON, null) ist das Ergebnis null –
 * wie bisher speichert der Schritt dann `kulturConfig: null`.
 */
export function wirksameKulturConfig(config: unknown, wahl: AlternativWahl): Record<string, unknown> | null {
  const obj = alsConfigObjekt(config)
  if (!obj) return null

  const regeln = parseKulturRegeln(config)

  // R4/AK2.5: Kultur ohne Entweder/Oder-Gruppen – unveränderte Config.
  if (regeln.alternativen.length === 0) return obj

  // R2: Einträge der gewählten Seiten, je Abschnitt gesammelt.
  const gewaehlteEintraege = new Map<KulturFeld, KulturGruppenEintrag[]>()
  for (let index = 0; index < regeln.alternativen.length; index++) {
    const seite = wahl[index]
    if (seite !== 0 && seite !== 1) continue
    for (const eintrag of regeln.alternativen[index].seiten[seite]) {
      const liste = gewaehlteEintraege.get(eintrag.feld)
      if (liste) liste.push(eintrag)
      else gewaehlteEintraege.set(eintrag.feld, [eintrag])
    }
  }

  const wirksam: Record<string, unknown> = { ...obj }
  for (const feld of ABSCHNITT_FELDER) {
    const eintraege = gewaehlteEintraege.get(feld)
    if (!eintraege) continue
    const abschnitt = leseRoheAbschnittsliste(obj[feld])
    for (const eintrag of eintraege) {
      abschnitt.push(
        feld === 'staerken'
          ? { id: eintrag.id, name: eintrag.name, anzahl: eintrag.wert }
          : { id: eintrag.id, name: eintrag.name, punkte: eintrag.wert },
      )
    }
    wirksam[feld] = JSON.stringify(abschnitt)
  }
  // Die Gruppen sind über die Wahl aufgelöst – der Reducer liest nur die
  // Abschnitte, das Feld wird zur Klarheit entfernt.
  delete wirksam.alternativen
  return wirksam
}
