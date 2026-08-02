export const STEP_ORDER = [
  'schicksal',
  'rasse',
  'abstammung',
  'kultur',
  'kindheit',
  'ausbildung',
  'attribute',
  'meisterschaft',
] as const

export type StepKey = typeof STEP_ORDER[number]

export function isStepKey(value: string): value is StepKey {
  return (STEP_ORDER as readonly string[]).includes(value)
}

export interface SchicksalDelta {
  id: string
  name: string
  ruleText: string
}

export interface RasseDelta {
  id: string
  name: string
  groessenklasse?: number
  statblock: { vorteile: string[]; nachteile: string[] }
}

export interface AbstammungDelta {
  classId: string | null
  className: string | null
  originId: string | null
  originName: string | null
  rowSelections: Record<number, string>
  specializations?: Record<number, string>
}

export interface KulturDelta {
  kulturId: string
  kulturName: string
  kulturDescription: string | null
  kulturConfig: unknown
}

export interface KindheitDelta {
  skills: Record<string, number>
  staerke: string
}

export interface AusbildungDelta {
  skills: Record<string, number>
  staerken: string[]
  ressourcen: Record<string, number>
}

export interface AttributeDelta {
  attribute: Record<string, number>
  rolls: (number | null)[]
  slotAssignments?: Record<string, number>
}

export interface MeisterschaftDelta {
  skills: Record<string, number>
  staerken: string[]
  ressourcen: Record<string, number>
}

export type StepDeltaMap = {
  schicksal: SchicksalDelta
  rasse: RasseDelta
  abstammung: AbstammungDelta
  kultur: KulturDelta
  kindheit: KindheitDelta
  ausbildung: AusbildungDelta
  attribute: AttributeDelta
  meisterschaft: MeisterschaftDelta
}

export type StepDeltas = Partial<StepDeltaMap>

export type AnyStepDelta = StepDeltaMap[StepKey]
