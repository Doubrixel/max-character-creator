import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

interface NameStepProps {
  onValid: (valid: boolean) => void
}

export default function NameStep({ onValid }: NameStepProps) {
  const { stepDeltas, currentStep, updateStepDelta, finalizeCharacter, resetCharacter } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const initializedRef = useRef(false)

  const [name, setName] = useState('')
  const [finalizing, setFinalizing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    setName((stepData as { name?: string } | null)?.name ?? '')
  }, [stepData])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const valid = name.trim() !== ''

  useEffect(() => {
    onValid(valid)
  }, [valid, onValid])

  const handleNameChange = (value: string) => {
    setName(value)
    updateStepDelta('Name', { name: value })
  }

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
        <p style={styles.completedText}>{name} wurde erfolgreich erstellt und erhält 15 Start-XP.</p>
        <p style={styles.completedText}>Er erscheint nun im Chroniken-Tab.</p>
        <button style={styles.finalizeButton} onClick={resetCharacter}>
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Name des Charakters</h3>
        <p style={styles.hint}>Gib deinem Charakter einen Namen.</p>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Name..."
          style={styles.input}
          autoFocus
        />
      </div>

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
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 300,
  },
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '0 0 16px 0',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    outline: 'none',
  },
  error: {
    padding: '12px 16px',
    background: 'var(--bg-error)',
    color: 'var(--accent)',
    borderRadius: 8,
    fontSize: 14,
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
    alignSelf: 'flex-start',
  },
  finalizeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
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
}
