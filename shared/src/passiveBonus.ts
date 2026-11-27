/**
 * INT-000020 (SF-000012): Passive Attribut-/Wert-Boni für Meisterschaften
 * und Vorteile.
 *
 * Die Boni werden im `config`-JSON der Bibliothekseinträge gespeichert
 * (`passive_bonus_aktiv`, `passive_bonus`). Dieses Modul ist die einzige
 * Stelle, die die Werte liest, validiert und auf einen Charakterzustand
 * anwendet — damit Bibliothek, Erstellung und Chronik dieselbe Semantik
 * verwenden.
 */

import { geschwindigkeit } from './character'

export interface PassiveStatDefinition {
  key: string
  label: string
}

/** Die im System definierten Attribute (Reihenfolge wie im Formular). */
export const PASSIVE_ATTRIBUTE_STATS: readonly PassiveStatDefinition[] = [
  { key: 'MUT', label: 'MUT' },
  { key: 'KLU', label: 'KLU' },
  { key: 'INT', label: 'INT' },
  { key: 'CHA', label: 'CHA' },
  { key: 'HIN', label: 'HIN' },
  { key: 'MYS', label: 'MYS' },
  { key: 'FF', label: 'FF' },
  { key: 'GEW', label: 'GEW' },
  { key: 'KON', label: 'KON' },
  { key: 'KRA', label: 'KRA' },
]

/** Die im System definierten abgeleiteten Werte (Reihenfolge wie im Formular). */
export const PASSIVE_DERIVED_STATS: readonly PassiveStatDefinition[] = [
  { key: 'LP', label: 'Lebenspunkte' },
  { key: 'FK', label: 'Focus' },
  { key: 'SP', label: 'Spirit' },
  { key: 'VTD', label: 'Verteidigung' },
  { key: 'KW', label: 'Körperlicher Widerstand' },
  { key: 'GW', label: 'Geistiger Widerstand' },
  { key: 'SS', label: 'Schadensschwelle' },
  { key: 'INI', label: 'Initiative' },
  { key: 'GK', label: 'GK' },
  { key: 'GES', label: 'Geschwindigkeit' },
]

export const PASSIVE_STAT_KEYS: readonly string[] = [
  ...PASSIVE_ATTRIBUTE_STATS.map((s) => s.key),
  ...PASSIVE_DERIVED_STATS.map((s) => s.key),
]

/**
 * INT-000021: Beschriftung der Bonus-Eingabefelder in der Bibliothek.
 *
 * Es erscheint ausschließlich das im System etablierte Kürzel (`key`),
 * nie der vollständige Langname (`label`). Die Zuordnung Kürzel → Feld
 * bleibt dabei unverändert; `key` ist zugleich der Schlüssel im `config`-JSON.
 */
export function passiveStatFieldLabel(stat: PassiveStatDefinition): string {
  return stat.key
}

export type PassiveBonus = Record<string, number>

export interface PassiveBonusConfig {
  aktiv: boolean
  werte: PassiveBonus
}

export interface BonusCatalogItem {
  id: string
  name: string
  config: unknown
}

