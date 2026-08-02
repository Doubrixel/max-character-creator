import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface RasseFormProps {
  editingId: string | null
  initialName?: string
  initialConfig?: Record<string, string>
  onSaved: () => void
  onCancel: () => void
}

function parseNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(x => String(x)).map(s => s.trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(x => String(x)).map(s => s.trim()).filter(Boolean)
    } catch {}
    return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  }
  return []
}

export default function RasseForm({
  editingId,
  initialName = '',
  initialConfig = {},
  onSaved,
  onCancel,
}: RasseFormProps) {
  const [name, setName] = useState(initialName)
  const [beschreibung, setBeschreibung] = useState(String(initialConfig.beschreibung ?? ''))
  const [groessenklasse, setGroessenklasse] = useState(String(initialConfig.groessenklasse ?? ''))
  const [vorteile, setVorteile] = useState<string[]>(parseNames(initialConfig.vorteile))
  const [nachteile, setNachteile] = useState<string[]>(parseNames(initialConfig.nachteile))

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: null,
      config: JSON.stringify({
        beschreibung: beschreibung.trim(),
        groessenklasse: parseInt(groessenklasse) || undefined,
        vorteile,
        nachteile,
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
        <label style={styles.label}>Großenklasse (GK)</label>
        <input
          style={styles.input}
          type="number"
          min={1}
          max={5}
          placeholder="1-5"
          value={groessenklasse}
          onChange={e => setGroessenklasse(e.target.value)}
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
      <div style={styles.formRow}>
        <label style={styles.label}>Vorteile</label>
        <textarea
          style={styles.textarea}
          placeholder={'Nachtsicht\nSchnelle Heilung'}
          value={vorteile.join('\n')}
          onChange={e => setVorteile(e.target.value.split(/\r?\n/))}
          rows={3}
        />
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>Nachteile</label>
        <textarea
          style={styles.textarea}
          placeholder={'Empfindlich gegen Eisen\nLangsam'}
          value={nachteile.join('\n')}
          onChange={e => setNachteile(e.target.value.split(/\r?\n/))}
          rows={3}
        />
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
