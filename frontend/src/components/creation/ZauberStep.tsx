import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import type { PickedItem, PflichtMeisterschaft, PickedSpell } from '@mcc/shared'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  config: string | unknown | null
}

interface SkillRef {
  id: string
  name: string
  category: string
}

interface MasteryInfo {
  id: string
  name: string
  description: string
  effekt: string
  kategorieName: string | null
  schwelle: string | null
}

interface QualifyingSkill {
  id: string
  name: string
  category: string
  value: number
  pool: MasteryInfo[]
}

interface SpellInfo {
  id: string
  name: string
  description: string | null
  schulen: { id: string; name: string; wert: number }[]
  artefakt: string
}

interface ZauberStepProps {
  onValid: (valid: boolean) => void
}

function parseConfig(config: string | unknown | null): Record<string, unknown> {
  if (typeof config === 'string') {
    try { return JSON.parse(config) } catch { return {} }
  }
  return (config ?? {}) as Record<string, unknown>
}

function gradToSchulenwert(grad: number): number {
  if (grad === 0) return 1
  return grad * 3
}

function getAvailableGrades(skillValue: number): number[] {
  const grades: number[] = []
  for (let grade = 0; grade <= 5; grade++) {
    if (skillValue >= gradToSchulenwert(grade)) {
      grades.push(grade)
    }
  }
  return grades
}

