/**
 * Kulturregeln des Bibliotheks-Kultureditors (SF-000009 / INT-000015).
 *
 * R1 Stärken-Limit: höchstens eine Stärke pro Kultur, Stufe (Anzahl) 1 und Kosten 1.
 *    Eine Stärke gilt über ihre gesetzte `id` als zugewiesen – unabhängig vom
 *    Wert. Ein `wert` von 0 darf das Limit also nicht umgehen.
 * R2 Talent-Limit: höchstens 5 Punkte über Talente + Waffentalente + Magieschulen.
 * R3 Alternative: eine Entweder/Oder-Gruppe hat zwei Seiten (1..n Einträge je
 *    Seite); jede Seite braucht mindestens einen vollständig zugewiesenen
 *    Eintrag (id, name, wert > 0), sonst ist sie im Folgeticket nicht wählbar.
 * R4 Gleichwertigkeit: die Wertesummen beider Seiten müssen gleich sein.
 * R5 Ergebnis-Stabilität: jedes wählbare Ergebnis (je Gruppe genau eine Seite)
 *    erfüllt R1 und R2.
 * R6 Gruppen sind paarweise und unabhängig; gemischte Stärken-/Talent-Gruppen
 *    sind nicht vorgesehen (PO-Entscheidung K2c).
 *
 * Die Regeln werden vom Bibliotheks-Editor (Live-Prüfung beim Zuweisen) und vom
 * Backend (Prüfung vor dem Speichern) gleichermaßen genutzt.
 */

export type KulturFeld = 'talente' | 'waffenTalente' | 'magieSchulen' | 'staerken'

export type GruppenTyp = 'talent' | 'staerke'

export const TALENT_FELDER: readonly KulturFeld[] = ['talente', 'waffenTalente', 'magieSchulen']

export const MAX_TALENT_PUNKTE = 5
export const MAX_STAERKEN = 1
export const STUFE_1 = 1

export const MSG_MAX_TALENTE = 'Maximal 5 Punkte insgesamt für Talente, Waffentalente und Magieschulen.'
export const MSG_MAX_STAERKEN = 'Maximal eine Stärke pro Kultur.'
export const MSG_STAERKE_STUFE = 'Stärken nur mit Stufe 1 und Kosten 1.'
export const ERGEBNIS_ZUSATZ = ' (in einem wählbaren Ergebnis verletzt)'

/** R3: eine Gruppenseite ohne Eintrag macht die Gruppe nicht wählbar. */
export function msgSeiteLeer(seite: number): string {
  return `Ungültige Gruppe: Seite ${seite} ist leer – jede Seite braucht mindestens einen Eintrag.`
}

/** R3: ein Gruppeneintrag ohne Auswahl bzw. zugewiesenen Wert ist nicht wählbar. */
export function msgEintragUnvollstaendig(seite: number): string {
  return `Ungültige Gruppe: Seite ${seite} hat einen Eintrag ohne Auswahl oder Wert.`
}

export interface KulturEintrag {
  id: string
  name: string
  wert: number
}

export interface KulturGruppenEintrag extends KulturEintrag {
  feld: KulturFeld
}

export interface KulturAlternative {
  typ: GruppenTyp
  /** Genau zwei Seiten: [Seite 1, Seite 2] */
  seiten: [KulturGruppenEintrag[], KulturGruppenEintrag[]]
}

export interface KulturRegeln {
  talente: KulturEintrag[]
  waffenTalente: KulturEintrag[]
  magieSchulen: KulturEintrag[]
  staerken: KulturEintrag[]
  alternativen: KulturAlternative[]
}

export interface Wahlmoeglichkeit {
  talentPunkte: number
  /** Anzahl zugewiesener Stärken in diesem Ergebnis (Einträge mit gesetzter `id`). */
  staerkenAnzahl: number
}

// --- tolerantes Parsen -------------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed: unknown = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      return asObject(JSON.parse(trimmed))
    } catch {
      return null
    }
  }
  return asObject(value)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function isKulturFeld(value: unknown): value is KulturFeld {
  return value === 'talente' || value === 'waffenTalente' || value === 'magieSchulen' || value === 'staerken'
}

