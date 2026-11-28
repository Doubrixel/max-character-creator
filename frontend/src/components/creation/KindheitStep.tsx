import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStepFill } from '../../context/TestModeContext'
import { distributePoints, pickRandom } from '../../testmode/random'
import {
  readMehrfachConfig,
  displayNameWithCount,
  staerkenPunkteVerbrauch,
  zaehleStaerkenAuswahlen,
  maxAuswahlVonEintrag,
  istStaerkeNochWaehlbar,
  type StaerkenWahlEintrag,
} from '@mcc/shared'

const INITIAL_POINTS = 20
// INT-000028: In Schritt „5. Kindheit" steht genau 1 Punkt für Stärken zur
// Verfügung. Die Budget- und Obergrenzenlogik stammt aus INT-000027 und wird
// hier über dieselben geteilten Helper angewendet.
const STAERKEN_PUNKTE = 1

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

interface KulturStepProps {
  onValid: (valid: boolean) => void
}

export default function KulturStep({ onValid }: KulturStepProps) {
  const { computeBaseStats, stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const baseSkills = (computeBaseStats(currentStep).skills ?? {}) as Record<string, number>

  const [talents, setTalents] = useState<{ id: string; name: string }[]>([])
  const [weapons, setWeapons] = useState<{ id: string; name: string }[]>([])
  const [magicSchools, setMagicSchools] = useState<{ id: string; name: string }[]>([])
  const [staerkenData, setStaerkenData] = useState<{
    id: string; name: string; desc: string; kosten: number; kategorie: string;
    mehrfach: boolean; max: number | null;
  }[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillDelta, setSkillDelta] = useState<Record<string, number>>({})
  const [staerken, setStaerken] = useState<string[]>([])
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
      .finally(() => setSkillsLoading(false))
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    if (skillsLoading) return
    if (talents.length === 0) return
    initializedRef.current = true

    const saved = stepData as {
      skills?: Record<string, number>
      staerke?: string
      staerken?: string[]
    } | null

    setSkillDelta(saved?.skills ?? {})
    setStaerken(
      saved?.staerken?.length
        ? saved.staerken
        : saved?.staerke
          ? [saved.staerke]
          : [],
    )
  }, [stepData, skillsLoading, talents, weapons, magicSchools])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  const usedPoints = Object.values(skillDelta).reduce((a, b) => a + b, 0)
  const availablePoints = INITIAL_POINTS - usedPoints

  const getSkillValue = (id: string) => (baseSkills[id] ?? 0) + (skillDelta[id] ?? 0)

  const saveDelta = (newDelta: Record<string, number>, newStaerken: string[] = staerken) => {
    const cleaned: Record<string, number> = {}
    for (const [k, v] of Object.entries(newDelta)) {
      if (v > 0) cleaned[k] = v
    }
    updateStepDelta('kindheit', {
      skills: cleaned,
      staerke: newStaerken[0] ?? '',
      staerken: [...newStaerken],
    })
  }

  // INT-000028: Nur Stärken, deren regulärer Preis in das 1-Punkt-Budget
  // passt, können in Schritt 5 überhaupt gewählt werden.
  const eligibleStaerken = staerkenData.filter((s) => s.kosten <= STAERKEN_PUNKTE)
  const countOf = (id: string): number => zaehleStaerkenAuswahlen(staerken, id)
  const maxOf = (s: { mehrfach: boolean; max: number | null }): number =>
    maxAuswahlVonEintrag(s)

  // INT-000027: Jede Auswahl – auch die zweite einer mehrfach wählbaren
  // Stärke – zieht ihren regulären Preis vom Budget ab.
  const staerkenVerbrauch = staerkenPunkteVerbrauch(
    staerken,
    (id) => staerkenData.find((x) => x.id === id)?.kosten ?? 1,
  )
  const staerkenAvailable = STAERKEN_PUNKTE - staerkenVerbrauch

  // INT-000023: Eine mehrfach wählbare Stärke bleibt bis zur Obergrenze im
  // Angebot. INT-000028: Ob eine weitere Auswahl tatsächlich möglich ist,
  // entscheidet zusätzlich das 1-Punkt-Budget (siehe `isDisabled` unten) –
  // identisch zum Vorgehen in den Schritten 6 und 8.
  const angeboteneStaerken = eligibleStaerken.filter(
    (s) => !s.mehrfach || countOf(s.id) < maxOf(s),
  )
  const selectedMultiStaerken = staerkenData.filter(
    (s) => s.mehrfach && countOf(s.id) > 0,
  )

  useEffect(() => {
    const valid = staerkenAvailable <= 0 && availablePoints <= 0
    onValid(valid)
  }, [staerkenAvailable, availablePoints, onValid])

  const incrementSkill = (id: string) => {
    const current = getSkillValue(id)
    const max = getSkillMax(id)
    if (availablePoints <= 0 || current >= max) return
    const next = { ...skillDelta, [id]: (skillDelta[id] ?? 0) + 1 }
    setSkillDelta(next)
    saveDelta(next)
  }

  const decrementSkill = (id: string) => {
    const current = skillDelta[id] ?? 0
    if (current <= 0) return
    const next = { ...skillDelta, [id]: current - 1 }
    setSkillDelta(next)
    saveDelta(next)
  }

  const getSkillMax = (id: string): number => {
    if (magicSchools.some((m) => m.id === id)) {
      const hasOtherAt3 = magicSchools.some((m) => m.id !== id && (skillDelta[m.id] ?? 0) >= 3)
      const cap = hasOtherAt3 ? 2 : 3
      return (baseSkills[id] ?? 0) + cap
    }
    return 6;
  }

  const handleStaerke = (s: StaerkenWahlEintrag) => {
    // Nicht mehrfach wählbare Stärken bleiben abwählbar (Toggle wie bisher).
    if (!s.mehrfach && staerken.includes(s.id)) {
      const next = staerken.filter((value) => value !== s.id)
      setStaerken(next)
      saveDelta(skillDelta, next)
      return
    }
    // INT-000028: Obergrenze und 1-Punkt-Budget wirken gemeinsam. Erst wenn
    // beides stimmt, wird die Auswahl akzeptiert und der Preis abgezogen.
    if (!istStaerkeNochWaehlbar(s, staerken, staerkenAvailable)) return
    const next = [...staerken, s.id]
    setStaerken(next)
    saveDelta(skillDelta, next)
  }

  const removeOneStaerke = (id: string) => {
    const index = staerken.indexOf(id)
    if (index < 0) return
    const next = [...staerken]
    next.splice(index, 1)
    setStaerken(next)
    saveDelta(skillDelta, next)
  }

  // INT-000018: Testmodus – alle 20 Fertigkeitspunkte zufällig verteilen und
  // eine zulässige Stärke wählen. Magieschulen werden ausgelassen: Sie würden
  // im späteren Zauber-Schritt Zauberauswahlen erzwingen, für die die
  // Bibliothek keine passenden Einträge bereithält.
  const fillRandomly = () => {
    const staerkeId = pickRandom(eligibleStaerken)?.id
    if (!staerkeId) return
    const skillIds = [...talents, ...weapons].map((s) => s.id)
    const next = distributePoints(
      skillIds,
      (id) => baseSkills[id] ?? 0,
      () => 6,
      INITIAL_POINTS,
    )
    setSkillDelta(next)
    setStaerken([staerkeId])
    saveDelta(next, [staerkeId])
  }
  useStepFill(fillRandomly, !skillsLoading && talents.length > 0)

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
            const value = getSkillValue(item.id)
            const max = getSkillMax(item.id)
            const canInc = availablePoints > 0 && value < max
            const canDec = (skillDelta[item.id] ?? 0) > 0
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

      <div style={styles.counters}>
        <div style={{ ...styles.counter, ...(staerkenAvailable === 0 ? styles.counterZero : {}) }}>
          Stärken Punkte: {staerkenAvailable}
        </div>
        <div style={{ ...styles.counter, ...(availablePoints === 0 ? styles.counterZero : {}) }}>
          Fertigkeits-Punkte: {availablePoints}
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
        <h3 style={styles.sectionTitle}>Stärke wählen</h3>
        {selectedMultiStaerken.length > 0 && (
          <div style={styles.selectedStaerken}>
            {selectedMultiStaerken.map((s) => (
              <span key={s.id} style={styles.selectedStaerke}>
                {displayNameWithCount(s.name, countOf(s.id))}
                <span style={styles.staerkeCount}>Auswahl {countOf(s.id)} / {maxOf(s)}</span>
                <button
                  type="button"
                  style={styles.removeStaerke}
                  aria-label={`${s.name} entfernen`}
                  onClick={() => removeOneStaerke(s.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={styles.staerkenGrid}>
          {angeboteneStaerken.map((s) => {
            const isSelected = countOf(s.id) > 0
            // Eine bereits gewählte, nicht mehrfach wählbare Stärke bleibt
            // zum Abwählen anklickbar. Jede weitere Auswahl wird nur bei
            // freier Obergrenze UND ausreichendem Budget angeboten.
            const canToggleOff = !s.mehrfach && isSelected
            const isDisabled = !canToggleOff
              && !istStaerkeNochWaehlbar(s, staerken, staerkenAvailable)
            return (
              <button
                key={s.id}
                style={{
                  ...styles.staerkeCard,
                  ...(isSelected ? styles.staerkeCardSelected : {}),
                  ...(isDisabled ? styles.staerkeCardDisabled : {}),
                }}
                aria-pressed={isSelected}
                onClick={() => handleStaerke(s)}
                disabled={isDisabled}
              >
                <div style={styles.staerkeHeader}>
                  <span style={styles.staerkeName}>{s.name}</span>
                  <span style={styles.staerkeCost}>{s.kosten} Punkt{s.kosten > 1 ? 'e' : ''}</span>
                </div>
                {s.mehrfach && (
                  <span style={styles.staerkeCount}>Auswahl {countOf(s.id)} / {maxOf(s)}</span>
                )}
                <span style={styles.staerkeDesc}>{s.desc}</span>
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
  selectedStaerken: {
    display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12,
  },
  selectedStaerke: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '4px 8px', fontSize: 13, color: 'var(--text-primary)',
  },
  removeStaerke: {
    background: 'transparent', border: 'none', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
  },
}
