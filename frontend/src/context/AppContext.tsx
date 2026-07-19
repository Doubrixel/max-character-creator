import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export interface CharacterData {
  id: string
  [key: string]: unknown
}

interface AppContextType {
  characterId: string | null
  currentStep: number
  setCharacterId: (id: string) => void
  setCurrentStep: (step: number) => void
  stepData: Record<string, unknown> | null
  setStepData: (data: Record<string, unknown> | null) => void
  characterData: Record<string, unknown>
  saveStep: (step: number, data: Record<string, unknown>) => Promise<void>
  loadStep: (step: number) => Promise<void>
  createCharacter: () => Promise<void>
  resetCharacter: () => void
  getAggregatedSkillPoints: () => Record<string, number>
  getAggregatedData: () => Record<string, unknown>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [characterId, setCharacterIdState] = useState<string | null>(null)
  const [currentStep, setCurrentStepState] = useState(1)
  const [stepData, setStepData] = useState<Record<string, unknown> | null>(null)
  const [characterData, setCharacterData] = useState<Record<string, unknown>>({})
  const [_loadingStep, setLoadingStep] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/characters`)
      .then(res => res.json())
      .then((characters: CharacterData[]) => {
        if (characters.length > 0) {
          setCharacterIdState(characters[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const loadStep = useCallback(async (step: number) => {
    if (!characterId) return
    setLoadingStep(true)
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`)
      if (!res.ok) {
        setStepData(null)
        return
      }
      const json = await res.json()
      const data = json.data ?? null
      setStepData(data)
      if (data) {
        setCharacterData(prev => ({
          ...prev,
          [`step${step}`]: data,
        }))
      }
    } catch {
      setStepData(null)
    } finally {
      setLoadingStep(false)
    }
  }, [characterId])

  useEffect(() => {
    if (characterId) {
      loadStep(currentStep)
    }
  }, [characterId, currentStep, loadStep])

  const setCharacterId = (id: string) => {
    setCharacterIdState(id)
  }

  const setCurrentStep = (step: number) => {
    setCurrentStepState(step)
  }

  const saveStep = async (step: number, data: Record<string, unknown>) => {
    if (!characterId) return
    try {
      await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      setCharacterData(prev => ({
        ...prev,
        [`step${step}`]: data,
      }))
    } catch (err) {
      console.error('saveStep failed:', err)
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
    setCharacterData({})
  }

  const resetCharacter = () => {
    setCharacterIdState(null)
    setCurrentStepState(1)
    setStepData(null)
    setCharacterData({})
  }

  const getAggregatedSkillPoints = useCallback((): Record<string, number> => {
    const skillPoints: Record<string, number> = {}
    for (let step = 1; step <= 7; step++) {
      const stepKey = `step${step}`
      const data = characterData[stepKey]
      if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>
        for (const [key, value] of Object.entries(record)) {
          if (key.endsWith('Points') || key.endsWith('SkillPoints') || key === 'points') {
            if (typeof value === 'number') {
              const skillName = key.replace(/Points?$/, '').replace(/Skill$/, '')
              skillPoints[skillName || key] = (skillPoints[skillName || key] || 0) + value
            }
          }
          if (typeof value === 'object' && value !== null) {
            const nested = value as Record<string, unknown>
            for (const [nestedKey, nestedValue] of Object.entries(nested)) {
              if (typeof nestedValue === 'number') {
                skillPoints[nestedKey] = (skillPoints[nestedKey] || 0) + nestedValue
              }
            }
          }
        }
      }
    }
    return skillPoints
  }, [characterData])

  const getAggregatedData = useCallback((): Record<string, unknown> => {
    return characterData
  }, [characterData])

  return (
    <AppContext.Provider
      value={{
        characterId,
        currentStep,
        setCharacterId,
        setCurrentStep,
        stepData,
        setStepData,
        characterData,
        saveStep,
        loadStep,
        createCharacter,
        resetCharacter,
        getAggregatedSkillPoints,
        getAggregatedData,
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