function toEintrag(raw: unknown, wertKeys: string[]): KulturEintrag | null {
  const obj = asObject(raw)
  if (!obj) return null
  let wert = 0
  for (const key of wertKeys) {
    const parsed = toNumber(obj[key])
    if (parsed !== null) {
      wert = parsed
      break
    }
  }
  return {
    id: typeof obj.id === 'string' ? obj.id : '',
    name: typeof obj.name === 'string' ? obj.name : '',
    wert,
  }
}

function toGruppenEintrag(raw: unknown): KulturGruppenEintrag | null {
  const obj = asObject(raw)
  if (!obj) return null
  const eintrag = toEintrag(raw, ['wert', 'punkte', 'anzahl'])
  if (!eintrag) return null
  const feld: KulturFeld = isKulturFeld(obj.feld)
    ? obj.feld
    : 'anzahl' in obj && !('punkte' in obj)
      ? 'staerken'
      : 'talente'
  return { ...eintrag, feld }
}

function toGruppenTyp(raw: unknown, eintraege: KulturGruppenEintrag[]): GruppenTyp {
  if (raw === 'staerke' || raw === 'talent') return raw
  return eintraege.some(e => e.feld === 'staerken') ? 'staerke' : 'talent'
}

/**
 * Parst eine Kultur-Config tolerant (echte Arrays wie auch doppelt kodierte
 * JSON-Strings, defekte Einträge werden übersprungen).
 */
export function parseKulturRegeln(config: unknown): KulturRegeln {
  const obj = asRecord(config) ?? {}
  const parseList = (key: string, wertKeys: string[]): KulturEintrag[] =>
    asArray(obj[key])
      .map(raw => toEintrag(raw, wertKeys))
      .filter((entry): entry is KulturEintrag => entry !== null)

  const alternativen: KulturAlternative[] = []
  for (const raw of asArray(obj.alternativen)) {
    const altObj = asObject(raw)
    if (!altObj) continue
    // Strukturell defekte Einträge ohne Seitenangabe werden übersprungen; eine
    // vorhandene, aber leere Seitenangabe bleibt dagegen erhalten und wird bei
    // der Speicherprüfung als unvollständige Gruppe beanstandet.
    const seitenRoh = altObj.seiten
    if (!Array.isArray(seitenRoh) && typeof seitenRoh !== 'string') continue
    const seitenRaw = asArray(seitenRoh)
    const seiten: [KulturGruppenEintrag[], KulturGruppenEintrag[]] = [[], []]
    for (let i = 0; i < 2; i++) {
      seiten[i] = asArray(seitenRaw[i])
        .map(toGruppenEintrag)
        .filter((entry): entry is KulturGruppenEintrag => entry !== null)
    }
    alternativen.push({ typ: toGruppenTyp(altObj.typ, [...seiten[0], ...seiten[1]]), seiten })
  }

  return {
    talente: parseList('talente', ['punkte', 'wert']),
    waffenTalente: parseList('waffenTalente', ['punkte', 'wert']),
    magieSchulen: parseList('magieSchulen', ['punkte', 'wert']),
    staerken: parseList('staerken', ['anzahl', 'wert']),
    alternativen,
  }
}

/** Liest die Kosten (Punkte) einer Stärke aus deren Library-Config. */
export function parseKosten(config: unknown): number | null {
  const obj = asRecord(config)
  if (!obj) return null
  return toNumber(obj.kosten)
}

// --- Anzeige -----------------------------------------------------------------

export function formatEintrag(eintrag: KulturEintrag): string {
  return `${eintrag.name} ${eintrag.wert}`
}

export function formatSeite(eintraege: readonly KulturEintrag[]): string {
  return eintraege.map(formatEintrag).join(' + ')
}

/** Format „Athletik 2 | Akrobatik 1 + Heimlichkeit 1" (K4.3). */
export function formatAlternative(alternative: KulturAlternative): string {
  return `${formatSeite(alternative.seiten[0])} | ${formatSeite(alternative.seiten[1])}`
}

// --- Summen ------------------------------------------------------------------

export function summeEintraege(eintraege: readonly KulturEintrag[]): number {
  return eintraege.reduce((sum, eintrag) => sum + eintrag.wert, 0)
}

/** Zählt zugewiesene Stärken: Einträge mit gesetzter `id`, unabhängig vom Wert (R1). */
function zaehleStaerken(eintraege: readonly KulturEintrag[]): number {
  return eintraege.filter(eintrag => eintrag.id !== '').length
}

