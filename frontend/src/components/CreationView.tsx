import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import SchicksalStep from './creation/SchicksalStep'
import RasseStep from './creation/RasseStep'
import AbstammungStep from './creation/AbstammungStep'
import KulturSelectStep from './creation/KulturSelectStep'
import KindheitStep from './creation/KindheitStep'
import AusbildungStep from './creation/AusbildungStep'
import AttributeStep from './creation/AttributeStep'
import MeisterschaftStep from './creation/MeisterschaftStep'

const steps = [
  'Schicksal',
  'Rasse',
  'Abstammung',
  'Kultur',
  'Kindheit',
  'Ausbildung',
  'Attribute',
  'Meisterschaften & Spells',
]

export default function CreationView() {
  const { characterId, currentStep, setCurrentStep, createCharacter, resetCharacter, flushCurrentStep, stepDeltas } = useAppContext()
  const [canProceed, setCanProceed] = useState(false)

  if (!characterId) {
    return (
      <div style={styles.emptyState}>
        <h2 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>Noch kein Charakter vorhanden</h2>
        <button style={styles.createButton} onClick={createCharacter}>
          Neuen Charakter erstellen
        </button>
      </div>
    )
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      await flushCurrentStep()
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = async () => {
    if (currentStep > 1) {
      await flushCurrentStep()
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = async (target: number) => {
    if (target === currentStep) return
    if (!stepDeltas[target]) return
    await flushCurrentStep()
    setCurrentStep(target)
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
    if (currentStep === 4) {
      return <KulturSelectStep onValid={setCanProceed} />
    }
    if (currentStep === 5) {
      return <KindheitStep onValid={setCanProceed} />
    }
    if (currentStep === 6) {
      return <AusbildungStep onValid={setCanProceed} />
    }
    if (currentStep === 7) {
      return <AttributeStep onValid={setCanProceed} />
    }
    if (currentStep === 8) {
      return <MeisterschaftStep onValid={setCanProceed} />
    }
    return (
      <div style={styles.content}>
        <h3 style={{ color: 'var(--text-primary)' }}>{steps[currentStep - 1]}</h3>
        <p style={{ color: 'var(--text-tertiary)' }}>Schritt {currentStep} von {steps.length}</p>
      </div>
    )
  }

  return (
    <div style={styles.outerContainer}>
      <div style={styles.innerContainer}>
        <div style={styles.headerRow}>
          <button style={styles.resetButton} onClick={resetCharacter}>
            Neuer Charakter
          </button>
        </div>
        <div style={styles.stepBar}>
          {steps.map((step, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isVisited = !!stepDeltas[stepNum]
            const isReachable = stepNum <= currentStep || isVisited
            return (
              <span
                key={i}
                onClick={() => handleStepClick(stepNum)}
                style={{
                  ...styles.step,
                  ...(isActive ? styles.stepActive : {}),
                  ...(!isActive && isVisited ? styles.stepVisited : {}),
                  ...(!isActive && !isReachable ? styles.stepLocked : {}),
                  cursor: isReachable ? 'pointer' : 'default',
                }}
              >
                {stepNum}. {step}
              </span>
            )
          })}
        </div>
        {renderStepContent()}
        <div style={styles.spacer} />
      </div>
      <div style={styles.navBar}>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  resetButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  stepBar: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    background: 'var(--bg-stepbar)',
    borderRadius: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
    transition: 'background 0.2s',
  },
  step: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--stepbar-text)',
    padding: '4px 10px',
    borderRadius: 6,
    transition: 'all 0.2s',
  },
  stepActive: {
    color: 'var(--stepbar-text-active)',
    fontWeight: 700,
    background: 'rgba(233, 69, 96, 0.15)',
  },
  stepVisited: {
    color: 'var(--text-primary)',
  },
  stepLocked: {
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  outerContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 40px)',
  },
  innerContainer: {
    flex: 1,
  },
  spacer: {
    height: 80,
  },
  navBar: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    zIndex: 10,
  },
  navButton: {
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 600,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonDisabled: { opacity: 0.5, cursor: 'not-allowed', background: 'var(--bg-primary)', color: 'var(--text-secondary)' },
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
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
