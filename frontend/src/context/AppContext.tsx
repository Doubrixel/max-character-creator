import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  saveStep: (step: number, data: Record<string, unknown>) => Promise<void>
  loadStep: (step: number) => Promise<void>
  createCharacter: () => Promise<void>
  resetCharacter: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [characterId, setCharacterIdState] = useState<string | null>(null)
  const [currentStep, setCurrentStepState] = useState(1)
  const [stepData, setStepData] = useState<Record<string, unknown> | null>(null)

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

  useEffect(() => {
    if (characterId) {
      loadStep(currentStep)
    }
  }, [characterId, currentStep])

  const setCharacterId = (id: string) => {
    setCharacterIdState(id)
  }

  const setCurrentStep = async (step: number) => {
    if (characterId && step !== currentStep) {
      setCurrentStepState(step)
    }
  }

  const saveStep = async (step: number, data: Record<string, unknown>) => {
    if (!characterId) return
    await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
  }

  const loadStep = async (step: number) => {
    if (!characterId) return
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}/steps/${step}`)
      const json = await res.json()
      setStepData(json.data)
    } catch {
      setStepData(null)
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
  }

  const resetCharacter = () => {
    setCharacterIdState(null)
    setCurrentStepState(1)
    setStepData(null)
  }

  return (
    <AppContext.Provider
      value={{
        characterId,
        currentStep,
        setCharacterId,
        setCurrentStep,
        stepData,
        setStepData,
        saveStep,
        loadStep,
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
