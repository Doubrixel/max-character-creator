import { useState, useEffect } from 'react'
import { FULL_MAGIC_SKILLS, TYPE_SCHEMAS } from './typeSchemas'
import { useAppContext } from '../../context/AppContext'
import { schuwenwertToGrad } from '@mcc/shared'
import FilterPanel from './FilterPanel'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface SpellEntry {
  id: string
  name: string
  description: string | null
  config: string | null
  createdAt: number | null
  updatedAt: number | null
}

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function parseSchulen(cfg: Record<string, unknown>): { id: string; name: string; wert: number }[] {
  const raw = cfg.schulen
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  if (Array.isArray(raw)) return raw as { id: string; name: string; wert: number }[]
  return []
}

function getConfigSummary(cfg: Record<string, unknown>): string {
  const parts: string[] = []
  const keys = ['typus', 'schwierigkeit', 'kosten', 'zauberdauer', 'reichweite', 'artefakt', 'wirkungsdauer']
  for (const key of keys) {
    const val = cfg[key]
    if (val && val !== '' && val !== '[]') {
      parts.push(String(val))
    }
  }
  return parts.slice(0, 3).join(' · ')
}

const GRADE_OPTIONS = [
  { id: '0', label: 'Grad 0' },
  { id: '1', label: 'Grad 1' },
  { id: '2', label: 'Grad 2' },
  { id: '3', label: 'Grad 3' },
  { id: '4', label: 'Grad 4' },
  { id: '5', label: 'Grad 5' },
]

const spellSchema = TYPE_SCHEMAS.spells

