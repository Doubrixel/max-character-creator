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
 *    sind nicht vorgesehen (PO-Entscheidung K2c) und werden abgelehnt. Ein
 *    Eintrag (gleiche `id`) gehört höchstens einer Gruppe an: Er steht nicht
 *    zugleich in einer Gruppenseite und im Abschnitt und nicht in zwei
 *    Gruppen (PO-Entscheidung H).
 * Punkte in den Abschnitten (Talente, Waffentalente, Magieschulen) sind ganze
 *    Zahlen ab 0. Negative oder nicht ganzzahlige Werte würden R2 und die
 *    Basissumme von R5 über einen direkten API-Aufruf umgehen (−5 + 10 ergäbe
 *    5) und werden in der Speicherprüfung abgelehnt (Review-Fund F3).
 * Werte in Entweder/Oder-Gruppen sind ganze Zahlen ab 1 (PO-Entscheidung G):
 *    „1,5 | 1,5" wäre zwar gleichwertig, aber kein gültiger Punktwert.
 *
 * Die Regeln werden vom Bibliotheks-Editor (Live-Prüfung beim Zuweisen und
 * direkt an der Entweder/Oder-Gruppe) und vom Backend (Prüfung vor dem
 * Speichern) gleichermaßen genutzt: `pruefeGruppeImKontext` ist für eine
 * Gruppe dasselbe Urteil in Live- und Speicherprüfung. Die Editor-Schritte
 * der Abschnitte (Stärke wählen, Anzahl/Punkte setzen, Alternative anlegen)
 * sind reine Funktionen in `kulturEditor.ts` und rufen hier nur die Prüfungen auf.
 */

export type KulturFeld = 'talente' | 'waffenTalente' | 'magieSchulen' | 'staerken'

export type GruppenTyp = 'talent' | 'staerke'

export const TALENT_FELDER: readonly KulturFeld[] = ['talente', 'waffenTalente', 'magieSchulen']

/** Alle Abschnitte des Kultur-Editors: die drei Talentbereiche und die Stärken. */
export const ABSCHNITT_FELDER: readonly KulturFeld[] = [...TALENT_FELDER, 'staerken']

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

/** K2c: Stärken- und Talent-Einträge dürfen nicht in einer Gruppe gemischt sein. */
export const MSG_GRUPPE_GEMISCHT =
  'Ungültige Gruppe: Stärken und Talente dürfen nicht in einer Gruppe gemischt werden.'

/** F3 (Review INT-000015): Punkte sind ganze Zahlen ab 0 – auch per direktem API-Aufruf. */
export const MSG_PUNKTE_UNGUELTIG =
  'Ungültiger Punktwert: Punkte müssen ganze Zahlen ab 0 sein (Talente, Waffentalente und Magieschulen).'

/** G (PO-Entscheidung INT-000015): Werte in einer Entweder/Oder-Gruppe sind ganze Zahlen ab 1. */
export const MSG_GRUPPE_PUNKTE_UNGUELTIG =
  'Ungültiger Punktwert in einer Entweder/Oder-Gruppe: Werte müssen ganze Zahlen ab 1 sein.'

/** H (PO-Entscheidung INT-000015, R6): ein Eintrag gehört höchstens einer Gruppe an. */
export function msgMehrfachZugeordnet(name: string): string {
  return `Ungültige Gruppe: Eintrag ${name} ist mehrfach zugeordnet (Abschnitt oder mehrere Gruppen).`
}

