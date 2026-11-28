import { useState, useEffect, useRef, ReactNode } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStepFill } from '../../context/TestModeContext'
import { distributePoints, pickExactCostSubset, pickRandom } from '../../testmode/random'
import {
  ALL_RESOURCES,
  readMehrfachConfig,
  anzahlStaerkenKarten,
  staerkenPunkteVerbrauch,
  zaehleStaerkenAuswahlen,
  maxAuswahlVonEintrag,
  istStaerkeNochWaehlbar,
  type StaerkenWahlEintrag,
} from '@mcc/shared'

const DEFAULT_SKILL_MAX = 6

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

interface PointDistributionStepProps {
  stepKey: 'ausbildung' | 'Hobbybedarf'
  onValid: (valid: boolean) => void
  skillPoints: number
  skillPointLabel: string
  staerkenPoints: number
  staerkenMaxKosten: number
  ressourcenPoints: number
  magicMaxPerStep?: number
  magicMaxTotal?: number
  footer?: (valid: boolean) => ReactNode
}

export default function PointDistributionStep({
  stepKey,
  onValid,
  skillPoints,
  skillPointLabel,
  staerkenPoints,
  staerkenMaxKosten,
  ressourcenPoints,
  magicMaxPerStep,
  magicMaxTotal,
  footer,
}: PointDistributionStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>
  const baseResources = (computeBaseStats(currentStep).ressourcen ?? {}) as Record<string, number>

  const [talents, setTalents] = useState<{ id: string; name: string }[]>([])
  const [weapons, setWeapons] = useState<{ id: string; name: string }[]>([])
  const [magicSchools, setMagicSchools] = useState<{ id: string; name: string }[]>([])
  const [staerkenData, setStaerkenData] = useState<{
    id: string; name: string; desc: string; kosten: number; kategorie: string;
    mehrfach: boolean; max: number | null;
  }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [staerken, setStaerken] = useState<string[]>([])
  const [resourceLevels, setResourceLevels] = useState<Record<string, number>>({})
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    Promise.all([
      fetch(`${API_BASE}/api/library/skills`).then((r) => r.json()),
      fetch(`${API_BASE}/api/library/strengths`).then((r) => r.json()),
    ])
      .then(([skillsData, strengthsData]: [SkillItem[], StrengthItem[]]) => {
        const raw: { id: string; name: string; description: string; config: unknown }[] = skillsData as any
        const parsed: SkillItem[] = raw.map((s) => {
          const cfg = typeof s.config === 'string' ? JSON.parse(s.config) : (s.config ?? {})
          return { id: s.id, name: s.name, description: s.description, config: cfg }
        })
        setTalents(parsed.filter((s) => s.config.kategorie === 'fertigkeit').map((s) => ({ id: s.id, name: s.name })))
        setWeapons(parsed.filter((s) => s.config.kategorie === 'kampf').map((s) => ({ id: s.id, name: s.name })))
        setMagicSchools(parsed.filter((s) => s.config.kategorie === 'magie').map((s) => ({ id: s.id, name: s.name })))
        setStaerkenData(strengthsData.map((s) => {
          const cfg = s.config ? JSON.parse(s.config) : {}
          const mehrfach = readMehrfachConfig(cfg)
          return {
            id: s.id,
            name: s.name,
            desc: s.description || '',
            kosten: parseInt(cfg.kosten) || 1,
            kategorie: cfg.kategorie || 'staerke',
            mehrfach: mehrfach.aktiv,
            max: mehrfach.max,
          }
        }).filter(s => s.kategorie !== 'rasse'))
      })
      .catch(() => reportApiError('Bibliotheksdaten konnten nicht geladen werden'))
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    if (dataLoading) return

    const allSkills = [...talents, ...weapons, ...magicSchools]
    if (allSkills.length === 0) return
    initializedRef.current = true

    const saved = stepData as {
      skills?: Record<string, number>
      staerken?: string[]
      ressourcen?: Record<string, number>
    } | null

    const initialSkills: Record<string, number> = {}
    allSkills.forEach((s) => {
      const base = baseSkills[s.id] ?? 0
      const mine = saved?.skills?.[s.id] ?? 0
      initialSkills[s.id] = base + mine
    })

    const initialResources: Record<string, number> = {}
    for (const name of ALL_RESOURCES) {
      const base = baseResources[name] ?? 0
      const mine = saved?.ressourcen?.[name] ?? 0
      initialResources[name] = base + mine
    }

    setSkills(initialSkills)
    setStaerken(saved?.staerken ?? [])
    setResourceLevels(initialResources)
    setInitialized(true)
  }, [stepData, dataLoading, talents, weapons, magicSchools])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const skillUsed = Object.entries(skills)
    .reduce((sum, [id, v]) => sum + Math.max(0, v - (baseSkills[id] ?? 0)), 0)

  const skillAvailable = skillPoints - skillUsed

  const countOf = (id: string): number => zaehleStaerkenAuswahlen(staerken, id)
  const maxOf = (s: { mehrfach: boolean; max: number | null }): number =>
    maxAuswahlVonEintrag(s)
  // INT-000029: Mehrfach wählbare Stärken bleiben auch nach Erreichen der
  // Obergrenze im Abschnitt, damit ihre gewählten Karten abwählbar bleiben.
  // Wie viele identische Karten je Stärke erscheinen, entscheidet
  // `anzahlStaerkenKarten` beim Rendern (gewählte Karten + eine weitere,
  // solange Obergrenze und Budget eine Auswahl erlauben).
  const eligibleStaerken = staerkenData.filter(
    (s) => s.kosten <= staerkenMaxKosten,
  )
  // INT-000027: Jede Auswahl zählt mit ihrem regulären Preis – auch die zweite
  // und jede weitere Auswahl derselben mehrfach wählbaren Stärke.
  const staerkenUsed = staerkenPunkteVerbrauch(
    staerken,
    (id) => staerkenData.find((x) => x.id === id)?.kosten ?? 1,
  )
  const staerkenAvailable = staerkenPoints - staerkenUsed

  const resourcesSpent = ALL_RESOURCES.reduce((sum, name) => {
    const base = baseResources[name] ?? 0
    const current = resourceLevels[name] ?? 0
    return sum + Math.max(0, current - base)
  }, 0)
  const ressourcenAvailable = ressourcenPoints - resourcesSpent

  useEffect(() => {
    if (!initialized) return
    const valid =
      staerkenAvailable === 0 &&
      skillAvailable === 0 &&
      ressourcenAvailable === 0
    onValid(valid)
  }, [staerkenAvailable, skillAvailable, ressourcenAvailable, onValid, initialized])

  const getSkillMax = (id: string): number => {
    const current = skills[id] ?? 0
    const isMagic = magicSchools.some((m) => m.id === id)
    if (isMagic && magicMaxPerStep !== undefined && magicMaxTotal !== undefined) {
      const addedThisStep = current - (baseSkills[id] ?? 0)
      if (addedThisStep >= magicMaxPerStep) return current
      if (current >= magicMaxTotal) return current
      return current + 1
    }
    return DEFAULT_SKILL_MAX
  }

  const stepSkillsOnly = (current: Record<string, number>): Record<string, number> => {
    const stepOnly: Record<string, number> = {}
    for (const [sid, val] of Object.entries(current)) {
      const base = baseSkills[sid] ?? 0
      if (val > base) stepOnly[sid] = val - base
    }
    return stepOnly
  }

  const stepResourcesOnly = (current: Record<string, number>): Record<string, number> => {
    const stepOnly: Record<string, number> = {}
    for (const name of ALL_RESOURCES) {
      const base = baseResources[name] ?? 0
      const val = current[name] ?? 0
      if (val > base) stepOnly[name] = val - base
    }
    return stepOnly
  }

  const persist = (nextSkills: Record<string, number>, nextStaerken: string[], nextResources: Record<string, number>) => {
    updateStepDelta(stepKey, { skills: stepSkillsOnly(nextSkills), staerken: nextStaerken, ressourcen: stepResourcesOnly(nextResources) })
  }

  const incrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    const max = getSkillMax(id)
    if (current >= max) return
    if (skillAvailable <= 0) return

    const isMagic = magicSchools.some((m) => m.id === id)
    if (isMagic && magicMaxPerStep !== undefined && magicMaxTotal !== undefined) {
      const addedThisStep = (current + 1) - (baseSkills[id] ?? 0)
      if (addedThisStep > magicMaxPerStep) return
      if (current + 1 > magicMaxTotal) return
    }

    const next = { ...skills, [id]: current + 1 }
    setSkills(next)
    persist(next, staerken, resourceLevels)
  }

  const decrementSkill = (id: string) => {
    const current = skills[id] ?? 0
    if (current <= (baseSkills[id] ?? 0)) return
    const next = { ...skills, [id]: current - 1 }
    setSkills(next)
    persist(next, staerken, resourceLevels)
  }

  // INT-000029: Jede Karte ist ein Toggle. Eine bereits gewählte Karte nimmt
  // genau eine Auswahl zurück und erstattet den Preis; eine ungewählte Karte
  // fügt eine Auswahl hinzu, sofern Obergrenze UND Restbudget es erlauben
  // (INT-000027). Damit gilt dasselbe Muster wie für alle anderen Stärken –
  // ohne Entfernen-Kreuz und ohne gesonderte Darstellung über dem Fenster.
  const handleStaerke = (s: StaerkenWahlEintrag, isSelected: boolean) => {
    if (isSelected) {
      // Nicht mehrfach wählbare Stärken bleiben wie bisher komplett abwählbar;
      // bei mehrfach wählbaren nimmt ein Klick genau eine Auswahl zurück.
      if (!s.mehrfach) {
        const next = staerken.filter((value) => value !== s.id)
        setStaerken(next)
        persist(skills, next, resourceLevels)
        return
      }
      removeOneStaerke(s.id)
      return
    }
    if (!istStaerkeNochWaehlbar(s, staerken, staerkenAvailable)) return
    const next = [...staerken, s.id]
    setStaerken(next)
    persist(skills, next, resourceLevels)
  }

  const removeOneStaerke = (id: string) => {
    const index = staerken.indexOf(id)
    if (index < 0) return
    const next = [...staerken]
    next.splice(index, 1)
    setStaerken(next)
    persist(skills, next, resourceLevels)
  }

  const incrementResource = (name: string) => {
    if (ressourcenAvailable <= 0) return
    const current = resourceLevels[name] ?? 0
    const next = { ...resourceLevels, [name]: current + 1 }
    setResourceLevels(next)
    persist(skills, staerken, next)
  }

  const decrementResource = (name: string) => {
    const current = resourceLevels[name] ?? 0
    const base = baseResources[name] ?? 0
    if (current <= base) return
    const next = { ...resourceLevels, [name]: current - 1 }
    setResourceLevels(next)
    persist(skills, staerken, next)
  }

  // INT-000018: Testmodus – Fertigkeits-, Stärken- und Ressourcenpunkte
  // vollständig und regelkonform verteilen. Magieschulen werden ausgelassen,
  // damit der späteren Zauber-Schritt keine nicht vorhandenen Zauber erzwingt.
  const fillRandomly = () => {
    // INT-000027: Der Zufallsmodus darf eine mehrfach wählbare Stärke bis zu
    // ihrer Obergrenze mehrfach in die Auswahlliste aufnehmen, damit auch ein
    // Budget, das nur durch Wiederholungen exakt aufgeht, gefüllt werden kann.
    const staerkenKandidaten = eligibleStaerken.flatMap((s) => {
      if (!s.mehrfach && countOf(s.id) > 0) return []
      const verbleibend = s.mehrfach ? maxOf(s) - countOf(s.id) : 1
      return Array.from({ length: Math.max(0, verbleibend) }, () => ({
        id: s.id, kosten: s.kosten,
      }))
    })
    const zusaetzlicheStaerken = pickExactCostSubset(staerkenKandidaten, staerkenAvailable)
    if (zusaetzlicheStaerken.length === 0 && staerkenAvailable > 0) return
    const nextStaerken = [...staerken, ...zusaetzlicheStaerken]

    const skillIds = [...talents, ...weapons].map((s) => s.id)
    const delta = distributePoints(
      skillIds,
      (id) => baseSkills[id] ?? 0,
      () => DEFAULT_SKILL_MAX,
      skillPoints,
    )
    const nextSkills: Record<string, number> = {}
    for (const id of skillIds) nextSkills[id] = (baseSkills[id] ?? 0) + (delta[id] ?? 0)

    const nextResources: Record<string, number> = {}
    for (const name of ALL_RESOURCES) nextResources[name] = baseResources[name] ?? 0
    for (let i = 0; i < ressourcenPoints; i++) {
      const name = pickRandom([...ALL_RESOURCES])
      if (!name) break
      nextResources[name] = (nextResources[name] ?? 0) + 1
    }

    setSkills(nextSkills)
    setStaerken(nextStaerken)
    setResourceLevels(nextResources)
    persist(nextSkills, nextStaerken, nextResources)
  }
  useStepFill(fillRandomly, !dataLoading && talents.length > 0)

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
            const canInc = skillAvailable > 0 && value < max
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
        <div style={{ ...styles.counter, ...(skillAvailable === 0 ? styles.counterZero : {}) }}>
          {skillPointLabel}: {skillAvailable}
        </div>
        <div style={{ ...styles.counter, ...(ressourcenAvailable === 0 ? styles.counterZero : {}) }}>
          Ressourcen-Punkte: {ressourcenAvailable}
        </div>
        <div style={{ ...styles.counter, ...(staerkenAvailable === 0 ? styles.counterZero : {}) }}>
          Stärken-Punkte: {staerkenAvailable}
        </div>
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
        <h3 style={styles.sectionTitle}>Ressourcen steigern</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Ressource</th>
              <th style={styles.th}>Wert</th>
              <th style={styles.th}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {ALL_RESOURCES.map((name) => {
              const value = resourceLevels[name] ?? 0
              const base = baseResources[name] ?? 0
              const canInc = ressourcenAvailable > 0
              const canDec = value > base
              return (
                <tr key={name}>
                  <td style={styles.td}>{name}</td>
                  <td style={{ ...styles.td, ...styles.valueCell }}>{value}</td>
                  <td style={styles.td}>
                    <div style={styles.buttonGroup}>
                      <button
                        style={{ ...styles.pointButton, ...(canDec ? {} : styles.pointButtonDisabled) }}
                        onClick={() => decrementResource(name)}
                        disabled={!canDec}
                      >
                        −
                      </button>
                      <button
                        style={{ ...styles.pointButton, ...(canInc ? {} : styles.pointButtonDisabled) }}
                        onClick={() => incrementResource(name)}
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{staerkenPoints} Stärken wählen</h3>
        <div style={styles.staerkenGrid}>
          {eligibleStaerken.flatMap((s) => {
            // INT-000029: Eine Karte je getroffener Auswahl (abwählbar) und
            // eine weitere, identische Karte darunter, solange Obergrenze und
            // Budget eine Auswahl erlauben. Alle Karten tragen denselben
            // sichtbaren Namen; „Flink II" bleibt die Ergebnisdarstellung.
            const ausgewaehlt = countOf(s.id)
            const karten = anzahlStaerkenKarten(s, staerken, staerkenAvailable)
            const kannHinzufuegen = istStaerkeNochWaehlbar(s, staerken, staerkenAvailable)
            return Array.from({ length: karten }, (_, index) => {
              const isSelected = index < ausgewaehlt
              const isDisabled = !isSelected && !kannHinzufuegen
              return (
                <button
                  key={`${s.id}-${index}`}
                  style={{
                    ...styles.staerkeCard,
                    ...(isSelected ? styles.staerkeCardSelected : {}),
                    ...(isDisabled ? styles.staerkeCardDisabled : {}),
                  }}
                  aria-pressed={isSelected}
                  onClick={() => handleStaerke(s, isSelected)}
                  disabled={isDisabled}
                >
                  <div style={styles.staerkeHeader}>
                    <span style={styles.staerkeName}>{s.name}</span>
                    <span style={styles.staerkeCost}>{s.kosten} Punkt{s.kosten > 1 ? 'e' : ''}</span>
                  </div>
                  {s.mehrfach && (
                    <span style={styles.staerkeCount}>Auswahl {ausgewaehlt} / {maxOf(s)}</span>
                  )}
                  <span style={styles.staerkeDesc}>{s.desc}</span>
                </button>
              )
            })
          })}
        </div>
      </div>

      {footer && footer(
        staerkenAvailable === 0 && skillAvailable === 0 && ressourcenAvailable === 0,
      )}
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
  // INT-000029: pressed-Zustand neutral (nicht rot) – wie bei den anderen
  // Stärken per `aria-pressed` erfassbar, ohne Sonder-Hervorhebung.
  staerkeCardSelected: {
    border: '2px solid var(--border)',
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
  staerkeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staerkeCost: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'rgba(233, 69, 96, 0.1)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  staerkeDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  staerkeCount: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
  },
}
