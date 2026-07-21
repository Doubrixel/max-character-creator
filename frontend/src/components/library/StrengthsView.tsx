import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface StrengthEntry {
  id: string
  name: string
  description: string | null
  config: string | null
  createdAt: number | null
  updatedAt: number | null
}

export default function StrengthsView() {
  const [entries, setEntries] = useState<StrengthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kosten, setKosten] = useState('1')
  const [nurBeiErstellung, setNurBeiErstellung] = useState(false)

  const load = () => {
    fetch(`${API_BASE}/api/library/strengths`)
      .then(r => r.json())
      .then((data: StrengthEntry[]) => {
        const sorted = [...data].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        setEntries(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getCreationOnly = (e: StrengthEntry): boolean => {
    try {
      const cfg = e.config ? JSON.parse(e.config) : {}
      return cfg.nur_bei_erstellung === 'true'
    } catch { return false }
  }

  const getKosten = (e: StrengthEntry): string => {
    try {
      const cfg = e.config ? JSON.parse(e.config) : {}
      return cfg.kosten ?? '?'
    } catch { return '?' }
  }

  const creationOnly = entries.filter(e => getCreationOnly(e))
  const others = entries.filter(e => !getCreationOnly(e))
  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const resetForm = () => {
    setName('')
    setDescription('')
    setKosten('1')
    setNurBeiErstellung(false)
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      config: JSON.stringify({ kosten, nur_bei_erstellung: nurBeiErstellung ? 'true' : 'false' }),
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/strengths/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/strengths`, {
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
    const res = await fetch(`${API_BASE}/api/library/strengths/${id}`, { method: 'DELETE' })
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

  const startEdit = (entry: StrengthEntry) => {
    setName(entry.name)
    setDescription(entry.description ?? '')
    try {
      const cfg = entry.config ? JSON.parse(entry.config) : {}
      setKosten(cfg.kosten ?? '1')
      setNurBeiErstellung(cfg.nur_bei_erstellung === 'true')
    } catch {
      setKosten('1')
      setNurBeiErstellung(false)
    }
    setEditingId(entry.id)
    setShowForm(true)
  }

  const parseStaerkenFile = (content: string) => {
    const results: { name: string; description: string; config: Record<string, string> }[] = []
    const regex = /\*\*(.+?)\s*\((\d+)(\*?)\):\*\*\s*([\s\S]*?)(?=\n\n\*\*|\n*$)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      results.push({
        name: match[1].trim(),
        description: match[4].trim().replace(/\n/g, ' '),
        config: {
          kosten: match[2],
          nur_bei_erstellung: match[3] === '*' ? 'true' : 'false',
        },
      })
    }
    return results
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const content = await file.text()
      const parsed = parseStaerkenFile(content)
      let imported = 0
      let skipped = 0
      const existingNames = new Set(entries.map(en => en.name.toLowerCase()))
      for (const entry of parsed) {
        if (existingNames.has(entry.name.toLowerCase())) {
          skipped++
          continue
        }
        await fetch(`${API_BASE}/api/library/strengths`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            description: entry.description,
            config: JSON.stringify(entry.config),
          }),
        })
        imported++
      }
      setImportResult({ imported, skipped })
      load()
    } catch (err) {
      console.error('Import fehlgeschlagen:', err)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  const renderGrid = (title: string, items: StrengthEntry[]) => (
    <div style={styles.gridSection}>
      <h3 style={styles.gridTitle}>{title} ({items.length})</h3>
      <div style={styles.grid}>
        {items.map(entry => (
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
              <span style={styles.cardKosten}>Kosten: {getKosten(entry)}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={styles.gridEmpty}>Keine Einträge vorhanden.</div>
        )}
      </div>
    </div>
  )

  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        {deleteError && (
          <div style={styles.errorBanner}>
            {deleteError}
            <button style={styles.errorClose} onClick={() => setDeleteError(null)}>×</button>
          </div>
        )}

        {importResult && (
          <div style={styles.successBanner}>
            Import: {importResult.imported} importiert, {importResult.skipped} übersprungen.
            <button style={styles.errorClose} onClick={() => setImportResult(null)}>×</button>
          </div>
        )}

        <div style={styles.header}>
          <span style={styles.count}>{entries.length} Stärken</span>
          <div style={styles.headerActions}>
            <label style={styles.importBtn}>
              <input
                type="file"
                accept=".md"
                style={{ display: 'none' }}
                onChange={handleImport}
                disabled={importing}
              />
              {importing ? 'Importiere...' : 'Datei importieren'}
            </label>
            <button
              style={selectedId ? styles.editBtn : styles.editBtnDisabled}
              disabled={!selectedId}
              onClick={() => {
                if (!selectedEntry) return
                startEdit(selectedEntry)
              }}
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
                placeholder="Stärkenname"
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
                rows={3}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Kosten (Punkte)</label>
              <input
                style={styles.input}
                type="number"
                placeholder="1"
                value={kosten}
                onChange={e => setKosten(e.target.value)}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={nurBeiErstellung}
                  onChange={e => setNurBeiErstellung(e.target.checked)}
                />
                <span>Nur bei Erstellung wählbar</span>
              </label>
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

        {renderGrid('Nur bei Erstellung', creationOnly)}
        {renderGrid('Alle Stärken', others)}
      </div>

      <div style={styles.detailPanel}>
        {selectedEntry ? (
          <div style={styles.detailContent}>
            <h3 style={styles.detailName}>{selectedEntry.name}</h3>
            <div style={styles.detailMeta}>
              Kosten: {getKosten(selectedEntry)}
              {getCreationOnly(selectedEntry) && ' · Nur bei Erstellung'}
            </div>
            <div style={styles.detailDesc}>
              {selectedEntry.description || 'Keine Beschreibung vorhanden.'}
            </div>
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            Klicke eine Stärke an, um die Beschreibung zu lesen.
          </div>
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
  layout: {
    display: 'flex', gap: 20, minHeight: 400, overflow: 'hidden',
  },
  main: {
    flex: 3, minWidth: 0, overflow: 'auto',
  },
  detailPanel: {
    flex: 1, minWidth: 250, maxWidth: '25vw',
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 20, position: 'sticky', top: 0,
    maxHeight: 'calc(100vh - 200px)', overflow: 'auto',
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
  successBanner: {
    background: 'var(--bg-success, rgba(76,175,80,0.1))', border: '1px solid var(--success)',
    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'var(--success)', fontSize: 14,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  count: { fontSize: 13, color: 'var(--text-secondary)' },
  headerActions: { display: 'flex', gap: 8 },
  importBtn: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center',
  },
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
  textarea: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', resize: 'vertical', width: '100%',
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)',
    cursor: 'pointer',
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
  gridSection: { marginBottom: 24 },
  gridTitle: {
    fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10,
  },
  gridEmpty: {
    gridColumn: '1 / -1', color: 'var(--text-tertiary)', fontSize: 13,
    padding: 12, fontStyle: 'italic',
  },
  card: {
    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s', display: 'flex', flexDirection: 'column', gap: 6,
    minHeight: 60, outline: 'none',
  },
  cardSelected: {
    borderColor: '#eab308', background: 'rgba(234,179,8,0.08)',
  },
  cardHeader: {
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  cardName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardKosten: {
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
