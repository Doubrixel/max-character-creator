import { useState, useEffect, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

const BONUS_MEISTERSCHAFT_POINTS = 3
const BONUS_TALENT_POINTS = 5
const BONUS_RESOURCE_POINTS = 1

const BONUS_MEISTERSCHAFTEN = [
  { id: 'bm1', name: 'Meister der Klingen', desc: '+2 auf Nahkampf-Proben mit Einhandwaffen' },
  { id: 'bm2', name: 'Eiserner Wille', desc: '+2 auf Willenskraft-Proben' },
  { id: 'bm3', name: 'Schattenwanderer', desc: '+2 auf Schleichen-Proben bei Dunkelheit' },
]

const BONUS_TALENTE = [
  { id: 'akrobatik', name: 'Akrobatik' },
  { id: 'schleichen', name: 'Schleichen' },
  { id: 'wahrnehmung', name: 'Wahrnehmung' },
  { id: 'wissen', name: 'Wissen' },
  { id: 'ueberleben', name: 'Überleben' },
]

const BONUS_RESSOURCEN = [
  { id: 'lp', name: 'Lebenspunkte', desc: '+5 maximale Lebenspunkte' },
  { id: 'mp', name: 'Magiepunkte', desc: '+3 maximale Magiepunkte' },
  { id: 'ap', name: 'Ausdauerpunkte', desc: '+5 maximale Ausdauerpunkte' },
]

const MEISTERSCHAFTEN_PER_SKILL: Record<string, { id: string; name: string; desc: string }[]> = {
  nahkampf: [
    { id: 'm_nah_1', name: 'Klingensturm', desc: 'Ein Angriff gegen alle adjacenten Gegner' },
    { id: 'm_nah_2', name: 'Meisterparade', desc: 'Parade-Wurf wird um 2 erhöht' },
  ],
  distanz: [
    { id: 'm_dis_1', name: 'Scharfschütze', desc: '+2 auf Distanz-Angriffe über 10m' },
    { id: 'm_dis_2', name: 'Schnellfeuer', desc: 'Ein zusätzlicher Angriff pro Runde' },
  ],
  akrobatik: [
    { id: 'm_akr_1', name: 'Luftsprung', desc: 'Doppelte Sprungweite' },
    { id: 'm_akr_2', name: 'Fallmeister', desc: 'Kein Fallschaden bis 5m' },
  ],
  schleichen: [
    { id: 'm_sch_1', name: 'Unsichtbar', desc: '-3 auf gegnerische Wahrnehmung' },
    { id: 'm_sch_2', name: 'Schattenritt', desc: 'Bewegung im Schatten ohne Probe' },
  ],
  wahrnehmung: [
    { id: 'm_wah_1', name: 'Adlerauge', desc: 'Erkennt versteckte Fallen automatisch' },
    { id: 'm_wah_2', name: 'Gefahrensinn', desc: 'Initiative +2 bei Überraschung' },
  ],
  wissen: [
    { id: 'm_wis_1', name: 'Gelehrter', desc: 'Zugang zu verbotenen Archiven' },
    { id: 'm_wis_2', name: 'Analytiker', desc: 'Erkennt Schwächen nach 1 Runde' },
  ],
  elementar: [
    { id: 'm_ele_1', name: 'Elementarbeherrschung', desc: 'Spell-Kosten -1 MP' },
    { id: 'm_ele_2', name: 'Sturmrufer', desc: 'Elementarspells +2 Schaden' },
  ],
  heilung: [
    { id: 'm_hei_1', name: 'Wundheiler', desc: 'Heilungsspells heilen +5 LP' },
    { id: 'm_hei_2', name: 'Reinigung', desc: 'Entfernt alle negativen Status' },
  ],
}

const SPELLS: Record<string, { id: string; name: string; level: number; cost: string; effect: string }[]> = {
  elementar: [
    { id: 'sp_el_0_1', name: 'Funken', level: 0, cost: '0 MP', effect: 'Kleiner Brandschaden (1W3)' },
    { id: 'sp_el_0_2', name: 'Eisblitz', level: 0, cost: '0 MP', effect: 'Kleiner Frostschaden (1W3)' },
    { id: 'sp_el_1_1', name: 'Feuerball', level: 1, cost: '2 MP', effect: 'Feuerschaden in Radius (2W6)' },
    { id: 'sp_el_1_2', name: 'Eiswand', level: 1, cost: '3 MP', effect: 'Erschafft eine Eisbarriere' },
    { id: 'sp_el_2_1', name: 'Meteor', level: 2, cost: '5 MP', effect: 'Gewaltiger Feuerschaden (4W6)' },
    { id: 'sp_el_2_2', name: 'Blitzschlag', level: 2, cost: '6 MP', effect: 'Elektrizität trifft Ziel (3W6)' },
  ],
  heilung: [
    { id: 'sp_he_0_1', name: 'Leichtes Heilen', level: 0, cost: '0 MP', effect: 'Heilt 1W3 LP' },
    { id: 'sp_he_0_2', name: 'Reinigen', level: 0, cost: '0 MP', effect: 'Entfernt leichte Vergiftung' },
    { id: 'sp_he_1_1', name: 'Wunden schließen', level: 1, cost: '3 MP', effect: 'Heilt 2W6 LP' },
    { id: 'sp_he_1_2', name: 'Schutzschild', level: 1, cost: '2 MP', effect: '+3 Widerstand für 3 Runden' },
    { id: 'sp_he_2_1', name: 'Massenheilung', level: 2, cost: '6 MP', effect: 'Heilt alle in Radius (2W6)' },
    { id: 'sp_he_2_2', name: 'Wiederbelebung', level: 2, cost: '8 MP', effect: 'Belebt Ohnmächtige' },
  ],
}

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

interface MeisterschaftStepProps {
  onValid: (valid: boolean) => void
}

export default function MeisterschaftStep({ onValid }: MeisterschaftStepProps) {
  const { characterId, saveStep, currentStep } = useAppContext()

  const [skill6Entries, setSkill6Entries] = useState<Skill6Entry[]>([])
  const [magicThresholds, setMagicThresholds] = useState<MagicThreshold[]>([])
  const [bonusMeisterschaftPoints, setBonusMeisterschaftPoints] = useState(BONUS_MEISTERSCHAFT_POINTS)
  const [selectedBonusMeisterschaften, setSelectedBonusMeisterschaften] = useState<string[]>([])
  const [bonusTalentPoints, setBonusTalentPoints] = useState(BONUS_TALENT_POINTS)
  const [bonusTalents, setBonusTalents] = useState<Record<string, number>>({})
  const [bonusResourcePoints, setBonusResourcePoints] = useState(BONUS_RESOURCE_POINTS)
  const [selectedBonusResource, setSelectedBonusResource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  const loadPreviousSteps = useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const [step4Res, step5Res, step7Res] = await Promise.all([
        fetch(`${API_BASE}/api/characters/${characterId}/steps/4`),
        fetch(`${API_BASE}/api/characters/${characterId}/steps/5`),
        fetch(`${API_BASE}/api/characters/${characterId}/steps/7`),
      ])

      const step4Data = step4Res.ok ? await step4Res.json() : null
      const step5Data = step5Res.ok ? await step5Res.json() : null
      const savedStep7 = step7Res.ok ? await step7Res.json() : null

      const mergedSkills: Record<string, number> = {}
      for (const [id, val] of Object.entries(step4Data?.skills ?? {})) {
        mergedSkills[id] = (mergedSkills[id] ?? 0) + (val as number)
      }
      for (const [id, val] of Object.entries(step5Data?.skills ?? {})) {
        mergedSkills[id] = (mergedSkills[id] ?? 0) + (val as number)
      }

      const skill6: Skill6Entry[] = []
      const magicThresh: MagicThreshold[] = []

      const talentWeaponIds = ['akrobatik', 'schleichen', 'wahrnehmung', 'wissen', 'ueberleben', 'nahkampf', 'distanz', 'schild']
      const magicSchoolIds = ['elementar', 'heilung']

      const skillNames: Record<string, string> = {
        akrobatik: 'Akrobatik',
        schleichen: 'Schleichen',
        wahrnehmung: 'Wahrnehmung',
        wissen: 'Wissen',
        ueberleben: 'Überleben',
        nahkampf: 'Nahkampf',
        distanz: 'Distanz',
        schild: 'Schild',
        elementar: 'Elementarmagie',
        heilung: 'Heilungsmagie',
      }

      for (const [id, val] of Object.entries(mergedSkills)) {
        const numVal = val as number
        if (numVal >= 6 && talentWeaponIds.includes(id)) {
          skill6.push({ skillId: id, skillName: skillNames[id] ?? id, selectedMeisterschaft: null })
        }
        if (magicSchoolIds.includes(id)) {
          const thresholds: { level: number; selectedSpell: string | null }[] = []
          if (numVal >= 1) thresholds.push({ level: 0, selectedSpell: null })
          if (numVal >= 3) thresholds.push({ level: 1, selectedSpell: null })
          if (numVal >= 6) thresholds.push({ level: 2, selectedSpell: null })
          if (thresholds.length > 0) {
            magicThresh.push({ schoolId: id, schoolName: skillNames[id] ?? id, value: numVal, thresholds })
          }
        }
      }

      setSkill6Entries(skill6)
      setMagicThresholds(magicThresh)

      if (savedStep7) {
        if (savedStep7.bonusMeisterschaften) {
          setSelectedBonusMeisterschaften(savedStep7.bonusMeisterschaften)
          setBonusMeisterschaftPoints(BONUS_MEISTERSCHAFT_POINTS - savedStep7.bonusMeisterschaften.length)
        }
        if (savedStep7.bonusTalents) {
          setBonusTalents(savedStep7.bonusTalents)
          const used = Object.values(savedStep7.bonusTalents as Record<string, number>).reduce((s: number, v: number) => s + v, 0)
          setBonusTalentPoints(BONUS_TALENT_POINTS - used)
        }
        if (savedStep7.bonusResource) {
          setSelectedBonusResource(savedStep7.bonusResource)
          setBonusResourcePoints(0)
        }
        if (savedStep7.skill6Meisterschaften) {
          const updatedSkill6 = [...skill6]
          for (const entry of updatedSkill6) {
            if (savedStep7.skill6Meisterschaften[entry.skillId]) {
              entry.selectedMeisterschaft = savedStep7.skill6Meisterschaften[entry.skillId]
            }
          }
          setSkill6Entries(updatedSkill6)
        }
        if (savedStep7.magicSpells) {
          const updatedMagic = [...magicThresh]
          for (const mt of updatedMagic) {
            for (const th of mt.thresholds) {
              const key = `${mt.schoolId}_${th.level}`
              if (savedStep7.magicSpells[key]) {
                th.selectedSpell = savedStep7.magicSpells[key]
              }
            }
          }
          setMagicThresholds(updatedMagic)
        }
      }
    } catch {
      setError('Fehler beim Laden der vorherigen Schritte')
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    loadPreviousSteps()
  }, [loadPreviousSteps, currentStep])

  useEffect(() => {
    if (loading) return

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
    setSkill6Entries(prev => prev.map(e =>
      e.skillId === skillId ? { ...e, selectedMeisterschaft: e.selectedMeisterschaft === meisterId ? null : meisterId } : e
    ))
    persistState()
  }

  const handleMagicSpell = (schoolId: string, level: number, spellId: string) => {
    setMagicThresholds(prev => prev.map(mt =>
      mt.schoolId === schoolId
        ? {
            ...mt,
            thresholds: mt.thresholds.map(th =>
              th.level === level ? { ...th, selectedSpell: th.selectedSpell === spellId ? null : spellId } : th
            ),
          }
        : mt
    ))
    persistState()
  }

  const handleBonusMeisterschaft = (id: string) => {
    if (selectedBonusMeisterschaften.includes(id)) {
      const next = selectedBonusMeisterschaften.filter(m => m !== id)
      setSelectedBonusMeisterschaften(next)
      setBonusMeisterschaftPoints(BONUS_MEISTERSCHAFT_POINTS - next.length)
    } else {
      if (bonusMeisterschaftPoints <= 0) return
      const next = [...selectedBonusMeisterschaften, id]
      setSelectedBonusMeisterschaften(next)
      setBonusMeisterschaftPoints(BONUS_MEISTERSCHAFT_POINTS - next.length)
    }
    persistState()
  }

  const handleBonusTalent = (id: string, delta: number) => {
    const current = bonusTalents[id] ?? 0
    const newVal = current + delta
    if (newVal < 0) return
    if (newVal > 6) return

    const used = Object.entries({ ...bonusTalents, [id]: newVal }).reduce((s, [, v]) => s + v, 0)
    if (used > BONUS_TALENT_POINTS) return

    const next = { ...bonusTalents, [id]: newVal }
    setBonusTalents(next)
    setBonusTalentPoints(BONUS_TALENT_POINTS - used)
    persistState()
  }

  const handleBonusResource = (id: string) => {
    if (selectedBonusResource === id) {
      setSelectedBonusResource(null)
      setBonusResourcePoints(BONUS_RESOURCE_POINTS)
    } else {
      if (bonusResourcePoints <= 0) return
      setSelectedBonusResource(id)
      setBonusResourcePoints(0)
    }
    persistState()
  }

  const persistState = () => {
    if (!characterId) return
    const data = {
      skill6Meisterschaften: Object.fromEntries(skill6Entries.filter(e => e.selectedMeisterschaft).map(e => [e.skillId, e.selectedMeisterschaft])),
      magicSpells: magicThresholds.flatMap(mt =>
        mt.thresholds.filter(th => th.selectedSpell).map(th => [`${mt.schoolId}_${th.level}`, th.selectedSpell])
      ).filter(Boolean),
      bonusMeisterschaften: selectedBonusMeisterschaften,
      bonusTalents: bonusTalents,
      bonusResource: selectedBonusResource,
    }
    saveStep(7, data)
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
            const meisterList = MEISTERSCHAFTEN_PER_SKILL[entry.skillId] ?? []
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
                const availableSpells = SPELLS[mt.schoolId]?.filter(s => s.level === th.level) ?? []
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
            {BONUS_MEISTERSCHAFTEN.map(m => {
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
            {BONUS_TALENTE.map(t => {
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
            {BONUS_RESSOURCEN.map(r => {
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
    color: '#aaa',
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
    color: '#4ade80',
    margin: 0,
  },
  completedText: {
    fontSize: 16,
    color: '#aaa',
    margin: 0,
  },
  error: {
    padding: '12px 16px',
    background: '#2e1a1a',
    color: '#e94560',
    borderRadius: 8,
    fontSize: 14,
  },
  section: {
    background: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: 18,
    color: '#eee',
  },
  sectionHint: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 0,
    marginBottom: 16,
  },
  pflichtItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid #333',
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
    color: '#e94560',
  },
  pflichtStatus: {
    fontSize: 13,
    color: '#4ade80',
  },
  meisterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  meisterCard: {
    padding: 12,
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
  meisterCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
  },
  meisterName: {
    fontSize: 14,
    fontWeight: 600,
  },
  meisterDesc: {
    fontSize: 12,
    color: '#aaa',
  },
  magicSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid #333',
  },
  magicSchoolName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#c084fc',
    marginBottom: 12,
  },
  spellLevelGroup: {
    marginBottom: 12,
  },
  spellLevelLabel: {
    fontSize: 13,
    color: '#888',
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
  spellCardSelected: {
    border: '2px solid #c084fc',
    background: '#1a1a2e',
  },
  spellName: {
    fontSize: 14,
    fontWeight: 600,
  },
  spellCost: {
    fontSize: 12,
    color: '#4ade80',
  },
  spellEffect: {
    fontSize: 12,
    color: '#aaa',
  },
  bonusSubSection: {
    marginTop: 16,
  },
  counter: {
    fontSize: 16,
    fontWeight: 700,
    color: '#4ade80',
    padding: '10px 16px',
    background: '#0f0f23',
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 12,
  },
  counterZero: {
    color: '#e94560',
  },
  bonusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
  },
  bonusCard: {
    padding: 12,
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
  bonusCardSelected: {
    border: '2px solid #e94560',
    background: '#2a1a2e',
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
    color: '#aaa',
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
    background: '#0f0f23',
    borderRadius: 6,
  },
  bonusTalentName: {
    fontSize: 14,
    color: '#eee',
    flex: 1,
  },
  bonusTalentValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#4ade80',
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
    background: '#1a1a2e',
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
  finalizeSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 8,
  },
  finalizeButton: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 700,
    background: '#4ade80',
    color: '#0f0f23',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  finalizeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