/** R4 (K4.4): benennt die Wertesummen beider Seiten. */
export function msgUngleichwertig(summe1: number, summe2: number): string {
  return `Ungleichwertig: Seite 1 = ${summe1} Punkte, Seite 2 = ${summe2} Punkte`
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

/**
 * Punkte sind ganze Zahlen ab 0 (Review-Fund F3). Negative oder nicht
 * ganzzahlige Werte würden die Summen (R2, Basissumme von R5) umgehen:
 * −5 + 10 ergäbe 5, 2,5 + 2,5 ergäbe 5.
 */
export function istGueltigerPunktwert(wert: number): boolean {
  return Number.isInteger(wert) && wert >= 0
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

/**
 * R1 für die Gewährung: Eine Kultur gewährt höchstens eine Stärke.
 * Einträge ohne Anzahl (0) gewähren nichts – ein Wert von 0 darf die Grenze
 * nicht umgehen (Review-Fund INT-000015). Wird von der Anzeige im Schritt
 * „Kultur" und von der Kultur-Rechnung (Reducer) genutzt, damit beide
 * dieselbe Gewährung zeigen.
 */
export function gewaehrteStaerken<T extends { anzahl: number }>(eintraege: readonly T[]): T[] {
  return eintraege.filter(eintrag => eintrag.anzahl > 0).slice(0, MAX_STAERKEN)
}

// --- Live-Prüfungen im Editor -----------------------------------------------

/** R2 beim Zuweisen: Abschnittssumme über alle drei Talentbereiche. */
export function pruefeTalentPunkte(regeln: KulturRegeln): string | null {
  return talentPunkteGesamt(regeln) > MAX_TALENT_PUNKTE ? MSG_MAX_TALENTE : null
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

/**
 * Struktur einer einzelnen Entweder/Oder-Gruppe (R3, K2c) – Live- und
 * Speicherprüfung. Jede Seite braucht mindestens einen vollständig
 * zugewiesenen Eintrag (id, name, wert > 0), sonst ist sie im Folgeticket
 * nicht wählbar („Zäh 0 | " oder „Athletik 2 |  2"). Stärken- und
 * Talent-Einträge dürfen nicht in einer Gruppe gemischt sein.
 */
export function pruefeGruppeStruktur(alternative: KulturAlternative): string | null {
  for (let i = 0; i < alternative.seiten.length; i++) {
    const seite = alternative.seiten[i]
    if (seite.length === 0) return msgSeiteLeer(i + 1)
    if (seite.some(eintrag => eintrag.id === '' || eintrag.name === '' || eintrag.wert <= 0)) {
      return msgEintragUnvollstaendig(i + 1)
    }
  }
  const eintraege = alternative.seiten.flat()
  const hatStaerken = eintraege.some(eintrag => eintrag.feld === 'staerken')
  const hatTalente = eintraege.some(eintrag => eintrag.feld !== 'staerken')
  return hatStaerken && hatTalente ? MSG_GRUPPE_GEMISCHT : null
}

/**
 * Prüfung einer einzelnen Entweder/Oder-Gruppe, wie der Editor sie direkt an
 * der Gruppe anzeigt: Struktur (R3/K2c) → Wertformat (ganze Zahlen ab 1, G) →
 * R1 je Stärken-Eintrag (Stufe und Kosten 1) → R4 Gleichwertigkeit.
 * `pruefeGruppeImKontext` und damit `validateKultur` verwenden dieselbe
 * Funktion, damit Live- und Speicherprüfung für eine Gruppe identisch urteilen.
 * Liefert die sichtbare Fehlermeldung oder null, wenn die Gruppe in Ordnung ist.
 */
export function pruefeGruppe(
  alternative: KulturAlternative,
  kostenById: Record<string, number> = {},
): string | null {
  const strukturFehler = pruefeGruppeStruktur(alternative)
  if (strukturFehler) return strukturFehler

  // G: Werte sind ganze Zahlen ab 1. 0 und negative Werte hat die
  // Strukturprüfung bereits abgelehnt; hier bleiben positive Bruchwerte
  // („1,5 | 1,5" wäre gleichwertig – und dennoch kein gültiger Punktwert).
  for (const eintrag of alternative.seiten.flat()) {
    if (!Number.isInteger(eintrag.wert)) return MSG_GRUPPE_PUNKTE_UNGUELTIG
  }

  for (const eintrag of alternative.seiten.flat()) {
    if (eintrag.feld !== 'staerken') continue
    const fehler = pruefeStaerkeWert(eintrag.id, eintrag.wert, kostenById)
    if (fehler) return fehler
  }

  const summe1 = summeEintraege(alternative.seiten[0])
  const summe2 = summeEintraege(alternative.seiten[1])
  return summe1 === summe2 ? null : msgUngleichwertig(summe1, summe2)
}

/**
 * R6 (PO-Entscheidung H): Ein Eintrag mit derselben `id` gehört höchstens
 * einer Gruppe an. Für die Gruppe mit Index `index` wird abgelehnt, wenn einer
 * ihrer Einträge
 * - zugleich in einem Abschnitt steht (Talente, Waffentalente, Magieschulen
 *   oder Stärken) oder
 * - in einer weiteren Gruppe steht.
 *
 * Dieselbe id auf den beiden Seiten derselben Gruppe ist keine Mehrfachzuordnung
 * („Athletik 2 | Athletik 1 + Heimlichkeit 1"): Je Gruppe ist genau eine Seite
 * aktiv (R5), der Eintrag gehört weiterhin zu genau dieser einen Gruppe.
 *
 * Liefert die sichtbare Fehlermeldung für diese Gruppe oder null.
 */
export function pruefeMehrfachZuordnung(regeln: KulturRegeln, index: number): string | null {
  const alternative = regeln.alternativen[index]
  if (!alternative) return null

  const imAbschnitt = new Set<string>()
  for (const feld of ABSCHNITT_FELDER) {
    for (const eintrag of regeln[feld]) {
      if (eintrag.id !== '') imAbschnitt.add(eintrag.id)
    }
  }

  // Anzahl der Gruppen, in denen eine id vorkommt (je Gruppe einmal gezählt).
  const gruppenJeId = new Map<string, number>()
  for (const gruppe of regeln.alternativen) {
    const ids = new Set(gruppe.seiten.flat().map(eintrag => eintrag.id))
    ids.delete('')
    for (const id of ids) gruppenJeId.set(id, (gruppenJeId.get(id) ?? 0) + 1)
  }

  for (const eintrag of alternative.seiten.flat()) {
    if (eintrag.id === '') continue
    const zugewiesenImAbschnitt = imAbschnitt.has(eintrag.id)
    const inMehrerenGruppen = (gruppenJeId.get(eintrag.id) ?? 0) > 1
    if (zugewiesenImAbschnitt || inMehrerenGruppen) {
      return msgMehrfachZugeordnet(eintrag.name !== '' ? eintrag.name : eintrag.id)
    }
  }
  return null
}

/**
 * Live- und Speicherprüfung einer Gruppe im Kontext ihrer Kultur: die Gruppe
 * selbst (`pruefeGruppe`: Struktur, Wertformat, R1, R4) und ihre Zuordnung
 * (`pruefeMehrfachZuordnung`, R6). Der Editor zeigt genau diese Meldung direkt
 * an der Gruppe (`role="alert"`); `validateKultur` fragt dieselbe Funktion ab,
 * damit Live- und Speicherprüfung für eine Gruppe identisch urteilen.
 * Liefert die sichtbare Fehlermeldung oder null.
 */
export function pruefeGruppeImKontext(
  regeln: KulturRegeln,
  index: number,
  kostenById: Record<string, number> = {},
): string | null {
  const alternative = regeln.alternativen[index]
  if (!alternative) return null
  return pruefeGruppe(alternative, kostenById) ?? pruefeMehrfachZuordnung(regeln, index)
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

/** Roher Abschnittseintrag im Speicherformat des Kultur-Editors. */
export interface KulturAbschnittEintrag {
  id: string
  name: string
  punkte?: number
  anzahl?: number
}

/** Liest einen Abschnitt (JSON-Array) aus den Configfeldern des Editors. */
export function leseAbschnitt(roh: string | undefined): KulturAbschnittEintrag[] {
  if (!roh) return []
  try {
    const parsed: unknown = JSON.parse(roh)
    return Array.isArray(parsed) ? (parsed as KulturAbschnittEintrag[]) : []
  } catch {
    return []
  }
}

/**
 * „Gruppe entfernen" des Kultur-Editors (Review-Fund INT-000015): löst die
 * Gruppe mit Index `index` auf und liefert die aktualisierten Configfelder.
 * Zurück in die Abschnitte kommen ausschließlich die Einträge von Seite 1
 * (`gruppeAufloesen`) – Seite 2 und die Gruppe selbst entfallen. Beide Seiten
 * gleichzeitig zurückzuschreiben erzeugt per Konstruktion einen R1-widrigen
 * Zustand (z. B. zwei zugewiesene Stärken).
 *
 * Liefert `null`, wenn es die Gruppe nicht gibt.
 */
export function entferneGruppe(
  configFelder: Record<string, string>,
  index: number,
): Record<string, string> | null {
  const regeln = parseKulturRegeln(configFelder)
  const alternative = regeln.alternativen[index]
  if (!alternative) return null

  const wiederherstellen = new Map<KulturFeld, KulturGruppenEintrag[]>()
  for (const eintrag of gruppeAufloesen(alternative)) {
    const vorhanden = wiederherstellen.get(eintrag.feld)
    if (vorhanden) vorhanden.push(eintrag)
    else wiederherstellen.set(eintrag.feld, [eintrag])
  }

  const next: Record<string, string> = { ...configFelder }
  for (const [feld, eintraege] of wiederherstellen) {
    const abschnitt = leseAbschnitt(next[feld])
    for (const eintrag of eintraege) {
      abschnitt.push(
        feld === 'staerken'
          ? { id: eintrag.id, name: eintrag.name, anzahl: eintrag.wert }
          : { id: eintrag.id, name: eintrag.name, punkte: eintrag.wert },
      )
    }
    next[feld] = JSON.stringify(abschnitt)
  }

  const uebrig = regeln.alternativen.filter((_, i) => i !== index)
  if (uebrig.length === 0) delete next.alternativen
  else next.alternativen = JSON.stringify(uebrig)
  return next
}

/**
 * Vollständige Speicherprüfung einer Kultur.
 * Reihenfolge: R1 Anzahl der Stärken → R1 je Stärken-Eintrag der Abschnitte →
 * Punkte der Abschnitte sind ganze Zahlen ab 0 (F3) → je Gruppe die Struktur
 * (R3/K2c), das Wertformat (G), R1 je Eintrag, R4 Gleichwertigkeit und die
 * Zuordnung (R6, H) (`pruefeGruppeImKontext`, identisch zur Live-Prüfung) →
 * R5 über alle Ergebnisse.
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

  for (const eintrag of regeln.staerken) {
    const fehler = pruefeStaerkeWert(eintrag.id, eintrag.wert, kostenById)
    if (fehler) return fehler
  }

  // F3: Punkte der Abschnitte sind ganze Zahlen ab 0 – für jeden Eintrag,
  // unabhängig von id und name. Negative oder nicht ganzzahlige Werte würden
  // R2 und die Basissumme von R5 umgehen (−5 + 10 ergäbe 5).
  for (const feld of TALENT_FELDER) {
    for (const eintrag of regeln[feld]) {
      if (!istGueltigerPunktwert(eintrag.wert)) return MSG_PUNKTE_UNGUELTIG
    }
  }

  // Je Gruppe dieselbe Prüfung wie die Live-Meldung im Editor: R3/K2c/G/R1/R4
  // an der Gruppe, dann ihre Zuordnung (R6/H: Abschnitt, weitere Gruppen).
  for (let i = 0; i < regeln.alternativen.length; i++) {
    const fehler = pruefeGruppeImKontext(regeln, i, kostenById)
    if (fehler) return fehler
  }

  const zusatz = regeln.alternativen.length > 0 ? ERGEBNIS_ZUSATZ : ''
  for (const ergebnis of wahlmoeglichkeiten(regeln)) {
    if (ergebnis.staerkenAnzahl > MAX_STAERKEN) return MSG_MAX_STAERKEN + zusatz
    if (ergebnis.talentPunkte > MAX_TALENT_PUNKTE) return MSG_MAX_TALENTE + zusatz
  }
  return null
}
