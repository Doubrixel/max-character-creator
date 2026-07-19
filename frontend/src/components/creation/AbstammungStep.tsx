import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const heritageTable: Record<number, string> = {
  2: 'Ausgestoßen – Du wurdest von deiner Gemeinschaft verbannt.',
  3: 'Straßenkind – Du bist in den Gassen einer großen Stadt aufgewachsen.',
  4: 'Bauernkind – Du hast auf einem abgelegenen Hof gelebt.',
  5: 'Händlerfamilie – Deine Familie handelt mit Waren aus fernen Ländern.',
  6: 'Handwerker – Du hast in einer Werkstatt gelernt.',
  7: 'Söldnerblut – Deine Familie hat für Gold gekämpft.',
  8: 'Gelehrtenfamilie – Du bist mit Büchern und Wissen aufgewachsen.',
  9: 'Adelig – Du gehörst zu einer wohlhabenden Familie.',
  10: 'Tempelkind – Du wurdest in einem Kloster erzogen.',
  11: 'Magierblut – Deine Familie hat arcane Künste praktiziert.',
  12: 'Königslinie – Du bist von königlichem Geblüt.',
}

interface BinaryDecision {
  id: string
  label: string
  optionA: string
  optionB: string
}

const decisions: BinaryDecision[] = [
  {
    id: 'dec-1',
    label: 'Dein erster Überlebenskampf',
    optionA: 'Straßenkind – Du hast gelernt, dich in den Gassen durchzubeißen.',
    optionB: 'Adelig – Du hast diplomatische Mittel bevorzugt.',
  },
  {
    id: 'dec-2',
    label: 'Deine Ausbildung',
    optionA: 'Kämpfer – Du hast das Kämpfen an der Pike gelernt.',
    optionB: 'Gelehrter – Du hast dich in die Bibliothek geflüchtet.',
  },
  {
    id: 'dec-3',
    label: 'Dein erster Verbündeter',
    optionA: 'Treuer Freund – Eine Person, die immer zu dir steht.',
    optionB: 'Einflussreicher Mentor – Jemand, der dir Türen öffnet.',
  },
]

interface AbstammungStepProps {
  onValid: (valid: boolean) => void
}

