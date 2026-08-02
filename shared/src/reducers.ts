import { parseChoiceKey } from './herkunft'
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
  const { rowSelections } = delta as { rowSelections: Record<number, string> }
  const herkunftSkills: Record<string, number> = {}
  const herkunftResources: Record<string, number> = {}

  for (const choiceStr of Object.values(rowSelections)) {
    const items = parseChoiceKey(choiceStr)
    for (const item of items) {
      if (item.type === 'skill') {
        const id = skillNameToId(item.name)
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
    resources: mergeSkills((stats.resources ?? {}) as Record<string, number>, herkunftResources),
  }
}

const kulturReducer: Reducer = (stats, delta) => ({
  ...stats,
  kultur: delta as KulturDelta,
})

const kindheitReducer: Reducer = (stats, delta) => {
  const { skills: deltaSkills = {}, staerke, meisterschaft } = delta as {
    skills: Record<string, number>
    staerke: string
    meisterschaft: string
  }
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerke,
    kulturMeisterschaft: meisterschaft,
  };
};

const ausbildungReducer: Reducer = (stats, delta) => {
  const { skills: deltaSkills = {}, staerken = [], ressourcen = {}, magic } = delta as {
    skills: Record<string, number>
    staerken: string[]
    ressourcen: Record<string, number>
    magic: Record<string, number>
  }
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const currentStaerken = (stats.staerken ?? []) as string[];
  const currentRessourcen = (stats.ressourcen ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerken: concatArrays(currentStaerken, staerken),
    ressourcen: mergeSkills(currentRessourcen, ressourcen),
    magic,
  };
};

const attributeReducer: Reducer = (stats, delta) => {
  const { attribute = {} } = delta as { attribute: Record<string, number> }
  const attr = attribute;
  const rasseData = (stats.rasse ?? {}) as Record<string, unknown>;
  const gk = (rasseData.groessenklasse as number) ?? 3;
  const derived = {
    LP: (gk + (attr.KON ?? 0)) * 5,
    FK: ((attr.MYS ?? 0) + (attr.MYS ?? 0)) * 3,
    SP: ((attr.HIN ?? 0) + (attr.HIN ?? 0)) * 3,
    VTD: 12 + (attr.GEW ?? 0) + (attr.INT ?? 0) + (5 - gk) * 2,
    KW: 12 + (attr.KRA ?? 0) + (attr.KON ?? 0),
    GW: 12 + (attr.MUT ?? 0) + (attr.KON ?? 0),
    SS: gk - 3 + (attr.KON ?? 0),
    INI: 20 - (attr.INT ?? 0) - (attr.GEW ?? 0),
  };
  return {
    ...stats,
    attribute: attr,
    derived,
  };
};

const meisterschaftReducer: Reducer = (stats, delta) => {
  const {
    meisterschaften = [],
    bonusMeisterschaften = [],
    talents = {},
    resources = {},
    spells,
  } = delta as {
    meisterschaften: string[]
    bonusMeisterschaften: string[]
    talents: Record<string, number>
    resources: Record<string, number>
    spells: string[]
  }
  const currentMeisterschaften = (stats.meisterschaften ?? []) as string[];
  const currentBonus = (stats.bonusMeisterschaften ?? []) as string[];
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const currentResources = (stats.resources ?? {}) as Record<string, number>;
  return {
    ...stats,
    meisterschaften: concatArrays(currentMeisterschaften, meisterschaften),
    bonusMeisterschaften: concatArrays(currentBonus, bonusMeisterschaften),
    skills: mergeSkills(currentSkills, talents),
    resources: mergeSkills(currentResources, resources),
    spells,
  };
};

export const reducers: Record<StepKey, Reducer> = {
  schicksal: schicksalReducer,
  rasse: rasseReducer,
  abstammung: abstammungReducer,
  kultur: kulturReducer,
  kindheit: kindheitReducer,
  ausbildung: ausbildungReducer,
  attribute: attributeReducer,
  meisterschaft: meisterschaftReducer,
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
    ...(steps.ausbildung?.staerken ?? []),
  ]

  return {
    version: FINAL_CHARACTER_VERSION,
    name,
    schicksal: steps.schicksal?.name ?? null,
    rasse: steps.rasse?.name ?? null,
    groessenklasse: steps.rasse?.groessenklasse ?? 3,
    kultur: steps.kultur?.kulturName ?? null,
    attribute: (state.attribute ?? {}) as FinalCharacter['attribute'],
    derived: (state.derived ?? ZERO_DERIVED) as DerivedValues,
    skills: (state.skills ?? {}) as Record<string, number>,
    staerken,
    meisterschaften: [
      ...(state.meisterschaften ?? []),
      ...(state.bonusMeisterschaften ?? []),
    ],
    spells: state.spells ?? [],
    ressourcen: mergeSkills(
      (state.ressourcen ?? {}) as Record<string, number>,
      (state.resources ?? {}) as Record<string, number>,
    ),
    xp: 15,
  };
}
