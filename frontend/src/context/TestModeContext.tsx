import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

type StepFill = () => void

interface TestModeContextValue {
  /** Serverseitig aus SYSTEM=TEST gelesen – nie clientseitig umschaltbar. */
  testMode: boolean
  /** Zufallsfüll-Funktion des aktuell sichtbaren Wizard-Schritts. */
  stepFillRef: MutableRefObject<StepFill | null>
}

const TestModeContext = createContext<TestModeContextValue | null>(null)

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [testMode, setTestMode] = useState(false)
  const stepFillRef = useRef<StepFill | null>(null)

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/api/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { testMode?: unknown }) => {
        if (active) setTestMode(data.testMode === true)
      })
      .catch(() => {
        if (active) setTestMode(false)
      })
    return () => { active = false }
  }, [])

  return (
    <TestModeContext.Provider value={{ testMode, stepFillRef }}>
      {children}
    </TestModeContext.Provider>
  )
}

export function useTestMode(): TestModeContextValue {
  const context = useContext(TestModeContext)
  if (!context) {
    throw new Error('useTestMode must be used within TestModeProvider')
  }
  return context
}

/**
 * Registriert die Zufallsfüll-Funktion des gerade sichtbaren Schritts. Sie
 * wird bei jedem Render aktualisiert, damit sie immer die aktuellen
 * Komponenten-State-Werte (und geladene Bibliotheksdaten) sieht.
 *
 * `ready` false bedeutet: benötigte Daten laden noch. Ein Klick in diesem
 * Moment wird nachgeholt, sobald die Daten verfügbar sind.
 */
export function useStepFill(fill: StepFill, ready = true): boolean {
  const { testMode, stepFillRef } = useTestMode()
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!testMode) {
      stepFillRef.current = null
      return
    }
    const run = () => {
      if (ready) fill()
      else pendingRef.current = true
    }
    stepFillRef.current = run
    return () => {
      if (stepFillRef.current === run) stepFillRef.current = null
    }
  })

  useEffect(() => {
    if (!testMode || !ready || !pendingRef.current) return
    pendingRef.current = false
    fill()
  })

  return testMode
}
