import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface CharacterSheetProps {
  characterId: string
  onDelete: (id: string) => void
}

interface DetailInfo {
  type: string
  name: string
  description: string
  extra?: string
}

const SKILL_NAMES: Record<string, string> = {
  akrobatik: 'Akrobatik', schleichen: 'Schleichen', wahrnehmung: 'Wahrnehmung',
  wissen: 'Wissen', ueberleben: 'Überleben', nahkampf: 'Nahkampf',
  distanz: 'Distanz', schild: 'Schild', elementar: 'Elementarmagie', heilung: 'Heilungsmagie',
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  MUT: 'Mut', KLU: 'Klugheit', INT: 'Intuition', CHA: 'Charisma',
  HIN: 'Hinterhalt', MYS: 'Mystik',
  FF: 'Fingerfertigkeit', GEW: 'Gewandheit', KON: 'Konstitution',
  KRA: 'Körperkraft',
}

export default function CharacterSheet({ characterId, onDelete }: CharacterSheetProps) {
  const { reportApiError } = useAppContext()
  const [state, setState] = useState<Record<string, unknown> | null>(null)
  const [strengthNames, setStrengthNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<DetailInfo | null>(null)

  const [skillMap, setSkillMap] = useState<Record<string, { name: string; description: string }>>({})
  const [strengthMap, setStrengthMap] = useState<Record<string, { name: string; description: string }>>({})
  const [masteryMap, setMasteryMap] = useState<Record<string, { name: string; description: string; effekt: string }>>({})
  const [spellMap, setSpellMap] = useState<Record<string, { name: string; description: string }>>({})
  const [raceMap, setRaceMap] = useState<Record<string, { name: string; description: string }>>({})
  const [cultureMap, setCultureMap] = useState<Record<string, { name: string; description: string }>>({})

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/characters/${characterId}/state`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/strengths`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/skills`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/masteries`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/spells`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/races`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      fetch(`${API_BASE}/api/library/cultures`)
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
    ])
      .then(([charData, strengthsData, skillsData, masteriesData, spellsData, racesData, culturesData]: [
        { state: Record<string, unknown> },
        { id: string; name: string; description: string | null }[],
        { id: string; name: string; description: string | null }[],
        { id: string; name: string; description: string | null; config: string | null }[],
        { id: string; name: string; description: string | null }[],
        { id: string; name: string; description: string | null }[],
        { id: string; name: string; description: string | null }[],
      ]) => {
        setState(charData.state)
        
        const sMap: Record<string, string> = {}
        for (const s of strengthsData) sMap[s.id] = s.name
        setStrengthNames(sMap)
        
        const strMap: Record<string, { name: string; description: string }> = {}
        for (const s of strengthsData) strMap[s.id] = { name: s.name, description: s.description || '' }
        setStrengthMap(strMap)
        
        const skMap: Record<string, { name: string; description: string }> = {}
        for (const s of skillsData) skMap[s.id] = { name: s.name, description: s.description || '' }
        setSkillMap(skMap)
        
        const mstMap: Record<string, { name: string; description: string; effekt: string }> = {}
        for (const m of masteriesData) {
          const config = m.config ? JSON.parse(m.config) : {}
          mstMap[m.id] = { 
            name: m.name, 
            description: m.description || '', 
            effekt: config.effekt || '' 
          }
        }
        setMasteryMap(mstMap)
        
        const spMap: Record<string, { name: string; description: string }> = {}
        for (const s of spellsData) spMap[s.id] = { name: s.name, description: s.description || '' }
        setSpellMap(spMap)
        
        const rMap: Record<string, { name: string; description: string }> = {}
        for (const r of racesData) rMap[r.id] = { name: r.name, description: r.description || '' }
        setRaceMap(rMap)
        
        const cMap: Record<string, { name: string; description: string }> = {}
        for (const c of culturesData) cMap[c.id] = { name: c.name, description: c.description || '' }
        setCultureMap(cMap)
        
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
        reportApiError('Charakter konnte nicht geladen werden')
      })
  }, [characterId])

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/characters/${characterId}`, { method: 'DELETE' })
      if (res.ok) onDelete(characterId)
      else reportApiError('Löschen fehlgeschlagen')
    } catch {
      reportApiError('Löschen fehlgeschlagen')
    }
  }

  if (loading) return <div style={styles.loading}>Lade...</div>
  if (loadError) return <div style={styles.error}>Charakter konnte nicht geladen werden.</div>
  if (!state) return <div style={styles.error}>Charakter nicht gefunden.</div>

  const skills = (state.skills ?? {}) as Record<string, number>
  const attribute = (state.attribute ?? {}) as Record<string, number>
  const derived = (state.derived ?? {}) as Record<string, number>
  const staerken = (state.staerken ?? []) as string[]
  const resources = (state.ressourcen ?? {}) as Record<string, number>

  const displayedStaerken = (() => {
    const counts = new Map<string, { id: string; name: string; count: number }>()
    const order: string[] = []
    for (const raw of staerken) {
      const id = (raw ?? '').trim()
      if (!id || id.toLowerCase() === 'keine') continue
      // Try to find the strength in strengthMap, fallback to using the raw ID
      const name = strengthNames[id] ?? strengthMap[id]?.name ?? id
      const existing = counts.get(id)
      if (existing === undefined) {
        counts.set(id, { id, name, count: 1 })
        order.push(id)
      } else {
        existing.count++
      }
    }
    return order.map((id) => {
      const data = counts.get(id)!
      const displayName = data.count > 1 ? `${data.name} ${toRoman(data.count)}` : data.name
      return { id: data.id, displayName }
    })
  })()

  // Extract data from delta objects
  const schicksalRaw = state.schicksal as { id?: string; name?: string; ruleText?: string } | null
  const schicksalName = schicksalRaw?.name ?? null
  const schicksalRuleText = schicksalRaw?.ruleText ?? null

  const rasseRaw = state.rasse as { id?: string; name?: string; groessenklasse?: number } | null
  const rasseId = rasseRaw?.id ?? null
  const rasseName = rasseRaw?.name ?? null

  const kulturRaw = state.kultur as { kulturId?: string; kulturName?: string } | null
  const kulturId = kulturRaw?.kulturId ?? null
  const kulturName = kulturRaw?.kulturName ?? null

  const groessenklasse = rasseRaw?.groessenklasse ?? null

  return (
    <div style={styles.container}>
      <div style={styles.sheet}>
        <div style={styles.sheetHeader}>
          <h2 style={styles.sheetTitle}>Charakterbogen</h2>
          <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(true)}>
            Löschen
          </button>
        </div>

        {schicksalName && (
          <div 
            style={{
              ...styles.infoRow,
              ...(schicksalRuleText ? styles.clickable : {})
            }}
            onClick={() => {
              if (schicksalRuleText) {
                setSelectedDetail({
                  type: 'Schicksal',
                  name: schicksalName,
                  description: schicksalRuleText
                })
              }
            }}
          >
            <span style={styles.infoLabel}>Schicksal:</span>
            <span>{schicksalName}</span>
          </div>
        )}
        {rasseName && (
          <div 
            style={{
              ...styles.infoRow,
              ...(rasseId && raceMap[rasseId]?.description ? styles.clickable : {})
            }}
            onClick={() => {
              if (rasseId && raceMap[rasseId]?.description) {
                setSelectedDetail({
                  type: 'Rasse',
                  name: rasseName,
                  description: raceMap[rasseId].description
                })
              }
            }}
          >
            <span style={styles.infoLabel}>Rasse:</span>
            <span>
              {rasseName}
              {groessenklasse !== null && ` (Größenklasse ${groessenklasse})`}
            </span>
          </div>
        )}
        {kulturName && (
          <div 
            style={{
              ...styles.infoRow,
              ...(kulturId && cultureMap[kulturId]?.description ? styles.clickable : {})
            }}
            onClick={() => {
              if (kulturId && cultureMap[kulturId]?.description) {
                setSelectedDetail({
                  type: 'Kultur',
                  name: kulturName,
                  description: cultureMap[kulturId].description
                })
              }
            }}
          >
            <span style={styles.infoLabel}>Kultur:</span>
            <span>{kulturName}</span>
          </div>
        )}

        {Object.keys(attribute).length > 0 && (
          <Section title="Attribute">
            <div style={styles.attrGrid}>
              {Object.entries(attribute).map(([key, val]) => (
                <div key={key} style={styles.attrItem}>
                  <span style={styles.attrName}>{ATTRIBUTE_NAMES[key] ?? key}</span>
                  <span style={styles.attrValue}>{val}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {Object.keys(derived).length > 0 && (
          <Section title="Abgeleitete Werte">
            <div style={styles.attrGrid}>
              {Object.entries(derived).map(([key, val]) => (
                <div key={key} style={styles.attrItem}>
                  <span style={styles.attrName}>{key}</span>
                  <span style={styles.attrValue}>{val}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {Object.keys(skills).length > 0 && (
          <Section title="Fähigkeiten">
            <div style={styles.skillGrid}>
              {Object.entries(skills)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([id, val]) => (
                  <div 
                    key={id} 
                    style={{
                      ...styles.skillItem,
                      ...(skillMap[id]?.description ? styles.clickable : {})
                    }}
                    onClick={() => {
                      if (skillMap[id]?.description) {
                        setSelectedDetail({
                          type: 'Fertigkeit',
                          name: skillMap[id].name,
                          description: skillMap[id].description
                        })
                      }
                    }}
                  >
                    <span>{SKILL_NAMES[id] ?? id}</span>
                    <span style={styles.skillValue}>{val}</span>
                  </div>
                ))}
            </div>
          </Section>
        )}

        {displayedStaerken.length > 0 && (
          <Section title="Stärken">
            <div style={styles.tagList}>
              {displayedStaerken.map((item, i) => (
                <span 
                  key={i} 
                  style={{
                    ...styles.tag,
                    ...(strengthMap[item.id]?.description ? styles.clickable : {})
                  }}
                  onClick={() => {
                    if (strengthMap[item.id]?.description) {
                      setSelectedDetail({
                        type: 'Stärke',
                        name: item.displayName,
                        description: strengthMap[item.id].description
                      })
                    }
                  }}
                >
                  {item.displayName}
                </span>
              ))}
            </div>
          </Section>
        )}

        {((state.meisterschaften ?? []) as { id: string; name: string }[]).length > 0 && (
          <Section title="Meisterschaften">
            <div style={styles.tagList}>
              {((state.meisterschaften ?? []) as { id: string; name: string }[]).map((m, i) => (
                <span 
                  key={i} 
                  style={{
                    ...styles.tag,
                    ...(masteryMap[m.id]?.description || masteryMap[m.id]?.effekt ? styles.clickable : {})
                  }}
                  onClick={() => {
                    if (masteryMap[m.id]) {
                      setSelectedDetail({
                        type: 'Meisterschaft',
                        name: m.name,
                        description: masteryMap[m.id].description,
                        extra: masteryMap[m.id].effekt
                      })
                    }
                  }}
                >
                  {m.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {((state.spells ?? []) as { spellId: string; spellName: string; schoolId: string; schoolName: string; grade: number }[]).length > 0 && (
          <Section title="Zauber">
            {(() => {
              const spellsBySchool = new Map<string, { spellId: string; spellName: string; grade: number }[]>()
              const spells = (state.spells ?? []) as { spellId: string; spellName: string; schoolId: string; schoolName: string; grade: number }[]
              for (const spell of spells) {
                const existing = spellsBySchool.get(spell.schoolName) ?? []
                existing.push({ spellId: spell.spellId, spellName: spell.spellName, grade: spell.grade })
                spellsBySchool.set(spell.schoolName, existing)
              }
              return Array.from(spellsBySchool.entries()).map(([schoolName, schoolSpells]) => (
                <div key={schoolName} style={styles.spellSchool}>
                  <div style={styles.spellSchoolName}>{schoolName}</div>
                  {schoolSpells
                    .sort((a, b) => a.grade - b.grade)
                    .map((spell, i) => (
                      <div key={i} style={styles.spellItem}>
                        <span style={styles.spellGrade}>Grad {spell.grade}:</span>
                        <span 
                          style={{
                            ...(spellMap[spell.spellId]?.description ? styles.clickable : {})
                          }}
                          onClick={() => {
                            if (spellMap[spell.spellId]?.description) {
                              setSelectedDetail({
                                type: 'Zauber',
                                name: spell.spellName,
                                description: spellMap[spell.spellId].description
                              })
                            }
                          }}
                        >
                          {spell.spellName}
                        </span>
                      </div>
                    ))}
                </div>
              ))
            })()}
          </Section>
        )}

        {Object.keys(resources).length > 0 && (
          <Section title="Ressourcen">
            <div style={styles.skillGrid}>
              {Object.entries(resources).filter(([, v]) => v > 0).map(([id, val]) => (
                <div key={id} style={styles.skillItem}>
                  <span>{id.toUpperCase()}</span>
                  <span style={styles.skillValue}>{val}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {deleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Charakter löschen?</h3>
              <p style={styles.modalText}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div style={styles.modalActions}>
                <button style={styles.modalCancel} onClick={() => setDeleteConfirm(false)}>
                  Abbrechen
                </button>
                <button style={styles.modalDelete} onClick={handleDelete}>
                  endgültig löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedDetail && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <h3 style={styles.detailTitle}>{selectedDetail.name}</h3>
            <button 
              style={styles.detailClose}
              onClick={() => setSelectedDetail(null)}
            >
              ×
            </button>
          </div>
          <div style={styles.detailType}>{selectedDetail.type}</div>
          <div style={styles.detailContent}>
            {selectedDetail.description && (
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Beschreibung</div>
                <p style={styles.detailText}>{selectedDetail.description}</p>
              </div>
            )}
            {selectedDetail.extra && (
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Effekt</div>
                <p style={styles.detailText}>{selectedDetail.extra}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function toRoman(n: number): string {
  const numerals: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let result = ''
  let rest = n
  for (const [value, symbol] of numerals) {
    while (rest >= value) {
      result += symbol
      rest -= value
    }
  }
  return result
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: 'var(--text-tertiary)', padding: 40 },
  error: { color: 'var(--danger)', padding: 40 },
  container: {
    display: 'flex',
    gap: 20,
    maxWidth: 1200,
  },
  sheet: { 
    flex: 1,
    maxWidth: 700,
  },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '6px 14px',
    cursor: 'pointer', fontSize: 13,
  },
  clickable: {
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  infoRow: { display: 'flex', gap: 8, marginBottom: 6, fontSize: 14, color: 'var(--text-secondary)' },
  infoLabel: { fontWeight: 600, color: 'var(--text-primary)' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: 'var(--accent)',
    borderBottom: '1px solid var(--border)', paddingBottom: 6, margin: '0 0 12px',
  },
  attrGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  attrItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 12px',
  },
  attrName: { fontSize: 13, color: 'var(--text-secondary)' },
  attrValue: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  skillGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 12px', fontSize: 13,
  },
  skillValue: { fontWeight: 700, color: 'var(--accent)', fontSize: 15 },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '4px 10px', fontSize: 13, color: 'var(--text-primary)',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, maxWidth: 400, width: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' },
  modalText: { fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' },
  modalActions: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  modalCancel: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
  },
  modalDelete: {
    background: 'var(--danger)', border: 'none',
    color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
  },
  spellSchool: {
    marginBottom: 12,
  },
  spellSchoolName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  spellItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  spellGrade: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    minWidth: 50,
  },
  detailPanel: {
    width: 400,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 20,
    position: 'sticky',
    top: 20,
    alignSelf: 'flex-start',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    flex: 1,
  },
  detailClose: {
    background: 'transparent',
    border: 'none',
    fontSize: 24,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailType: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
}