/** R1: Anzahl der zugewiesenen Stärken im Abschnitt (id gesetzt), egal welchen Wert sie haben. */
export function staerkenZuweisungen(regeln: KulturRegeln): number {
  return zaehleStaerken(regeln.staerken)
}

/** R2: Summe über Talente, Waffentalente und Magieschulen (nur Abschnittseinträge). */
export function talentPunkteGesamt(regeln: KulturRegeln): number {
  return TALENT_FELDER.reduce((sum, feld) => sum + summeEintraege(regeln[feld]), 0)
}

// --- Live-Prüfungen im Editor -----------------------------------------------

/** R2 beim Zuweisen: Abschnittssumme über alle drei Talentbereiche. */
export function pruefeTalentPunkte(regeln: KulturRegeln): string | null {
  return talentPunkteGesamt(regeln) > MAX_TALENT_PUNKTE ? MSG_MAX_TALENTE : null
}

/**
 * R1 beim Zuweisen im Abschnitt „Stärken": höchstens eine zugewiesene Stärke.
 * Die Zeile, die gerade geändert wird (`selbstId`), zählt nicht mit.
 *
 * Als zugewiesen gilt ein Eintrag mit gesetzter `id` – unabhängig vom Wert.
 * Ein Anzahl-Wert von 0 darf das Limit nicht umgehen (Review-Fund INT-000015).
 */
export function pruefeStaerkenAbschnitt(
  regeln: KulturRegeln,
  selbstId: string | null,
): string | null {
  const andere = regeln.staerken.filter(
    eintrag => eintrag.id !== '' && eintrag.id !== selbstId,
  )
  return andere.length >= MAX_STAERKEN ? MSG_MAX_STAERKEN : null
}

/**
 * R1 pro Stärken-Eintrag: Stufe (Anzahl) 1 und Kosten 1.
 * Wird nur geprüft, wenn tatsächlich eine Stärke zugewiesen ist (gesetzte `id`).
 * Ein zugewiesener Eintrag mit Anzahl ≠ 1 – auch 0 – verstößt dagegen.
 * Unbekannte Kosten (z. B. Altbestand ohne Kostenfeld) werden nicht beanstandet.
 */
export function pruefeStaerkeWert(
  id: string,
  wert: number,
  kostenById: Record<string, number>,
): string | null {
  if (id === '') return null
  if (wert !== STUFE_1) return MSG_STAERKE_STUFE
  const kosten = kostenById[id]
  if (kosten !== undefined && kosten !== STUFE_1) return MSG_STAERKE_STUFE
  return null
}

// --- Speicher-Prüfung --------------------------------------------------------

function seitenTalentPunkte(seite: readonly KulturGruppenEintrag[]): number {
  return summeEintraege(seite.filter(eintrag => eintrag.feld !== 'staerken'))
}

function seitenStaerkenAnzahl(seite: readonly KulturGruppenEintrag[]): number {
  return zaehleStaerken(seite.filter(eintrag => eintrag.feld === 'staerken'))
}

/**
 * Liefert alle wählbaren Ergebnisse (je Gruppe genau eine Seite).
 * Bei mehr als 12 Gruppen wird rechnerisch der Worst Case verwendet – das ist
 * für die monotonen Regeln R1/R2 gleichwertig zur Aufzählung, verhindert aber
 * einen Kombinations-Explosion.
 */
export function wahlmoeglichkeiten(regeln: KulturRegeln): Wahlmoeglichkeit[] {
  const basis: Wahlmoeglichkeit = {
    talentPunkte: talentPunkteGesamt(regeln),
    staerkenAnzahl: staerkenZuweisungen(regeln),
  }
  if (regeln.alternativen.length === 0) return [basis]
  if (regeln.alternativen.length > 12) {
    return [
      regeln.alternativen.reduce<Wahlmoeglichkeit>(
        (acc, alternative) => ({
          talentPunkte:
            acc.talentPunkte +
            Math.max(
              seitenTalentPunkte(alternative.seiten[0]),
              seitenTalentPunkte(alternative.seiten[1]),
            ),
          staerkenAnzahl:
            acc.staerkenAnzahl +
            Math.max(
              seitenStaerkenAnzahl(alternative.seiten[0]),
              seitenStaerkenAnzahl(alternative.seiten[1]),
            ),
        }),
        basis,
      ),
    ]
  }

  let kombinationen: Wahlmoeglichkeit[] = [basis]
  for (const alternative of regeln.alternativen) {
    const naechste: Wahlmoeglichkeit[] = []
    for (const kombination of kombinationen) {
      for (const seite of alternative.seiten) {
        naechste.push({
          talentPunkte: kombination.talentPunkte + seitenTalentPunkte(seite),
          staerkenAnzahl: kombination.staerkenAnzahl + seitenStaerkenAnzahl(seite),
        })
      }
    }
    kombinationen = naechste
  }
  return kombinationen
}

