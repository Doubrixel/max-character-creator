import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  config: string | unknown | null
}

interface SkillRef {
  id: string
  name: string
  isMagic: boolean
}

interface MasteryInfo {
  id: string
  name: string
  description: string
  effekt: string
  typ: string | null
  skillId: string | null
  skillName: string | null
  wert: number | null
}

interface SpellInfo {
  id: string
  name: string
  description: string
  effekt: string
  level: number
  schuleId: string | null
  schuleName: string
  required: number
}

interface PickedItem {
  id: string
  name: string
}

interface ZauberStepProps {
  onValid: (valid: boolean) => void
}

function parseConfig(config: string | unknown | null): Record<string, unknown> {
  if (typeof config === 'string') {
    try { return JSON.parse(config) } catch { return {} }
  }
  return (config ?? {}) as Record<string, unknown>
}

const SPELL_LEVEL_DEFAULT = { 0: 1, 1: 3, 2: 6 } as Record<number, number>

export default function ZauberStep({ onValid }: ZauberStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [masteries, setMasteries] = useState<MasteryInfo[]>([])
  const [spells, setSpells] = useState<SpellInfo[]>([])
  const [magicSkills, setMagicSkills] = useState<SkillRef[]>([])
  const [selectedMasteries, setSelectedMasteries] = useState<PickedItem[]>([])
  const [selectedZauber, setSelectedZauber] = useState<PickedItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/masteries`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/spells`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
    ])
      .then(([masteriesData, spellsData, skillsData]: [LibraryItem[], LibraryItem[], LibraryItem[]]) => {
        const skills: SkillRef[] = skillsData.map((s) => ({
          id: s.id,
          name: s.name,
          isMagic: parseConfig(s.config).kategorie === 'magie',
        }))
        const skillName = (id: string) => skills.find((sk) => sk.id === id)?.name ?? id

        setMagicSkills(skills.filter((sk) => sk.isMagic))

        setMasteries(masteriesData.map((m) => {
          const cfg = parseConfig(m.config)
          const typ = typeof cfg.voraussetzung_typ === 'string' ? cfg.voraussetzung_typ : null
          const skillId = typeof cfg.voraussetzung_id === 'string' ? cfg.voraussetzung_id : null
          const wert = typeof cfg.voraussetzung_wert === 'number' ? cfg.voraussetzung_wert : null
          return {
            id: m.id,
            name: m.name,
            description: m.description ?? '',
            effekt: typeof cfg.effekt === 'string' ? cfg.effekt : (m.description ?? ''),
            typ,
            skillId,
            skillName: skillId ? skillName(skillId) : null,
            wert,
          }
        }))

        setSpells(spellsData.map((sp) => {
          const cfg = parseConfig(sp.config)
          const level = typeof cfg.level === 'number' ? cfg.level : (parseInt(String(cfg.level ?? '0'), 10) || 0)
          const schuleId = typeof cfg.schule === 'string' ? cfg.schule : null
          const maxWert = typeof cfg.maxSchulenwert === 'number' ? cfg.maxSchulenwert : null
          return {
            id: sp.id,
            name: sp.name,
            description: sp.description ?? '',
            effekt: typeof cfg.effekt === 'string' ? cfg.effekt : (sp.description ?? ''),
            level,
            schuleId,
            schuleName: schuleId ? skillName(schuleId) : 'Allgemeine Magie',
            required: maxWert ?? SPELL_LEVEL_DEFAULT[level] ?? 1,
          }
        }))
      })
      .catch(() => reportApiError('Meisterschaften/Zauber konnten nicht geladen werden'))
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    if (dataLoading) return
    initializedRef.current = true

    const saved = stepData as { meisterschaften?: PickedItem[]; zauber?: PickedItem[] } | null
    setSelectedMasteries(saved?.meisterschaften ?? [])
    setSelectedZauber(saved?.zauber ?? [])
  }, [stepData, dataLoading])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  useEffect(() => {
    onValid(true)
  }, [onValid])

  const magicMax = Math.max(0, ...magicSkills.map((s) => baseSkills[s.id] ?? 0))

  const masteryAvailable = (m: MasteryInfo): boolean => {
    if (!m.typ || !m.skillId || m.wert === null) return true
    return (baseSkills[m.skillId] ?? 0) >= m.wert
  }

  const spellAvailable = (s: SpellInfo): boolean => {
    const value = s.schuleId ? (baseSkills[s.schuleId] ?? 0) : magicMax
    return value >= s.required
  }

  const masteryRequirementText = (m: MasteryInfo): string => {
    if (!m.typ || !m.skillId || m.wert === null) return 'Immer verfügbar'
    return `${m.typ === 'magie >= wert' ? 'Magie' : ''} ${m.skillName} ${m.wert}`
  }

  const toggleMastery = (m: MasteryInfo) => {
    if (!masteryAvailable(m)) return
    let next: PickedItem[]
    if (selectedMasteries.some((x) => x.id === m.id)) {
      next = selectedMasteries.filter((x) => x.id !== m.id)
    } else {
      next = [...selectedMasteries, { id: m.id, name: m.name }]
    }
    setSelectedMasteries(next)
    updateStepDelta('Zauber', { meisterschaften: next, zauber: selectedZauber })
  }

  const toggleZauber = (s: SpellInfo) => {
    if (!spellAvailable(s)) return
    let next: PickedItem[]
    if (selectedZauber.some((x) => x.id === s.id)) {
      next = selectedZauber.filter((x) => x.id !== s.id)
    } else {
      next = [...selectedZauber, { id: s.id, name: s.name }]
    }
    setSelectedZauber(next)
    updateStepDelta('Zauber', { meisterschaften: selectedMasteries, zauber: next })
  }

  if (dataLoading) {
    return <div style={styles.loading}>Lade Meisterschaften und Zauber...</div>
  }

  return (
    <div style={styles.container}>
      <p style={styles.hint}>
        Wähle Meisterschaften und Zauber, für die dein Charakter die Voraussetzungen erfüllt.
        Diese Auswahl ist optional.
      </p>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Meisterschaften</h3>
        {masteries.length === 0 && <div style={styles.empty}>Keine Meisterschaften in der Bibliothek.</div>}
        <div style={styles.grid}>
          {masteries.map((m) => {
            const available = masteryAvailable(m)
            const isSelected = selectedMasteries.some((x) => x.id === m.id)
            return (
              <button
                key={m.id}
                style={{
                  ...styles.card,
                  ...(isSelected ? styles.cardSelected : {}),
                  ...(!available ? styles.cardDisabled : {}),
                }}
                onClick={() => toggleMastery(m)}
                disabled={!available}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardName}>{m.name}</span>
                  <span style={styles.cardReq}>{masteryRequirementText(m)}</span>
                </div>
                {m.effekt && <span style={styles.cardDesc}>{m.effekt}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Zauber</h3>
        {spells.length === 0 && <div style={styles.empty}>Keine Zauber in der Bibliothek.</div>}
        <div style={styles.grid}>
          {spells.map((s) => {
            const available = spellAvailable(s)
            const isSelected = selectedZauber.some((x) => x.id === s.id)
            return (
              <button
                key={s.id}
                style={{
                  ...styles.card,
                  ...(isSelected ? styles.cardSelected : {}),
                  ...(!available ? styles.cardDisabled : {}),
                }}
                onClick={() => toggleZauber(s)}
                disabled={!available}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardName}>{s.name}</span>
                  <span style={styles.cardReq}>Stufe {s.level} · {s.schuleName} {s.required}</span>
                </div>
                {s.effekt && <span style={styles.cardDesc}>{s.effekt}</span>}
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
  hint: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  loading: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 24,
  },
  empty: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  card: {
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
  cardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
  },
  cardDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
  },
  cardReq: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'rgba(233, 69, 96, 0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
}
