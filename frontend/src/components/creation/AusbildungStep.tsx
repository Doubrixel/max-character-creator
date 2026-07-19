import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const STAERKEN_POINTS = 2
const FERTIGKEITEN_POINTS = 30
const RESSOURCEN_POINTS = 2
const MAGIC_MAX_PER_STEP = 3
const MAGIC_MAX_TOTAL = 4
const TALENT_WAFFEN_MAX = 6

const talents = [
  { id: 'akrobatik', name: 'Akrobatik' },
  { id: 'schleichen', name: 'Schleichen' },
  { id: 'wahrnehmung', name: 'Wahrnehmung' },
  { id: 'ueberleben', name: 'Überleben' },
  { id: 'wissen', name: 'Wissen' },
]

const weapons = [
  { id: 'nahkampf', name: 'Nahkampf' },
  { id: 'distanz', name: 'Distanz' },
  { id: 'schild', name: 'Schild' },
]

const magicSchools = [
  { id: 'elementar', name: 'Elementarmagie' },
  { id: 'heilung', name: 'Heilungsmagie' },
]

const staerkenData = [
  { id: 'zaeh', name: 'Zäh', desc: '+1 Widerstand gegen physische Angriffe' },
  { id: 'schnell', name: 'Schnell', desc: '+1 Initiative in der ersten Kampfrunde' },
  { id: 'scharfsinn', name: 'Scharfsinn', desc: '+1 auf alle Wahrnehmungsproben' },
  { id: 'charisma', name: 'Charisma', desc: '+1 auf soziale Proben' },
]

const ressourcenData = [
  { id: 'lp', name: 'Lebenspunkte', desc: '+5 maximale Lebenspunkte' },
  { id: 'mp', name: 'Magiepunkte', desc: '+3 maximale Magiepunkte' },
  { id: 'ap', name: 'Ausdauerpunkte', desc: '+5 maximale Ausdauerpunkte' },
]

interface AusbildungStepProps {
  onValid: (valid: boolean) => void
}

