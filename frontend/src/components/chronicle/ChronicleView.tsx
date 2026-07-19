import { useState, useEffect } from 'react'
import CharacterSheet from './CharacterSheet'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Character {
  id: string
  name: string
  status: string
  xp: number
  createdAt?: number
}

export default function ChronicleView() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/characters`)
      .then(r => r.json())
      .then((data: Character[]) => setCharacters(data))
      .catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/characters/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id))
        setDeleteConfirm(null)
        if (selectedId === id) setSelectedId(null)
      }
    } catch {
    }
  }

  if (selectedId) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => setSelectedId(null)}>
          ← Zurück zur Liste
        </button>
        <CharacterSheet
          characterId={selectedId}
          onDelete={(id) => {
            setCharacters(prev => prev.filter(c => c.id !== id))
            setSelectedId(null)
          }}
        />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chronik</h2>
      {characters.length === 0 ? (
        <p style={styles.empty}>Noch keine Charaktere erstellt.</p>
      ) : (
        <div style={styles.list}>
          {characters.map(char => (
            <div key={char.id} style={styles.card}>
              <div style={styles.cardContent} onClick={() => setSelectedId(char.id)}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardName}>{char.name}</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: char.status === 'completed' ? '#22c55e' : '#f59e0b',
                  }}>
                    {char.status === 'completed' ? 'Fertig' : 'Entwurf'}
                  </span>
                </div>
                <div style={styles.cardMeta}>
                  <span>XP: {char.xp ?? 15}</span>
                </div>
              </div>
              <button
                style={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm(char.id)
                }}
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Charakter löschen?</h3>
            <p style={styles.modalText}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setDeleteConfirm(null)}>
                Abbrechen
              </button>
              <button style={styles.modalDelete} onClick={() => handleDelete(deleteConfirm)}>
                endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '0 0 24px' },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' },
  empty: { color: 'var(--text-tertiary)', fontSize: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  cardContent: { flex: 1, cursor: 'pointer' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' },
  statusBadge: {
    fontSize: 11, fontWeight: 600, padding: '2px 8px',
    borderRadius: 12, color: '#fff', textTransform: 'uppercase' as const,
  },
  cardMeta: { fontSize: 13, color: 'var(--text-secondary)' },
  deleteButton: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '6px 12px',
    cursor: 'pointer', fontSize: 13, marginLeft: 12,
  },
  backButton: {
    background: 'transparent', border: 'none', color: 'var(--accent)',
    cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0,
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
