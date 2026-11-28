/**
 * INT-000023 (SF-000014): Konfigurierbare Mehrfachauswahl für Vorteile
 * (Stärken) und Meisterschaften.
 *
 * Die Bibliothek speichert die Konfiguration im `config`-JSON der Einträge:
 *   - `mehrfach_waehlbar`: 'true'/'false' (Checkbox)
 *   - `max_auswahl`: positive ganze Zahl als Obergrenze (Textfeld)
 *
 * Dieses Modul ist die zentrale Stelle für Validierung, Zählung und
 * römische Darstellung, damit Bibliothek, Erstellung und Chronik dieselbe
 * Semantik verwenden.
 */

export const MEHRFACH_WAEHLBAR_KEY = 'mehrfach_waehlbar'
export const MAX_AUSWAHL_KEY = 'max_auswahl'

export interface MehrfachConfig {
  /** Wahr, wenn die Checkbox gesetzt ist (auch bei ungültiger Obergrenze). */
  flag: boolean
  /** Validierte Obergrenze; null bei fehlender oder ungültiger Angabe. */
  max: number | null
  /** Nur aktiv, wenn Checkbox UND gültige positive Obergrenze vorliegen. */
  aktiv: boolean
}

function parseConfigObject(config: unknown): Record<string, unknown> {
  if (typeof config === 'string') {
    try {
      const parsed: unknown = JSON.parse(config)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {}
    } catch {
      return {}
    }
  }
  return typeof config === 'object' && config !== null && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {}
}

/** Nur ganze Zahlen >= 1 (keine 0, kein Negativ, keine Dezimalzahl, kein Text). */
export function parsePositiveInteger(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw >= 1 ? raw : null
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const parsed = Number(raw.trim())
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null
  }
  return null
}

/** Prüfung einer rohen Texteingabe für das Formularfeld. */
export function isPositiveIntegerInput(raw: string): boolean {
  return /^[1-9]\d*$/.test(raw)
}

/** Liest und validiert die Mehrfachauswahl-Konfiguration eines Bibliothekseintrags. */
export function readMehrfachConfig(config: unknown): MehrfachConfig {
  const cfg = parseConfigObject(config)
  const flag = cfg[MEHRFACH_WAEHLBAR_KEY] === true || cfg[MEHRFACH_WAEHLBAR_KEY] === 'true'
  const max = parsePositiveInteger(cfg[MAX_AUSWAHL_KEY])
  return { flag, max, aktiv: flag && max !== null }
}

/** Kurzform für die Frage, ob ein Eintrag mehrfach wählbar ist. */
export function istMehrfachWaehlbar(config: unknown): boolean {
  return readMehrfachConfig(config).aktiv
}

/**
 * Speicherprüfung: Wenn die Checkbox gesetzt ist, muss eine gültige positive
 * Obergrenze vorliegen. Rückgabe einer Fehlermeldung oder null.
 */
