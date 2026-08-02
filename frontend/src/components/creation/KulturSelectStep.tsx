import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  config: string | null
}

interface KulturSelectStepProps {
  onValid: (valid: boolean) => void
}

export default function KulturSelectStep({ onValid }: KulturSelectStepProps) {
  const { stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const initializedRef = useRef(false)

  const [kulturen, setKulturen] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    fetch(`${API_BASE}/api/library/cultures`)
      .then((r) => r.json())
      .then((data: LibraryItem[]) => {
        setKulturen(data)
        setLoading(false)
      })
      .catch(() => { setLoading(false); reportApiError('Bibliotheksdaten konnten nicht geladen werden') })
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const d = stepData as Record<string, unknown> | null
    if (d) {
      setSelectedId((d.kulturId as string) ?? null)
    }
  }, [stepData])

  useEffect(() => () => { initializedRef.current = false }, [])

  useEffect(() => {
    onValid(selectedId !== null)
  }, [selectedId, onValid])

  const handleSelect = (item: LibraryItem) => {
    setSelectedId(item.id)
    updateStepDelta('kultur', {
      kulturId: item.id,
      kulturName: item.name,
      kulturDescription: item.description,
      kulturConfig: item.config ? JSON.parse(item.config) : null,
    })
  }

  const selectedKultur = kulturen.find((k) => k.id === selectedId)

  if (loading) {
    return <div style={styles.loading}>Lade Kulturen...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {kulturen.map((k) => (
          <button
            key={k.id}
            style={{
              ...styles.card,
              ...(selectedId === k.id ? styles.cardSelected : {}),
            }}
            onClick={() => handleSelect(k)}
          >
            <span style={styles.cardName}>{k.name}</span>
            {k.description && (
              <span style={styles.cardDesc}>{k.description}</span>
            )}
          </button>
        ))}
        {kulturen.length === 0 && (
          <div style={styles.empty}>Keine Kulturen in der Bibliothek vorhanden</div>
        )}
      </div>
      {selectedKultur && (
        <div style={styles.detailPanel}>
          <h3 style={styles.detailTitle}>{selectedKultur.name}</h3>
          {selectedKultur.description && (
            <p style={styles.detailText}>{selectedKultur.description}</p>
          )}
          {selectedKultur.config && (
            <pre style={styles.detailConfig}>{JSON.stringify(JSON.parse(selectedKultur.config), null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 16,
    minHeight: 300,
  },
  loading: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 24,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
    alignContent: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  cardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
  },
  cardDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: 24,
    fontSize: 14,
  },
  detailPanel: {
    width: '25%',
    background: 'var(--bg-detail)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    alignSelf: 'start',
    transition: 'background 0.2s',
  },
  detailTitle: {
    margin: '0 0 12px 0',
    fontSize: 18,
    color: 'var(--detail-title)',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--detail-text)',
    margin: '0 0 12px 0',
  },
  detailConfig: {
    fontSize: 12,
    color: 'var(--text-muted)',
    background: 'var(--bg-secondary)',
    padding: 12,
    borderRadius: 6,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
  },
}
