import type { SchicksalDelta, RasseDelta, AbstammungDelta, KulturDelta, PickedItem, PickedSpell } from './steps'

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
