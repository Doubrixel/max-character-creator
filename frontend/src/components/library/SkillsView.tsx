import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface SkillEntry {
  id: string
  name: string
  description: string | null
  config: string | null
  createdAt: number | null
  updatedAt: number | null
}

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

const KATEGORIE_LABELS: Record<string, string> = {
  fertigkeit: 'Fertigkeit',
  kampf: 'Kampffertigkeit',
  magie: 'Magieschule',
}

export default function SkillsView() {
  const [entries, setEntries] = useState<SkillEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('fertigkeit')
  const [beschreibung, setBeschreibung] = useState('')
  const [attribut1, setAttribut1] = useState('')
  const [attribut2, setAttribut2] = useState('')

  const [filter, setFilter] = useState<string | null>(null)

  const load = () => {
    fetch(`${API_BASE}/api/library/skills`)
      .then(r => r.json())
      .then((data: SkillEntry[]) => {
        const sorted = [...data].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        setEntries(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getKategorie = (e: SkillEntry): string => {
    return parseConfig(e.config).kategorie ?? 'talent'
  }

  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const resetForm = () => {
    setName('')
    setKategorie('fertigkeit')
    setBeschreibung('')
    setAttribut1('')
    setAttribut2('')
    setEditingId(null)
  }

  const buildConfig = () => {
    const cfg: Record<string, string> = {
      kategorie,
      maxWert: '18',
    }
    if (beschreibung.trim()) cfg.beschreibung = beschreibung.trim()
    if (attribut1.trim()) cfg.attribut1 = attribut1.trim()
    if (attribut2.trim()) cfg.attribut2 = attribut2.trim()
    return cfg
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: null,
      config: JSON.stringify(buildConfig()),
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/skills/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    resetForm()
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/library/skills/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedId === id) setSelectedId(null)
      setDeleteConfirm(null)
      setDeleteError(null)
      load()
    } else {
      const data = await res.json()
      setDeleteError(data.message || 'Löschen fehlgeschlagen')
      setDeleteConfirm(null)
    }
  }

  const startEdit = (entry: SkillEntry) => {
    setName(entry.name)
    const cfg = parseConfig(entry.config)
    setKategorie(cfg.kategorie ?? 'fertigkeit')
    setBeschreibung(cfg.beschreibung ?? '')
    setAttribut1(cfg.attribut1 ?? '')
    setAttribut2(cfg.attribut2 ?? '')
    setEditingId(entry.id)
    setShowForm(true)
  }

  const filteredEntries = filter
    ? entries.filter(e => getKategorie(e) === filter)
    : entries

  if (loading) return <div style={styles.loading}>Lade...</div>

  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        {deleteError && (
          <div style={styles.errorBanner}>
            {deleteError}
            <button style={styles.errorClose} onClick={() => setDeleteError(null)}>×</button>
          </div>
        )}

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.count}>{filteredEntries.length} Fähigkeiten</span>
            <div style={styles.filterGroup}>
              {['fertigkeit', 'kampf', 'magie'].map(k => (
                <button
                  key={k}
                  style={{
                    ...styles.filterBtn,
                    ...(filter === k ? styles.filterBtnActive : {}),
                  }}
                  onClick={() => setFilter(filter === k ? null : k)}
                >
                  {KATEGORIE_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              style={selectedId ? styles.editBtn : styles.editBtnDisabled}
              disabled={!selectedId}
              onClick={() => { if (selectedEntry) startEdit(selectedEntry) }}
            >
              Bearbeiten
            </button>
            <button
              style={selectedId ? styles.deleteBtn : styles.deleteBtnDisabled}
              disabled={!selectedId}
              onClick={() => { if (selectedId) setDeleteConfirm(selectedId) }}
            >
              Löschen
            </button>
            <button
              style={styles.addBtn}
              onClick={() => { resetForm(); setShowForm(!showForm) }}
            >
              {showForm ? 'Abbrechen' : '+ Neu'}
            </button>
          </div>
        </div>

        {showForm && (
          <div style={styles.form}>
            <div style={styles.formRow}>
              <label style={styles.label}>Name *</label>
              <input
                style={styles.input}
                placeholder="Fähigkeitsname"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Kategorie</label>
              <select
                style={styles.select}
                value={kategorie}
                onChange={e => setKategorie(e.target.value)}
              >
                <option value="fertigkeit">Fertigkeit</option>
                <option value="kampf">Kampffertigkeit</option>
                <option value="magie">Magieschule</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ ...styles.formRow, flex: 1 }}>
                <label style={styles.label}>Attribut 1</label>
                <select
                  style={styles.select}
                  value={attribut1}
                  onChange={e => setAttribut1(e.target.value)}
                >
                  <option value="">Keines</option>
                  <option value="MU">MU (Mut)</option>
                  <option value="KL">KL (Klugheit)</option>
                  <option value="IN">IN (Intuition)</option>
                  <option value="CH">CH (Charisma)</option>
                  <option value="FF">FF (Fingerfertigkeit)</option>
                  <option value="GE">GE (Gewandheit)</option>
                  <option value="KO">KO (Konstitution)</option>
                  <option value="KK">KK (Körperkraft)</option>
                  <option value="SR">SR (Sinnenschärfe)</option>
                </select>
              </div>
              <div style={{ ...styles.formRow, flex: 1 }}>
                <label style={styles.label}>Attribut 2</label>
                <select
                  style={styles.select}
                  value={attribut2}
                  onChange={e => setAttribut2(e.target.value)}
                >
                  <option value="">Keines</option>
                  <option value="MU">MU (Mut)</option>
                  <option value="KL">KL (Klugheit)</option>
                  <option value="IN">IN (Intuition)</option>
                  <option value="CH">CH (Charisma)</option>
                  <option value="FF">FF (Fingerfertigkeit)</option>
                  <option value="GE">GE (Gewandheit)</option>
                  <option value="KO">KO (Konstitution)</option>
                  <option value="KK">KK (Körperkraft)</option>
                  <option value="SR">SR (Sinnenschärfe)</option>
                </select>
              </div>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Beschreibung (Regeltext)</label>
              <textarea
                style={styles.textarea}
                placeholder="Was tut diese Fähigkeit?"
                value={beschreibung}
                onChange={e => setBeschreibung(e.target.value)}
                rows={3}
              />
            </div>
            <div style={styles.formActions}>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Abbrechen
              </button>
              <button style={styles.saveBtn} onClick={handleSubmit}>
                {editingId ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        )}

        <div style={styles.grid}>
          {filteredEntries.map(entry => {
            const cfg = parseConfig(entry.config)
            const kategorie = cfg.kategorie ?? 'talent'
            const a1 = cfg.attribut1
            const a2 = cfg.attribut2
            return (
              <div
                key={entry.id}
                tabIndex={-1}
                style={{
                  ...styles.card,
                  ...(selectedId === entry.id ? styles.cardSelected : {}),
                }}
                onClick={(e) => {
                  setSelectedId(entry.id === selectedId ? null : entry.id)
                  ;(e.currentTarget as HTMLElement).blur()
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardName}>{entry.name}</span>
                  <span style={styles.cardMeta}>
                    {KATEGORIE_LABELS[kategorie] ?? kategorie}
                    {(a1 || a2) && ` · ${a1}${a2 ? '/' + a2 : ''}`}
                  </span>
                </div>
              </div>
            )
          })}
          {filteredEntries.length === 0 && (
            <div style={styles.gridEmpty}>Keine Einträge vorhanden.</div>
          )}
        </div>
      </div>

      <div style={styles.detailPanel}>
        {selectedEntry ? (
          <div style={styles.detailContent}>
            <h3 style={styles.detailName}>{selectedEntry.name}</h3>
            <div style={styles.detailMeta}>
              {(() => {
                const cfg = parseConfig(selectedEntry.config)
                const parts: string[] = []
                parts.push(KATEGORIE_LABELS[cfg.kategorie] ?? cfg.kategorie)
                parts.push('Max: 18')
                if (cfg.attribut1) parts.push(cfg.attribut1)
                if (cfg.attribut2) parts.push(cfg.attribut2)
                return parts.join(' · ')
              })()}
            </div>
            {(() => {
              const cfg = parseConfig(selectedEntry.config)
              return cfg.beschreibung ? (
                <div style={styles.detailDesc}>{cfg.beschreibung}</div>
              ) : null
            })()}
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            Klicke eine Fähigkeit an, um Details zu sehen.
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Fähigkeit löschen?</h3>
            <p style={styles.modalText}>Kann nicht rückgängig gemacht werden.</p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setDeleteConfirm(null)}>
                Abbrechen
              </button>
              <button style={styles.modalDelete} onClick={() => handleDelete(deleteConfirm)}>
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex', gap: 20, alignItems: 'flex-start',
  },
  main: {
    flex: 1, minWidth: 0,
  },
  detailPanel: {
    flex: '0 0 25%', width: '25%',
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 20, position: 'sticky', top: 20,
    maxHeight: 'calc(100vh - 40px)', overflow: 'auto',
  },
  detailContent: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  detailName: {
    fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
  },
  detailMeta: {
    fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
  },
  detailDesc: {
    fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  detailPlaceholder: {
    color: 'var(--text-tertiary)', fontSize: 14, fontStyle: 'italic',
    textAlign: 'center', padding: 40,
  },
  loading: { color: 'var(--text-tertiary)', padding: 40 },
  errorBanner: {
    background: 'var(--bg-error)', border: '1px solid var(--danger)',
    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'var(--danger)', fontSize: 14,
  },
  errorClose: {
    background: 'transparent', border: 'none', color: 'var(--danger)',
    cursor: 'pointer', fontSize: 18, padding: '0 4px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  count: { fontSize: 13, color: 'var(--text-secondary)' },
  filterGroup: {
    display: 'flex', gap: 4,
  },
  filterBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-tertiary)', borderRadius: 6, padding: '6px 12px', fontSize: 12,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: 'var(--accent)', border: '1px solid var(--accent)',
    color: '#fff',
  },
  headerActions: { display: 'flex', gap: 8 },
  addBtn: {
    background: 'var(--accent)', border: 'none', color: '#fff',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  editBtn: {
    background: 'transparent', border: '1px solid var(--accent)',
    color: 'var(--accent)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
  },
  editBtnDisabled: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-tertiary)', borderRadius: 6, padding: '8px 16px', fontSize: 13,
    opacity: 0.5, cursor: 'not-allowed',
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
  },
  deleteBtnDisabled: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-tertiary)', borderRadius: 6, padding: '8px 16px', fontSize: 13,
    opacity: 0.5, cursor: 'not-allowed',
  },
  form: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
  },
  formRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)',
    outline: 'none', width: '100%',
  },
  select: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)',
    outline: 'none', width: '100%',
  },
  textarea: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', resize: 'vertical', width: '100%',
  },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--accent)', border: 'none', color: '#fff',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10,
  },
  gridEmpty: {
    gridColumn: '1 / -1', color: 'var(--text-tertiary)', fontSize: 13,
    padding: 12, fontStyle: 'italic',
  },
  card: {
    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
    transition: 'background 0.15s', display: 'flex', flexDirection: 'column', gap: 6,
    minHeight: 60, outline: 'none',
  },
  cardSelected: {
    background: 'rgba(234,179,8,0.12)',
  },
  cardHeader: {
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  cardName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: 11, color: 'var(--text-tertiary)',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'var(--overlay)',
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
}
