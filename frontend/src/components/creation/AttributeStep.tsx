import { useState, useEffect, useMemo, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const ATTRIBUTES = ['MU', 'KL', 'IN', 'CH', 'FF', 'GE', 'KO', 'KK', 'SR', 'LE'] as const
type AttributeKey = (typeof ATTRIBUTES)[number]

const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  MU: 'Mut',
  KL: 'Klugheit',
  IN: 'Intuition',
  CH: 'Charisma',
  FF: 'Fingerfertigkeit',
  GE: 'Geschicklichkeit',
  KO: 'Konstitution',
  KK: 'Körperkraft',
  SR: 'Seelenstärke',
  LE: 'Lebenskraft',
}

function roll4d6DropLowest(): { dice: number[]; sum: number } {
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  const sorted = [...dice].sort((a, b) => a - b)
  const sum = sorted[1] + sorted[2] + sorted[3]
  return { dice, sum }
}

interface AttributeStepProps {
  onValid: (valid: boolean) => void
}

export default function AttributeStep({ onValid }: AttributeStepProps) {
  const { stepDeltas, currentStep, saveStep } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null

  const [rolls, setRolls] = useState<number[]>([])
  const [assignments, setAssignments] = useState<Partial<Record<AttributeKey, number>>>({})
  const [manualInputs, setManualInputs] = useState<Record<string, string>>(
    Object.fromEntries(ATTRIBUTES.map((a) => [a, '']))
  )
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null)
  const [rollsDetail, setRollsDetail] = useState<{ dice: number[]; sum: number }[]>([])
  const prevStepDataRef = useRef<Record<string, unknown> | null | undefined>(undefined)

  const savedAttributes = (stepData as { attribute?: Record<string, number> } | null)?.attribute ?? {}
  const savedRolls = (stepData as { rolls?: number[] } | null)?.rolls ?? []

  function stepDataHasChanged(prev: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null): boolean {
    if (prev === undefined) return true
    if (prev === null && next === null) return false
    if (prev === null || next === null) return true
    const prevKeys = Object.keys(prev)
    const nextKeys = Object.keys(next)
    if (prevKeys.length !== nextKeys.length) return true
    for (const key of nextKeys) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) return true
    }
    return false
  }

  const simplePool = useMemo(() => {
    const result: { value: number; originalIndex: number }[] = []
    const usedIndices = new Set<number>()

    for (const attr of ATTRIBUTES) {
      const assignedVal = assignments[attr]
      if (assignedVal !== undefined) {
        for (let i = 0; i < rolls.length; i++) {
          if (rolls[i] === assignedVal && !usedIndices.has(i)) {
            usedIndices.add(i)
            break
          }
        }
      }
    }

    for (let i = 0; i < rolls.length; i++) {
      if (!usedIndices.has(i)) {
        result.push({ value: rolls[i], originalIndex: i })
      }
    }

    return result
  }, [rolls, assignments])

  const allAssigned = ATTRIBUTES.every((a) => assignments[a] !== undefined)

  useEffect(() => {
    onValid(allAssigned)
  }, [allAssigned, onValid])

  useEffect(() => {
    const hasChanged = stepDataHasChanged(prevStepDataRef.current, stepData)
    if (!hasChanged) return
    prevStepDataRef.current = stepData

    if (savedRolls.length === 10) {
      setRolls(savedRolls)
    } else {
      setRolls([])
    }
    if (Object.keys(savedAttributes).length > 0) {
      setAssignments(savedAttributes as Partial<Record<AttributeKey, number>>)
      setManualInputs(
        Object.fromEntries(ATTRIBUTES.map((a) => [a, savedAttributes[a] !== undefined ? String(savedAttributes[a]) : '']))
      )
    } else {
      setAssignments({})
      setManualInputs(Object.fromEntries(ATTRIBUTES.map((a) => [a, ''])))
    }
  }, [stepData])

  useEffect(() => {
    if (Object.keys(assignments).length > 0) {
      saveStep(6, {
        attribute: assignments,
        rolls,
      })
    }
  }, [assignments, rolls])

  const handleAutoRoll = () => {
    const newRolls: number[] = []
    const newDetail: { dice: number[]; sum: number }[] = []
    for (let i = 0; i < 10; i++) {
      const result = roll4d6DropLowest()
      newRolls.push(result.sum)
      newDetail.push(result)
    }
    setRolls(newRolls)
    setRollsDetail(newDetail)
    setAssignments({})
    setManualInputs(Object.fromEntries(ATTRIBUTES.map((a) => [a, ''])))
    setSelectedPoolIndex(null)
  }

  const handlePoolClick = (index: number) => {
    if (selectedPoolIndex === index) {
      setSelectedPoolIndex(null)
    } else {
      setSelectedPoolIndex(index)
    }
  }

  const handleAttributeClick = (attr: AttributeKey) => {
    if (assignments[attr] !== undefined) {
      const next = { ...assignments }
      delete next[attr]
      setAssignments(next)
      setManualInputs((prev) => ({ ...prev, [attr]: '' }))
      setSelectedPoolIndex(null)
      return
    }

    if (selectedPoolIndex !== null) {
      const poolEntry = simplePool.find((p) => p.originalIndex === selectedPoolIndex)
      if (poolEntry) {
        const next = { ...assignments, [attr]: poolEntry.value }
        setAssignments(next)
        setManualInputs((prev) => ({ ...prev, [attr]: String(poolEntry.value) }))
        setSelectedPoolIndex(null)
      }
    }
  }

  const handleManualInput = (attr: AttributeKey, value: string) => {
    const num = parseInt(value, 10)
    if (value === '') {
      setManualInputs((prev) => ({ ...prev, [attr]: '' }))
      const next = { ...assignments }
      delete next[attr]
      setAssignments(next)
      return
    }
    if (isNaN(num)) return
    const clamped = Math.max(3, Math.min(18, num))
    setManualInputs((prev) => ({ ...prev, [attr]: String(clamped) }))
    setAssignments((prev) => ({ ...prev, [attr]: clamped }))
  }

  const validateManualInput = (value: string): string => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return ''
    if (num < 3) return '3'
    if (num > 18) return '18'
    return String(num)
  }

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Attributswerte erwürfeln (4d6, höchste 3)</h3>
        <button onClick={handleAutoRoll} style={styles.autoRollButton}>
          Auto-Würfel
        </button>
      </div>

      {rolls.length === 10 && (
        <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Würfel-Pool</h3>
            <p style={styles.poolHint}>
              {selectedPoolIndex !== null
                ? 'Klicke auf ein Attribut, um den Wert zuzuordnen'
                : 'Klicke auf einen Wert, dann auf ein Attribut'}
            </p>
            <div style={styles.poolGrid}>
              {simplePool.map((entry) => (
                <button
                  key={entry.originalIndex}
                  onClick={() => handlePoolClick(entry.originalIndex)}
                  style={{
                    ...styles.poolValue,
                    ...(selectedPoolIndex === entry.originalIndex ? styles.poolValueSelected : {}),
                  }}
                >
                  {entry.value}
                </button>
              ))}
            </div>
            {rollsDetail.length === 10 && (
              <div style={styles.rollsDetail}>
                {rollsDetail.map((detail, i) => (
                  <div key={i} style={styles.rollDetailItem}>
                    <span style={styles.rollDice}>
                      {detail.dice.map((d, j) => (
                        <span
                          key={j}
                          style={{
                            ...styles.rollDie,
                            ...(j === 0 ? styles.rollDieDropped : {}),
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </span>
                    <span style={styles.rollSum}>= {detail.sum}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Attribute zuordnen</h3>
            <div style={styles.attributesGrid}>
              {ATTRIBUTES.map((attr) => {
                const assigned = assignments[attr]
                const isAssigned = assigned !== undefined
                const isSelected = selectedPoolIndex !== null && !isAssigned
                return (
                  <div key={attr} style={styles.attributeSlot}>
                    <div style={styles.attributeHeader}>
                      <span style={styles.attributeKey}>{attr}</span>
                      <span style={styles.attributeName}>{ATTRIBUTE_NAMES[attr]}</span>
                    </div>
                    <div
                      onClick={() => handleAttributeClick(attr)}
                      style={{
                        ...styles.attributeValue,
                        ...(isAssigned ? styles.attributeValueAssigned : {}),
                        ...(isSelected ? styles.attributeValueSelectable : {}),
                      }}
                    >
                      {isAssigned ? assigned : (isSelected ? '?' : '—')}
                    </div>
                    <input
                      type="number"
                      min={3}
                      max={18}
                      value={manualInputs[attr]}
                      onChange={(e) => handleManualInput(attr, validateManualInput(e.target.value))}
                      style={styles.manualInput}
                      placeholder="3-18"
                    />
                  </div>
                )
              })}
            </div>
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
    gap: 20,
    minHeight: 300,
  },
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  autoRollButton: {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 700,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  poolHint: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 12,
  },
  poolGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  poolValue: {
    width: 48,
    height: 48,
    fontSize: 20,
    fontWeight: 700,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolValueSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
  },
  rollsDetail: {
    marginTop: 16,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  rollDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    background: 'var(--bg-secondary)',
    borderRadius: 6,
    fontSize: 12,
  },
  rollDice: {
    display: 'flex',
    gap: 2,
  },
  rollDie: {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--text-primary)',
  },
  rollDieDropped: {
    opacity: 0.3,
    textDecoration: 'line-through',
  },
  rollSum: {
    fontWeight: 700,
    color: 'var(--success)',
    marginLeft: 4,
  },
  attributesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  attributeSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  attributeHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  attributeKey: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  attributeName: {
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
  attributeValue: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-muted)',
    border: '2px dashed var(--border)',
    borderRadius: 8,
    cursor: 'default',
  },
  attributeValueAssigned: {
    color: 'var(--text-primary)',
    border: '2px solid var(--success)',
    background: 'var(--bg-success-subtle)',
    cursor: 'pointer',
  },
  attributeValueSelectable: {
    border: '2px dashed var(--accent)',
    cursor: 'pointer',
    color: 'var(--accent)',
  },
  manualInput: {
    width: 60,
    padding: '4px 8px',
    fontSize: 13,
    textAlign: 'center',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
  },
}
