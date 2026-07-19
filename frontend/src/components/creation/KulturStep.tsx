import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'

const INITIAL_POINTS = 20

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

const staerken = [
  { id: 'zaeh', name: 'Zäh', desc: '+1 Widerstand gegen physische Angriffe' },
  { id: 'schnell', name: 'Schnell', desc: '+1 Initiative in der ersten Kampfrunde' },
  { id: 'scharfsinn', name: 'Scharfsinn', desc: '+1 auf alle Wahrnehmungsproben' },
  { id: 'charisma', name: 'Charisma', desc: '+1 auf soziale Proben' },
]

const meisterschaften = [
  { id: 'meister-hieb', name: 'Meisterhieb', skillId: 'nahkampf' },
  { id: 'meisterschuss', name: 'Meisterschuss', skillId: 'distanz' },
  { id: 'arkaner-strom', name: 'Arkaner Strom', skillId: 'elementar' },
]

interface KulturStepProps {
  onValid: (valid: boolean) => void
}

export default function KulturStep({ onValid }: KulturStepProps) {
  const { stepData, saveStep } = useAppContext()

  const saved = stepData as {
    skills?: Record<string, number>
    staerke?: string
    meisterschaft?: string
  } | null

  const savedSkills = saved?.skills ?? {}
  const savedStaerke = saved?.staerke ?? ''
  const savedMeisterschaft = saved?.meisterschaft ?? ''

  const [skills, setSkills] = useState<Record<string, number>>(savedSkills)
  const [staerke, setStaerke] = useState<string>(savedStaerke)
  const [meisterschaftSkill, setMeisterschaftSkill] = useState<string>('')
  const [meisterschaft, setMeisterschaft] = useState<string>(savedMeisterschaft)

  const usedPoints = Object.values(skills).reduce((a, b) => a + b, 0)
  const availablePoints = INITIAL_POINTS - usedPoints

  useEffect(() => {
    const allSkills = [...talents, ...weapons, ...magicSchools]
    const initial: Record<string, number> = {}
    allSkills.forEach((s) => {
      initial[s.id] = savedSkills[s.id] ?? 0
    })
    setSkills(initial)
  }, [])

  useEffect(() => {
    const eligible = Object.entries(skills)
      .filter(([, v]) => v >= 1)
      .map(([id]) => id)
    if (meisterschaftSkill && !eligible.includes(meisterschaftSkill)) {
      setMeisterschaftSkill('')
      setMeisterschaft('')
    }
  }, [skills, meisterschaftSkill])

  useEffect(() => {
    const valid = staerke !== '' && meisterschaft !== ''
    onValid(valid)
  }, [staerke, meisterschaft, onValid])

  const incrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    const max = getSkillMax(id)
    if (availablePoints <= 0 || current >= max) return
    const next = { ...skills, [id]: current + 1 }
    setSkills(next)
    saveStep(4, { skills: next, staerke, meisterschaft })
  }

  const decrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    if (current <= 0) return
    const next = { ...skills, [id]: current - 1 }
    setSkills(next)
    saveStep(4, { skills: next, staerke, meisterschaft })
  }

  const getSkillMax = (id: string): number => {
    if (talents.some((t) => t.id === id) || weapons.some((w) => w.id === id)) return 6
    if (magicSchools.some((m) => m.id === id)) {
      const hasHigh = magicSchools.some(
        (m2) => (skills[m2.id] ?? 0) >= 3 && m2.id !== id
      )
      return hasHigh ? 2 : 3
    }
    return 6
  }

  const handleStaerke = (id: string) => {
    setStaerke(id)
    saveStep(4, { skills, staerke: id, meisterschaft })
  }

  const handleMeisterschaftSkill = (id: string) => {
    setMeisterschaftSkill(id)
    setMeisterschaft('')
  }

  const handleMeisterschaft = (id: string) => {
    setMeisterschaft(id)
    saveStep(4, { skills, staerke, meisterschaft: id })
  }

  const eligibleSkills = Object.entries(skills)
    .filter(([, v]) => v >= 1)
    .map(([id]) => {
      const all = [...talents, ...weapons, ...magicSchools]
      return all.find((s) => s.id === id)!
    })

  const availableMeisterschaften = meisterschaften.filter(
    (m) => m.skillId === meisterschaftSkill
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
            const canDec = value > 0
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
      <div style={{ ...styles.counter, ...(availablePoints === 0 ? styles.counterZero : {}) }}>
        Verfügbare Punkte: {availablePoints}
      </div>

      {renderSkillSection('Talente', talents)}
      {renderSkillSection('Waffen', weapons)}
      {renderSkillSection('Magie', magicSchools)}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Stärke wählen</h3>
        <div style={styles.staerkenGrid}>
          {staerken.map((s) => (
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
                  {m.name}
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
  counter: {
    fontSize: 18,
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
  staerkeName: {
    fontSize: 15,
    fontWeight: 600,
  },
  staerkeDesc: {
    fontSize: 12,
    color: '#aaa',
  },
  meisterschaftRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  select: {
    padding: '10px 14px',
    fontSize: 14,
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
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
    background: '#0f0f23',
    color: '#eee',
    border: '2px solid #333',
    borderRadius: 8,
    cursor: 'pointer',
  },
  meisterschaftBtnSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
  },
  noMeisterschaft: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
}
