import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const INITIAL_POINTS = 20

interface SkillItem {
  id: string
  name: string
  description: string
  config: { kategorie: string; [key: string]: unknown }
}

interface StrengthItem {
  id: string
  name: string
  description: string | null
  config: string | null
}

interface MeisterschaftItem {
  id: string
  name: string
  kategorieName: string
  schwelle: number
  effekt: string
}

interface KulturStepProps {
  onValid: (valid: boolean) => void
}

export default function KulturStep({ onValid }: KulturStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [talents, setTalents] = useState<{ id: string; name: string }[]>([])
  const [weapons, setWeapons] = useState<{ id: string; name: string }[]>([])
  const [magicSchools, setMagicSchools] = useState<{ id: string; name: string }[]>([])
  const [staerkenData, setStaerkenData] = useState<{ id: string; name: string; desc: string }[]>([])
  const [meisterschaftenData, setMeisterschaftenData] = useState<MeisterschaftItem[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [staerke, setStaerke] = useState<string>('')
  const [meisterschaftSkill, setMeisterschaftSkill] = useState<string>('')
  const [meisterschaft, setMeisterschaft] = useState<string>('')
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/strengths`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/masteries`).then((r) => r.json()),
    ])
      .then(([skillsData, strengthsData, masteriesData]: [SkillItem[], StrengthItem[], any[]]) => {
        const raw: { id: string; name: string; description: string; config: unknown }[] = skillsData as any
        const parsed: SkillItem[] = raw.map((s) => {
          const cfg = typeof s.config === 'string' ? JSON.parse(s.config) : (s.config ?? {})
          return { id: s.id, name: s.name, description: s.description, config: cfg }
        })
        setTalents(parsed.filter((s) => s.config.kategorie === 'fertigkeit').map((s) => ({ id: s.id, name: s.name })))
        setWeapons(parsed.filter((s) => s.config.kategorie === 'kampf').map((s) => ({ id: s.id, name: s.name })))
        setMagicSchools(parsed.filter((s) => s.config.kategorie === 'magie').map((s) => ({ id: s.id, name: s.name })))
        setStaerkenData(strengthsData.map((s) => ({ id: s.id, name: s.name, desc: s.description || '' })))
        setMeisterschaftenData(masteriesData.map((m) => {
          const cfg = m.config ? JSON.parse(m.config) : {}
          return {
            id: m.id,
            name: m.name,
            kategorieName: cfg.kategorie_name || '',
            schwelle: parseInt(cfg.schwelle) || 1,
            effekt: cfg.effekt || m.description || '',
          }
        }))
      })
      .catch(() => {})
      .finally(() => setSkillsLoading(false))
  }, [])

  const usedPoints = Object.values(skills).reduce((a, b) => a + b, 0)
  const availablePoints = INITIAL_POINTS - usedPoints

  useEffect(() => {
    if (initializedRef.current) return
    if (skillsLoading) return
    if (talents.length === 0) return
    initializedRef.current = true

    const saved = stepData as {
      skills?: Record<string, number>
      staerke?: string
      meisterschaft?: string
    } | null

    const allSkills = [...talents, ...weapons, ...magicSchools]
    const initialSkills: Record<string, number> = {}
    allSkills.forEach((s) => {
      initialSkills[s.id] = baseSkills[s.id] ?? saved?.skills?.[s.id] ?? 0
    })

    setSkills(initialSkills)
    setStaerke(saved?.staerke ?? '')
    setMeisterschaft(saved?.meisterschaft ?? '')
    setInitialized(true)
  }, [stepData, skillsLoading, talents, weapons, magicSchools])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  useEffect(() => {
    if (!initialized) return
    const eligible = Object.entries(skills)
      .filter(([, v]) => v >= 1)
      .map(([id]) => id)
    if (meisterschaftSkill && !eligible.includes(meisterschaftSkill)) {
      setMeisterschaftSkill('')
      setMeisterschaft('')
    }
  }, [skills, meisterschaftSkill, initialized])

  useEffect(() => {
    if (!initialized) return
    const valid = staerke !== '' && meisterschaft !== ''
    onValid(valid)
  }, [staerke, meisterschaft, onValid, initialized])

  const incrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    const max = getSkillMax(id)
    if (availablePoints <= 0 || current >= max) return
    const next = { ...skills, [id]: current + 1 }
    setSkills(next)
    const myOnly: Record<string, number> = {}
    for (const [sid, val] of Object.entries(next)) {
      const base = baseSkills[sid] ?? 0
      if (val > base) myOnly[sid] = val - base
    }
    updateStepDelta(4, { skills: myOnly, staerke, meisterschaft })
  }

  const decrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    if (current <= (baseSkills[id] ?? 0)) return
    const next = { ...skills, [id]: current - 1 }
    setSkills(next)
    const myOnly: Record<string, number> = {}
    for (const [sid, val] of Object.entries(next)) {
      const base = baseSkills[sid] ?? 0
      if (val > base) myOnly[sid] = val - base
    }
    updateStepDelta(4, { skills: myOnly, staerke, meisterschaft })
  }

  const getSkillMax = (_id: string): number => {
    return 6;
  }

  const handleStaerke = (id: string) => {
    setStaerke(id)
    updateStepDelta(4, { skills, staerke: id, meisterschaft })
  }

  const handleMeisterschaftSkill = (id: string) => {
    setMeisterschaftSkill(id)
    setMeisterschaft('')
  }

  const handleMeisterschaft = (id: string) => {
    setMeisterschaft(id)
    updateStepDelta(4, { skills, staerke, meisterschaft: id })
  }

  const eligibleSkills = Object.entries(skills)
    .filter(([, v]) => v >= 1)
    .map(([id]) => {
      const all = [...talents, ...weapons, ...magicSchools]
      return all.find((s) => s.id === id)!
    })

  const selectedSkillName = eligibleSkills.find((s) => s.id === meisterschaftSkill)?.name ?? ''

  const availableMeisterschaften = meisterschaftenData.filter(
    (m) => m.kategorieName === selectedSkillName && m.schwelle === 1
  )

  const renderSkillSection = (title: string, items: { id: string; name: string }[]) => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Skill</th>
            <th style={styles.th}>Wert</th>
            <th style={styles.th}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const value = skills[item.id] ?? 0
            const max = getSkillMax(item.id)
            const canInc = availablePoints > 0 && value < max
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
      {skillsLoading && <div style={styles.loading}>Lade Skills...</div>}

      <div style={{ ...styles.counter, ...(availablePoints === 0 ? styles.counterZero : {}) }}>
        Verfügbare Punkte: {availablePoints}
      </div>

      <div style={styles.skillRow}>
        <div style={styles.skillCol}>
          {renderSkillSection('Fertigkeiten', talents)}
        </div>
        <div style={styles.skillCol}>
          {renderSkillSection('Kampffertigkeiten', weapons)}
          {renderSkillSection('Magieschulen', magicSchools)}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Stärke wählen</h3>
        <div style={styles.staerkenGrid}>
          {staerkenData.map((s) => (
            <button
              key={s.id}
              style={{ ...styles.staerkeCard, ...(staerke === s.id ? styles.staerkeCardSelected : {}) }}
              onClick={() => handleStaerke(s.id)}
            >
              <span style={styles.staerkeName}>{s.name}</span>
              <span style={styles.staerkeDesc}>{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Meisterschaft wählen</h3>
        <div style={styles.meisterschaftRow}>
          <select
            value={meisterschaftSkill}
            onChange={(e) => handleMeisterschaftSkill(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Skill wählen --</option>
            {eligibleSkills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {meisterschaftSkill && (
            <div style={styles.meisterschaftOptions}>
              {availableMeisterschaften.map((m) => (
                <button
                  key={m.id}
                  style={{ ...styles.meisterschaftBtn, ...(meisterschaft === m.id ? styles.meisterschaftBtnSelected : {}) }}
                  onClick={() => handleMeisterschaft(m.id)}
                >
                  <span>{m.name}</span>
                  {m.effekt && <span style={styles.meisterschaftEffekt}>{m.effekt}</span>}
                </button>
              ))}
              {availableMeisterschaften.length === 0 && (
                <span style={styles.noMeisterschaft}>Keine Meisterschaft verfügbar</span>
              )}
            </div>
          )}
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
  skillRow: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
  },
  skillCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    flex: 1,
    minWidth: 0,
  },
  loading: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 24,
  },
  counter: {
    fontSize: 18,
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
  staerkeName: {
    fontSize: 15,
    fontWeight: 600,
  },
  staerkeDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  meisterschaftRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  select: {
    padding: '10px 14px',
    fontSize: 14,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  meisterschaftOptions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  meisterschaftBtn: {
    padding: '10px 20px',
    fontSize: 14,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'left',
  },
  meisterschaftBtnSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
  },
  meisterschaftEffekt: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  noMeisterschaft: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
}
