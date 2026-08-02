import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import {
  socialClasses,
  choiceKey,
  choiceLabel,
  GENERIC_SKILL_NAMES,
  type Origin,
  type Choice,
} from '@mcc/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface AbstammungStepProps {
  onValid: (valid: boolean) => void
}

type Phase = 'class' | 'origin' | 'choices'

function autoRowSelections(origin: Origin): Record<number, string> {
  const result: Record<number, string> = {}
  origin.rows.forEach((row, idx) => {
    if (row.length === 1) result[idx] = choiceKey(row[0])
  })
  return result
}

function genericItemOf(choice: Choice | undefined): { name: string; value: number } | null {
  if (!choice) return null
  const item = choice.find((c) => c.type === 'skill' && (GENERIC_SKILL_NAMES as readonly string[]).includes(c.name))
  return item ? { name: item.name, value: item.value } : null
}

export default function AbstammungStep({ onValid }: AbstammungStepProps) {
  const { stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const initializedRef = useRef(false)

  const [classId, setClassId] = useState<string | null>(null)
  const [originId, setOriginId] = useState<string | null>(null)
  const [rowSelections, setRowSelections] = useState<Record<number, string>>({})
  const [specializations, setSpecializations] = useState<Record<number, string>>({})
  const [combatSkills, setCombatSkills] = useState<{ id: string; name: string }[]>([])
  const [magicSkills, setMagicSkills] = useState<{ id: string; name: string }[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/library/skills`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string; config: string | null }>) => {
        const parsed = data.map((s) => {
          const cfg = s.config ? JSON.parse(s.config) : {}
          return { id: s.id, name: s.name, kategorie: cfg.kategorie as string }
        })
        setCombatSkills(parsed.filter((s) => s.kategorie === 'kampf').map((s) => ({ id: s.id, name: s.name })))
        setMagicSkills(parsed.filter((s) => s.kategorie === 'magie').map((s) => ({ id: s.id, name: s.name })))
        setSkillsLoading(false)
      })
      .catch(() => {
        setSkillsLoading(false)
        reportApiError('Bibliotheksdaten konnten nicht geladen werden')
      })
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const d = stepData as Record<string, unknown> | null
    if (d) {
      const cId = (d.classId as string) ?? null
      const oId = (d.originId as string) ?? null
      const loaded = (d.rowSelections as Record<number, string>) ?? {}
      const loadedSpec = (d.specializations as Record<number, string>) ?? {}
      const origin = socialClasses.find((c) => c.id === cId)?.origins.find((o) => o.id === oId) ?? null
      setClassId(cId)
      setOriginId(oId)
      setRowSelections(origin ? { ...autoRowSelections(origin), ...loaded } : loaded)
      setSpecializations(loadedSpec)
    }
  }, [stepData])

  useEffect(() => () => { initializedRef.current = false }, [])

  const currentClass = socialClasses.find((c) => c.id === classId) ?? null
  const currentOrigin = currentClass?.origins.find((o) => o.id === originId) ?? null

  const phase: Phase = !classId ? 'class' : !originId ? 'origin' : 'choices'

  const allRowsSelected = currentOrigin
    ? currentOrigin.rows.every((row, idx) => row.length === 0 || row.length === 1 || rowSelections[idx] !== undefined)
    : false

  const allSpecialized = currentOrigin
    ? currentOrigin.rows.every((row, idx) => {
        const selected = rowSelections[idx]
        if (selected === undefined) return true
        const choice = row.find((c) => choiceKey(c) === selected)
        return genericItemOf(choice) === null || specializations[idx] !== undefined
      })
    : false

  const magicUnique = (() => {
    const chosen = new Set<string>()
    for (const sid of Object.values(specializations)) {
      if (!magicSkills.some((m) => m.id === sid)) continue
      if (chosen.has(sid)) return false
      chosen.add(sid)
    }
    return true
  })()

  useEffect(() => {
    onValid(phase === 'choices' && allRowsSelected && allSpecialized && magicUnique)
  }, [phase, allRowsSelected, allSpecialized, magicUnique, onValid])

  const persist = (cId: string | null, oId: string | null, rs: Record<number, string>, spec: Record<number, string>) => {
    const cl = socialClasses.find((c) => c.id === cId) ?? null
    const or = cl?.origins.find((o) => o.id === oId) ?? null
    updateStepDelta('abstammung', {
      classId: cId,
      className: cl?.name ?? null,
      originId: oId,
      originName: or?.name ?? null,
      rowSelections: rs,
      specializations: spec,
    })
  }

  const handleClassSelect = (id: string) => {
    setClassId(id)
    setOriginId(null)
    setRowSelections({})
    setSpecializations({})
    persist(id, null, {}, {})
  }

  const handleOriginSelect = (id: string) => {
    const or = currentClass?.origins.find((o) => o.id === id) ?? null
    const auto = or ? autoRowSelections(or) : {}
    setOriginId(id)
    setRowSelections(auto)
    setSpecializations({})
    persist(classId, id, auto, {})
  }

  const handleRowChoice = (rowIdx: number, key: string) => {
    const choice = currentOrigin?.rows[rowIdx]?.find((c) => choiceKey(c) === key)
    const spec = { ...specializations }
    if (genericItemOf(choice) === null) delete spec[rowIdx]
    const next = { ...rowSelections, [rowIdx]: key }
    setRowSelections(next)
    setSpecializations(spec)
    persist(classId, originId, next, spec)
  }

  const handleRowSpecialization = (rowIdx: number, skillId: string) => {
    const spec = { ...specializations, [rowIdx]: skillId }
    setSpecializations(spec)
    persist(classId, originId, rowSelections, spec)
  }

  const rollD6 = () => Math.floor(Math.random() * 6) + 1

  const handleRollClass = () => {
    const idx = rollD6() - 1
    handleClassSelect(socialClasses[idx].id)
  }

  const handleRollOrigin = () => {
    if (!currentClass) return
    const idx = rollD6() - 1
    handleOriginSelect(currentClass.origins[idx].id)
  }

  return (
    <div style={styles.container}>
      {phase === 'class' && (
        <>
          <div style={styles.phaseHeader}>
            <h3 style={styles.phaseTitle}>Soziale Herkunft</h3>
            <button style={styles.rollButton} onClick={handleRollClass}>🎲 Würfeln</button>
          </div>
          <div style={styles.grid3}>
            {socialClasses.map((sc, i) => (
              <button
                key={sc.id}
                style={{ ...styles.classCard, ...(classId === sc.id ? styles.classCardSelected : {}) }}
                onClick={() => handleClassSelect(sc.id)}
              >
                <span style={styles.originNum}>{i + 1}</span>
                <span style={styles.className}>{sc.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'origin' && currentClass && (
        <>
          <div style={styles.phaseHeader}>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbActive}>{currentClass.name}</span>
              <span style={styles.breadcrumbSep}>›</span>
              <span style={styles.breadcrumbMuted}>Herkunft wählen</span>
            </div>
            <button style={styles.rollButton} onClick={handleRollOrigin}>🎲 Würfeln</button>
          </div>
          <div style={styles.grid3}>
            {currentClass.origins.map((o, i) => (
              <button
                key={o.id}
                style={{ ...styles.classCard, ...(originId === o.id ? styles.classCardSelected : {}) }}
                onClick={() => handleOriginSelect(o.id)}
              >
                <span style={styles.originNum}>{i + 1}</span>
                <span style={styles.className}>{o.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'choices' && currentOrigin && (
        <>
          <div style={styles.phaseHeader}>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbActive}>{currentClass?.name}</span>
              <span style={styles.breadcrumbSep}>›</span>
              <span style={styles.breadcrumbActive}>{currentOrigin.name}</span>
            </div>
          </div>
          <div style={styles.choicesContainer}>
            {currentOrigin.rows.map((row, rowIdx) => {
              if (row.length === 0) return null
              const selected = rowSelections[rowIdx]
              const isAuto = row.length === 1
              const selectedChoice = selected ? row.find((c) => choiceKey(c) === selected) : undefined
              const genericItem = genericItemOf(selectedChoice)
              const isKampf = genericItem?.name === 'Kampf'
              const options = isKampf ? combatSkills : magicSkills
              return (
                <div key={rowIdx} style={styles.rowBlock}>
                  <div style={styles.rowOptions}>
                    {row.map((choice) => {
                      const key = choiceKey(choice)
                      const isSelected = selected === key
                      if (isAuto) {
                        return (
                          <span key={key} style={{ ...styles.choiceChip, ...styles.choiceChipAuto }}>
                            {choiceLabel(choice)}
                          </span>
                        )
                      }
                      return (
                        <button
                          key={key}
                          style={{ ...styles.choiceChip, ...(isSelected ? styles.choiceChipSelected : {}) }}
                          onClick={() => handleRowChoice(rowIdx, key)}
                        >
                          {choiceLabel(choice)}
                        </button>
                      )
                    })}
                  </div>
                  {genericItem && (
                    <div style={styles.specializationWrap}>
                      <span style={styles.specializationLabel}>
                        {isKampf
                          ? `Welches Kampftalent erhält +${genericItem.value}?`
                          : `Welche Magieschule erhält +${genericItem.value}?`}
                      </span>
                      {skillsLoading ? (
                        <span style={styles.specializationHint}>Lade Talente...</span>
                      ) : options.length === 0 ? (
                        <span style={styles.specializationHint}>Keine Talente verfügbar</span>
                      ) : (
                        <select
                          value={specializations[rowIdx] ?? ''}
                          onChange={(e) => handleRowSpecialization(rowIdx, e.target.value)}
                          style={styles.specializationSelect}
                        >
                          <option value="">-- Bitte wählen --</option>
                          {options.map((opt) => {
                            const takenElsewhere = !isKampf && Object.entries(specializations).some(
                              ([rid, sid]) => Number(rid) !== rowIdx && sid === opt.id,
                            )
                            return (
                              <option key={opt.id} value={opt.id} disabled={takenElsewhere}>
                                {opt.name}
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 300,
  },
  phaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
  },
  breadcrumbActive: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  breadcrumbSep: {
    color: 'var(--text-muted)',
  },
  breadcrumbMuted: {
    color: 'var(--text-secondary)',
  },
  rollButton: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  classCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  classCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  className: {
    fontSize: 15,
    fontWeight: 600,
  },
  originNum: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  choicesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  rowBlock: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 18px',
  },
  rowOptions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  specializationWrap: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  specializationLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  specializationHint: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  specializationSelect: {
    padding: '8px 12px',
    fontSize: 14,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  choiceChip: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  choiceChipSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 8px var(--shadow-accent)',
  },
  choiceChipAuto: {
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--accent)',
    color: 'var(--text-primary)',
    cursor: 'default',
    fontWeight: 600,
  },
}