/**
 * Löst eine Entweder/Oder-Gruppe auf und liefert die Einträge, die wieder in
 * ihre Abschnitte eingetragen werden: ausschließlich Seite 1.
 *
 * Im wählbaren Ergebnis ist pro Gruppe genau eine Seite aktiv (R5). Beide
 * Seiten gleichzeitig in die Abschnitte zurückzuschreiben, erzeugt per
 * Konstruktion einen regelwidrigen Zustand – z. B. zwei gleichzeitig
 * zugewiesene Stärken (Review-Fund INT-000015).
 */
export function gruppeAufloesen(alternative: KulturAlternative): KulturGruppenEintrag[] {
  return alternative.seiten[0].map(eintrag => ({ ...eintrag }))
}

/**
 * Vollständige Speicherprüfung einer Kultur.
 * Reihenfolge: R1 Anzahl der Stärken → R3 Vollständigkeit der Gruppenseiten →
 * R1 je Eintrag → R4 Gleichwertigkeit → R5 über alle Ergebnisse.
 * Liefert die sichtbare Fehlermeldung oder null, wenn die Kultur gültig ist.
 */
export function validateKultur(
  config: unknown,
  kostenById: Record<string, number> = {},
): string | null {
  const regeln = parseKulturRegeln(config)

  // R1: höchstens eine zugewiesene Stärke – die Zuweisung zählt über die id,
  // nicht über den Anzahl-Wert (ein Wert von 0 umgeht das Limit sonst).
  if (staerkenZuweisungen(regeln) > MAX_STAERKEN) return MSG_MAX_STAERKEN

  // R3: jede Seite braucht mindestens einen vollständig zugewiesenen Eintrag,
  // sonst ist die Gruppe im Ergebnis nicht auflösbar.
  for (const alternative of regeln.alternativen) {
    for (let i = 0; i < alternative.seiten.length; i++) {
      const seite = alternative.seiten[i]
      if (seite.length === 0) return msgSeiteLeer(i + 1)
      if (seite.some(eintrag => eintrag.id === '' || eintrag.name === '' || eintrag.wert <= 0)) {
        return msgEintragUnvollstaendig(i + 1)
      }
    }
  }

  const staerkenEintraege: KulturGruppenEintrag[] = [
    ...regeln.staerken.map(eintrag => ({ ...eintrag, feld: 'staerken' as KulturFeld })),
    ...regeln.alternativen.flatMap(alternative => alternative.seiten.flat()),
  ].filter(eintrag => eintrag.feld === 'staerken')

  for (const eintrag of staerkenEintraege) {
    const fehler = pruefeStaerkeWert(eintrag.id, eintrag.wert, kostenById)
    if (fehler) return fehler
  }

  for (const alternative of regeln.alternativen) {
    const summe1 = summeEintraege(alternative.seiten[0])
    const summe2 = summeEintraege(alternative.seiten[1])
    if (summe1 !== summe2) {
      return `Ungleichwertig: Seite 1 = ${summe1} Punkte, Seite 2 = ${summe2} Punkte`
    }
  }

  const zusatz = regeln.alternativen.length > 0 ? ERGEBNIS_ZUSATZ : ''
  for (const ergebnis of wahlmoeglichkeiten(regeln)) {
    if (ergebnis.staerkenAnzahl > MAX_STAERKEN) return MSG_MAX_STAERKEN + zusatz
    if (ergebnis.talentPunkte > MAX_TALENT_PUNKTE) return MSG_MAX_TALENTE + zusatz
  }
  return null
}
