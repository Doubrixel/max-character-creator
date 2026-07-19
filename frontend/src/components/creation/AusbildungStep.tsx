import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const STAERKEN_POINTS = 2
const FERTIGKEITEN_POINTS = 30
const RESSOURCEN_POINTS = 2
const MAGIC_MAX_PER_STEP = 3
const MAGIC_MAX_TOTAL = 4
const TALENT_WAFFEN_MAX = 6

interface SkillItem {
  id: string
  name: string
  description: string
  config: { kategorie: 'talent' | 'waffe' | 'magie' }
}

interface ResourceItem {
  id: string
  name: string
  description: string
  config: { startwert: number; maximalwert: number; typ: string }
}

interface StrengthItem {
  id: string
  name: string
  description: string | null
  config: string | null
}

interface AusbildungStepProps {
  onValid: (valid: boolean) => void
}

export default function AusbildungStep({ onValid }: AusbildungStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, saveStep } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [talents, setTalents] = useState<{ id: string; name: string }[]>([])
  const [weapons, setWeapons] = useState<{ id: string; name: string }[]>([])
  const [magicSchools, setMagicSchools] = useState<{ id: string; name: string }[]>([])
  const [ressourcenData, setRessourcenData] = useState<{ id: string; name: string; desc: string }[]>([])
  const [staerkenData, setStaerkenData] = useState<{ id: string; name: string; desc: string }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [staerken, setStaerken] = useState<string[]>([])
  const [ressourcen, setRessourcen] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)


  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/resources`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/strengths`).then((r) => r.json()),
    ])
      .then(([skillsData, resourcesData, strengthsData]: [SkillItem[], ResourceItem[], StrengthItem[]]) => {
        setTalents(skillsData.filter((s) => s.config.kategorie === 'talent').map((s) => ({ id: s.id, name: s.name })))
        setWeapons(skillsData.filter((s) => s.config.kategorie === 'waffe').map((s) => ({ id: s.id, name: s.name })))
        setMagicSchools(skillsData.filter((s) => s.config.kategorie === 'magie').map((s) => ({ id: s.id, name: s.name })))
        setRessourcenData(resourcesData.map((r) => ({ id: r.id, name: r.name, desc: r.description })))
        setStaerkenData(strengthsData.map((s) => ({ id: s.id, name: s.name, desc: s.description || '' })))
      })
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [])

  function buildMagicValues(s: Record<string, number>): Record<string, number> {
    const magicValues: Record<string, number> = {}
    for (const [skillId, value] of Object.entries(s)) {
      if (magicSchools.some(m => m.id === skillId)) {
        magicValues[skillId] = value
      }
    }
    return magicValues
  }

  useEffect(() => {
    if (initializedRef.current) return
    if (dataLoading) return
    if (talents.length === 0) return
    initializedRef.current = true

    const saved = stepData as {
      skills?: Record<string, number>
      staerken?: string[]
      ressourcen?: string[]
      magic?: Record<string, number>
    } | null

    const allSkills = [...talents, ...weapons, ...magicSchools]
    const initialSkills: Record<string, number> = {}
    allSkills.forEach((s) => {
      const base = baseSkills[s.id] ?? 0
      const mine = saved?.skills?.[s.id] ?? 0
      initialSkills[s.id] = base + mine
    })

    setSkills(initialSkills)
    setStaerken(saved?.staerken ?? [])
    setRessourcen(saved?.ressourcen ?? [])
    setInitialized(true)
  }, [stepData, dataLoading, talents, weapons, magicSchools])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const fertigkeitenUsed = Object.entries(skills)
    .filter(([id]) => !magicSchools.some((m) => m.id === id))
    .reduce((sum, [id, v]) => sum + Math.max(0, v - (baseSkills[id] ?? 0)), 0)

  const fertigkeitenAvailable = FERTIGKEITEN_POINTS - fertigkeitenUsed

  const staerkenUsed = staerken.length
  const staerkenAvailable = STAERKEN_POINTS - staerkenUsed

  const ressourcenUsed = ressourcen.length
  const ressourcenAvailable = RESSOURCEN_POINTS - ressourcenUsed

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
      const addedThisStep = current - (baseSkills[id] ?? 0)
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
      const addedThisStep = (current + 1) - (baseSkills[id] ?? 0)
      if (addedThisStep > MAGIC_MAX_PER_STEP) return
      if (current + 1 > MAGIC_MAX_TOTAL) return
    }

    if (!isMagic && fertigkeitenAvailable <= 0) return

    const next = { ...skills, [id]: current + 1 }
    setSkills(next)
    const step5Only: Record<string, number> = {}
    for (const [sid, val] of Object.entries(next)) {
      const base = baseSkills[sid] ?? 0
      if (val > base) step5Only[sid] = val - base
    }
    saveStep(5, { skills: step5Only, staerken, ressourcen, magic: buildMagicValues(next) })
  }

  const decrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    if (current <= (baseSkills[id] ?? 0)) return
    const next = { ...skills, [id]: current - 1 }
    setSkills(next)
    const step5Only: Record<string, number> = {}
    for (const [sid, val] of Object.entries(next)) {
      const base = baseSkills[sid] ?? 0
      if (val > base) step5Only[sid] = val - base
    }
    saveStep(5, { skills: step5Only, staerken, ressourcen, magic: buildMagicValues(next) })
  }

  const handleStaerke = (id: string) => {
    if (staerken.includes(id)) {
      const next = staerken.filter((s) => s !== id)
      setStaerken(next)
      saveStep(5, { skills, staerken: next, ressourcen, magic: buildMagicValues(skills) })
    } else {
      if (staerkenAvailable <= 0) return
      const next = [...staerken, id]
      setStaerken(next)
      saveStep(5, { skills, staerken: next, ressourcen, magic: buildMagicValues(skills) })
    }
  }

  const handleRessource = (id: string) => {
    if (ressourcen.includes(id)) {
      const next = ressourcen.filter((r) => r !== id)
      setRessourcen(next)
      saveStep(5, { skills, staerken, ressourcen: next, magic: buildMagicValues(skills) })
    } else {
      if (ressourcenAvailable <= 0) return
      const next = [...ressourcen, id]
      setRessourcen(next)
      saveStep(5, { skills, staerken, ressourcen: next, magic: buildMagicValues(skills) })
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
            const canDec = value > (baseSkills[item.id] ?? 0)
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
      {dataLoading && <div style={styles.loading}>Lade Daten...</div>}

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
  loading: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 24,
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
    color: 'var(--success)',
    padding: '12px 16px',
    background: 'var(--bg-primary)',
    borderRadius: 8,
    textAlign: 'center',
  },
  counterZero: {
    color: 'var(--accent)',
  },
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '8px 12px',
    fontSize: 14,
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-dark)',
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
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
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
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  staerkeCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
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
    color: 'var(--text-secondary)',
  },
  ressourcenGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
  },
  ressourceCard: {
    padding: 14,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  ressourceCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
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
    color: 'var(--text-secondary)',
  },
}
