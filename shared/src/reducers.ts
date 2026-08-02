import { parseChoiceKey, GENERIC_SKILL_NAMES } from './herkunft'
import { attributeModifier } from './attributes'
import { CharacterState, FinalCharacter, DerivedValues, FINAL_CHARACTER_VERSION } from './character'
import {
  StepKey,
  STEP_ORDER,
  StepDeltas,
  AnyStepDelta,
  SchicksalDelta,
  RasseDelta,
  AbstammungDelta,
  KulturDelta,
} from './steps'

type Reducer = (currentStats: CharacterState, delta: AnyStepDelta) => CharacterState

function skillNameToId(name: string): string {
  return name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mergeSkills(
  current: Record<string, number>,
  incoming: Record<string, number>,
): Record<string, number> {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

function concatArrays<T>(current: T[] | undefined, incoming: T[] | undefined): T[] {
  return [...(current ?? []), ...(incoming ?? [])];
}

const schicksalReducer: Reducer = (stats, delta) => ({
  ...stats,
  schicksal: delta as SchicksalDelta,
})

const rasseReducer: Reducer = (stats, delta) => ({
  ...stats,
  rasse: delta as RasseDelta,
})

const abstammungReducer: Reducer = (stats, delta) => {
  const { rowSelections, specializations = {} } = delta as {
    rowSelections: Record<number, string>
    specializations?: Record<number, string>
  }
  const herkunftSkills: Record<string, number> = {}
  const herkunftResources: Record<string, number> = {}

  for (const [rowIdxStr, choiceStr] of Object.entries(rowSelections)) {
    const rowIdx = Number(rowIdxStr)
    const items = parseChoiceKey(choiceStr)
    for (const item of items) {
      if (item.type === 'skill') {
        const generic = (GENERIC_SKILL_NAMES as readonly string[]).includes(item.name)
        const id = generic ? (specializations[rowIdx] ?? skillNameToId(item.name)) : skillNameToId(item.name)
        herkunftSkills[id] = (herkunftSkills[id] ?? 0) + item.value
      } else {
        herkunftResources[item.name] = (herkunftResources[item.name] ?? 0) + item.value
      }
    }
  }

  return {
    ...stats,
    abstammung: delta as AbstammungDelta,
    skills: mergeSkills((stats.skills ?? {}) as Record<string, number>, herkunftSkills),
    ressourcen: mergeSkills((stats.ressourcen ?? {}) as Record<string, number>, herkunftResources),
  }
}

const kulturReducer: Reducer = (stats, delta) => {
  const kulturDelta = delta as KulturDelta
  const kulturConfig = kulturDelta.kulturConfig as Record<string, string> | undefined
  const currentSkills = (stats.skills ?? {}) as Record<string, number>
  const currentStaerken = (stats.staerken ?? []) as string[]
  
  const kulturSkills: Record<string, number> = {}
  const kulturStaerken: string[] = []
  
  if (kulturConfig) {
    // Skills aus talente, waffenTalente, magieSchulen
    for (const key of ['talente', 'waffenTalente', 'magieSchulen']) {
      try {
        const arr = JSON.parse(kulturConfig[key] || '[]') as Array<{ id: string; punkte: number }>
        for (const item of arr) {
          if (item.punkte > 0) {
            kulturSkills[item.id] = (kulturSkills[item.id] ?? 0) + item.punkte
          }
        }
      } catch (error) {
        console.error(`Fehler beim Parsen von kulturConfig.${key}:`, error)
      }
    }
    
    // Stärken mit anzahl
    try {
      const staerkenArr = JSON.parse(kulturConfig.staerken || '[]') as Array<{ id: string; anzahl: number }>
      for (const item of staerkenArr) {
        for (let i = 0; i < item.anzahl; i++) {
          kulturStaerken.push(item.id)
        }
      }
    } catch (error) {
      console.error('Fehler beim Parsen von kulturConfig.staerken:', error)
    }
  }
  
  return {
    ...stats,
    kultur: kulturDelta,
    skills: mergeSkills(currentSkills, kulturSkills),
    staerken: concatArrays(currentStaerken, kulturStaerken),
  }
}

const kindheitReducer: Reducer = (stats, delta) => {
  const { skills: deltaSkills = {}, staerke } = delta as {
    skills: Record<string, number>
    staerke: string
  }
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerke,
  };
};

const ausbildungReducer: Reducer = (stats, delta) => {
  const { skills: deltaSkills = {}, staerken = [], ressourcen = {} } = delta as {
    skills: Record<string, number>
    staerken: string[]
    ressourcen: Record<string, number>
  }
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const currentStaerken = (stats.staerken ?? []) as string[];
  const currentRessourcen = (stats.ressourcen ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerken: concatArrays(currentStaerken, staerken),
    ressourcen: mergeSkills(currentRessourcen, ressourcen),
  };
};

const attributeReducer: Reducer = (stats, delta) => {
  const { attribute = {} } = delta as { attribute: Record<string, number> }
  const attr = attribute;
  const mod = (k: string) => attributeModifier(attr[k] ?? 0);
  const rasseData = (stats.rasse ?? {}) as Record<string, unknown>;
  const gk = (rasseData.groessenklasse as number) ?? 3;
  const derived = {
    LP: (gk + mod('KON')) * 5,
    FK: (mod('MYS') + mod('MYS')) * 3,
    SP: (mod('HIN') + mod('HIN')) * 3,
    VTD: 12 + mod('GEW') + mod('INT') + (5 - gk) * 2,
    KW: 12 + mod('KRA') + mod('KON'),
    GW: 12 + mod('MUT') + mod('KON'),
    SS: gk - 3 + mod('KON'),
    INI: 20 - mod('INT') - mod('GEW'),
  };
  return {
    ...stats,
    attribute: attr,
    derived,
  };
};

const HobbybedarfReducer: Reducer = (stats, delta) => {
  const { skills: deltaSkills = {}, staerken = [], ressourcen = {} } = delta as {
    skills: Record<string, number>
    staerken: string[]
    ressourcen: Record<string, number>
  }
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const currentStaerken = (stats.staerken ?? []) as string[];
  const currentRessourcen = (stats.ressourcen ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerken: concatArrays(currentStaerken, staerken),
    ressourcen: mergeSkills(currentRessourcen, ressourcen),
  };
};

const zauberReducer: Reducer = (stats, delta) => {
  const { pflicht = [], spells = [] } = delta as {
    pflicht: { skillId: string; meisterschaft: { id: string; name: string } }[]
    spells: { spellId: string; spellName: string; schoolId: string; schoolName: string; grade: number }[]
  }
  return {
    ...stats,
    meisterschaften: pflicht.map((p) => p.meisterschaft),
    spells,
  };
};

const nameReducer: Reducer = (stats, delta) => ({
  ...stats,
  name: (delta as { name: string }).name,
})

export const reducers: Record<StepKey, Reducer> = {
  schicksal: schicksalReducer,
  rasse: rasseReducer,
  abstammung: abstammungReducer,
  kultur: kulturReducer,
  kindheit: kindheitReducer,
  ausbildung: ausbildungReducer,
  attribute: attributeReducer,
  Hobbybedarf: HobbybedarfReducer,
  Zauber: zauberReducer,
  Name: nameReducer,
};

export function recalculateStats(deltas: StepDeltas): CharacterState {
  let stats: CharacterState = {};
  for (const step of STEP_ORDER) {
    const delta = deltas[step];
    if (delta) {
      stats = reducers[step](stats, delta);
    }
  }
  return stats;
}

export function recalculateStatsUpTo(
  deltas: StepDeltas,
  upToStep: StepKey,
): CharacterState {
  let stats: CharacterState = {};
  for (const step of STEP_ORDER) {
    if (step === upToStep) break;
    const delta = deltas[step];
    if (delta) {
      stats = reducers[step](stats, delta);
    }
  }
  return stats;
}

const ZERO_DERIVED: DerivedValues = { LP: 0, FK: 0, SP: 0, VTD: 0, KW: 0, GW: 0, SS: 0, INI: 0 }

export function buildFinalCharacter(name: string, steps: StepDeltas): FinalCharacter {
  const state = recalculateStats(steps)

  const staerken = [
    ...(steps.rasse?.statblock.vorteile ?? []),
    ...(steps.rasse?.statblock.nachteile ?? []),
    ...(steps.kindheit?.staerke ? [steps.kindheit.staerke] : []),
    ...(state.staerken ?? []),
  ]

  return {
    version: FINAL_CHARACTER_VERSION,
    name,
    schicksal: steps.schicksal ?? null,
    rasse: steps.rasse ?? null,
    groessenklasse: steps.rasse?.groessenklasse ?? 3,
    kultur: steps.kultur ?? null,
    attribute: (state.attribute ?? {}) as FinalCharacter['attribute'],
    derived: (state.derived ?? ZERO_DERIVED) as DerivedValues,
    skills: (state.skills ?? {}) as Record<string, number>,
    staerken,
    ressourcen: (state.ressourcen ?? {}) as Record<string, number>,
    meisterschaften: steps.Zauber?.pflicht?.map((p) => p.meisterschaft) ?? [],
    spells: steps.Zauber?.spells ?? [],
    xp: 15,
  };
}
