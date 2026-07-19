import { useState, useEffect } from 'react'
import { TYPE_SCHEMAS, SKILL_OPTIONS, STRENGTH_OPTIONS, MASTERY_OPTIONS, MAGIC_SCHOOL_OPTIONS, type FieldSchema } from './typeSchemas'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface LibraryEntry {
  id: string
  name: string
  description: string | null
  config: string | null
  createdAt: number | null
  updatedAt: number | null
}

interface LibraryTableProps {
  type: string
}

function getOptions(field: FieldSchema): { id: string; name: string }[] {
  if (field.key.includes('Talente') || field.key.includes('Waffen')) return SKILL_OPTIONS
  if (field.key.includes('Magie') || field.key === 'schule') return MAGIC_SCHOOL_OPTIONS
  if (field.key.includes('Staerken')) return STRENGTH_OPTIONS
  if (field.key.includes('meisterschaften')) return MASTERY_OPTIONS
  if (field.key.includes('voraussetzung_id')) return [...SKILL_OPTIONS, ...MAGIC_SCHOOL_OPTIONS]
  return SKILL_OPTIONS
}

function parseConfigArray(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

function encodeConfigArray(arr: string[]): string {
  return JSON.stringify(arr)
}

export default function LibraryTable({ type }: LibraryTableProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configFields, setConfigFields] = useState<Record<string, string>>({})

  const schema = TYPE_SCHEMAS[type]
  const fields = schema?.fields ?? []

  const load = () => {
    fetch(`${API_BASE}/api/library/${type}`)
      .then(r => r.json())
      .then((data: LibraryEntry[]) => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [type])

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
      await fetch(`${API_BASE}/api/library/${type}/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/${type}`, {
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
    const res = await fetch(`${API_BASE}/api/library/${type}/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(null)
      setDeleteError(null)
      load()
    } else {
      const data = await res.json()
      setDeleteError(data.message || 'Löschen fehlgeschlagen')
      setDeleteConfirm(null)
    }
  }

  const startEdit = (entry: LibraryEntry) => {
    setName(entry.name)
    setDescription(entry.description ?? '')
    try {
      const cfg = entry.config ? JSON.parse(entry.config) : {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(cfg)) {
        if (Array.isArray(v)) flat[k] = encodeConfigArray(v)
        else if (typeof v === 'object' && v !== null) flat[k] = JSON.stringify(v)
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

  const toggleMultiSelect = (key: string, id: string) => {
    setConfigFields(prev => {
      const current = parseConfigArray(prev[key])
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      return { ...prev, [key]: encodeConfigArray(next) }
    })
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  return (
    <div>
      {deleteError && (
        <div style={styles.errorBanner}>
          {deleteError}
          <button style={styles.errorClose} onClick={() => setDeleteError(null)}>×</button>
        </div>
      )}
      <div style={styles.header}>
        <span style={styles.count}>{entries.length} Einträge</span>
        <button
          style={styles.addBtn}
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.label}>Name *</label>
            <input
              style={styles.input}
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Beschreibung</label>
            <textarea
              style={styles.textarea}
              placeholder="Beschreibung..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {fields.map(field => (
            <div key={field.key} style={styles.formRow}>
              <label style={styles.label}>{field.label}</label>

              {field.type === 'skillSelect' ? (
                <div style={styles.chipContainer}>
                  {getOptions(field).map(opt => {
                    const selected = parseConfigArray(configFields[field.key]).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        style={{
                          ...styles.chip,
                          ...(selected ? styles.chipSelected : {}),
                        }}
                        onClick={() => toggleMultiSelect(field.key, opt.id)}
                      >
                        {selected ? '✓ ' : ''}{opt.name}
                      </button>
                    )
                  })}
                </div>
              ) : field.type === 'select' ? (
                <select
                  style={styles.select}
                  value={configFields[field.key] ?? ''}
                  onChange={e => setField(field.key, e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
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
            <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
            <button style={styles.saveBtn} onClick={handleSubmit}>
              {editingId ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.list}>
        {entries.length === 0 ? (
          <p style={styles.empty}>Noch keine Einträge vorhanden.</p>
        ) : (
          entries.map(entry => {
            let summary = ''
            try {
              const cfg = entry.config ? JSON.parse(entry.config) : {}
              const vals = Object.values(cfg).filter(v => v && v !== '' && v !== '[]')
              summary = vals.slice(0, 3).join(' · ')
            } catch {}
            return (
              <div key={entry.id} style={styles.row}>
                <div style={styles.rowContent}>
                  <div style={styles.rowName}>{entry.name}</div>
                  {entry.description && (
                    <div style={styles.rowDesc}>{entry.description}</div>
                  )}
                  {summary && (
                    <div style={styles.rowConfig}>{summary}</div>
                  )}
                </div>
                <div style={styles.rowActions}>
                  <button style={styles.editBtn} onClick={() => startEdit(entry)}>
                    Bearbeiten
                  </button>
                  <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(entry.id)}>
                    Löschen
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Eintrag löschen?</h3>
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
  count: { fontSize: 13, color: 'var(--text-secondary)' },
  addBtn: {
    background: 'var(--accent)', border: 'none', color: '#fff',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  form: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
  },
  formRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: {
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  },
  input: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    width: '100%',
  },
  select: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    width: '100%',
  },
  textarea: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', resize: 'vertical', width: '100%',
  },
  chipContainer: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  chip: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  chipSelected: {
    background: 'var(--accent)', borderColor: 'var(--accent)',
    color: '#fff',
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
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: 'var(--text-tertiary)', fontSize: 14 },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 16px',
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  rowDesc: {
    fontSize: 13, color: 'var(--text-secondary)', marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowConfig: {
    fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4,
    fontStyle: 'italic',
  },
  rowActions: { display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 },
  editBtn: {
    background: 'transparent', border: '1px solid var(--accent)',
    color: 'var(--accent)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
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