export function validateMehrfachConfig(config: unknown): string | null {
  const { flag, max } = readMehrfachConfig(config)
  if (flag && max === null) {
    return 'Bei „mehrfach wählbar“ muss die maximale Auswahl-Obergrenze eine positive ganze Zahl sein.'
  }
  return null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

/**
 * Zählt, wie oft ein Eintrag in einer Auswahlliste bereits gewählt wurde.
 * Verweise können als Id oder (Altbestand) als Name vorliegen.
 */
export function zaehleAuswahlen(
  auswahlen: readonly (string | undefined | null)[],
  ziel: { id?: string | null; namen?: readonly (string | undefined | null)[] },
): number {
  const namen = new Set(
    (ziel.namen ?? [])
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .map((value) => normalizeName(value)),
  )
  const zielId = typeof ziel.id === 'string' ? ziel.id.trim() : ''
  return auswahlen.filter((raw) => {
    if (typeof raw !== 'string') return false
    const value = raw.trim()
    if (!value) return false
    if (zielId !== '' && value === zielId) return true
    return namen.has(normalizeName(value))
  }).length
}

/**
 * INT-000023 (Rework / MCC-010): Zählt, wie oft eine Meisterschaft in einer
 * Auswahlliste vorkommt. Verweise können als Id oder als Name (Altbestand)
 * vorliegen; Normalisierung wie in `zaehleAuswahlen`.
 *
 * Die übergebene Liste ist bewusst characterweit (über alle Fertigkeiten
 * hinweg), weil die konfigurierte Obergrenze pro Eintrag gilt und nicht pro
 * Fertigkeit, für die die Meisterschaft gewählt wurde.
 */
export function zaehleMeisterschaftAuswahlen(
  bereitsGewaehlt: readonly { id?: string | null; name?: string | null }[],
  ziel: { id?: string | null; name?: string | null },
): number {
  const zielId = typeof ziel.id === 'string' ? ziel.id.trim() : ''
  const zielName = normalizeName(typeof ziel.name === 'string' ? ziel.name : '')
  return bereitsGewaehlt.filter((item) => {
    if (zielId !== '' && item.id === zielId) return true
    const itemName = normalizeName(typeof item.name === 'string' ? item.name : '')
    return zielName !== '' && itemName === zielName
  }).length
}

/** Ob eine Meisterschaft bei `max` erlaubten Gesamtauswahlen noch wählbar ist. */
export function istMeisterschaftNochWaehlbar(
  bereitsGewaehlt: readonly { id?: string | null; name?: string | null }[],
  ziel: { id?: string | null; name?: string | null },
  max: number,
): boolean {
  return zaehleMeisterschaftAuswahlen(bereitsGewaehlt, ziel) < max
}

interface MeisterschaftAuswahlKandidat {
  id: string
  name: string
  mehrfach: boolean
  max: number | null
}

/**
 * INT-000023 (Rework / MCC-010): Filtert die passenden Meisterschaften eines
 * Schritt-9-Auswahlfelds auf diejenigen, die noch gewählt werden dürfen.
 *
 * - Mehrfach wählbare Meisterschaften: die Obergrenze gilt characterweit,
 *   d. h. Auswahlen für andere Fertigkeiten zählen ebenfalls mit.
 * - Alle anderen Einträge behalten das bisherige Verhalten (je Fertigkeit
 *   höchstens eine Auswahl) und bleiben für andere Fertigkeiten verfügbar.
 */
export function filterVerfuegbareMeisterschaften<
  T extends MeisterschaftAuswahlKandidat,
>(
  pool: readonly T[],
  alleGewaehlt: readonly { id?: string | null; name?: string | null }[],
  jeSkill: readonly { id?: string | null; name?: string | null }[],
): T[] {
  return pool.filter((m) => {
    const max = m.mehrfach && m.max !== null ? m.max : 1
    return istMeisterschaftNochWaehlbar(
      m.mehrfach ? alleGewaehlt : jeSkill,
      { id: m.id, name: m.name },
      max,
    )
  })
}

const ROMAN_VALUES: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** Römische Zählung für Anzeigen (2 → II, 3 → III, 4 → IV, …). */
export function toRoman(count: number): string {
  if (!Number.isSafeInteger(count) || count < 1) return ''
  let rest = count
  let result = ''
  for (const [value, symbol] of ROMAN_VALUES) {
    while (rest >= value) {
      result += symbol
      rest -= value
    }
  }
  return result
}

/**
 * Anzeigename bei mehrfacher Auswahl: „Flink" + 2 ⇒ „Flink II".
 * Bei einer Auswahl bleibt der Name unverändert.
 */
export function displayNameWithCount(name: string, count: number): string {
  return count > 1 ? `${name} ${toRoman(count)}` : name
}

/** Zulässige Gesamtanzahl für einen Eintrag (1, wenn nicht mehrfach wählbar). */
export function maxAuswahlVon(config: unknown): number {
  const { aktiv, max } = readMehrfachConfig(config)
  return aktiv && max !== null ? max : 1
}

/**
 * INT-000027 (SF-000014): Verbrauchte Punkte im Creation-Punkteschritt.
 *
 * Eine mehrfach wählbare Stärke steht für jede Auswahl erneut in der Liste.
 * Jeder Eintrag – auch der zweite und jede weitere Auswahl derselben Stärke –
 * kostet den regulären, in der Bibliothek konfigurierten Kostenwert. Der
 * Verbrauch ist deshalb die Summe über ALLE Auswahlen und nicht über die
 * Anzahl unterschiedlicher Einträge.
 *
 * Unbekannte bzw. ungültige Kostenwerte fallen auf 1 zurück (Altbestand).
 */
export function staerkenPunkteVerbrauch(
  auswahlen: readonly string[],
  kostenVon: (id: string) => number,
): number {
  return auswahlen.reduce((sum, id) => {
    const kosten = kostenVon(id)
    return sum + (Number.isFinite(kosten) && kosten > 0 ? kosten : 1)
  }, 0)
}

/** Ein Stärken-Eintrag aus Sicht der Creation-Auswahl. */
export interface StaerkenWahlEintrag {
  id: string
  kosten: number
  mehrfach: boolean
  max: number | null
}

/** Wie oft ein Eintrag in der Auswahlliste bereits gewählt wurde. */
export function zaehleStaerkenAuswahlen(
  auswahlen: readonly string[],
  id: string,
): number {
  return auswahlen.filter((value) => value === id).length
}

/** Zulässige Gesamtanzahl eines Creation-Stärken-Eintrags. */
export function maxAuswahlVonEintrag(
  eintrag: { mehrfach: boolean; max: number | null },
): number {
  return eintrag.mehrfach && eintrag.max !== null ? eintrag.max : 1
}

/**
 * INT-000027: Obergrenze UND Punktbudget wirken gemeinsam als Begrenzung.
 *
 * Eine weitere Auswahl wird nur akzeptiert (bzw. als Option angeboten), wenn
 * die maximale Auswahl-Obergrenze noch nicht erreicht ist UND das verbleibende
 * Punktbudget für den regulären Preis der Stärke ausreicht. Ist eine der
 * beiden Bedingungen verletzt, gibt diese Funktion false zurück.
 */
export function istStaerkeNochWaehlbar(
  eintrag: StaerkenWahlEintrag,
  auswahlen: readonly string[],
  verfuegbarePunkte: number,
): boolean {
  if (
    zaehleStaerkenAuswahlen(auswahlen, eintrag.id) >=
    maxAuswahlVonEintrag(eintrag)
  ) {
    return false
  }
  const kosten = Number.isFinite(eintrag.kosten) && eintrag.kosten > 0
    ? eintrag.kosten
    : 1
  return verfuegbarePunkte >= kosten
}
