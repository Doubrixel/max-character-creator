import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import RasseForm from './RasseForm'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface RaceEntry {
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

export default function RacesView() {
  const { reportApiError } = useAppContext()
  const [entries, setEntries] = useState<RaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rasseName, setRasseName] = useState('')
  const [rasseConfig, setRasseConfig] = useState<Record<string, string>>({})

  const load = () => {
    fetch(`${API_BASE}/api/library/races`)
      .then(r => r.json())
      .then((data: RaceEntry[]) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'de'))
        setEntries(sorted)
        setLoading(false)
      })
      .catch(() => { setLoading(false); reportApiError('Bibliotheksdaten konnten nicht geladen werden') })
  }

  useEffect(() => { load() }, [])

  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const resetForm = () => {
    setRasseName('')
    setRasseConfig({})
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/library/races/${id}`, { method: 'DELETE' })
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

  const startEdit = (entry: RaceEntry) => {
    setEditingId(entry.id)
    setRasseName(entry.name)
    setRasseConfig(entry.config ? JSON.parse(entry.config) : {})
    setShowForm(true)
  }

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
            <span style={styles.count}>{entries.length} Rassen</span>
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
          <RasseForm
            key={editingId ?? 'new'}
            editingId={editingId}
            initialName={rasseName}
            initialConfig={rasseConfig}
            onSaved={() => { setShowForm(false); setEditingId(null); setRasseName(''); setRasseConfig({}); load() }}
            onCancel={() => { setShowForm(false); setEditingId(null); setRasseName(''); setRasseConfig({}) }}
          />
        )}

        <div style={styles.grid}>
          {entries.map(entry => {
            const cfg = parseConfig(entry.config)
            const groessenklasse = cfg.groessenklasse ?? ''
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
                    {groessenklasse && `GK ${groessenklasse}`}
                  </span>
                </div>
              </div>
            )
          })}
          {entries.length === 0 && (
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
                if (cfg.groessenklasse) parts.push(`GK ${cfg.groessenklasse}`)
                return parts.join(' · ')
              })()}
            </div>
            {(() => {
              const cfg = parseConfig(selectedEntry.config)
              const beschreibung = cfg.beschreibung as string
              if (beschreibung) {
                return <div style={styles.detailDesc}>{beschreibung}</div>
              }
              return null
            })()}
            {(() => {
              const cfg = parseConfig(selectedEntry.config)
              const vorteile = cfg.vorteile as string[] | undefined
              const nachteile = cfg.nachteile as string[] | undefined
              const hasVorteile = vorteile && vorteile.length > 0 && vorteile.some(v => v.trim())
              const hasNachteile = nachteile && nachteile.length > 0 && nachteile.some(n => n.trim())
              if (!hasVorteile && !hasNachteile) return null
              return (
                <div style={styles.detailLists}>
                  {hasVorteile && (
                    <div>
                      <div style={styles.detailListTitle}>Vorteile</div>
                      <ul style={styles.detailList}>
                        {vorteile!.filter(v => v.trim()).map((v, i) => (
                          <li key={i}>{v.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hasNachteile && (
                    <div>
                      <div style={styles.detailListTitle}>Nachteile</div>
                      <ul style={styles.detailList}>
                        {nachteile!.filter(n => n.trim()).map((n, i) => (
                          <li key={i}>{n.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <div style={styles.detailPlaceholder}>
            Klicke eine Rasse an, um Details zu sehen.
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Rasse löschen?</h3>
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
  detailLists: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  detailListTitle: {
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: 4,
  },
  detailList: {
    margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--text-primary)',
    lineHeight: 1.6,
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