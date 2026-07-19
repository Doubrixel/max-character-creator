import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const destinies = [
  {
    id: 'die-welt',
    name: 'Die Welt',
    icon: '🌍',
    ruleText:
      'Die Welt verbindet dich mit der physischen Realität. Du erhältst +2 auf alle Widerstandswürfe gegen Umwelteinflüsse und kannst einmal pro Abenteuer eine natürliche Gefahr ignorieren. Deine Herkunft ist geprägt von der Verbundenheit mit der Materie.',
  },
  {
    id: 'die-sonne',
    name: 'Die Sonne',
    icon: '☀️',
    ruleText:
      'Die Sonne schenkt dir innere Wärme und Ausstrahlung. Du erhältst +2 auf alle Überzeugungsproben und kannst einmal pro Sitzung eine soziale Niederlage in einen Teilerfolg umwandeln. Deine Präsenz wirkt ansteckend und motivierend.',
  },
  {
    id: 'der-mond',
    name: 'Der Mond',
    icon: '🌙',
    ruleText:
      'Der Mond hüllt dich in Geheimnisse und Intuition. Du erhältst +2 auf alle Wahrnehmungsproben in der Dunkelheit und kannst einmal pro Abenteuer eine versteckte Information aufdecken. Deine Sinne sind geschärft für das Verborgene.',
  },
  {
    id: 'die-sterne',
    name: 'Die Sterne',
    icon: '⭐',
    ruleText:
      'Die Sterne verbinden dich mit dem Kosmischen. Du erhältst +2 auf alle Wissensproben zu Magie und Astronomie und kannst einmal pro Sitzung einen Wurf wiederholen. Dein Schicksal ist mit den Gestirnen verwoben.',
  },
]

interface SchicksalStepProps {
  onValid: (valid: boolean) => void
}

export default function SchicksalStep({ onValid }: SchicksalStepProps) {
  const { stepDeltas, currentStep, saveStep } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const [selected, setSelected] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const id = (stepData as { id?: string } | null)?.id
    setSelected(id ?? null)
  }, [stepData])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  useEffect(() => {
    onValid(selected !== null)
  }, [selected, onValid])

  const handleSelect = (id: string) => {
    setSelected(id)
    const destiny = destinies.find((d) => d.id === id)
    if (destiny) {
      saveStep(1, { id: destiny.id, name: destiny.name, ruleText: destiny.ruleText })
    }
  }

  const selectedDestiny = destinies.find((d) => d.id === selected)

  return (
    <div style={styles.container}>
      <div style={styles.optionsGrid}>
        {destinies.map((destiny) => (
          <button
            key={destiny.id}
            style={{
              ...styles.optionCard,
              ...(selected === destiny.id ? styles.optionCardSelected : {}),
            }}
            onClick={() => handleSelect(destiny.id)}
          >
            <span style={styles.optionIcon}>{destiny.icon}</span>
            <span style={styles.optionName}>{destiny.name}</span>
          </button>
        ))}
      </div>
      {selectedDestiny && (
        <div style={styles.detailPanel}>
          <h3 style={styles.detailTitle}>{selectedDestiny.icon} {selectedDestiny.name}</h3>
          <p style={styles.detailText}>{selectedDestiny.ruleText}</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 16,
    minHeight: 300,
  },
  optionsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    alignContent: 'start',
  },
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 16,
    fontWeight: 500,
  },
  optionCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: 600,
  },
  detailPanel: {
    width: '25%',
    background: 'var(--bg-detail)',
    border: '1px solid var(--border-light)',
    borderRadius: 8,
    padding: 16,
    alignSelf: 'start',
    transition: 'background 0.2s',
  },
  detailTitle: {
    margin: '0 0 12px 0',
    fontSize: 18,
    color: 'var(--detail-title)',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--detail-text)',
    margin: 0,
  },
}
