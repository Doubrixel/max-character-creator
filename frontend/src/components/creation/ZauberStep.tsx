import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import type { PickedItem, PflichtMeisterschaft } from '@mcc/shared'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  config: string | unknown | null
}

interface SkillRef {
  id: string
  name: string
  category: string
}

interface MasteryInfo {
  id: string
  name: string
  description: string
  effekt: string
  kategorieName: string | null
  schwelle: string | null
}

interface QualifyingSkill {
  id: string
  name: string
  category: string
  value: number
  pool: MasteryInfo[]
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

export default function ZauberStep({ onValid }: ZauberStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [masteries, setMasteries] = useState<MasteryInfo[]>([])
  const [skills, setSkills] = useState<SkillRef[]>([])
  const [pflicht, setPflicht] = useState<Record<string, PickedItem>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/masteries`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
    ])
      .then(([masteriesData, skillsData]: [LibraryItem[], LibraryItem[]]) => {
        setSkills(skillsData.map((s) => ({
          id: s.id,
          name: s.name,
          category: typeof parseConfig(s.config).kategorie === 'string' ? parseConfig(s.config).kategorie as string : '',
        })))

        setMasteries(masteriesData.map((m) => {
          const cfg = parseConfig(m.config)
          return {
            id: m.id,
            name: m.name,
            description: m.description ?? '',
            effekt: typeof cfg.effekt === 'string' ? cfg.effekt : (m.description ?? ''),
            kategorieName: typeof cfg.kategorie_name === 'string' ? cfg.kategorie_name : null,
            schwelle: typeof cfg.schwelle === 'string' ? cfg.schwelle : null,
          }
        }))
      })
      .catch(() => reportApiError('Meisterschaften konnten nicht geladen werden'))
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    if (dataLoading) return
    initializedRef.current = true

    const saved = stepData as { pflicht?: PflichtMeisterschaft[] } | null
    const restored: Record<string, PickedItem> = {}
    for (const p of saved?.pflicht ?? []) {
      restored[p.skillId] = p.meisterschaft
    }
    setPflicht(restored)
  }, [stepData, dataLoading])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const masteryMatchesSkill = (m: MasteryInfo, skill: SkillRef): boolean => {
    if (m.schwelle !== '1') return false
    if (m.kategorieName === skill.name) return true
    if (skill.category === 'kampf' && !['Schusswaffen', 'Wurfwaffen'].includes(skill.name) && m.kategorieName === 'Allgemeine Nahkampfmeisterschaften') return true
    if (skill.category === 'magie' && m.kategorieName === 'Allgemeine Magieschulen-Meisterschaften') return true
    return false
  }

  const qualifyingSkills: QualifyingSkill[] = skills
    .filter((s) => ['fertigkeit', 'kampf', 'magie'].includes(s.category))
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      value: baseSkills[s.id] ?? 0,
      pool: masteries.filter((m) => masteryMatchesSkill(m, s)),
    }))
    .filter((s) => s.value >= 6 && s.pool.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const missingCount = qualifyingSkills.filter((s) => !pflicht[s.id]).length
  const allCovered = missingCount === 0

  useEffect(() => {
    onValid(allCovered)
  }, [onValid, allCovered])

  const setPflichtForSkill = (skill: QualifyingSkill, m: PickedItem | null) => {
    const next = { ...pflicht }
    if (m) next[skill.id] = m
    else delete next[skill.id]
    setPflicht(next)
    updateStepDelta('Zauber', {
      pflicht: Object.entries(next).map(([skillId, meisterschaft]) => ({ skillId, meisterschaft })),
    })
  }

  if (dataLoading) {
    return <div style={styles.loading}>Lade Meisterschaften...</div>
  }

  if (qualifyingSkills.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.hint}>
          Keine Talent-, Kampf- oder Magie-Fertigkeit hat einen Wert von 6 oder mehr.
          Es sind keine Pflicht-Meisterschaften nötig.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <p style={styles.hint}>
        Für jede Talent-, Kampf- und Magie-Fertigkeit mit einem Wert von 6 oder mehr
        musst du genau eine Meisterschaft mit Schwelle 1 wählen.
      </p>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Pflicht-Meisterschaften</h3>
        {qualifyingSkills.map((skill) => {
          const selected = pflicht[skill.id]
          return (
            <div key={skill.id} style={styles.skillRow}>
              <div style={styles.skillInfo}>
                <span style={styles.skillName}>{skill.name}</span>
                <span style={styles.skillValue}>Wert {skill.value}</span>
              </div>
              <select
                style={styles.select}
                value={selected?.id ?? ''}
                onChange={(e) => {
                  const mastery = skill.pool.find((m) => m.id === e.target.value) ?? null
                  setPflichtForSkill(skill, mastery ? { id: mastery.id, name: mastery.name } : null)
                }}
              >
                <option value="">— Meisterschaft wählen —</option>
                {skill.pool.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {selected && skill.pool.find((m) => m.id === selected.id)?.effekt && (
                <span style={styles.masteryEffect}>
                  {skill.pool.find((m) => m.id === selected.id)?.effekt}
                </span>
              )}
            </div>
          )
        })}
        {missingCount > 0 && (
          <p style={styles.missingHint}>
            Noch {missingCount} Fertigkeit{missingCount > 1 ? 'en' : ''} ohne Meisterschaft.
          </p>
        )}
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
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  skillRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 12,
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '2px solid var(--border)',
  },
  skillInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  skillName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  skillValue: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'rgba(233, 69, 96, 0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  select: {
    padding: '8px 10px',
    fontSize: 14,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
  },
  masteryEffect: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  missingHint: {
    fontSize: 13,
    color: 'var(--accent)',
    margin: 0,
    fontWeight: 600,
  },
}