export interface BonusCatalog {
  byId: Map<string, PassiveBonus>
  byName: Map<string, PassiveBonus>
  /** Normalisierter Name je Id — verhindert Doppelzählung bei id+Name-Verweisen. */
  nameById: Map<string, string>
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

/** Nur ganze Zahlen (optional mit Minus) als Eingabe zulassen. */
export function isIntegerInput(raw: string): boolean {
  return /^-?\d*$/.test(raw)
}

/** Bereinigte Eingabe für die Formularfelder: alles Nicht-Ganzzahlige wird verworfen. */
export function sanitizeIntegerInput(raw: string): string {
  const value = raw.trim()
  if (!/^-?\d+$/.test(value)) return ''
  return String(parseInt(value, 10))
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = parseInt(value.trim(), 10)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

/** Passive Boni aus einem Bibliotheks-`config` lesen und validieren. */
export function readPassiveBonusConfig(config: unknown): PassiveBonusConfig {
  const cfg = parseConfigObject(config)
  if (cfg.passive_bonus_aktiv !== true && cfg.passive_bonus_aktiv !== 'true') {
    return { aktiv: false, werte: {} }
  }
  const raw = parseConfigObject(cfg.passive_bonus)
  const werte: PassiveBonus = {}
  for (const key of PASSIVE_STAT_KEYS) {
    const value = toInteger(raw[key])
    if (value !== null && value !== 0) werte[key] = value
  }
  return { aktiv: true, werte }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

/** Katalog aus Bibliotheks-Einträgen (Stärken/Vorteile und Meisterschaften) bauen. */
export function buildBonusCatalog(items: readonly BonusCatalogItem[]): BonusCatalog {
  const byId = new Map<string, PassiveBonus>()
  const byName = new Map<string, PassiveBonus>()
  const nameById = new Map<string, string>()
  for (const item of items) {
    const { aktiv, werte } = readPassiveBonusConfig(item.config)
    if (!aktiv || Object.keys(werte).length === 0) continue
    byId.set(item.id, werte)
    byName.set(normalizeName(item.name), werte)
    nameById.set(item.id, normalizeName(item.name))
  }
  return { byId, byName, nameById }
}

export interface BonusReferences {
  ids?: readonly (string | undefined)[]
  names?: readonly (string | undefined)[]
}

/** Summe aller Boni der angegebenen Einträge. */
export function collectPassiveBonuses(catalog: BonusCatalog, refs: BonusReferences): PassiveBonus {
  const sum: PassiveBonus = {}
  const add = (bonus: PassiveBonus | undefined) => {
    if (!bonus) return
    for (const [key, value] of Object.entries(bonus)) {
      if (Number.isSafeInteger(value)) sum[key] = (sum[key] ?? 0) + value
    }
  }
  const collectedIds = new Set<string>()
  for (const id of refs.ids ?? []) {
    if (!id || collectedIds.has(id)) continue
    add(catalog.byId.get(id))
    collectedIds.add(id)
  }
  for (const name of refs.names ?? []) {
    if (!name) continue
    const normalized = normalizeName(name)
    const alreadyCollected = [...collectedIds].some((id) => catalog.nameById.get(id) === normalized)
    if (alreadyCollected) continue
    add(catalog.byName.get(normalized))
  }
  return sum
}

interface MutableBonusTarget {
  attribute?: Record<string, number | undefined>
  derived?: Record<string, number | undefined>
  groessenklasse?: number
  passiveBonusStats?: PassiveBonus
}

function asRecord(value: unknown): Record<string, number | undefined> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, number | undefined>
    : null
}

/**
 * Boni additiv auf den Charakterzustand anwenden.
 *
 * Attribute erhalten den Zusatz direkt auf ihren Wert; abgeleitete Werte
 * werden nach ihrer regulären Berechnung um den Zusatz erhöht. Die
 * angewendeten Boni werden zusätzlich in `passiveBonusStats` festgehalten,
 * damit abgeleitete Werte beim Lesen (insbesondere GES) erhalten bleiben.
 */
export function applyPassiveBonuses(state: object, bonuses: readonly PassiveBonus[]): void {
  const target = state as MutableBonusTarget
  const merged: PassiveBonus = {}
  for (const bonus of bonuses) {
    for (const [key, value] of Object.entries(bonus)) {
      if (!PASSIVE_STAT_KEYS.includes(key) || !Number.isSafeInteger(value)) continue
      merged[key] = (merged[key] ?? 0) + value
    }
  }
  if (Object.keys(merged).length === 0) return

  // Wichtig: nie die vom Request stammenden Objekte mutieren. `final.attribute`
  // teilt die Referenz mit `steps.attribute.attribute` (siehe attributeReducer);
  // ein direktes Überschreiben würde die gespeicherten Roheingaben in
  // `characterSteps` verbonsten und bei Neuberechnung doppelt zählen lassen.
  const sourceAttribute = asRecord(target.attribute)
  const attribute: Record<string, number | undefined> = sourceAttribute ? { ...sourceAttribute } : {}
  let attributeChanged = false
  for (const { key } of PASSIVE_ATTRIBUTE_STATS) {
    const bonus = merged[key]
    if (bonus === undefined || bonus === 0) continue
    const base = typeof attribute[key] === 'number' ? attribute[key] as number : 0
    attribute[key] = base + bonus
    attributeChanged = true
  }
  if (attributeChanged) target.attribute = attribute

  const sourceDerived = asRecord(target.derived)
  const derived: Record<string, number | undefined> = sourceDerived ? { ...sourceDerived } : {}
  let derivedChanged = false
  for (const { key } of PASSIVE_DERIVED_STATS) {
    if (key === 'GK') continue
    const bonus = merged[key]
    if (bonus === undefined || bonus === 0) continue
    const base = typeof derived[key] === 'number' ? derived[key] as number : 0
    derived[key] = base + bonus
    derivedChanged = true
  }

  // GK ist die Größenklasse der Rasse; ein Zusatz wirkt auf den gespeicherten
  // Wert und damit auf die davon abgeleitete Geschwindigkeit.
  const gkBonus = merged.GK ?? 0
  if (gkBonus !== 0 && typeof target.groessenklasse === 'number') {
    target.groessenklasse += gkBonus
  }
  if (gkBonus !== 0 && typeof derived.GES === 'number') {
    const basis = typeof target.groessenklasse === 'number' ? target.groessenklasse : 3
    derived.GES = geschwindigkeit(basis, typeof attribute.GEW === 'number' ? attribute.GEW : undefined)
      + (merged.GES ?? 0)
    derivedChanged = true
  }
  if (derivedChanged) target.derived = derived

  const stats: PassiveBonus = { ...(target.passiveBonusStats ?? {}) }
  for (const [key, value] of Object.entries(merged)) {
    stats[key] = (stats[key] ?? 0) + value
  }
  target.passiveBonusStats = stats
}
