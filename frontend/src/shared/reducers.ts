type Reducer = (
  currentStats: Record<string, unknown>,
  delta: Record<string, unknown>,
) => Record<string, unknown>;

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

const step1: Reducer = (stats, delta) => ({
  ...stats,
  schicksal: delta,
});

const step2: Reducer = (stats, delta) => ({
  ...stats,
  rasse: delta,
});

const step3: Reducer = (stats, delta) => ({
  ...stats,
  abstammung: delta,
});

const step4: Reducer = (stats, delta) => {
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const deltaSkills = (delta.skills ?? {}) as Record<string, number>;
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerke: delta.staerke,
    kulturMeisterschaft: delta.meisterschaft,
  };
};

const step5: Reducer = (stats, delta) => {
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const deltaSkills = (delta.skills ?? {}) as Record<string, number>;
  const currentStaerken = (stats.staerken ?? []) as unknown[];
  const deltaStaerken = (delta.staerken ?? []) as unknown[];
  const currentRessourcen = (stats.ressourcen ?? []) as unknown[];
  const deltaRessourcen = (delta.ressourcen ?? []) as unknown[];
  return {
    ...stats,
    skills: mergeSkills(currentSkills, deltaSkills),
    staerken: concatArrays(currentStaerken, deltaStaerken),
    ressourcen: concatArrays(currentRessourcen, deltaRessourcen),
    magic: delta.magic,
  };
};

const step6: Reducer = (stats, delta) => {
  const attr = (delta.attribute ?? {}) as Record<string, number>;
  const derived = {
    LP: 10 + (attr.KO ?? 0) * 2,
    AP: 5 + (attr.KK ?? 0),
    MP: 3 + (attr.MU ?? 0),
    INI: (attr.GE ?? 0) + (attr.IN ?? 0),
    WP: 5 + (attr.SR ?? 0),
    AW: 8 + (attr.GE ?? 0),
  };
  return {
    ...stats,
    attribute: delta.attribute,
    derived,
  };
};

const step7: Reducer = (stats, delta) => {
  const currentMeisterschaften = (stats.meisterschaften ?? []) as unknown[];
  const deltaMeisterschaften = (delta.meisterschaften ?? []) as unknown[];
  const currentBonus = (stats.bonusMeisterschaften ?? []) as unknown[];
  const deltaBonus = (delta.bonusMeisterschaften ?? []) as unknown[];
  const currentSkills = (stats.skills ?? {}) as Record<string, number>;
  const deltaTalents = (delta.talents ?? {}) as Record<string, number>;
  const currentResources = (stats.resources ?? {}) as Record<string, number>;
  const deltaResources = (delta.resources ?? {}) as Record<string, number>;
  return {
    ...stats,
    meisterschaften: concatArrays(currentMeisterschaften, deltaMeisterschaften),
    bonusMeisterschaften: concatArrays(currentBonus, deltaBonus),
    skills: mergeSkills(currentSkills, deltaTalents),
    resources: mergeSkills(currentResources, deltaResources),
    spells: delta.spells,
  };
};

export const reducers: Map<number, Reducer> = new Map([
  [1, step1],
  [2, step2],
  [3, step3],
  [4, step4],
  [5, step5],
  [6, step6],
  [7, step7],
]);

export function recalculateStats(
  deltas: Record<number, Record<string, unknown>>,
): Record<string, unknown> {
  let stats: Record<string, unknown> = {};
  for (let step = 1; step <= 7; step++) {
    const delta = deltas[step];
    if (delta) {
      const reducer = reducers.get(step);
      if (reducer) {
        stats = reducer(stats, delta);
      }
    }
  }
  return stats;
}

export function recalculateStatsUpTo(
  deltas: Record<number, Record<string, unknown>>,
  upToStep: number,
): Record<string, unknown> {
  let stats: Record<string, unknown> = {};
  for (let step = 1; step < upToStep; step++) {
    const delta = deltas[step];
    if (delta) {
      const reducer = reducers.get(step);
      if (reducer) {
        stats = reducer(stats, delta);
      }
    }
  }
  return stats;
}
