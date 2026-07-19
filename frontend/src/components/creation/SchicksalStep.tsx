import { useState, useEffect } from 'react'
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
  const { stepData, saveStep } = useAppContext()
  const [selected, setSelected] = useState<string | null>(
    (stepData as { destiny?: string } | null)?.destiny ?? null
  )

  useEffect(() => {
    onValid(selected !== null)
  }, [selected, onValid])

  const handleSelect = (id: string) => {
    setSelected(id)
    saveStep(1, { destiny: id })
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
    background: '#1a1a2e',
    color: '#eee',
    border: '2px solid transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 16,
    fontWeight: 500,
  },
  optionCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
    boxShadow: '0 0 12px rgba(233, 69, 96, 0.3)',
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
    background: '#f8f8f8',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 16,
    alignSelf: 'start',
  },
  detailTitle: {
    margin: '0 0 12px 0',
    fontSize: 18,
    color: '#1a1a2e',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#444',
    margin: 0,
  },
}
