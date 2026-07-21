import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface LibraryEntry {
  id: string
  name: string
  description: string | null
  config: string | null
}

interface RasseFormProps {
  editingId: string | null
  initialName?: string
  initialConfig?: Record<string, string>
  onSaved: () => void
  onCancel: () => void
}

function parseIdArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export default function RasseForm({
  editingId,
  initialName = '',
  initialConfig = {},
  onSaved,
  onCancel,
}: RasseFormProps) {
  const [name, setName] = useState(initialName)
  const [beschreibung, setBeschreibung] = useState(initialConfig.beschreibung ?? '')
  const [selectedStaerken, setSelectedStaerken] = useState<string[]>(parseIdArray(initialConfig.staerken))
  const [selectedSchwaechen, setSelectedSchwaechen] = useState<string[]>(parseIdArray(initialConfig.schwaechen))

  const [allStaerken, setAllStaerken] = useState<LibraryEntry[]>([])
  const [allSchwaechen, setAllSchwaechen] = useState<LibraryEntry[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/library/strengths`)
      .then(r => r.json())
      .then((data: LibraryEntry[]) => {
        setAllStaerken(data.filter(e => {
          try {
            const cfg = e.config ? JSON.parse(e.config) : {}
            return !(cfg.kategorie === 'rasse' && cfg.unterkategorie === 'nachteil')
          } catch { return true }
        }))
        setAllSchwaechen(data.filter(e => {
          try {
            const cfg = e.config ? JSON.parse(e.config) : {}
            return cfg.kategorie === 'rasse' && cfg.unterkategorie === 'nachteil'
          } catch { return false }
        }))
      })
      .catch(() => {})
  }, [])

  const toggleStaerke = (id: string) => {
    setSelectedStaerken(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSchwaeche = (id: string) => {
    setSelectedSchwaechen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: null,
      config: JSON.stringify({
        beschreibung: beschreibung.trim(),
        staerken: selectedStaerken,
        schwaechen: selectedSchwaechen,
      }),
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/races/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/races`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSaved()
  }

  const renderPickTable = (
    label: string,
    allEntries: LibraryEntry[],
    selectedIds: string[],
    onToggle: (id: string) => void,
  ) => {
    const selected = selectedIds
      .map(id => allEntries.find(e => e.id === id))
      .filter(Boolean) as LibraryEntry[]
    const available = allEntries.filter(e => !selectedIds.includes(e.id))

    return (
      <div style={styles.pickSection}>
        <label style={styles.label}>{label}</label>
        {selected.length > 0 && (
          <table style={styles.table}>
            <tbody>
              {selected.map(entry => (
                <tr key={entry.id} style={styles.tableRow}>
                  <td style={styles.tableCellName}>{entry.name}</td>
                  <td style={styles.tableCellAction}>
                    <button
                      style={styles.removeBtn}
                      onClick={() => onToggle(entry.id)}
                    >
                      −
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {available.length > 0 && (
          <table style={styles.table}>
            <tbody>
              {available.map(entry => (
                <tr key={entry.id} style={styles.tableRow}>
                  <td style={styles.tableCellName}>{entry.name}</td>
                  <td style={styles.tableCellAction}>
                    <button
                      style={styles.addBtn}
                      onClick={() => onToggle(entry.id)}
                    >
                      +
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {allEntries.length === 0 && (
          <div style={styles.emptyHint}>Keine Einträge in der Bibliothek vorhanden.</div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.form}>
      <div style={styles.formRow}>
        <label style={styles.label}>Name *</label>
        <input
          style={styles.input}
          placeholder="Rassenname"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>Beschreibung</label>
        <textarea
          style={styles.textarea}
          placeholder="Was zeichnet diese Rasse aus?"
          value={beschreibung}
          onChange={e => setBeschreibung(e.target.value)}
          rows={3}
        />
      </div>
      <div style={styles.pickColumns}>
        {renderPickTable('Stärken', allStaerken, selectedStaerken, toggleStaerke)}
        {renderPickTable('Schwächen', allSchwaechen, selectedSchwaechen, toggleSchwaeche)}
      </div>
      <div style={styles.formActions}>
        <button style={styles.cancelBtn} onClick={onCancel}>Abbrechen</button>
        <button style={styles.saveBtn} onClick={handleSubmit}>
          {editingId ? 'Speichern' : 'Erstellen'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  pickColumns: {
    display: 'flex', gap: 24,
  },
  pickSection: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 6,
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    borderBottom: '1px solid var(--border)',
  },
  tableCellName: {
    padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
  },
  tableCellAction: {
    padding: '4px 8px', textAlign: 'right' as const, width: 40,
  },
  addBtn: {
    background: 'var(--accent)', border: 'none', color: '#fff',
    borderRadius: 4, width: 24, height: 24, cursor: 'pointer',
    fontSize: 16, fontWeight: 700, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  },
  removeBtn: {
    background: 'var(--danger)', border: 'none', color: '#fff',
    borderRadius: 4, width: 24, height: 24, cursor: 'pointer',
    fontSize: 16, fontWeight: 700, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  },
  emptyHint: {
    fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic',
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
}
