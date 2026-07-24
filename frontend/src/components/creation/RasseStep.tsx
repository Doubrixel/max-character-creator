import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Race = { id: string, name: string, icon: string, speciesLaw: string, statblock: { vorteile: string[], nachteile: string[] } }

interface RasseStepProps {
  onValid: (valid: boolean) => void
}

export default function RasseStep({ onValid }: RasseStepProps) {
  const { stepDeltas, currentStep, updateStepDelta } = useAppContext()
  const stepData = stepDeltas[currentStep] ?? null
  const [races, setRaces] = useState<Race[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRace, setModalRace] = useState<Race | null>(null)
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
            statblock: {
              vorteile: cfg.vorteile ? (typeof cfg.vorteile === 'string' ? JSON.parse(cfg.vorteile) : cfg.vorteile) : [],
              nachteile: cfg.nachteile ? (typeof cfg.nachteile === 'string' ? JSON.parse(cfg.nachteile) : cfg.nachteile) : [],
            },
          }
        })
        setRaces(loaded)
        setDataLoading(false)
      })
      .catch(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    onValid(selected !== null)
  }, [selected, onValid])

  const handleSelect = (id: string) => {
    setSelected(id)
    const race = races.find((r) => r.id === id)
    if (race) {
      updateStepDelta(2, { id: race.id, name: race.name, statblock: race.statblock })
      setModalRace(race)
      setModalOpen(true)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalRace(null)
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
        <div style={styles.detailPanel}>
          <h3 style={styles.detailTitle}>
            {selectedRace.icon} {selectedRace.name}
          </h3>
          <p style={styles.detailText}>{selectedRace.speciesLaw.substring(0, 200)}...</p>
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
      {modalOpen && modalRace && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={closeModal}>
              ✕
            </button>
            <h2 style={styles.modalTitle}>
              {modalRace.icon} {modalRace.name}
            </h2>
            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Spezieslaw</h3>
                <div style={styles.scrollableText}>{modalRace.speciesLaw}</div>
              </div>
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>Statblock</h3>
                <div style={styles.statblock}>
                  <h4 style={styles.statblockTitle}>Vorteile</h4>
                  <ul style={styles.statList}>
                    {modalRace.statblock.vorteile.map((v, i) => (
                      <li key={i} style={styles.statItem}>
                        {v}
                      </li>
                    ))}
                  </ul>
                  <h4 style={styles.statblockTitle}>Nachteile</h4>
                  <ul style={styles.statList}>
                    {modalRace.statblock.nachteile.map((n, i) => (
                      <li key={i} style={styles.statItem}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
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
    border: '1px solid var(--border-light)',
    borderRadius: 8,
    padding: 16,
    alignSelf: 'start',
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'var(--bg-modal)',
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    maxHeight: '80vh',
    width: '90%',
    overflow: 'auto',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: 'var(--text-muted)',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: 22,
    color: 'var(--detail-title)',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  modalSection: {},
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: 16,
    color: 'var(--detail-title)',
  },
  scrollableText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--detail-text)',
    maxHeight: 250,
    overflowY: 'auto',
    padding: 12,
    background: 'var(--bg-detail)',
    borderRadius: 8,
  },
}
