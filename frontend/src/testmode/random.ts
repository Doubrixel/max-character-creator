/**
 * INT-000018: Hilfsfunktionen für den Testmodus ("Zufällig ausfüllen").
 * Alle Funktionen arbeiten ausschließlich mit synthetischen Daten aus der
 * laufenden Anwendung und verändern keine Validierungsregeln.
 */

export function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}

/**
 * Verteilt `points` zufällig auf die übergebenen Felder und beachtet dabei
 * die Obergrenze je Feld. Es werden nie mehr Punkte vergeben als verfügbar.
 */
export function distributePoints(
  ids: readonly string[],
  baseValue: (id: string) => number,
  maxValue: (id: string) => number,
  points: number,
): Record<string, number> {
  const delta: Record<string, number> = {}
  let remaining = points
  // Sicherheitsgrenze: nie endlos, selbst bei widersprüchlichen Limits.
  let guard = points * Math.max(1, ids.length) + ids.length + 1
  while (remaining > 0 && guard-- > 0) {
    const candidates = ids.filter(
      (id) => (delta[id] ?? 0) + 1 <= maxValue(id) - baseValue(id),
    )
    const id = pickRandom(candidates)
    if (id === undefined) break
    delta[id] = (delta[id] ?? 0) + 1
    remaining--
  }
  return delta
}

/**
 * Wählt zufällig eine Teilmenge von Stärken, deren Kosten exakt `target`
 * ergeben (die Schrittvalidierung verlangt vollständige Punktausgabe).
 */
export function pickExactCostSubset(
  items: readonly { id: string; kosten: number }[],
  target: number,
): string[] {
  const candidates = items.filter((item) => item.kosten > 0 && item.kosten <= target)

  for (let attempt = 0; attempt < 40; attempt++) {
    const chosen: string[] = []
    let remaining = target
    for (const item of shuffled(candidates)) {
      if (item.kosten <= remaining && Math.random() < 0.85) {
        chosen.push(item.id)
        remaining -= item.kosten
      }
      if (remaining === 0) break
    }
    if (remaining === 0) return chosen
  }

  // Deterministischer Fallback, falls Zufall kein exaktes Maß gefunden hat
  // (z. B. weil die Bibliothek keine 1-Punkt-Stärke anbietet).
  const sorted = [...candidates].sort((a, b) => a.kosten - b.kosten)
  const exact: string[] = []
  let rest = target
  for (const item of sorted) {
    if (item.kosten <= rest) {
      exact.push(item.id)
      rest -= item.kosten
    }
    if (rest === 0) break
  }
  return rest === 0 ? exact : []
}
