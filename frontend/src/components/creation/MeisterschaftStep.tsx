import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import PointDistributionStep from './PointDistributionStep'

interface MeisterschaftStepProps {
  onValid: (valid: boolean) => void
}

export default function MeisterschaftStep({ onValid }: MeisterschaftStepProps) {
  const { finalizeCharacter, resetCharacter } = useAppContext()
  const [finalizing, setFinalizing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFinalize = async () => {
    setFinalizing(true)
    setError(null)
    const ok = await finalizeCharacter()
    if (ok) {
      setCompleted(true)
    } else {
      setError('Fehler beim Fertigstellen')
    }
    setFinalizing(false)
  }

  if (completed) {
    return (
      <div style={styles.completed}>
        <h2 style={styles.completedTitle}>Charakter fertiggestellt!</h2>
        <p style={styles.completedText}>Dein Charakter wurde erfolgreich erstellt und erhält 15 Start-XP.</p>
        <p style={styles.completedText}>Er erscheint nun im Chroniken-Tab.</p>
        <button style={styles.finalizeButton} onClick={resetCharacter}>
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  return (
    <PointDistributionStep
      stepKey="meisterschaft"
      onValid={onValid}
      skillPoints={5}
      skillPointLabel="Talent-Punkte"
      staerkenPoints={3}
      staerkenMaxKosten={3}
      ressourcenPoints={1}
      footer={(valid) => (
        <div style={styles.finalizeSection}>
          {error && <div style={styles.error}>{error}</div>}
          <button
            style={{
              ...styles.finalizeButton,
              ...(!valid || finalizing ? styles.finalizeButtonDisabled : {}),
            }}
            onClick={handleFinalize}
            disabled={finalizing || !valid}
          >
            {finalizing ? 'Wird fertiggestellt...' : 'Charakter fertigstellen'}
          </button>
        </div>
      )}
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  completed: {
    padding: 40,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  completedTitle: {
    fontSize: 24,
    color: 'var(--success)',
    margin: 0,
  },
  completedText: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  error: {
    padding: '12px 16px',
    background: 'var(--bg-error)',
    color: 'var(--accent)',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  finalizeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 8,
  },
  finalizeButton: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 700,
    background: 'var(--success)',
    color: 'var(--text-on-success)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  finalizeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
