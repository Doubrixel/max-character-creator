/**
 * INT-000020 (SF-000012): Sichtbarkeits-/Schwellenlogik für den Schritt
 * „9. Meisterschaften" des Erstellungs-Wizards.
 *
 * Für jede Talent-, Kampf- oder Magie-Fertigkeit mit ausreichend hohem Wert
 * muss genau eine Pflicht-Meisterschaft (Schwelle 1) wählbar sein. Ob eine
 * Meisterschaft für eine Fertigkeit angeboten wird, entscheidet:
 *  1. Die Meisterschaftsschwelle muss 1 sein (Pflicht-Meisterschaft).
 *  2. Passen Meisterschaft und Fertigkeit über Kategorie-Name bzw. die
 *     Kampf-/Magie-Gruppenlogik zusammen, ist die Meisterschaft wählbar.
 *  3. Eine skill-basierte Voraussetzung (`skill >= wert` bzw. `magie >= wert`)
 *     begrenzt die Meisterschaft auf die genannte Fertigkeit und blockiert
 *     sie, solange der Fertigkeitswert den Mindestwert nicht erreicht.
 *  4. Ohne kategorie_name und ohne jede Voraussetzung ist die Meisterschaft
 *     für jede qualifizierende Fertigkeit wählbar (formularerstellte
 *     Meisterschaften sind so auffindbar); mit kategorie_name bleibt es beim
 *     bisherigen Namens-/Gruppenmatching.
 *  5. Andere Voraussetzungstypen (z. B. Meisterschaft, Schwerpunkt) können
 *     hier nicht verifiziert werden und blockieren die Auswahl daher.
 */

export interface MasteryChoiceInfo {
  id: string
  name: string
  schwelle: string | null
  kategorieName: string | null
  voraussetzungTyp: string | null
  voraussetzungId: string | null
  voraussetzungWert: string | null
}

export interface MasterySkillInfo {
  id: string
  name: string
  category: string
}

/** Fertigkeitswert, ab dem im Erstellungs-Wizard eine Pflicht-Meisterschaft fällig wird. */
export const MEISTERSCHAFTS_SKILL_SCHWELLE = 6

const KAMPF_AUSNAHMEN = ['Schusswaffen', 'Wurfwaffen']
const ALLGEMEINE_NAHKAMPF = 'Allgemeine Nahkampfmeisterschaften'
const ALLGEMEINE_MAGIE = 'Allgemeine Magieschulen-Meisterschaften'

/**
 * Parst den Mindestwert einer Voraussetzung. Fehlt oder ist der Wert ungültig,
 * wird keine zusätzliche Beschränkung abgeleitet (Rückgabe null).
 */
export function parseVoraussetzungMinWert(wert: string | null | undefined): number | null {
  if (wert === null || wert === undefined) return null
  const text = String(wert).trim()
  if (text === '') return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

/** True, wenn die Fertigkeitskategorie im Meisterschafts-Schritt berücksichtigt wird. */
export function istMeisterschaftsRelevanteKategorie(category: string): boolean {
  return category === 'fertigkeit' || category === 'kampf' || category === 'magie'
}

/**
 * Entspricht die Meisterschaft der Fertigkeit, sodass sie im Schritt
 * „9. Meisterschaften" für diese Fertigkeit angeboten werden darf?
 * `skillValue` ist der aktuelle (Roh-)Wert der Fertigkeit.
 */
export function masteryMatchesSkill(
  mastery: MasteryChoiceInfo,
  skill: MasterySkillInfo,
  skillValue: number,
): boolean {
  // Nur Pflicht-Meisterschaften (Schwelle 1) sind hier wählbar.
  if (mastery.schwelle !== '1') return false

  // Zusammenpassen über Kategorie-Name bzw. Kampf-/Magie-Gruppenlogik.
  if (mastery.kategorieName === skill.name) return true
  if (
    skill.category === 'kampf' &&
    !KAMPF_AUSNAHMEN.includes(skill.name) &&
    mastery.kategorieName === ALLGEMEINE_NAHKAMPF
  ) {
    return true
  }
  if (skill.category === 'magie' && mastery.kategorieName === ALLGEMEINE_MAGIE) {
    return true
  }

  // Skill-basierte Voraussetzung: genau die genannte Fertigkeit, sofern der
  // Mindestwert erreicht ist (z. B. „Akrobatik >= 6" bei Akrobatik = 6).
  if (
    (mastery.voraussetzungTyp === 'skill >= wert' || mastery.voraussetzungTyp === 'magie >= wert') &&
    mastery.voraussetzungId
  ) {
    const trifftFertigkeit =
      mastery.voraussetzungId === skill.id || mastery.voraussetzungId === skill.name
    if (!trifftFertigkeit) return false
    const minWert = parseVoraussetzungMinWert(mastery.voraussetzungWert)
    if (minWert !== null && skillValue < minWert) return false
    return true
  }

  // Ohne jede Voraussetzung und ohne kategorie_name (formularerstellte
  // Meisterschaft): für jede qualifizierende Fertigkeit wählbar.
  if (
    (!mastery.kategorieName) &&
    (!mastery.voraussetzungTyp || mastery.voraussetzungTyp === 'keine')
  ) {
    return true
  }

  // Andere Voraussetzungstypen können in diesem Schritt nicht verifiziert
  // werden und blockieren die Auswahl daher.
  return false
}