export default function SpellsView() {
  const { reportApiError } = useAppContext()
  const [entries, setEntries] = useState<SpellEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showFilter, setShowFilter] = useState(false)
  const [filterSelected, setFilterSelected] = useState<Map<number, Set<string>>>(() => new Map())

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configFields, setConfigFields] = useState<Record<string, string>>({})

  const load = () => {
    fetch(`${API_BASE}/api/library/spells`)
      .then(r => r.json())
      .then((data: SpellEntry[]) => {
        const sorted = [...data].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        setEntries(sorted)
        setLoading(false)
      })
      .catch(() => { setLoading(false); reportApiError('Bibliotheksdaten konnten nicht geladen werden') })
  }

  useEffect(() => { load() }, [])

  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const toggleFilter = (colIndex: number, id: string) => {
    setFilterSelected(prev => {
      const next = new Map(prev)
      const set = new Set(next.get(colIndex) ?? [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      next.set(colIndex, set)
      return next
    })
  }

  const filteredEntries = entries.filter(entry => {
    const cfg = parseConfig(entry.config)
    const schulen = parseSchulen(cfg)
    const selectedSchulen = filterSelected.get(0)
    const selectedGrade = filterSelected.get(1)

    if ((!selectedSchulen || selectedSchulen.size === 0) && (!selectedGrade || selectedGrade.size === 0)) {
      return true
    }

    return schulen.some(s => {
      const schuleMatch = !selectedSchulen || selectedSchulen.size === 0 || selectedSchulen.has(s.id)
      const grad = schuwenwertToGrad(s.wert)
      const gradeMatch = !selectedGrade || selectedGrade.size === 0 || selectedGrade.has(String(grad))
      return schuleMatch && gradeMatch
    })
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setConfigFields({})
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      config: JSON.stringify(configFields) || null,
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/spells/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/spells`, {
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
    const res = await fetch(`${API_BASE}/api/library/spells/${id}`, { method: 'DELETE' })
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

  const startEdit = (entry: SpellEntry) => {
    setName(entry.name)
    setDescription(entry.description ?? '')
    try {
      const cfg = entry.config ? JSON.parse(entry.config) : {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(cfg)) {
        if (typeof v === 'object' && v !== null) flat[k] = JSON.stringify(v)
        else flat[k] = String(v ?? '')
      }
      setConfigFields(flat)
    } catch {
      setConfigFields({})
    }
    setEditingId(entry.id)
    setShowForm(true)
  }

  const setField = (key: string, value: string) => {
    setConfigFields(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        {deleteError && (
          <div style={styles.errorBanner}>
            {deleteError}
            <button style={styles.errorClose} onClick={() => setDeleteError(null)}>x</button>
          </div>
        )}

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.count}>{filteredEntries.length} Spells</span>
            <button
              style={{
                ...styles.filterBtn,
                ...(showFilter ? styles.filterBtnActive : {}),
              }}
              onClick={() => setShowFilter(!showFilter)}
            >Filter</button>
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
              Loschen
            </button>
            <button
              style={styles.addBtn}
              onClick={() => { resetForm(); setShowForm(!showForm) }}
            >
              {showForm ? 'Abbrechen' : '+ Neu'}
            </button>
          </div>
        </div>

        {showFilter && (
          <FilterPanel
            columns={[
              { title: 'Magieschule', options: FULL_MAGIC_SKILLS.map(s => ({ id: s.id, label: s.name })) },
              { title: 'Grad', options: GRADE_OPTIONS },
            ]}
            selected={filterSelected}
            onToggle={toggleFilter}
          />
        )}

        {showForm && (
          <div style={styles.form}>
            <div style={styles.formRow}>
              <label style={styles.label}>Name *</label>
              <input
                style={styles.input}
                placeholder="Spellname"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Wirkung</label>
              <textarea
                style={styles.textarea}
                placeholder="Beschreibung der Wirkung"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            {spellSchema.fields.map(field => (
              <div key={field.key} style={styles.formRow}>
                <label style={styles.label}>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    style={styles.select}
                    value={configFields[field.key] ?? ''}
                    onChange={e => setField(field.key, e.target.value)}
                  >
                    <option value="">Bitte wahlen...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    style={styles.textarea}
                    placeholder={field.placeholder}
                    value={configFields[field.key] ?? ''}
                    onChange={e => setField(field.key, e.target.value)}
                    rows={3}
                  />
                ) : field.type === 'number' ? (
                  <input
                    style={styles.input}
                    type="number"
                    placeholder={field.placeholder}
                    value={configFields[field.key] ?? ''}
                    onChange={e => setField(field.key, e.target.value)}
                  />
                ) : field.type === 'schoolValues' ? (
                  <div style={styles.schoolValuesContainer}>
                    {FULL_MAGIC_SKILLS.map(skill => {
                      let schulenArr: { id: string; name: string; wert: number }[] = []
                      try {
                        schulenArr = JSON.parse(configFields[field.key] || '[]')
                      } catch { schulenArr = [] }
                      const current = schulenArr.find(s => s.id === skill.id)
                      const wert = current?.wert ?? 0
                      return (
                        <div key={skill.id} style={styles.schoolValueRow}>
                          <span style={styles.schoolValueName}>{skill.name}</span>
                          <input
                            style={{ ...styles.input, width: 60, textAlign: 'center' }}
                            type="number"
                            min={0}
                            max={99}
                            value={wert}
                            onChange={e => {
                              const newWert = parseInt(e.target.value, 10) || 0
                              let arr: { id: string; name: string; wert: number }[] = []
                              try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                              const idx = arr.findIndex(s => s.id === skill.id)
                              if (newWert > 0) {
                                if (idx >= 0) arr[idx].wert = newWert
                                else arr.push({ id: skill.id, name: skill.name, wert: newWert })
                              } else if (idx >= 0) {
                                arr.splice(idx, 1)
                              }
                              setField(field.key, JSON.stringify(arr))
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <input
                    style={styles.input}
                    type="text"
                    placeholder={field.placeholder}
                    value={configFields[field.key] ?? ''}
                    onChange={e => setField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            <div style={styles.formActions}>
              <button style={styles.cancelBtn} onClick={() => { resetForm(); setShowForm(false) }}>
                Abbrechen
              </button>
              <button style={styles.saveBtn} onClick={handleSubmit}>
                {editingId ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        )}

        <div style={styles.list}>
          {filteredEntries.length === 0 ? (
            <p style={styles.empty}>Keine Einträge vorhanden.</p>
          ) : (
            filteredEntries.map(entry => {
              const cfg = parseConfig(entry.config)
              const summary = getConfigSummary(cfg)
              return (
                <div
                  key={entry.id}
                  style={{
                    ...styles.row,
                    ...(selectedId === entry.id ? styles.rowSelected : {}),
                  }}
                  onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                >
                  <div style={styles.rowContent}>
                    <div style={styles.rowName}>{entry.name}</div>
                    {entry.description && (
                      <div style={styles.rowDesc}>{entry.description}</div>
                    )}
                    {summary && (
                      <div style={styles.rowConfig}>{summary}</div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {deleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Spell loschen?</h3>
              <p style={styles.modalText}>Kann nicht ruckgangig gemacht werden.</p>
              <div style={styles.modalActions}>
                <button style={styles.modalCancel} onClick={() => setDeleteConfirm(null)}>
                  Abbrechen
                </button>
                <button style={styles.modalDelete} onClick={() => handleDelete(deleteConfirm)}>
                  Loschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.detailPanel}>
        {selectedEntry ? (
          <div style={styles.detailContent}>
            <h3 style={styles.detailName}>{selectedEntry.name}</h3>
            <div style={styles.detailMeta}>
              {(() => {
                const cfg = parseConfig(selectedEntry.config)
                const parts: string[] = []
                if (cfg.artefakt) parts.push(String(cfg.artefakt))
                const schulen = parseSchulen(cfg)
                if (schulen.length > 0) {
                  parts.push(schulen.map(s => `${s.name} (Grad ${schuwenwertToGrad(s.wert)})`).join(', '))
                }
                if (cfg.kosten) parts.push(`Kosten: ${cfg.kosten}`)
                return parts.join(' · ')
              })()}
            </div>
            {selectedEntry.description && (
              <div style={styles.detailDesc}>
                {selectedEntry.description}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            Klicke einen Spell an, um Details zu sehen.
          </div>
        )}
      </div>
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
  filterBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', borderRadius: 6, padding: '8px 16px', fontSize: 13,
    cursor: 'pointer',
  },
  filterBtnActive: {
    borderColor: 'var(--accent)', color: 'var(--accent)',
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
  schoolValuesContainer: {
    display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 300, overflowY: 'auto',
  },
  schoolValueRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  schoolValueName: {
    fontSize: 13, color: 'var(--text-primary)', flex: 1,
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
  list: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  empty: {
    color: 'var(--text-tertiary)', fontSize: 13, padding: 12, fontStyle: 'italic',
  },
  row: {
    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  },
  rowSelected: {
    background: 'rgba(234,179,8,0.12)',
  },
  rowContent: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
  },
  rowName: {
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
  },
  rowDesc: {
    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4,
  },
  rowConfig: {
    fontSize: 12, color: 'var(--text-tertiary)',
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