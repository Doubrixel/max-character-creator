import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Race = { id: string, name: string, icon: string, speciesLaw: string, groessenklasse: number, statblock: { vorteile: string[], nachteile: string[] } }

interface RasseStepProps {
  onValid: (valid: boolean) => void
}

export default function RasseStep({ onValid }: RasseStepProps) {
  const { stepDeltas, currentStep, updateStepDelta, reportApiError } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const [races, setRaces] = useState<Race[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const id = (stepData as { id?: string } | null)?.id
    setSelected(id ?? null)
  }, [stepData])

  useEffect(() => {
    return () => { initializedRef.current = false }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/library/races`)
      .then(r => r.json())
      .then((data: any[]) => {
        const loaded = data.map(r => {
          const cfg = JSON.parse(r.config || '{}')
          return {
            id: r.id,
            name: r.name,
            icon: cfg.bildUrl ? '🖼️' : '🧑',
            speciesLaw: cfg.spezieslaw || r.description || '',
            groessenklasse: typeof cfg.groessenklasse === 'number' ? cfg.groessenklasse : 3,
            statblock: {
              vorteile: cfg.vorteile ? (typeof cfg.vorteile === 'string' ? JSON.parse(cfg.vorteile) : cfg.vorteile) : [],
              nachteile: cfg.nachteile ? (typeof cfg.nachteile === 'string' ? JSON.parse(cfg.nachteile) : cfg.nachteile) : [],
            },
          }
        })
        setRaces(loaded)
        setDataLoading(false)
      })
      .catch(() => { setDataLoading(false); reportApiError('Bibliotheksdaten konnten nicht geladen werden') })
  }, [])

  useEffect(() => {
    onValid(selected !== null)
  }, [selected, onValid])

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  const handleSelect = (id: string) => {
    setSelected(id)
    const race = races.find((r) => r.id === id)
    if (race) {
      updateStepDelta('rasse', { id: race.id, name: race.name, groessenklasse: race.groessenklasse, statblock: race.statblock })
    }
  }

  const selectedRace = races.find((r) => r.id === selected)

  if (dataLoading) {
    return <div style={styles.loading}>Lade Rassen...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.optionsGrid}>
        {races.map((race) => (
          <button
            key={race.id}
            style={{
              ...styles.optionCard,
              ...(selected === race.id ? styles.optionCardSelected : {}),
            }}
            onClick={() => handleSelect(race.id)}
          >
            <span style={styles.optionIcon}>{race.icon}</span>
            <span style={styles.optionName}>{race.name}</span>
          </button>
        ))}
      </div>
      {selectedRace && (
        <div style={{ ...styles.detailPanel, ...(fullscreen ? styles.detailPanelFullscreen : {}) }}>
          <div style={styles.detailHeader}>
            <h3 style={styles.detailTitle}>
              {selectedRace.icon} {selectedRace.name}
            </h3>
            <button
              style={styles.fullscreenButton}
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? 'Vollbild schließen' : 'Vollbild anzeigen'}
            >
              {fullscreen ? '🗕 Verkleinern' : '⛶ Vollbild'}
            </button>
          </div>
          <p style={styles.detailText}>
            {fullscreen ? selectedRace.speciesLaw : selectedRace.speciesLaw.length > 200 ? `${selectedRace.speciesLaw.substring(0, 200)}...` : selectedRace.speciesLaw}
          </p>
          <div style={styles.statblock}>
            <h4 style={styles.statblockTitle}>Vorteile</h4>
            <ul style={styles.statList}>
              {selectedRace.statblock.vorteile.map((v, i) => (
                <li key={i} style={styles.statItem}>
                  {v}
                </li>
              ))}
            </ul>
            <h4 style={styles.statblockTitle}>Nachteile</h4>
            <ul style={styles.statList}>
              {selectedRace.statblock.nachteile.map((n, i) => (
                <li key={i} style={styles.statItem}>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    fontSize: 16,
    color: 'var(--text-muted)',
  },
  container: {
    display: 'flex',
    gap: 16,
    minHeight: 300,
  },
  optionsGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    alignContent: 'start',
  },
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid transparent',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: 16,
    fontWeight: 500,
  },
  optionCardSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: 600,
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
  detailPanelFullscreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 'auto',
    height: 'auto',
    maxWidth: 'none',
    borderRadius: 0,
    alignSelf: 'auto',
    overflowY: 'auto',
    zIndex: 1000,
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fullscreenButton: {
    flexShrink: 0,
    background: 'var(--bg-secondary)',
    color: 'var(--detail-text)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 13,
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
    margin: '0 0 16px 0',
  },
  statblock: {
    marginTop: 12,
  },
  statblockTitle: {
    margin: '8px 0 4px 0',
    fontSize: 14,
    color: 'var(--detail-title)',
  },
  statList: {
    margin: '0 0 12px 0',
    paddingLeft: 20,
  },
  statItem: {
    fontSize: 13,
    color: 'var(--detail-text)',
    marginBottom: 4,
  },
}
