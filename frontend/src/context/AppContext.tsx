import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { recalculateStats, recalculateStatsUpTo } from '../shared/reducers'

const API_BASE = import.meta.env.VITE_API_URL || ''

export interface CharacterData {
  id: string
  [key: string]: unknown
}

interface CharacterStats {
  schicksal?: { id: string; name: string; ruleText: string }
  rasse?: { id: string; name: string; groessenklasse?: number; statblock?: Record<string, unknown> }
  abstammung?: { heritageRoll: number; heritage: string; decisions: Record<string, string> }
  skills?: Record<string, number>
  staerke?: string
  staerken?: string[]
  kulturMeisterschaft?: string
  ressourcen?: string[]
  magic?: Record<string, number>
  attribute?: { MUT?: number; KLU?: number; INT?: number; CHA?: number; HIN?: number; MYS?: number; FF?: number; GEW?: number; KON?: number; KRA?: number }
  derived?: { LP: number; FK: number; SP: number; VTD: number; KW: number; GW: number; SS: number; INI: number }
  meisterschaften?: string[]
  bonusMeisterschaften?: string[]
  resources?: Record<string, number>
  spells?: string[]
  [key: string]: unknown
}

interface AppContextType {
  characterId: string | null
  currentStep: number
  characterStats: CharacterStats
  stepDeltas: Record<number, Record<string, unknown>>
  computeBaseStats: (upToStep: number) => CharacterStats
  setCharacterId: (id: string) => void
  setCurrentStep: (step: number) => void
  updateStepDelta: (step: number, delta: Record<string, unknown>) => void
  saveStep: (step: number, delta: Record<string, unknown>) => Promise<void>
  flushCurrentStep: () => Promise<void>
  loadCharacter: (id: string) => Promise<void>
  validateStep: (step: number) => Promise<{ valid: boolean; errors: string[] }>
  createCharacter: () => Promise<void>
  resetCharacter: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [characterId, setCharacterIdState] = useState<string | null>(null)
  const [currentStep, setCurrentStepState] = useState(1)
  const [stepDeltas, setStepDeltas] = useState<Record<number, Record<string, unknown>>>({})

  const characterStats = useMemo(() => {
    return recalculateStats(stepDeltas) as CharacterStats
  }, [stepDeltas])

  const computeBaseStats = (upToStep: number): CharacterStats => {
    return recalculateStatsUpTo(stepDeltas, upToStep) as CharacterStats
  }

  const setCharacterId = (id: string) => {
    setCharacterIdState(id)
  }

  const setCurrentStep = (step: number) => {
    setCurrentStepState(step)
  }

  const updateStepDelta = (step: number, delta: Record<string, unknown>) => {
    setStepDeltas(prev => ({ ...prev, [step]: delta }))
  }

  const flushCurrentStep = async () => {
    if (!characterId) return
    const delta = stepDeltas[currentStep]
    if (!delta) return
    try {
      await fetch(`${API_BASE}/api/characters/${characterId}/steps/${currentStep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
    } catch (err) {
      console.error('flushCurrentStep failed:', err)
    }
  }

  const loadCharacter = async (characterId: string) => {
    try {
      const stepPromises = Array.from({ length: 7 }, (_, i) =>
        fetch(`${API_BASE}/api/characters/${characterId}/steps/${i + 1}`)
          .then(r => r.json())
          .then(d => [i + 1, d.delta || {}] as const)
          .catch(() => [i + 1, {}] as const)
      )
      const stepResults = await Promise.all(stepPromises)
      const deltas: Record<number, Record<string, unknown>> = {}
      for (const [step, delta] of stepResults) {
        deltas[step] = delta
      }
      setStepDeltas(deltas)
    } catch (err) {
      console.error('loadCharacter failed:', err)
    }
  }

  const saveStep = async (step: number, delta: Record<string, unknown>) => {
    if (!characterId) return
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (!res.ok) throw new Error('Failed to save step')
      await res.json()
      setStepDeltas(prev => ({ ...prev, [step]: delta }))
    } catch (err) {
      console.error('saveStep failed:', err)
    }
  }

  const validateStep = async (step: number): Promise<{ valid: boolean; errors: string[] }> => {
    if (!characterId) return { valid: true, errors: [] }
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}/validate`, {
        method: 'POST',
      })
      if (!res.ok) return { valid: true, errors: [] }
      return await res.json()
    } catch (err) {
      console.error('validateStep failed:', err)
      return { valid: true, errors: [] }
    }
  }

  const createCharacter = async () => {
    const res = await fetch(`${API_BASE}/api/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Neuer Charakter' }),
    })
    const character = await res.json()
    setCharacterIdState(character.id)
    setStepDeltas({})
  }

  const resetCharacter = () => {
    setCharacterIdState(null)
    setCurrentStepState(1)
    setStepDeltas({})
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/characters`)
      .then(res => res.json())
      .then((characters: CharacterData[]) => {
        if (characters.length > 0) {
          const id = characters[0].id
          setCharacterIdState(id)
          loadCharacter(id)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <AppContext.Provider
      value={{
        characterId,
        currentStep,
        characterStats,
        stepDeltas,
        computeBaseStats,
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
