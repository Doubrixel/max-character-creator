import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import {
  recalculateStats,
  recalculateStatsUpTo,
  STEP_ORDER,
  StepKey,
  StepDeltas,
  StepDeltaMap,
  CharacterState,
} from '@mcc/shared'

const API_BASE = import.meta.env.VITE_API_URL || ''

export interface CharacterData {
  id: string
  [key: string]: unknown
}

interface AppContextType {
  characterId: string | null
  currentStep: StepKey
  characterStats: CharacterState
  stepDeltas: StepDeltas
  apiError: string | null
  computeBaseStats: (upToStep: StepKey) => CharacterState
  reportApiError: (message: string) => void
  clearApiError: () => void
  setCharacterId: (id: string) => void
  setCurrentStep: (step: StepKey) => void
  updateStepDelta: <K extends StepKey>(step: K, delta: StepDeltaMap[K]) => void
  saveStep: <K extends StepKey>(step: K, delta: StepDeltaMap[K]) => Promise<boolean>
  flushCurrentStep: () => Promise<boolean>
  loadCharacter: (id: string) => Promise<void>
  validateStep: (step: StepKey) => Promise<{ valid: boolean; errors: string[] }>
  createCharacter: () => Promise<void>
  resetCharacter: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [characterId, setCharacterIdState] = useState<string | null>(null)
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

  const setCharacterId = (id: string) => {
    setCharacterIdState(id)
  }

  const setCurrentStep = (step: StepKey) => {
    setCurrentStepState(step)
  }

  const updateStepDelta = <K extends StepKey>(step: K, delta: StepDeltaMap[K]) => {
    setStepDeltas(prev => ({ ...prev, [step]: delta }))
  }

  const flushCurrentStep = async (): Promise<boolean> => {
    if (!characterId) return true
    const delta = stepDeltas[currentStep]
    if (!delta) return true
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${currentStep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    } catch (err) {
      reportApiError(`Speichern von Schritt "${currentStep}" fehlgeschlagen: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  const loadCharacter = async (characterId: string) => {
    const stepResults = await Promise.all(STEP_ORDER.map(async (step): Promise<[StepKey, StepDeltaMap[StepKey]] | null> => {
      try {
        const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return [step, data.delta || {}]
      } catch (err) {
        console.error(`loadCharacter failed for step "${step}":`, err)
        return null
      }
    }))

    const failedCount = stepResults.filter(r => r === null).length
    if (failedCount > 0) {
      reportApiError(`${failedCount} von ${STEP_ORDER.length} Schritten konnten nicht geladen werden`)
    }

    const deltas: StepDeltas = {}
    for (const result of stepResults) {
      if (result) deltas[result[0]] = result[1] as any
    }
    setStepDeltas(deltas)
  }

  const saveStep = async <K extends StepKey>(step: K, delta: StepDeltaMap[K]): Promise<boolean> => {
    if (!characterId) return true
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await res.json()
      setStepDeltas(prev => ({ ...prev, [step]: delta }))
      return true
    } catch (err) {
      reportApiError(`Speichern von Schritt "${step}" fehlgeschlagen: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  const validateStep = async (step: StepKey): Promise<{ valid: boolean; errors: string[] }> => {
    if (!characterId) return { valid: true, errors: [] }
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}/validate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      reportApiError(`Validierung fehlgeschlagen: ${err instanceof Error ? err.message : err}`)
      return { valid: false, errors: ['Validierung konnte nicht ausgeführt werden'] }
    }
  }

  const createCharacter = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Neuer Charakter' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const character = await res.json()
      setCharacterIdState(character.id)
      setStepDeltas({})
      setCurrentStepState('schicksal')
    } catch (err) {
      reportApiError(`Charakter konnte nicht erstellt werden: ${err instanceof Error ? err.message : err}`)
    }
  }

  const resetCharacter = () => {
    setCharacterIdState(null)
    setCurrentStepState('schicksal')
    setStepDeltas({})
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/characters`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((characters: CharacterData[]) => {
        if (characters.length > 0) {
          const id = characters[0].id
          setCharacterIdState(id)
          loadCharacter(id)
        }
      })
      .catch(() => reportApiError('Charakterliste konnte nicht geladen werden'))
  }, [])

  return (
    <AppContext.Provider
      value={{
        characterId,
        currentStep,
        characterStats,
        stepDeltas,
        apiError,
        computeBaseStats,
        reportApiError,
        clearApiError,
        setCharacterId,
        setCurrentStep,
        updateStepDelta,
        saveStep,
        flushCurrentStep,
        loadCharacter,
        validateStep,
        createCharacter,
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
