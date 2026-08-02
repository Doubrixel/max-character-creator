import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { socialClasses, choiceKey, choiceLabel } from '@mcc/shared'

interface AbstammungStepProps {
  onValid: (valid: boolean) => void
}

type Phase = 'class' | 'origin' | 'choices'

export default function AbstammungStep({ onValid }: AbstammungStepProps) {
  const { stepDeltas, currentStep, updateStepDelta } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const initializedRef = useRef(false)

  const [classId, setClassId] = useState<string | null>(null)
  const [originId, setOriginId] = useState<string | null>(null)
  const [rowSelections, setRowSelections] = useState<Record<number, string>>({})

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const d = stepData as Record<string, unknown> | null
    if (d) {
      setClassId((d.classId as string) ?? null)
      setOriginId((d.originId as string) ?? null)
      setRowSelections((d.rowSelections as Record<number, string>) ?? {})
    }
  }, [stepData])

  useEffect(() => () => { initializedRef.current = false }, [])

  const currentClass = socialClasses.find((c) => c.id === classId) ?? null
  const currentOrigin = currentClass?.origins.find((o) => o.id === originId) ?? null

  const phase: Phase = !classId ? 'class' : !originId ? 'origin' : 'choices'

  const allRowsSelected = currentOrigin
    ? currentOrigin.rows.every((row, idx) => row.length === 0 || rowSelections[idx] !== undefined)
    : false

  useEffect(() => {
    onValid(phase === 'choices' && allRowsSelected)
  }, [phase, allRowsSelected, onValid])

  const persist = (cId: string | null, oId: string | null, rs: Record<number, string>) => {
    const cl = socialClasses.find((c) => c.id === cId) ?? null
    const or = cl?.origins.find((o) => o.id === oId) ?? null
    updateStepDelta(3, {
      classId: cId,
      className: cl?.name ?? null,
      originId: oId,
      originName: or?.name ?? null,
      rowSelections: rs,
    })
  }

  const handleClassSelect = (id: string) => {
    setClassId(id)
    setOriginId(null)
    setRowSelections({})
    persist(id, null, {})
  }

  const handleOriginSelect = (id: string) => {
    setOriginId(id)
    setRowSelections({})
    persist(classId, id, {})
  }

  const handleRowChoice = (rowIdx: number, key: string) => {
    const next = { ...rowSelections, [rowIdx]: key }
    setRowSelections(next)
    persist(classId, originId, next)
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
            {socialClasses.map((sc) => (
              <button
                key={sc.id}
                style={{ ...styles.classCard, ...(classId === sc.id ? styles.classCardSelected : {}) }}
                onClick={() => handleClassSelect(sc.id)}
              >
                <span style={styles.className}>{sc.name}</span>
                <span style={styles.classCount}>1–6</span>
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
              return (
                <div key={rowIdx} style={styles.rowBlock}>
                  <div style={styles.rowLabel}>Zeile {rowIdx + 1}</div>
                  <div style={styles.rowOptions}>
                    {row.map((choice) => {
                      const key = choiceKey(choice)
                      const isSelected = selected === key
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
  classCount: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 4,
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
  rowLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rowOptions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
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
}
