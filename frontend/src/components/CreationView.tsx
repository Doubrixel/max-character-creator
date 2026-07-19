import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import SchicksalStep from './creation/SchicksalStep'
import RasseStep from './creation/RasseStep'
import AbstammungStep from './creation/AbstammungStep'

const steps = [
  'Schicksal',
  'Rasse',
  'Abstammung',
  'Kultur & Kindheit',
  'Ausbildung',
  'Attribute',
  'Meisterschaften & Spells',
]

export default function CreationView() {
  const { characterId, currentStep, setCurrentStep, saveStep, createCharacter } = useAppContext()
  const [canProceed, setCanProceed] = useState(false)

  if (!characterId) {
    return (
      <div style={styles.emptyState}>
        <h2 style={{ marginBottom: 16 }}>Noch kein Charakter vorhanden</h2>
        <button style={styles.createButton} onClick={createCharacter}>
          Neuen Charakter erstellen
        </button>
      </div>
    )
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      await saveStep(currentStep, {})
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = async () => {
    if (currentStep > 1) {
      await saveStep(currentStep, {})
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    if (currentStep === 1) {
      return <SchicksalStep onValid={setCanProceed} />
    }
    if (currentStep === 2) {
      return <RasseStep onValid={setCanProceed} />
    }
    if (currentStep === 3) {
      return <AbstammungStep onValid={setCanProceed} />
    }
    return (
      <div style={styles.content}>
        <h3>{steps[currentStep - 1]}</h3>
        <p style={{ color: '#888' }}>Schritt {currentStep} von {steps.length}</p>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.stepBar}>
        {steps.map((step, i) => (
          <span
            key={i}
            style={{
              ...styles.step,
              ...(i + 1 === currentStep ? styles.stepActive : {}),
            }}
          >
            {i + 1}. {step}
          </span>
        ))}
      </div>
      {renderStepContent()}
      <div style={styles.navButtons}>
        <button
          style={{ ...styles.navButton, ...(currentStep === 1 ? styles.navButtonDisabled : {}) }}
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Zurück
        </button>
        <button
          style={{
            ...styles.navButton,
            ...((currentStep === steps.length || !canProceed) ? styles.navButtonDisabled : {}),
          }}
          onClick={handleNext}
          disabled={currentStep === steps.length || !canProceed}
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  stepBar: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    background: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  step: { fontSize: 13, fontWeight: 500, color: '#333' },
  stepActive: { color: '#e94560', fontWeight: 700 },
  content: { padding: 16, border: '1px dashed #ccc', borderRadius: 8, minHeight: 300 },
  navButtons: { display: 'flex', gap: 12, marginTop: 24, justifyContent: 'space-between' },
  navButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    background: '#1a1a2e',
    color: '#eee',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  navButtonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  createButton: {
    padding: '12px 32px',
    fontSize: 16,
    fontWeight: 600,
    background: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
}
