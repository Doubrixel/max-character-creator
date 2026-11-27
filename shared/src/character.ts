import type { SchicksalDelta, RasseDelta, AbstammungDelta, KulturDelta, PickedItem, PickedSpell } from './steps'
import { attributeModifier } from './attributes'

export interface AttributeValues {
  MUT?: number
  KLU?: number
  INT?: number
  CHA?: number
  HIN?: number
  MYS?: number
  FF?: number
  GEW?: number
  KON?: number
  KRA?: number
}

export interface DerivedValues {
  LP: number
  FK: number
  SP: number
  VTD: number
  KW: number
  GW: number
  SS: number
  INI: number
  GES: number
}

/**
 * INT-000019 (SF-000011): Geschwindigkeit (GES) ist ein rein abgeleiteter Wert
 * mit der verbindlichen Formel GES = GK + GE — Größenklasse plus Modifikator
 * des Attributs Gewandheit (GEW). Die Berechnung steht zentral hier, damit
 * Erstellung, Chronik und Bibliothek konsistent denselben Wert liefern
 * (die Kachel der Erstellung nutzt dieselbe Semantik über die Formel „GK + GE").
 * Fehlt GEW (unvollständige Daten), gilt der durchschnittliche Attributswert 10
 * (Modifikator 0). Der Wert ist nicht manuell editierbar und aktualisiert sich
 * automatisch, sobald GK oder GE sich ändern.
 */
export function geschwindigkeit(groessenklasse: number, gewandheit: number | undefined): number {
  return groessenklasse + attributeModifier(gewandheit ?? 10)
}

export interface CharacterState {
  schicksal?: SchicksalDelta
  rasse?: RasseDelta
  abstammung?: AbstammungDelta
  kultur?: KulturDelta
  skills?: Record<string, number>
  staerke?: string
  staerken?: string[]
  ressourcen?: Record<string, number>
  meisterschaften?: PickedItem[]
  name?: string
  attribute?: AttributeValues
  derived?: DerivedValues
}

export const FINAL_CHARACTER_VERSION = 1

export interface FinalCharacter {
  version: typeof FINAL_CHARACTER_VERSION
  name: string
  schicksal: SchicksalDelta | null
  rasse: RasseDelta | null
  groessenklasse: number
  kultur: KulturDelta | null
  attribute: AttributeValues
  derived: DerivedValues
  skills: Record<string, number>
  rassenVorteile: string[]
  rassenNachteile: string[]
  staerken: string[]
  ressourcen: Record<string, number>
  meisterschaften: PickedItem[]
  spells: PickedSpell[]
  xp: number
}