export default function AbstammungStep({ onValid }: AbstammungStepProps) {
  const { stepData, saveStep } = useAppContext()

  const [dice1, setDice1] = useState<string>('')
  const [dice2, setDice2] = useState<string>('')
  const [heritage, setHeritage] = useState<string>('')
  const [chosenDecisions, setChosenDecisions] = useState<Record<string, string>>({})
  const chosenDecisionsRef = useRef<Record<string, string>>({})
  const prevStepDataRef = useRef<Record<string, unknown> | null | undefined>(undefined)

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

  useEffect(() => {
    const hasChanged = stepDataHasChanged(prevStepDataRef.current, stepData)
    if (!hasChanged) return
    prevStepDataRef.current = stepData

    const saved = stepData as { dice?: [number, number]; heritage?: string; decisions?: { id: string; choice: string }[] } | null
    if (saved?.dice) {
      setDice1(String(saved.dice[0]))
      setDice2(String(saved.dice[1]))
    } else {
      setDice1('')
      setDice2('')
    }
    setHeritage(saved?.heritage ?? '')
    const loaded = saved?.decisions ? Object.fromEntries(saved.decisions.map((d) => [d.id, d.choice])) : {}
    setChosenDecisions(loaded)
    chosenDecisionsRef.current = loaded
  }, [stepData])

  useEffect(() => {
    const d1 = parseInt(dice1, 10)
    const d2 = parseInt(dice2, 10)
    if (d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6) {
      const sum = d1 + d2
      const result = heritageTable[sum] ?? 'Unbekannte Herkunft'
      setHeritage(result)
      const currentDecisions = Object.entries(chosenDecisionsRef.current).map(([id, choice]) => ({ id, choice }))
      saveStep(3, { dice: [d1, d2] as [number, number], heritage: result, decisions: currentDecisions })
    } else {
      setHeritage('')
    }
  }, [dice1, dice2])

  useEffect(() => {
    const allDecided = decisions.every((d) => chosenDecisions[d.id] !== undefined)
    onValid(allDecided && heritage !== '')
  }, [chosenDecisions, heritage, onValid])

  const handleAutoRoll = () => {
    const r1 = Math.floor(Math.random() * 6) + 1
    const r2 = Math.floor(Math.random() * 6) + 1
    setDice1(String(r1))
    setDice2(String(r2))
  }

  const handleDecision = (decisionId: string, choice: string) => {
    setChosenDecisions((prev) => {
      const next = { ...prev, [decisionId]: choice }
      chosenDecisionsRef.current = next
      const allDecisions = Object.entries(next).map(([id, choice]) => ({ id, choice }))
      const d1 = parseInt(dice1, 10)
      const d2 = parseInt(dice2, 10)
      saveStep(3, { dice: [d1, d2], heritage, decisions: allDecisions })
      return next
    })
  }

  const handleUndo = (decisionId: string) => {
    setChosenDecisions((prev) => {
      const undoIndex = decisions.findIndex((d) => d.id === decisionId)
      const next = { ...prev }
      for (let i = undoIndex; i < decisions.length; i++) {
        delete next[decisions[i].id]
      }
      chosenDecisionsRef.current = next
      const allDecisions = Object.entries(next).map(([id, choice]) => ({ id, choice }))
      const d1 = parseInt(dice1, 10)
      const d2 = parseInt(dice2, 10)
      saveStep(3, { dice: [d1, d2], heritage, decisions: allDecisions })
      return next
    })
  }

  const validateInput = (value: string): string => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return ''
    if (num < 1) return '1'
    if (num > 6) return '6'
    return String(num)
  }

  const sum = parseInt(dice1, 10) + parseInt(dice2, 10)
  const validDice = parseInt(dice1, 10) >= 1 && parseInt(dice1, 10) <= 6 && parseInt(dice2, 10) >= 1 && parseInt(dice2, 10) <= 6

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>2d6 Wurf – Bestimme deine Abstammung</h3>
        <div style={styles.diceRow}>
          <div style={styles.diceGroup}>
            <label style={styles.label}>Würfel 1</label>
            <input
              type="number"
              min={1}
              max={6}
              value={dice1}
              onChange={(e) => setDice1(validateInput(e.target.value))}
              style={styles.diceInput}
            />
          </div>
          <div style={styles.diceGroup}>
            <label style={styles.label}>Würfel 2</label>
            <input
              type="number"
              min={1}
              max={6}
              value={dice2}
              onChange={(e) => setDice2(validateInput(e.target.value))}
              style={styles.diceInput}
            />
          </div>
          <button onClick={handleAutoRoll} style={styles.autoRollButton}>
            Auto-Würfel
          </button>
        </div>
      </div>

      {validDice && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Ergebnis: {sum}</h3>
          <p style={styles.heritageText}>{heritage}</p>
        </div>
      )}

      {validDice && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Entscheidungen</h3>
          {decisions.map((decision, index) => {
            const chosen = chosenDecisions[decision.id]
            const previousDecided = decisions.slice(0, index).every((d) => chosenDecisions[d.id] !== undefined)

            return (
              <div key={decision.id} style={styles.decisionBlock}>
                <p style={styles.decisionLabel}>{decision.label}</p>
                <div style={styles.decisionOptions}>
                  <button
                    onClick={() => handleDecision(decision.id, 'A')}
                    disabled={!previousDecided && !chosen}
                    style={{
                      ...styles.decisionOption,
                      ...(chosen === 'A' ? styles.decisionOptionChosen : {}),
                      ...(chosen === 'B' ? styles.decisionOptionGrayed : {}),
                      ...((!previousDecided && !chosen) ? styles.decisionOptionDisabled : {}),
                    }}
                  >
                    {decision.optionA}
                    {chosen === 'A' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUndo(decision.id) }} style={styles.undoButton}>
                        Rückgängig
                      </button>
                    )}
                  </button>
                  <button
                    onClick={() => handleDecision(decision.id, 'B')}
                    disabled={!previousDecided && !chosen}
                    style={{
                      ...styles.decisionOption,
                      ...(chosen === 'B' ? styles.decisionOptionChosen : {}),
                      ...(chosen === 'A' ? styles.decisionOptionGrayed : {}),
                      ...((!previousDecided && !chosen) ? styles.decisionOptionDisabled : {}),
                    }}
                  >
                    {decision.optionB}
                    {chosen === 'B' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUndo(decision.id) }} style={styles.undoButton}>
                        Rückgängig
                      </button>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
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
  diceRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
  },
  diceGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: '#aaa',
  },
  diceInput: {
    width: 60,
    padding: '8px 12px',
    fontSize: 18,
    fontWeight: 600,
    textAlign: 'center',
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
  },
  autoRollButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  heritageText: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#ccc',
    margin: 0,
  },
  decisionBlock: {
    marginBottom: 16,
  },
  decisionLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#eee',
    margin: '0 0 8px 0',
  },
  decisionOptions: {
    display: 'flex',
    gap: 12,
  },
  decisionOption: {
    flex: 1,
    padding: 14,
    fontSize: 14,
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    position: 'relative',
  },
  decisionOptionChosen: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
  },
  decisionOptionGrayed: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  decisionOptionDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  undoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '4px 8px',
    fontSize: 11,
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
}
