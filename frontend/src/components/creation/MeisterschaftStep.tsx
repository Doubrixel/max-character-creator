import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

const BONUS_MEISTERSCHAFT_POINTS = 3
const BONUS_TALENT_POINTS = 5
const BONUS_RESOURCE_POINTS = 1

interface Skill6Entry {
  skillId: string
  skillName: string
  selectedMeisterschaft: string | null
}

interface MagicThreshold {
  schoolId: string
  schoolName: string
  value: number
  thresholds: { level: number; selectedSpell: string | null }[]
}

interface Step7Data {
  meisterschaften?: string[]
  bonusMeisterschaften?: string[]
  talents?: Record<string, number>
  resources?: Record<string, number>
  spells?: string[]
}

interface MeisterschaftStepProps {
  onValid: (valid: boolean) => void
}

export default function MeisterschaftStep({ onValid }: MeisterschaftStepProps) {
  const { characterId, stepDeltas, currentStep, updateStepDelta, computeBaseStats } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null

  const [skill6Entries, setSkill6Entries] = useState<Skill6Entry[]>([])
  const [magicThresholds, setMagicThresholds] = useState<MagicThreshold[]>([])
  const [bonusMeisterschaftPoints, setBonusMeisterschaftPoints] = useState(BONUS_MEISTERSCHAFT_POINTS)
  const [selectedBonusMeisterschaften, setSelectedBonusMeisterschaften] = useState<string[]>([])
  const [bonusTalentPoints, setBonusTalentPoints] = useState(BONUS_TALENT_POINTS)
  const [bonusTalents, setBonusTalents] = useState<Record<string, number>>({})
  const [bonusResourcePoints, setBonusResourcePoints] = useState(BONUS_RESOURCE_POINTS)
  const [selectedBonusResource, setSelectedBonusResource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)
  const [bonusMeisterschaften, setBonusMeisterschaften] = useState<{id: string, name: string, desc: string}[]>([])
  const [bonusTalente, setBonusTalente] = useState<{id: string, name: string}[]>([])
  const [bonusRessourcen, setBonusRessourcen] = useState<{id: string, name: string, desc: string}[]>([])
  const [meisterschaftenPerSkill, setMeisterschaftenPerSkill] = useState<Record<string, {id: string, name: string, desc: string}[]>>({})
  const [spells, setSpells] = useState<Record<string, {id: string, name: string, level: number, cost: string, effect: string}[]>>({})
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const skills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

    const talentWeaponIds = ['akrobatik', 'schleichen', 'wahrnehmung', 'wissen', 'ueberleben', 'nahkampf', 'distanz', 'schild']
    const magicSchoolIds = ['elementar', 'heilung']

    const skillNames: Record<string, string> = {
      akrobatik: 'Akrobatik', schleichen: 'Schleichen', wahrnehmung: 'Wahrnehmung',
      wissen: 'Wissen', ueberleben: 'Überleben', nahkampf: 'Nahkampf',
      distanz: 'Distanz', schild: 'Schild', elementar: 'Elementarmagie', heilung: 'Heilungsmagie',
    }

    const saved = stepData as Step7Data | null
        const savedMeisterschaften = saved?.meisterschaften ?? []
    const savedSpells = saved?.spells ?? []

    const skill6: Skill6Entry[] = []
    const magicThresh: MagicThreshold[] = []

    for (const [id, val] of Object.entries(skills)) {
      if (val >= 6 && talentWeaponIds.includes(id)) {
        const skillMasteryIds = (meisterschaftenPerSkill[id] ?? []).map(m => m.id)
        const match = savedMeisterschaften.find(m => skillMasteryIds.includes(m))
        skill6.push({ skillId: id, skillName: skillNames[id] ?? id, selectedMeisterschaft: match ?? null })
      }
      if (magicSchoolIds.includes(id)) {
        const thresholds: { level: number; selectedSpell: string | null }[] = []
        if (val >= 1) thresholds.push({ level: 0, selectedSpell: null })
        if (val >= 3) thresholds.push({ level: 1, selectedSpell: null })
        if (val >= 6) thresholds.push({ level: 2, selectedSpell: null })
        if (thresholds.length > 0) {
          const resolvedThresholds = thresholds.map(th => {
            const availableSpells = spells[id]?.filter(s => s.level === th.level) ?? []
            const match = availableSpells.find(s => savedSpells.includes(s.id))
            return { ...th, selectedSpell: match?.id ?? null }
          })
          magicThresh.push({ schoolId: id, schoolName: skillNames[id] ?? id, value: val, thresholds: resolvedThresholds })
        }
      }
    }

    setSkill6Entries(skill6)
    setMagicThresholds(magicThresh)

    if (!initializedRef.current) {
      initializedRef.current = true

      if (saved?.bonusMeisterschaften) {
        setSelectedBonusMeisterschaften(saved.bonusMeisterschaften)
        setBonusMeisterschaftPoints(BONUS_MEISTERSCHAFT_POINTS - saved.bonusMeisterschaften.length)
      } else {
        setSelectedBonusMeisterschaften([])
        setBonusMeisterschaftPoints(BONUS_MEISTERSCHAFT_POINTS)
      }

      if (saved?.talents) {
        setBonusTalents(saved.talents)
        const used = Object.values(saved.talents).reduce((s: number, v: number) => s + v, 0)
        setBonusTalentPoints(BONUS_TALENT_POINTS - used)
      } else {
        setBonusTalents({})
        setBonusTalentPoints(BONUS_TALENT_POINTS)
      }

      if (saved?.resources) {
        const resourceEntry = Object.entries(saved.resources).find(([, v]) => v > 0)
        setSelectedBonusResource(resourceEntry ? resourceEntry[0] : null)
        setBonusResourcePoints(resourceEntry ? 0 : BONUS_RESOURCE_POINTS)
      } else {
        setSelectedBonusResource(null)
        setBonusResourcePoints(BONUS_RESOURCE_POINTS)
      }
    }

    setLoading(false)
  }, [computeBaseStats, currentStep, stepDeltas])

  useEffect(() => {
    const loadLibraryData = async () => {
      try {
        const [masteriesRes, skillsRes, resourcesRes, spellsRes] = await Promise.all([
          fetch(`${API_BASE}/api/library/masteries`).then(r => r.json()),
          fetch(`${API_BASE}/api/library/skills`).then(r => r.json()),
          fetch(`${API_BASE}/api/library/resources`).then(r => r.json()),
          fetch(`${API_BASE}/api/library/spells`).then(r => r.json()),
        ])

        const talentSkills = skillsRes.filter((s: any) => {
          try { return JSON.parse(s.config)?.kategorie === 'talent' } catch { return false }
        })

        const pflichtMeisterschaften = masteriesRes.filter((m: any) => {
          try { return JSON.parse(m.config)?.kategorie === 'pflicht' } catch { return false }
        })
        const bonusMeisterschaftenList = masteriesRes.filter((m: any) => {
          try { return JSON.parse(m.config)?.kategorie === 'bonus' } catch { return false }
        })

        const grouped: Record<string, {id: string, name: string, desc: string}[]> = {}
        for (const m of pflichtMeisterschaften) {
          const cfg = JSON.parse(m.config || '{}')
          const skillId = cfg.voraussetzung_id || 'unknown'
          if (!grouped[skillId]) grouped[skillId] = []
          grouped[skillId].push({ id: m.id, name: m.name, desc: cfg.effekt || '' })
        }

        const spellsGrouped: Record<string, {id: string, name: string, level: number, cost: string, effect: string}[]> = {}
        for (const sp of spellsRes) {
          const cfg = JSON.parse(sp.config || '{}')
          const school = cfg.schule || 'unknown'
          if (!spellsGrouped[school]) spellsGrouped[school] = []
          spellsGrouped[school].push({
            id: sp.id, name: sp.name,
            level: parseInt(cfg.level) || 0,
            cost: cfg.kosten || '0 MP',
            effect: cfg.effekt || '',
          })
        }

        setBonusMeisterschaften(bonusMeisterschaftenList.map((m: any) => {
          const cfg = JSON.parse(m.config || '{}')
          return { id: m.id, name: m.name, desc: cfg.effekt || '' }
        }))
        setBonusTalente(talentSkills.map((s: any) => ({ id: s.id, name: s.name })))
        setBonusRessourcen(resourcesRes.map((r: any) => {
          const cfg = JSON.parse(r.config || '{}')
          return { id: r.id, name: r.name, desc: cfg.typ || '' }
        }))
        setMeisterschaftenPerSkill(grouped)
        setSpells(spellsGrouped)
      } catch (err) {
        console.error('Failed to load library data:', err)
      } finally {
        setDataLoading(false)
      }
    }
    loadLibraryData()
  }, [])

  useEffect(() => {
    if (loading || !initializedRef.current) return

    const allSkill6Selected = skill6Entries.every(e => e.selectedMeisterschaft !== null)
    const allMagicSelected = magicThresholds.every(mt =>
      mt.thresholds.every(th => th.selectedSpell !== null)
    )
    const allBonusMeisterschaftUsed = bonusMeisterschaftPoints === 0
    const allBonusTalentsUsed = bonusTalentPoints === 0
    const allBonusResourceUsed = bonusResourcePoints === 0

    const valid = allSkill6Selected && allMagicSelected && allBonusMeisterschaftUsed && allBonusTalentsUsed && allBonusResourceUsed
    setIsValid(valid)
    onValid(valid)
  }, [skill6Entries, magicThresholds, bonusMeisterschaftPoints, bonusTalentPoints, bonusResourcePoints, onValid, loading])

  const handleSkill6Meisterschaft = (skillId: string, meisterId: string) => {
    setSkill6Entries(prev => {
      const next = prev.map(e =>
        e.skillId === skillId ? { ...e, selectedMeisterschaft: e.selectedMeisterschaft === meisterId ? null : meisterId } : e
      )
      persistState(next)
      return next
    })
  }

  const handleMagicSpell = (schoolId: string, level: number, spellId: string) => {
    setMagicThresholds(prev => {
      const next = prev.map(mt =>
        mt.schoolId === schoolId
          ? {
              ...mt,
              thresholds: mt.thresholds.map(th =>
                th.level === level ? { ...th, selectedSpell: th.selectedSpell === spellId ? null : spellId } : th
              ),
            }
          : mt
      )
      persistState(undefined, next)
      return next
    })
  }

  const handleBonusMeisterschaft = (id: string) => {
    setSelectedBonusMeisterschaften(prev => {
      let next: string[]
      let pts: number
      if (prev.includes(id)) {
        next = prev.filter(m => m !== id)
        pts = BONUS_MEISTERSCHAFT_POINTS - next.length
      } else {
        if (bonusMeisterschaftPoints <= 0) return prev
        next = [...prev, id]
        pts = BONUS_MEISTERSCHAFT_POINTS - next.length
      }
      setBonusMeisterschaftPoints(pts)
      persistState(undefined, undefined, next)
      return next
    })
  }

  const handleBonusTalent = (id: string, delta: number) => {
    setBonusTalents(prev => {
      const current = prev[id] ?? 0
      const newVal = current + delta
      if (newVal < 0) return prev
      if (newVal > 6) return prev

      const next = { ...prev, [id]: newVal }
      const used = Object.values(next).reduce((s, v) => s + v, 0)
      if (used > BONUS_TALENT_POINTS) return prev

      setBonusTalentPoints(BONUS_TALENT_POINTS - used)
      persistState(undefined, undefined, undefined, next)
      return next
    })
  }

  const handleBonusResource = (id: string) => {
    setSelectedBonusResource(prev => {
      let next: string | null
      let pts: number
      if (prev === id) {
        next = null
        pts = BONUS_RESOURCE_POINTS
      } else {
        if (bonusResourcePoints <= 0) return prev
        next = id
        pts = 0
      }
      setBonusResourcePoints(pts)
      persistState(undefined, undefined, undefined, undefined, next)
      return next
    })
  }

  const persistState = (
    overrideSkill6?: Skill6Entry[],
    overrideMagic?: MagicThreshold[],
    overrideBonusM?: string[],
    overrideBonusT?: Record<string, number>,
    overrideBonusR?: string | null,
  ) => {
    if (!characterId) return
    const s6 = overrideSkill6 ?? skill6Entries
    const mg = overrideMagic ?? magicThresholds
    const bm = overrideBonusM ?? selectedBonusMeisterschaften
    const bt = overrideBonusT ?? bonusTalents
    const br = overrideBonusR ?? selectedBonusResource

    const magicSpellsObj: Record<string, string> = {}
    for (const mt of mg) {
      for (const th of mt.thresholds) {
        if (th.selectedSpell) {
          magicSpellsObj[`${mt.schoolId}_${th.level}`] = th.selectedSpell
        }
      }
    }

    const data = {
      meisterschaften: s6.filter(e => e.selectedMeisterschaft).map(e => e.selectedMeisterschaft!),
      bonusMeisterschaften: bm,
      talents: bt,
      resources: br ? { [br]: 1 } : {},
      spells: Object.values(magicSpellsObj).filter(Boolean),
    }
    updateStepDelta(7, data)
  }

  const handleFinalize = async () => {
    if (!characterId) return
    setFinalizing(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) throw new Error('Fehler beim Fertigstellen')
      setCompleted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setFinalizing(false)
    }
  }

  if (dataLoading) {
    return <div style={styles.loading}>Lade Bibliotheksdaten...</div>
  }

  if (loading) {
    return <div style={styles.loading}>Lade Charakterdaten...</div>
  }

  if (completed) {
    return (
      <div style={styles.completed}>
        <h2 style={styles.completedTitle}>Charakter fertiggestellt!</h2>
        <p style={styles.completedText}>Dein Charakter wurde erfolgreich erstellt und erhält 15 Start-XP.</p>
        <p style={styles.completedText}>Er erscheint nun im Chroniken-Tab.</p>
        <button style={styles.finalizeButton} onClick={() => window.location.reload()}>
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}

      {skill6Entries.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Pflicht-Meisterschaften (Skill-Wert 6)</h3>
          <p style={styles.sectionHint}>Wähle für jede Fähigkeit mit Wert 6 eine Meisterschaft.</p>
          {skill6Entries.map(entry => {
            const meisterList = meisterschaftenPerSkill[entry.skillId] ?? []
            return (
              <div key={entry.skillId} style={styles.pflichtItem}>
                <div style={styles.pflichtHeader}>
                  <span style={styles.pflichtSkillName}>{entry.skillName}</span>
                  <span style={styles.pflichtStatus}>
                    {entry.selectedMeisterschaft ? '✓ Gewählt' : '— Noch nicht gewählt'}
                  </span>
                </div>
                <div style={styles.meisterGrid}>
                  {meisterList.map(m => (
                    <button
                      key={m.id}
                      style={{
                        ...styles.meisterCard,
                        ...(entry.selectedMeisterschaft === m.id ? styles.meisterCardSelected : {}),
                      }}
                      onClick={() => handleSkill6Meisterschaft(entry.skillId, m.id)}
                    >
                      <span style={styles.meisterName}>{m.name}</span>
                      <span style={styles.meisterDesc}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {magicThresholds.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Pflicht-Spells (Magie-Schwellenwerte)</h3>
          <p style={styles.sectionHint}>Wähle pro Schwellenwert (1/3/6) einen Spell.</p>
          {magicThresholds.map(mt => (
            <div key={mt.schoolId} style={styles.magicSection}>
              <h4 style={styles.magicSchoolName}>{mt.schoolName} (Wert: {mt.value})</h4>
              {mt.thresholds.map(th => {
                const availableSpells = spells[mt.schoolId]?.filter(s => s.level === th.level) ?? []
                return (
                  <div key={th.level} style={styles.spellLevelGroup}>
                    <span style={styles.spellLevelLabel}>Stufe {th.level} Spells</span>
                    <div style={styles.spellGrid}>
                      {availableSpells.map(sp => (
                        <button
                          key={sp.id}
                          style={{
                            ...styles.spellCard,
                            ...(th.selectedSpell === sp.id ? styles.spellCardSelected : {}),
                          }}
                          onClick={() => handleMagicSpell(mt.schoolId, th.level, sp.id)}
                        >
                          <span style={styles.spellName}>{sp.name}</span>
                          <span style={styles.spellCost}>{sp.cost}</span>
                          <span style={styles.spellEffect}>{sp.effect}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Bonus-Punkte verteilen</h3>

        <div style={styles.bonusSubSection}>
          <div style={{ ...styles.counter, ...(bonusMeisterschaftPoints === 0 ? styles.counterZero : {}) }}>
            Meisterschafts-Punkte: {bonusMeisterschaftPoints}
          </div>
          <div style={styles.bonusGrid}>
            {bonusMeisterschaften.map(m => {
              const isSelected = selectedBonusMeisterschaften.includes(m.id)
              const isDisabled = !isSelected && bonusMeisterschaftPoints <= 0
              return (
                <button
                  key={m.id}
                  style={{
                    ...styles.bonusCard,
                    ...(isSelected ? styles.bonusCardSelected : {}),
                    ...(isDisabled ? styles.bonusCardDisabled : {}),
                  }}
                  onClick={() => handleBonusMeisterschaft(m.id)}
                  disabled={isDisabled}
                >
                  <span style={styles.bonusCardName}>{m.name}</span>
                  <span style={styles.bonusCardDesc}>{m.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={styles.bonusSubSection}>
          <div style={{ ...styles.counter, ...(bonusTalentPoints === 0 ? styles.counterZero : {}) }}>
            Talent-Punkte: {bonusTalentPoints}
          </div>
          <div style={styles.bonusTalentTable}>
            {bonusTalente.map(t => {
              const val = bonusTalents[t.id] ?? 0
              const canInc = bonusTalentPoints > 0 && val < 6
              const canDec = val > 0
              return (
                <div key={t.id} style={styles.bonusTalentRow}>
                  <span style={styles.bonusTalentName}>{t.name}</span>
                  <span style={styles.bonusTalentValue}>{val}</span>
                  <div style={styles.buttonGroup}>
                    <button
                      style={{ ...styles.pointButton, ...(canDec ? {} : styles.pointButtonDisabled) }}
                      onClick={() => handleBonusTalent(t.id, -1)}
                      disabled={!canDec}
                    >
                      −
                    </button>
                    <button
                      style={{ ...styles.pointButton, ...(canInc ? {} : styles.pointButtonDisabled) }}
                      onClick={() => handleBonusTalent(t.id, 1)}
                      disabled={!canInc}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={styles.bonusSubSection}>
          <div style={{ ...styles.counter, ...(bonusResourcePoints === 0 ? styles.counterZero : {}) }}>
            Ressourcen-Punkte: {bonusResourcePoints}
          </div>
          <div style={styles.bonusGrid}>
            {bonusRessourcen.map(r => {
              const isSelected = selectedBonusResource === r.id
              const isDisabled = !isSelected && bonusResourcePoints <= 0
              return (
                <button
                  key={r.id}
                  style={{
                    ...styles.bonusCard,
                    ...(isSelected ? styles.bonusCardSelected : {}),
                    ...(isDisabled ? styles.bonusCardDisabled : {}),
                  }}
                  onClick={() => handleBonusResource(r.id)}
                  disabled={isDisabled}
                >
                  <span style={styles.bonusCardName}>{r.name}</span>
                  <span style={styles.bonusCardDesc}>{r.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={styles.finalizeSection}>
        <button
          style={{
            ...styles.finalizeButton,
            ...(!isValid ? styles.finalizeButtonDisabled : {}),
          }}
          onClick={handleFinalize}
          disabled={finalizing || !isValid}
        >
          {finalizing ? 'Wird fertiggestellt...' : 'Charakter fertigstellen'}
        </button>
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
    padding: 40,
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 16,
  },
  completed: {
    padding: 40,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  completedTitle: {
    fontSize: 24,
    color: 'var(--success)',
    margin: 0,
  },
  completedText: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  error: {
    padding: '12px 16px',
    background: 'var(--bg-error)',
    color: 'var(--accent)',
    borderRadius: 8,
    fontSize: 14,
  },
  section: {
    background: 'var(--bg-primary)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  sectionHint: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 0,
    marginBottom: 16,
  },
  pflichtItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid var(--border)',
  },
  pflichtHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pflichtSkillName: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  pflichtStatus: {
    fontSize: 13,
    color: 'var(--success)',
  },
  meisterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  meisterCard: {
    padding: 12,
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
  meisterCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
  },
  meisterName: {
    fontSize: 14,
    fontWeight: 600,
  },
  meisterDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  magicSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid var(--border)',
  },
  magicSchoolName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--purple)',
    marginBottom: 12,
  },
  spellLevelGroup: {
    marginBottom: 12,
  },
  spellLevelLabel: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    marginBottom: 8,
    display: 'block',
  },
  spellGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  spellCard: {
    padding: 12,
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
  spellCardSelected: {
    border: '2px solid var(--purple)',
    background: 'var(--bg-primary)',
  },
  spellName: {
    fontSize: 14,
    fontWeight: 600,
  },
  spellCost: {
    fontSize: 12,
    color: 'var(--success)',
  },
  spellEffect: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  bonusSubSection: {
    marginTop: 16,
  },
  counter: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--success)',
    padding: '10px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 12,
  },
  counterZero: {
    color: 'var(--accent)',
  },
  bonusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
  },
  bonusCard: {
    padding: 12,
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
  bonusCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
  },
  bonusCardDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  bonusCardName: {
    fontSize: 14,
    fontWeight: 600,
  },
  bonusCardDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  bonusTalentTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  bonusTalentRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 6,
  },
  bonusTalentName: {
    fontSize: 14,
    color: 'var(--text-primary)',
    flex: 1,
  },
  bonusTalentValue: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--success)',
    width: 40,
    textAlign: 'center',
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
    background: 'var(--bg-primary)',
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
  finalizeSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 8,
  },
  finalizeButton: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 700,
    background: 'var(--success)',
    color: 'var(--text-on-success)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  finalizeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
