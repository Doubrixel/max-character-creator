import { useState, useEffect } from 'react'
import { SKILL_OPTIONS } from './typeSchemas'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface MasteryEntry {
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

function getSkillName(id: string): string {
  return SKILL_OPTIONS.find(s => s.id === id)?.name ?? id
}

export default function MasteriesView() {
  const [entries, setEntries] = useState<MasteryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [effekt, setEffekt] = useState('')
  const [kosten, setKosten] = useState('1')
  const [kategorie, setKategorie] = useState('pflicht')
  const [voraussetzungTyp, setVoraussetzungTyp] = useState('skill >= wert')
  const [voraussetzungId, setVoraussetzungId] = useState('')
  const [voraussetzungWert, setVoraussetzungWert] = useState('6')

  const load = () => {
    fetch(`${API_BASE}/api/library/masteries`)
      .then(r => r.json())
      .then((data: MasteryEntry[]) => {
        const sorted = [...data].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        setEntries(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getKategorie = (e: MasteryEntry): string => {
    return parseConfig(e.config).kategorie ?? 'pflicht'
  }
  const getKosten = (e: MasteryEntry): string => {
    return parseConfig(e.config).kosten ?? '?'
  }
  const getEffekt = (e: MasteryEntry): string => {
    return parseConfig(e.config).effekt ?? ''
  }
  const getVoraussetzung = (e: MasteryEntry): string => {
    const cfg = parseConfig(e.config)
    if (!cfg.voraussetzung_id) return ''
    const wert = cfg.voraussetzung_wert ?? '?'
    return `${getSkillName(cfg.voraussetzung_id)} >= ${wert}`
  }

  const pflicht = entries.filter(e => getKategorie(e) === 'pflicht')
  const bonus = entries.filter(e => getKategorie(e) !== 'pflicht')
  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const resetForm = () => {
    setName('')
    setDescription('')
    setEffekt('')
    setKosten('1')
    setKategorie('pflicht')
    setVoraussetzungTyp('skill >= wert')
    setVoraussetzungId('')
    setVoraussetzungWert('6')
    setEditingId(null)
  }

  const buildConfig = () => ({
    effekt,
    kosten,
    kategorie,
    voraussetzung_typ: voraussetzungTyp,
    voraussetzung_id: voraussetzungId,
    voraussetzung_wert: voraussetzungWert,
  })

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      config: JSON.stringify(buildConfig()),
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/masteries/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/masteries`, {
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
    const res = await fetch(`${API_BASE}/api/library/masteries/${id}`, { method: 'DELETE' })
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

  const startEdit = (entry: MasteryEntry) => {
    setName(entry.name)
    setDescription(entry.description ?? '')
    const cfg = parseConfig(entry.config)
    setEffekt(cfg.effekt ?? '')
    setKosten(cfg.kosten ?? '1')
    setKategorie(cfg.kategorie ?? 'pflicht')
    setVoraussetzungTyp(cfg.voraussetzung_typ ?? 'skill >= wert')
    setVoraussetzungId(cfg.voraussetzung_id ?? '')
    setVoraussetzungWert(cfg.voraussetzung_wert ?? '6')
    setEditingId(entry.id)
    setShowForm(true)
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  const renderGrid = (title: string, items: MasteryEntry[]) => (
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
              <span style={styles.cardMeta}>Kosten: {getKosten(entry)}</span>
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

        <div style={styles.header}>
          <span style={styles.count}>{entries.length} Meisterschaften</span>
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
                placeholder="Meisterschaftsname"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Effekt *</label>
              <textarea
                style={styles.textarea}
                placeholder="Was bewirkt diese Meisterschaft?"
                value={effekt}
                onChange={e => setEffekt(e.target.value)}
                rows={3}
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Beschreibung</label>
              <textarea
                style={styles.textarea}
                placeholder="Flavor / Lore..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
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
              <label style={styles.label}>Kategorie</label>
              <select
                style={styles.select}
                value={kategorie}
                onChange={e => setKategorie(e.target.value)}
              >
                <option value="pflicht">Pflicht</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Voraussetzung Typ</label>
              <select
                style={styles.select}
                value={voraussetzungTyp}
                onChange={e => setVoraussetzungTyp(e.target.value)}
              >
                <option value="skill >= wert">Skill {'>='} Wert</option>
                <option value="magie >= wert">Magie {'>='} Wert</option>
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Voraussetzung Skill</label>
              <select
                style={styles.select}
                value={voraussetzungId}
                onChange={e => setVoraussetzungId(e.target.value)}
              >
                <option value="">Keine</option>
                {SKILL_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Voraussetzung Min-Wert</label>
              <input
                style={styles.input}
                type="number"
                placeholder="6"
                value={voraussetzungWert}
                onChange={e => setVoraussetzungWert(e.target.value)}
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

        {renderGrid('Pflicht-Meisterschaften', pflicht)}
        {renderGrid('Bonus-Meisterschaften', bonus)}
      </div>

      <div style={styles.detailPanel}>
        {selectedEntry ? (
          <div style={styles.detailContent}>
            <h3 style={styles.detailName}>{selectedEntry.name}</h3>
            <div style={styles.detailMeta}>
              Kosten: {getKosten(selectedEntry)} · {getKategorie(selectedEntry) === 'pflicht' ? 'Pflicht' : 'Bonus'}
            </div>
            {getVoraussetzung(selectedEntry) && (
              <div style={styles.detailMeta}>
                Voraussetzung: {getVoraussetzung(selectedEntry)}
              </div>
            )}
            <div style={styles.detailDesc}>
              {getEffekt(selectedEntry) || 'Kein Effekt definiert.'}
            </div>
            {selectedEntry.description && (
              <div style={styles.detailLore}>
                {selectedEntry.description}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            Klicke eine Meisterschaft an, um Details zu sehen.
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Meisterschaft löschen?</h3>
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
  detailLore: {
    fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5,
    fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 12,
    marginTop: 4,
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
  count: { fontSize: 13, color: 'var(--text-secondary)' },
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
