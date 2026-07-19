import { useState, useEffect, useMemo } from 'react'
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

interface DerivedFormula {
  key: string
  name: string
  formula: string
  calc: (attrs: Partial<Record<AttributeKey, number>>) => number
}

const DERIVED_FORMULAS: DerivedFormula[] = [
  {
    key: 'LP',
    name: 'Lebenspunkte',
    formula: '10 + KO × 2',
    calc: (a) => 10 + (a.KO ?? 0) * 2,
  },
  {
    key: 'AP',
    name: 'Ausdauerpunkte',
    formula: '5 + KK',
    calc: (a) => 5 + (a.KK ?? 0),
  },
  {
    key: 'MP',
    name: 'Magiepunkte',
    formula: '3 + MU',
    calc: (a) => 3 + (a.MU ?? 0),
  },
  {
    key: 'INI',
    name: 'Initiative',
    formula: 'GE + IN',
    calc: (a) => (a.GE ?? 0) + (a.IN ?? 0),
  },
  {
    key: 'WP',
    name: 'Willenskraft',
    formula: '5 + SR',
    calc: (a) => 5 + (a.SR ?? 0),
  },
  {
    key: 'AW',
    name: 'Ausweichwert',
    formula: '8 + GE',
    calc: (a) => 8 + (a.GE ?? 0),
  },
]

interface AttributeStepProps {
  onValid: (valid: boolean) => void
}

export default function AttributeStep({ onValid }: AttributeStepProps) {
  const { stepData, saveStep } = useAppContext()

  const saved = stepData as {
    attributes?: Record<string, number>
    rolls?: number[]
  } | null

  const savedAttributes = saved?.attributes ?? {}
  const savedRolls = saved?.rolls ?? []

  const [rolls, setRolls] = useState<number[]>(savedRolls.length === 10 ? savedRolls : [])
  const [assignments, setAssignments] = useState<Partial<Record<AttributeKey, number>>>(
    Object.fromEntries(
      ATTRIBUTES.filter((a) => savedAttributes[a] !== undefined).map((a) => [a, savedAttributes[a]])
    ) as Partial<Record<AttributeKey, number>>
  )
  const [manualInputs, setManualInputs] = useState<Record<string, string>>(
    Object.fromEntries(ATTRIBUTES.map((a) => [a, savedAttributes[a] !== undefined ? String(savedAttributes[a]) : '']))
  )
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null)
  const [rollsDetail, setRollsDetail] = useState<{ dice: number[]; sum: number }[]>([])

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

  const derivedValues = useMemo(() => {
    return DERIVED_FORMULAS.map((f) => ({
      ...f,
      value: f.calc(assignments),
    }))
  }, [assignments])

  const allAssigned = ATTRIBUTES.every((a) => assignments[a] !== undefined)

  useEffect(() => {
    onValid(allAssigned)
  }, [allAssigned, onValid])

  useEffect(() => {
    const saved = stepData as {
      attributes?: Record<string, number>
      rolls?: number[]
    } | null
    if (saved?.rolls && saved.rolls.length === 10 && rolls.length === 0) {
      setRolls(saved.rolls)
    }
    if (saved?.attributes && Object.keys(saved.attributes).length > 0 && Object.keys(assignments).length === 0) {
      setAssignments(saved.attributes as Partial<Record<AttributeKey, number>>)
      setManualInputs(
        Object.fromEntries(ATTRIBUTES.map((a) => [a, saved.attributes?.[a] !== undefined ? String(saved.attributes[a]) : '']))
      )
    }
  }, [stepData])

  useEffect(() => {
    if (Object.keys(assignments).length > 0) {
      saveStep(6, {
        attributes: assignments,
        derivedValues: Object.fromEntries(derivedValues.map((d) => [d.key, d.value])),
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

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Abgeleitete Werte</h3>
            <div style={styles.derivedGrid}>
              {derivedValues.map((d) => (
                <div key={d.key} style={styles.derivedItem}>
                  <div style={styles.derivedHeader}>
                    <span style={styles.derivedKey}>{d.key}</span>
                    <span style={styles.derivedName}>{d.name}</span>
                  </div>
                  <div style={styles.derivedValue}>{d.value}</div>
                  <div style={styles.derivedFormula}>{d.formula}</div>
                </div>
              ))}
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
    background: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 18,
    color: '#eee',
  },
  autoRollButton: {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 700,
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  poolHint: {
    fontSize: 13,
    color: '#aaa',
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
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolValueSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
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
    background: '#0f0f23',
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
    background: '#1a1a2e',
    borderRadius: 4,
    fontSize: 11,
    color: '#eee',
  },
  rollDieDropped: {
    opacity: 0.3,
    textDecoration: 'line-through',
  },
  rollSum: {
    fontWeight: 700,
    color: '#4ade80',
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
    background: '#0f0f23',
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
    color: '#e94560',
  },
  attributeName: {
    fontSize: 11,
    color: '#aaa',
  },
  attributeValue: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#666',
    border: '2px dashed #333',
    borderRadius: 8,
    cursor: 'default',
  },
  attributeValueAssigned: {
    color: '#eee',
    border: '2px solid #4ade80',
    background: '#1a2e1a',
    cursor: 'pointer',
  },
  attributeValueSelectable: {
    border: '2px dashed #e94560',
    cursor: 'pointer',
    color: '#e94560',
  },
  manualInput: {
    width: 60,
    padding: '4px 8px',
    fontSize: 13,
    textAlign: 'center',
    background: '#1a1a2e',
    color: '#eee',
    border: '1px solid #333',
    borderRadius: 4,
  },
  derivedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  derivedItem: {
    padding: 12,
    background: '#0f0f23',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  derivedHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  derivedKey: {
    fontSize: 14,
    fontWeight: 700,
    color: '#e94560',
  },
  derivedName: {
    fontSize: 11,
    color: '#aaa',
  },
  derivedValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#4ade80',
  },
  derivedFormula: {
    fontSize: 11,
    color: '#888',
  },
}
