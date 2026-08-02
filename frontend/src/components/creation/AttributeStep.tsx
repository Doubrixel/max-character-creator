import { useState, useEffect, useRef } from 'react'
import { evaluateFormula, attributeModifier } from '@mcc/shared'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

const ATTRIBUTES = ['MUT', 'KLU', 'INT', 'CHA', 'HIN', 'MYS', 'FF', 'GEW', 'KON', 'KRA'] as const
type AttributeKey = (typeof ATTRIBUTES)[number]

const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  MUT: 'Mut',
  KLU: 'Klugheit',
  INT: 'Intuition',
  CHA: 'Charisma',
  HIN: 'Hinterhalt',
  MYS: 'Mystik',
  FF: 'Fingerfertigkeit',
  GEW: 'Gewandheit',
  KON: 'Konstitution',
  KRA: 'Körperkraft',
}

function roll4d6DropLowest(): { dice: number[]; sum: number; droppedIndex: number } {
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  const sorted = [...dice].sort((a, b) => a - b)
  const sum = sorted[1] + sorted[2] + sorted[3]
  const droppedIndex = dice.indexOf(Math.min(...dice))
  return { dice, sum, droppedIndex }
}

function formatModifier(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

interface AttributeStepProps {
  onValid: (valid: boolean) => void
}

type RollDetail = { dice: number[]; sum: number; droppedIndex: number }

export default function AttributeStep({ onValid }: AttributeStepProps) {
  const { stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null

  const [pool, setPool] = useState<(number | null)[]>(Array(ATTRIBUTES.length).fill(null))
  const [slotAssignments, setSlotAssignments] = useState<Partial<Record<AttributeKey, number>>>({})
  const [rollsDetail, setRollsDetail] = useState<(RollDetail | null)[]>(Array(ATTRIBUTES.length).fill(null))
  const [derivedDefs, setDerivedDefs] = useState<{ name: string; description: string; formel: string }[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/library/derived-values`)
      .then((r) => r.json())
      .then((data: { name: string; description: string | null; config: string | null }[]) => {
        setDerivedDefs(
          data.map((d) => {
            let formel = ''
            if (d.config) {
              try {
                const cfg = JSON.parse(d.config)
                if (typeof cfg.formel === 'string') formel = cfg.formel
              } catch {}
            }
            return { name: d.name, description: d.description ?? '', formel }
          }),
        )
      })
      .catch(() => reportApiError('Abgeleitete Werte konnten nicht geladen werden'))
  }, [])

  const poolFilled = pool.every((v) => v !== null)

  const allAssigned = ATTRIBUTES.every((attr) => {
    const slot = slotAssignments[attr]
    return slot !== undefined && pool[slot] !== null
  })

  const valid = poolFilled && allAssigned

  useEffect(() => {
    onValid(valid)
  }, [valid, onValid])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const saved = stepData as {
      attribute?: Record<string, number>
      rolls?: (number | null)[]
      slotAssignments?: Record<string, number>
    } | null

    const savedRolls = saved?.rolls ?? []
    if (savedRolls.length === ATTRIBUTES.length) {
      setPool(savedRolls)
    }

    const savedSlots = saved?.slotAssignments ?? {}
    const restored: Partial<Record<AttributeKey, number>> = {}
    for (const [attr, slot] of Object.entries(savedSlots)) {
      if (ATTRIBUTES.includes(attr as AttributeKey) && typeof slot === 'number') {
        restored[attr as AttributeKey] = slot
      }
    }
    setSlotAssignments(restored)
  }, [stepData])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  useEffect(() => {
    const attribute: Record<string, number> = {}
    const slotMap: Record<string, number> = {}
    for (const attr of ATTRIBUTES) {
      const slot = slotAssignments[attr]
      if (slot !== undefined && pool[slot] !== null) {
        attribute[attr] = pool[slot] as number
        slotMap[attr] = slot
      }
    }
    updateStepDelta('attribute', { attribute, rolls: pool, slotAssignments: slotMap })
  }, [pool, slotAssignments])

  const handleAutoRoll = () => {
    const newPool: (number | null)[] = []
    const newDetail: (RollDetail | null)[] = []
    for (let i = 0; i < ATTRIBUTES.length; i++) {
      const result = roll4d6DropLowest()
      newPool.push(result.sum)
      newDetail.push(result)
    }
    setPool(newPool)
    setRollsDetail(newDetail)
    setSlotAssignments({})
  }

  const handlePoolChange = (index: number, value: string) => {
    const raw = value.trim()
    if (raw === '') {
      setPool((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      setRollsDetail((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      setSlotAssignments((prev) => {
        const next = { ...prev }
        for (const attr of ATTRIBUTES) {
          if (next[attr] === index) delete next[attr]
        }
        return next
      })
      return
    }
    const num = parseInt(raw, 10)
    if (isNaN(num)) return
    const clamped = Math.max(3, Math.min(18, num))
    setPool((prev) => {
      const next = [...prev]
      next[index] = clamped
      return next
    })
    setRollsDetail((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  const handleSlotAssign = (attr: AttributeKey, value: string) => {
    if (value === '') {
      setSlotAssignments((prev) => {
        const next = { ...prev }
        delete next[attr]
        return next
      })
      return
    }
    const targetSlot = parseInt(value, 10)
    if (isNaN(targetSlot) || pool[targetSlot] === null) return
    const currentSlot = slotAssignments[attr]
    const validCurrent = currentSlot !== undefined && pool[currentSlot] !== null ? currentSlot : undefined
    if (targetSlot === validCurrent) return
    const ownerOfTarget = ATTRIBUTES.find((a) => a !== attr && slotAssignments[a] === targetSlot)
    if (validCurrent !== undefined && ownerOfTarget !== undefined) {
      setSlotAssignments((prev) => {
        const next = { ...prev }
        delete next[ownerOfTarget]
        next[attr] = targetSlot
        next[ownerOfTarget] = validCurrent
        return next
      })
    } else {
      setSlotAssignments((prev) => {
        const next = { ...prev }
        if (ownerOfTarget !== undefined) delete next[ownerOfTarget]
        next[attr] = targetSlot
        return next
      })
    }
  }

  const assignedTo: Record<number, AttributeKey> = {}
  for (const a of ATTRIBUTES) {
    const s = slotAssignments[a]
    if (s !== undefined && pool[s] !== null) assignedTo[s] = a
  }

  const filledSlots: number[] = []
  for (let i = 0; i < pool.length; i++) {
    if (pool[i] !== null) filledSlots.push(i)
  }
  const freeSlots = filledSlots
    .filter((i) => assignedTo[i] === undefined)
    .sort((a, b) => (pool[b] as number) - (pool[a] as number))
  const takenSlots = filledSlots
    .filter((i) => assignedTo[i] !== undefined)
    .sort((a, b) => ATTRIBUTES.indexOf(assignedTo[a]) - ATTRIBUTES.indexOf(assignedTo[b]))

  const attributeModifiers: Record<string, number> = {}
  for (const a of ATTRIBUTES) {
    const s = slotAssignments[a]
    if (s !== undefined && pool[s] !== null) attributeModifiers[a] = attributeModifier(pool[s] as number)
  }
  const groessenklasse = stepDeltas.rasse?.groessenklasse ?? 3
  const derivedResults = derivedDefs.map((d) => {
    const result = d.formel
      ? evaluateFormula(d.formel, { attribute: attributeModifiers, groessenklasse })
      : { value: null, display: '—' }
    return { ...d, result }
  })

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.poolHeader}>
          <h3 style={styles.sectionTitle}>Werte-Pool</h3>
          <button onClick={handleAutoRoll} style={styles.autoRollButton}>
            Auto-Würfel (4d6, höchste 3)
          </button>
        </div>
        <p style={styles.poolHint}>
          Trage selbst gewürfelte Werte ein (3–18) oder nutze Auto-Würfel. Jeder Wert kann nur einem Attribut zugeordnet werden.
        </p>
        <div style={styles.poolGrid}>
          {pool.map((val, i) => {
            const detail = rollsDetail[i]
            return (
              <div key={i} style={styles.poolSlot}>
                <span style={styles.poolSlotLabel}>Wert {i + 1}</span>
                <input
                  type="number"
                  min={3}
                  max={18}
                  value={val === null ? '' : String(val)}
                  onChange={(e) => handlePoolChange(i, e.target.value)}
                  style={styles.poolInput}
                  placeholder="—"
                />
                {detail && (
                  <div style={styles.rollDetailItem}>
                    <span style={styles.rollDice}>
                      {detail.dice.map((d, j) => (
                        <span
                          key={j}
                          style={{
                            ...styles.rollDie,
                            ...(j === detail.droppedIndex ? styles.rollDieDropped : {}),
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Attribute zuordnen</h3>
        <div style={styles.attributesGrid}>
          {ATTRIBUTES.map((attr) => {
            const slot = slotAssignments[attr]
            const assignedValue = slot !== undefined && pool[slot] !== null ? pool[slot] : null
            return (
              <div key={attr} style={styles.attributeSlot}>
                <div style={styles.attributeHeader}>
                  <span style={styles.attributeKey}>{attr}</span>
                  <span style={styles.attributeName}>{ATTRIBUTE_NAMES[attr]}</span>
                </div>
                <select
                  value={slot !== undefined && pool[slot] !== null ? String(slot) : ''}
                  onChange={(e) => handleSlotAssign(attr, e.target.value)}
                  style={styles.attributeSelect}
                >
                  <option value="">—</option>
                  {freeSlots.map((i) => (
                    <option key={i} value={String(i)}>{pool[i]}</option>
                  ))}
                  {takenSlots.length > 0 && (
                    <optgroup label="────">
                      {takenSlots.map((i) => (
                        <option key={i} value={String(i)}>{assignedTo[i]} {pool[i]}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <span
                  style={{
                    ...styles.attributeValue,
                    ...(assignedValue !== null ? styles.attributeValueAssigned : {}),
                  }}
                >
                  {assignedValue !== null ? assignedValue : '—'}
                </span>
                {assignedValue !== null && (
                  <span style={styles.attributeModifier}>
                    {formatModifier(attributeModifier(assignedValue))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {derivedDefs.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Abgeleitete Werte</h3>
          <div style={styles.derivedGrid}>
            {derivedResults.map((d, i) => (
              <div key={i} style={styles.derivedSlot} title={d.description}>
                <span style={styles.derivedName}>{d.name}</span>
                {d.formel && <span style={styles.derivedFormula}>{d.formel}</span>}
                <span style={styles.derivedValue}>{d.result.display}</span>
              </div>
            ))}
          </div>
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
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  poolHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  autoRollButton: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 700,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  poolHint: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginBottom: 16,
  },
  poolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 10,
  },
  poolSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
  },
  poolSlotLabel: {
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
  poolInput: {
    width: 56,
    padding: '6px 8px',
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 6,
  },
  rollDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 6px',
    background: 'var(--bg-primary)',
    borderRadius: 6,
    fontSize: 11,
  },
  rollDice: {
    display: 'flex',
    gap: 2,
  },
  rollDie: {
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    borderRadius: 4,
    fontSize: 10,
    color: 'var(--text-primary)',
  },
  rollDieDropped: {
    opacity: 0.3,
    textDecoration: 'line-through',
  },
  attributesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  attributeSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
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
  attributeSelect: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 13,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
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
  },
  attributeValueAssigned: {
    color: 'var(--text-primary)',
    border: '2px solid var(--success)',
    background: 'var(--bg-success-subtle)',
  },
  attributeModifier: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  derivedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12,
  },
  derivedSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    cursor: 'help',
  },
  derivedName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  derivedFormula: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  derivedValue: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)',
  },
}