export default function AusbildungStep({ onValid }: AusbildungStepProps) {
  const { stepData, saveStep } = useAppContext()

  const [skills, setSkills] = useState<Record<string, number>>({})
  const [staerken, setStaerken] = useState<string[]>([])
  const [ressourcen, setRessourcen] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const prevStepDataRef = useRef<Record<string, unknown> | null | undefined>(undefined)

  const savedSkills = (stepData as { skills?: Record<string, number> } | null)?.skills ?? {}

  function stepDataHasChanged(prev: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null): boolean {
    if (prev === undefined) return true
    if (prev === null && next === null) return false
    if (prev === null || next === null) return true
    const prevKeys = Object.keys(prev)
    const nextKeys = Object.keys(next)
    if (prevKeys.length !== nextKeys.length) return true
    for (const key of nextKeys) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) return true
    }
    return false
  }

  useEffect(() => {
    const hasChanged = stepDataHasChanged(prevStepDataRef.current, stepData)
    if (!hasChanged) return
    prevStepDataRef.current = stepData

    const saved = stepData as {
      skills?: Record<string, number>
      staerken?: string[]
      ressourcen?: string[]
    } | null

    const allSkills = [...talents, ...weapons, ...magicSchools]
    const initialSkills: Record<string, number> = {}
    allSkills.forEach((s) => {
      initialSkills[s.id] = saved?.skills?.[s.id] ?? 0
    })

    setSkills(initialSkills)
    setStaerken(saved?.staerken ?? [])
    setRessourcen(saved?.ressourcen ?? [])
    setInitialized(true)
  }, [stepData])

  const fertigkeitenUsed = Object.entries(skills)
    .filter(([id]) => !magicSchools.some((m) => m.id === id))
    .reduce((sum, [, v]) => sum + v, 0)

  const fertigkeitenAvailable = FERTIGKEITEN_POINTS - fertigkeitenUsed

  const staerkenUsed = staerken.length
  const staerkenAvailable = STAERKEN_POINTS - staerkenUsed

  const ressourcenUsed = ressourcen.length
  const ressourcenAvailable = RESSOURCEN_POINTS - ressourcenUsed

  useEffect(() => {
    const saved = stepData as {
      skills?: Record<string, number>
      staerken?: string[]
      ressourcen?: string[]
    } | null

    const allSkills = [...talents, ...weapons, ...magicSchools]
    const initialSkills: Record<string, number> = {}
    allSkills.forEach((s) => {
      initialSkills[s.id] = saved?.skills?.[s.id] ?? 0
    })

    setSkills(initialSkills)
    setStaerken(saved?.staerken ?? [])
    setRessourcen(saved?.ressourcen ?? [])
    setInitialized(true)
  }, [stepData])

  useEffect(() => {
    if (!initialized) return
    const valid =
      staerkenAvailable === 0 &&
      fertigkeitenAvailable === 0 &&
      ressourcenAvailable === 0
    onValid(valid)
  }, [staerkenAvailable, fertigkeitenAvailable, ressourcenAvailable, onValid, initialized])

  const getSkillMax = (id: string): number => {
    if (talents.some((t) => t.id === id) || weapons.some((w) => w.id === id)) {
      return TALENT_WAFFEN_MAX
    }
    if (magicSchools.some((m) => m.id === id)) {
      const current = skills[id] ?? 0
      const addedThisStep = current - (savedSkills[id] ?? 0)
      if (addedThisStep >= MAGIC_MAX_PER_STEP) return current
      if (current >= MAGIC_MAX_TOTAL) return current
      return current + 1
    }
    return TALENT_WAFFEN_MAX
  }

  const incrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    const max = getSkillMax(id)
    if (current >= max) return

    const isMagic = magicSchools.some((m) => m.id === id)
    if (isMagic) {
      const addedThisStep = (current + 1) - (savedSkills[id] ?? 0)
      if (addedThisStep > MAGIC_MAX_PER_STEP) return
      if (current + 1 > MAGIC_MAX_TOTAL) return
    }

    if (!isMagic && fertigkeitenAvailable <= 0) return

    const next = { ...skills, [id]: current + 1 }
    setSkills(next)
    saveStep(5, { skills: next, staerken, ressourcen })
  }

  const decrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    const baseValue = savedSkills[id] ?? 0
    if (current <= baseValue) return
    const next = { ...skills, [id]: current - 1 }
    setSkills(next)
    saveStep(5, { skills: next, staerken, ressourcen })
  }

  const handleStaerke = (id: string) => {
    if (staerken.includes(id)) {
      const next = staerken.filter((s) => s !== id)
      setStaerken(next)
      saveStep(5, { skills, staerken: next, ressourcen })
    } else {
      if (staerkenAvailable <= 0) return
      const next = [...staerken, id]
      setStaerken(next)
      saveStep(5, { skills, staerken: next, ressourcen })
    }
  }

  const handleRessource = (id: string) => {
    if (ressourcen.includes(id)) {
      const next = ressourcen.filter((r) => r !== id)
      setRessourcen(next)
      saveStep(5, { skills, staerken, ressourcen: next })
    } else {
      if (ressourcenAvailable <= 0) return
      const next = [...ressourcen, id]
      setRessourcen(next)
      saveStep(5, { skills, staerken, ressourcen: next })
    }
  }

  const renderSkillSection = (title: string, items: { id: string; name: string }[]) => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Fertigkeit</th>
            <th style={styles.th}>Wert</th>
            <th style={styles.th}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const value = skills[item.id] ?? 0
            const max = getSkillMax(item.id)
            const isMagic = magicSchools.some((m) => m.id === item.id)
            const canInc = isMagic
              ? value < max
              : fertigkeitenAvailable > 0 && value < max
            const canDec = value > (savedSkills[item.id] ?? 0)
            return (
              <tr key={item.id}>
                <td style={styles.td}>{item.name}</td>
                <td style={{ ...styles.td, ...styles.valueCell }}>{value}</td>
                <td style={styles.td}>
                  <div style={styles.buttonGroup}>
                    <button
                      style={{ ...styles.pointButton, ...(canDec ? {} : styles.pointButtonDisabled) }}
                      onClick={() => decrementSkill(item.id)}
                      disabled={!canDec}
                    >
                      −
                    </button>
                    <button
                      style={{ ...styles.pointButton, ...(canInc ? {} : styles.pointButtonDisabled) }}
                      onClick={() => incrementSkill(item.id)}
                      disabled={!canInc}
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.counters}>
        <div style={{ ...styles.counter, ...(staerkenAvailable === 0 ? styles.counterZero : {}) }}>
          Stärken-Punkte: {staerkenAvailable}
        </div>
        <div style={{ ...styles.counter, ...(fertigkeitenAvailable === 0 ? styles.counterZero : {}) }}>
          Fertigkeits-Punkte: {fertigkeitenAvailable}
        </div>
        <div style={{ ...styles.counter, ...(ressourcenAvailable === 0 ? styles.counterZero : {}) }}>
          Ressourcen-Punkte: {ressourcenAvailable}
        </div>
      </div>

      {renderSkillSection('Talente', talents)}
      {renderSkillSection('Waffen', weapons)}
      {renderSkillSection('Magie', magicSchools)}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>2 Stärken wählen</h3>
        <div style={styles.staerkenGrid}>
          {staerkenData.map((s) => {
            const isSelected = staerken.includes(s.id)
            const isDisabled = !isSelected && staerkenAvailable <= 0
            return (
              <button
                key={s.id}
                style={{
                  ...styles.staerkeCard,
                  ...(isSelected ? styles.staerkeCardSelected : {}),
                  ...(isDisabled ? styles.staerkeCardDisabled : {}),
                }}
                onClick={() => handleStaerke(s.id)}
                disabled={isDisabled}
              >
                <span style={styles.staerkeName}>{s.name}</span>
                <span style={styles.staerkeDesc}>{s.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>2 Ressourcen steigern</h3>
        <div style={styles.ressourcenGrid}>
          {ressourcenData.map((r) => {
            const isSelected = ressourcen.includes(r.id)
            const isDisabled = !isSelected && ressourcenAvailable <= 0
            return (
              <button
                key={r.id}
                style={{
                  ...styles.ressourceCard,
                  ...(isSelected ? styles.ressourceCardSelected : {}),
                  ...(isDisabled ? styles.ressourceCardDisabled : {}),
                }}
                onClick={() => handleRessource(r.id)}
                disabled={isDisabled}
              >
                <span style={styles.ressourceName}>{r.name}</span>
                <span style={styles.ressourceDesc}>{r.desc}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    minHeight: 300,
  },
  counters: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  counter: {
    flex: 1,
    minWidth: 150,
    fontSize: 16,
    fontWeight: 700,
    color: '#4ade80',
    padding: '12px 16px',
    background: '#1a1a2e',
    borderRadius: 8,
    textAlign: 'center',
  },
  counterZero: {
    color: '#e94560',
  },
  section: {
    background: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 18,
    color: '#eee',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 13,
    color: '#aaa',
    borderBottom: '1px solid #333',
  },
  td: {
    padding: '8px 12px',
    fontSize: 14,
    color: '#eee',
    borderBottom: '1px solid #222',
  },
  valueCell: {
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 16,
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
  },
  pointButton: {
    width: 32,
    height: 32,
    fontSize: 18,
    fontWeight: 700,
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  staerkenGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  staerkeCard: {
    padding: 14,
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  staerkeCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
  },
  staerkeCardDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  staerkeName: {
    fontSize: 15,
    fontWeight: 600,
  },
  staerkeDesc: {
    fontSize: 12,
    color: '#aaa',
  },
  ressourcenGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
  },
  ressourceCard: {
    padding: 14,
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  ressourceCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
  },
  ressourceCardDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  ressourceName: {
    fontSize: 15,
    fontWeight: 600,
  },
  ressourceDesc: {
    fontSize: 12,
    color: '#aaa',
  },
}
