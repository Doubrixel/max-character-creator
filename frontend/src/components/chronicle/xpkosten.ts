// XP-Regelwerk (Platzhalter) — zentrale Stelle, hier werden später die echten
// Kosten und das Level-Cap hinterlegt. Level basiert AUSSCHLIESSLICH auf den
// gesammelten (totalXp) — ausgegebenes XP (xp-Guthaben) beeinflusst das Level nie.

export const XP_PER_LEVEL = 100
export const START_XP = 15

export function levelOf(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

export function levelProgress(totalXp: number): number {
  return ((totalXp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL
}

export function xpToNextLevel(totalXp: number): number {
  return XP_PER_LEVEL - levelProgress(totalXp)
}

// --- Platzhalter-Kosten (TBD) -------------------------------------------------

export type SpendKind = 'skill_up' | 'learn_skill' | 'learn_strength'

const XP_KOSTEN: Record<SpendKind, number> = {
  skill_up: 15,        // vorhandenen Skill +1 aufwerten
  learn_skill: 15,     // neuen Skill neu erlernen (Start bei 1)
  learn_strength: 15,  // neue Stärke erlernen
}

export function spendCost(kind: SpendKind): number {
  return XP_KOSTEN[kind]
}

export function spendLabel(kind: SpendKind, targetName: string): string {
  switch (kind) {
    case 'skill_up': return `Aufwertung: ${targetName} +1`
    case 'learn_skill': return `Neu erlernt: ${targetName}`
    case 'learn_strength': return `Neu erlernt: ${targetName}`
  }
}

// Level-Cap-Regel folgt später; null = keine Beschränkung
export function getLevelCap(_level: number): number | null {
  return null
}
