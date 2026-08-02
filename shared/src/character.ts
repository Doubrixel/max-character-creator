import type { SchicksalDelta, RasseDelta, AbstammungDelta, KulturDelta } from './steps'

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
  kulturMeisterschaft?: string
  ressourcen?: Record<string, number>
  magic?: Record<string, number>
  attribute?: AttributeValues
  derived?: DerivedValues
  meisterschaften?: string[]
  bonusMeisterschaften?: string[]
  resources?: Record<string, number>
  spells?: string[]
}
