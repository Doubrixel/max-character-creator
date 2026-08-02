import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import {
  recalculateStats,
  recalculateStatsUpTo,
  StepKey,
  StepDeltas,
  StepDeltaMap,
  CharacterState,
} from '@mcc/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''
const DEFAULT_NAME = 'Neuer Charakter'

interface AppContextType {
  creating: boolean
  currentStep: StepKey
  characterStats: CharacterState
  stepDeltas: StepDeltas
  apiError: string | null
  computeBaseStats: (upToStep: StepKey) => CharacterState
  reportApiError: (message: string) => void
  clearApiError: () => void
  setCurrentStep: (step: StepKey) => void
  updateStepDelta: <K extends StepKey>(step: K, delta: StepDeltaMap[K]) => void
  createCharacter: () => void
  finalizeCharacter: () => Promise<boolean>
  resetCharacter: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [creating, setCreating] = useState(false)
  const [currentStep, setCurrentStepState] = useState<StepKey>('schicksal')
  const [stepDeltas, setStepDeltas] = useState<StepDeltas>({})
  const [apiError, setApiError] = useState<string | null>(null)

  const reportApiError = (message: string) => {
    setApiError(message)
    console.error(message)
  }

  const clearApiError = () => {
    setApiError(null)
  }

  const characterStats = useMemo(() => {
    return recalculateStats(stepDeltas)
  }, [stepDeltas])

  const computeBaseStats = (upToStep: StepKey): CharacterState => {
    return recalculateStatsUpTo(stepDeltas, upToStep)
  }

  const setCurrentStep = (step: StepKey) => {
    setCurrentStepState(step)
  }

  const updateStepDelta = <K extends StepKey>(step: K, delta: StepDeltaMap[K]) => {
    setStepDeltas(prev => ({ ...prev, [step]: delta }))
  }

  const createCharacter = () => {
    setCreating(true)
    setCurrentStepState('schicksal')
    setStepDeltas({})
    clearApiError()
  }

  const finalizeCharacter = async (): Promise<boolean> => {
    try {
      const name = (stepDeltas.Name as { name?: string } | undefined)?.name?.trim() || DEFAULT_NAME
      const res = await fetch(`${API_BASE}/api/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps: stepDeltas }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await res.json()
      setCreating(false)
      setCurrentStepState('schicksal')
      setStepDeltas({})
      return true
    } catch (err) {
      reportApiError(`Charakter konnte nicht fertiggestellt werden: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  const resetCharacter = () => {
    setCreating(false)
    setCurrentStepState('schicksal')
    setStepDeltas({})
  }

  return (
    <AppContext.Provider
      value={{
        creating,
        currentStep,
        characterStats,
        stepDeltas,
        apiError,
        computeBaseStats,
        reportApiError,
        clearApiError,
        setCurrentStep,
        updateStepDelta,
        createCharacter,
        finalizeCharacter,
        resetCharacter,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
