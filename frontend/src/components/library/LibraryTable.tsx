import { useState, useEffect } from 'react'

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

export default function LibraryTable({ type }: LibraryTableProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', config: '' })

  const load = () => {
    fetch(`${API_BASE}/api/library/${type}`)
      .then(r => r.json())
      .then((data: LibraryEntry[]) => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [type])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      config: form.config.trim() || null,
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
    setForm({ name: '', description: '', config: '' })
    setEditingId(null)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/api/library/${type}/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    load()
  }

  const startEdit = (entry: LibraryEntry) => {
    setForm({
      name: entry.name,
      description: entry.description ?? '',
      config: entry.config ?? '',
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  return (
    <div>
      <div style={styles.header}>
        <span style={styles.count}>{entries.length} Einträge</span>
        <button
          style={styles.addBtn}
          onClick={() => {
            setForm({ name: '', description: '', config: '' })
            setEditingId(null)
            setShowForm(!showForm)
          }}
        >
          {showForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {showForm && (
        <div style={styles.form}>
          <input
            style={styles.input}
            placeholder="Name *"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <textarea
            style={styles.textarea}
            placeholder="Beschreibung"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <textarea
            style={styles.textarea}
            placeholder='Config (JSON, z.B. {"vorteile": "...", "nachteile": "..."})'
            value={form.config}
            onChange={e => setForm(p => ({ ...p, config: e.target.value }))}
            rows={4}
          />
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
          entries.map(entry => (
            <div key={entry.id} style={styles.row}>
              <div style={styles.rowContent}>
                <div style={styles.rowName}>{entry.name}</div>
                {entry.description && (
                  <div style={styles.rowDesc}>{entry.description}</div>
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
          ))
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
    borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
  },
  input: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
  },
  textarea: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', resize: 'vertical', fontFamily: 'monospace',
  },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
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
}