export default function ZauberStep({ onValid }: ZauberStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [masteries, setMasteries] = useState<MasteryInfo[]>([])
  const [skills, setSkills] = useState<SkillRef[]>([])
  const [spells, setSpells] = useState<SpellInfo[]>([])
  const [pflicht, setPflicht] = useState<Record<string, PickedItem>>({})
  const [pickedSpells, setPickedSpells] = useState<PickedSpell[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/masteries`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/spells`).then((r) => r.json()),
    ])
      .then(([masteriesData, skillsData, spellsData]: [LibraryItem[], LibraryItem[], LibraryItem[]]) => {
        setSkills(skillsData.map((s) => ({
          id: s.id,
          name: s.name,
          category: typeof parseConfig(s.config).kategorie === 'string' ? parseConfig(s.config).kategorie as string : '',
        })))

        setMasteries(masteriesData.map((m) => {
          const cfg = parseConfig(m.config)
          return {
            id: m.id,
            name: m.name,
            description: m.description ?? '',
            effekt: typeof cfg.effekt === 'string' ? cfg.effekt : (m.description ?? ''),
            kategorieName: typeof cfg.kategorie_name === 'string' ? cfg.kategorie_name : null,
            schwelle: typeof cfg.schwelle === 'string' ? cfg.schwelle : null,
          }
        }))

        setSpells(spellsData.map((s) => {
          const cfg = parseConfig(s.config)
          const schulenRaw = cfg.schulen || '[]'
          const schulen = typeof schulenRaw === 'string' ? JSON.parse(schulenRaw) : schulenRaw
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            schulen: schulen as { id: string; name: string; wert: number }[],
            artefakt: typeof cfg.artefakt === 'string' ? cfg.artefakt : 'Spruch',
          }
        }))
      })
      .catch(() => reportApiError('Meisterschaften konnten nicht geladen werden'))
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    if (dataLoading) return
    initializedRef.current = true

    const saved = stepData as { pflicht?: PflichtMeisterschaft[]; spells?: PickedSpell[] } | null
    const restoredPflicht: Record<string, PickedItem> = {}
    for (const p of saved?.pflicht ?? []) {
      restoredPflicht[p.skillId] = p.meisterschaft
    }
    setPflicht(restoredPflicht)
    setPickedSpells(saved?.spells ?? [])
  }, [stepData, dataLoading])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const masteryMatchesSkill = (m: MasteryInfo, skill: SkillRef): boolean => {
    if (m.schwelle !== '1') return false
    if (m.kategorieName === skill.name) return true
    if (skill.category === 'kampf' && !['Schusswaffen', 'Wurfwaffen'].includes(skill.name) && m.kategorieName === 'Allgemeine Nahkampfmeisterschaften') return true
    if (skill.category === 'magie' && m.kategorieName === 'Allgemeine Magieschulen-Meisterschaften') return true
    return false
  }

  const qualifyingSkills: QualifyingSkill[] = skills
    .filter((s) => ['fertigkeit', 'kampf', 'magie'].includes(s.category))
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      value: baseSkills[s.id] ?? 0,
      pool: masteries.filter((m) => masteryMatchesSkill(m, s)),
    }))
    .filter((s) => s.value >= 6 && s.pool.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const magicSchoolsWithValue = skills
    .filter((s) => s.category === 'magie' && (baseSkills[s.id] ?? 0) >= 1)
    .map((s) => ({
      id: s.id,
      name: s.name,
      value: baseSkills[s.id] ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const missingPflichtCount = qualifyingSkills.filter((s) => !pflicht[s.id]).length
  const allPflichtCovered = missingPflichtCount === 0

  const allSpellsCovered = magicSchoolsWithValue.every(school => {
    const grades = getAvailableGrades(school.value)
    return grades.every(grade =>
      pickedSpells.some(s => s.schoolId === school.id && s.grade === grade)
    )
  })

  useEffect(() => {
    onValid(allPflichtCovered && allSpellsCovered)
  }, [onValid, allPflichtCovered, allSpellsCovered])

  const setPflichtForSkill = (skill: QualifyingSkill, m: PickedItem | null) => {
    const next = { ...pflicht }
    if (m) next[skill.id] = m
    else delete next[skill.id]
    setPflicht(next)
    updateStepDelta('Zauber', {
      pflicht: Object.entries(next).map(([skillId, meisterschaft]) => ({ skillId, meisterschaft })),
      spells: pickedSpells,
    })
  }

  const setSpellForGrade = (schoolId: string, schoolName: string, grade: number, spell: SpellInfo | null) => {
    let next: PickedSpell[]
    if (spell) {
      const existing = pickedSpells.findIndex(s => s.schoolId === schoolId && s.grade === grade)
      if (existing >= 0) {
        next = [...pickedSpells]
        next[existing] = {
          spellId: spell.id,
          spellName: spell.name,
          schoolId,
          schoolName,
          grade,
        }
      } else {
        next = [...pickedSpells, {
          spellId: spell.id,
          spellName: spell.name,
          schoolId,
          schoolName,
          grade,
        }]
      }
    } else {
      next = pickedSpells.filter(s => !(s.schoolId === schoolId && s.grade === grade))
    }
    setPickedSpells(next)
    updateStepDelta('Zauber', {
      pflicht: Object.entries(pflicht).map(([skillId, meisterschaft]) => ({ skillId, meisterschaft })),
      spells: next,
    })
  }

  const getAvailableSpells = (schoolId: string, grade: number): SpellInfo[] => {
    return spells.filter(spell => {
      const hasSchool = spell.schulen.some(s => s.id === schoolId)
      const correctLevel = spell.schulen.some(s => s.id === schoolId && s.wert === gradToSchulenwert(grade))
      
      // Spell ist für einen ANDEREN Grad dieser Schule gewählt
      const pickedForOtherGrade = pickedSpells.some(s => 
        s.schoolId === schoolId && 
        s.spellId === spell.id && 
        s.grade !== grade
      )
      
      return hasSchool && correctLevel && !pickedForOtherGrade
    })
  }

  if (dataLoading) {
    return <div style={styles.loading}>Lade Meisterschaften und Zauber...</div>
  }

  const hasQualifyingSkills = qualifyingSkills.length > 0
  const hasMagicSchools = magicSchoolsWithValue.length > 0

  if (!hasQualifyingSkills && !hasMagicSchools) {
    return (
      <div style={styles.container}>
        <p style={styles.hint}>
          Keine Talent-, Kampf- oder Magie-Fertigkeit hat einen Wert von 6 oder mehr.
          Es sind keine Pflicht-Meisterschaften oder Zauber nötig.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {hasQualifyingSkills && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Pflicht-Meisterschaften</h3>
          <p style={styles.hint}>
            Für jede Talent-, Kampf- und Magie-Fertigkeit mit einem Wert von 6 oder mehr
            musst du genau eine Meisterschaft mit Schwelle 1 wählen.
          </p>
          {qualifyingSkills.map((skill) => {
            const selected = pflicht[skill.id]
            return (
              <div key={skill.id} style={styles.skillRow}>
                <div style={styles.skillInfo}>
                  <span style={styles.skillName}>{skill.name}</span>
                  <span style={styles.skillValue}>Wert {skill.value}</span>
                </div>
                <select
                  style={styles.select}
                  value={selected?.id ?? ''}
                  onChange={(e) => {
                    const mastery = skill.pool.find((m) => m.id === e.target.value) ?? null
                    setPflichtForSkill(skill, mastery ? { id: mastery.id, name: mastery.name } : null)
                  }}
                >
                  <option value="">— Meisterschaft wählen —</option>
                  {skill.pool.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {selected && skill.pool.find((m) => m.id === selected.id)?.effekt && (
                  <span style={styles.masteryEffect}>
                    {skill.pool.find((m) => m.id === selected.id)?.effekt}
                  </span>
                )}
              </div>
            )
          })}
          {missingPflichtCount > 0 && (
            <p style={styles.missingHint}>
              Noch {missingPflichtCount} Fertigkeit{missingPflichtCount > 1 ? 'en' : ''} ohne Meisterschaft.
            </p>
          )}
        </div>
      )}

      {hasMagicSchools && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Zauber</h3>
          <p style={styles.hint}>
            Für jede Magieschule musst du für jeden verfügbaren Grad genau einen Zauber wählen.
          </p>
          {magicSchoolsWithValue.map((school) => {
            const grades = getAvailableGrades(school.value)
            return (
              <div key={school.id} style={styles.schoolSection}>
                <div style={styles.schoolHeader}>
                  <span style={styles.schoolName}>{school.name}</span>
                  <span style={styles.skillValue}>Wert {school.value}</span>
                </div>
                {grades.map((grade) => {
                  const picked = pickedSpells.find(s => s.schoolId === school.id && s.grade === grade)
                  const available = getAvailableSpells(school.id, grade)
                  return (
                    <div key={grade} style={styles.gradeRow}>
                      <span style={styles.gradeLabel}>Grad {grade}:</span>
                      <div style={styles.gradeContent}>
                        <select
                          style={styles.select}
                          value={picked?.spellId ?? ''}
                          onChange={(e) => {
                            const spell = available.find(s => s.id === e.target.value) ?? null
                            setSpellForGrade(school.id, school.name, grade, spell)
                          }}
                        >
                          <option value="">— Zauber wählen —</option>
                          {available.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {picked && (
                          <div style={styles.spellDescription}>
                            {spells.find(s => s.id === picked.spellId)?.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {!allSpellsCovered && (
            <p style={styles.missingHint}>
              Noch nicht alle Grade belegt.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    minHeight: 300,
  },
  hint: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  loading: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 24,
  },
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  schoolSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '2px solid var(--border)',
  },
  schoolHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  gradeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 8,
  },
  gradeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    minWidth: 60,
  },
  gradeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  spellDescription: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
  skillRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 12,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '2px solid var(--border)',
  },
  skillInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  skillName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  skillValue: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'rgba(233, 69, 96, 0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  select: {
    padding: '8px 10px',
    fontSize: 14,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    flex: 1,
  },
  masteryEffect: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  missingHint: {
    fontSize: 13,
    color: 'var(--accent)',
    margin: 0,
    fontWeight: 600,
  },
}
