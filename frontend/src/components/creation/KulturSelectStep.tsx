import { useState, useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  gewaehrteStaerken,
  istZugewiesenerEintrag,
  istWahlVollstaendig,
  leseAlternativWahl,
  parseKulturRegeln,
  wirksameKulturConfig,
  type AlternativWahl,
} from '@mcc/shared'
import { useAppContext } from '../../context/AppContext'

// --- Robustes Parsen der Kultur-Config --------------------------------------
// Die config speichert Listen teils als JSON-Strings (doppelt kodiert) und teils
// als echte Arrays; Einträge können leer oder unvollständig sein. Diese Helper
// normalisieren beides und werfen nie (kein Crash bei kaputten Einträgen).

interface KulturEntry {
  id: string
  name: string
  punkte: number
  anzahl: number
}

interface KulturConfig {
  talente: KulturEntry[]
  waffenTalente: KulturEntry[]
  magieSchulen: KulturEntry[]
  staerken: KulturEntry[]
}

const EMPTY_KULTUR_CONFIG: KulturConfig = {
  talente: [],
  waffenTalente: [],
  magieSchulen: [],
  staerken: [],
}

function asArray(value: unknown): unknown[] {
  if (value == null) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return []
    try {
      const parsed: unknown = JSON.parse(s)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function entryField(entry: unknown, key: string): string {
  if (!entry || typeof entry !== 'object') return ''
  const v = (entry as Record<string, unknown>)[key]
  return typeof v === 'string' ? v.trim() : ''
}

function entryNumber(entry: unknown, key: string): number {
  if (!entry || typeof entry !== 'object') return 0
  const v = (entry as Record<string, unknown>)[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return 0
}

function parseEntries(value: unknown): KulturEntry[] {
  return asArray(value)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map(entry => ({
      id: entryField(entry, 'id'),
      name: entryField(entry, 'name'),
      punkte: entryNumber(entry, 'punkte'),
      anzahl: entryNumber(entry, 'anzahl'),
    }))
    // Mangel-3-Standard für Abschnitte (Review-Fund 1 und 2): Nur vollständig
    // zugewiesene Einträge (id und name) werden angezeigt – Phantomzeilen aus
    // „+ Eintrag hinzufügen" ohne Auswahl stehen weder in der Anzeige noch in
    // der Gewährung (Reducer prüft denselben Standard). Die `id` wird mitgeführt,
    // damit `gewaehrteStaerken` hier dasselbe Urteil wie in der Kultur-Rechnung
    // fällt (Fund 1: eine Phantomzeile verdrängt keine zugewiesene Stärke).
    .filter(istZugewiesenerEintrag)
}

function parseKulturConfig(config: string | null): KulturConfig {
  if (!config) return EMPTY_KULTUR_CONFIG
  let parsed: unknown
  try {
    parsed = JSON.parse(config)
  } catch {
    return EMPTY_KULTUR_CONFIG
  }
  if (!parsed || typeof parsed !== 'object') return EMPTY_KULTUR_CONFIG
  const cfg = parsed as Record<string, unknown>
  return {
    talente: parseEntries(cfg.talente),
    waffenTalente: parseEntries(cfg.waffenTalente),
    magieSchulen: parseEntries(cfg.magieSchulen),
    // R1: Eine Kultur gewährt höchstens eine Stärke (PO INT-000015) – auch wenn
    // Altbestand mehrere Einträge enthält. Anzahl 0 gewährt nichts.
    staerken: gewaehrteStaerken(parseEntries(cfg.staerken)),
  }
}

function formatEntry(entry: KulturEntry): string {
  if (entry.punkte > 0) return `${entry.name} +${entry.punkte}`
  if (entry.anzahl > 1) return `${entry.name} ×${entry.anzahl}`
  return entry.name
}

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
  // Gewählte Seite je Entweder/Oder-Gruppe der gewählten Kultur (INT-000016).
  const [wahl, setWahl] = useState<AlternativWahl>({})

  const selectedRasseId = stepDeltas.rasse?.id

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

  const filteredKulturen = kulturen.filter(k => {
    if (!selectedRasseId) return true
    if (!k.config) return false
    try {
      const config = JSON.parse(k.config)
      const gaengigFuer = config.gaengigFuer || []
      return gaengigFuer.includes(selectedRasseId)
    } catch {
      return false
    }
  })

  const selectedKultur = filteredKulturen.find((k) => k.id === selectedId)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const d = stepData as Record<string, unknown> | null
    if (d) {
      setSelectedId((d.kulturId as string) ?? null)
      // Bereits getroffene Entweder/Oder-Wahl wiederherstellen (wie die
      // gewählte Kultur selbst), damit die Entscheidung beim erneuten Betreten
      // des Schritts sichtbar bleibt (AK2.6).
      setWahl(leseAlternativWahl(d.alternativWahl))
    }
  }, [stepData])

  useEffect(() => () => { initializedRef.current = false }, [])

  // Entweder/Oder-Gruppen der gewählten Kultur – dieselbe tolerante Parsung
  // wie im Bibliotheks-Editor (`parseKulturRegeln`); die Abschnitte der
  // Anzeige enthalten nur die festen Einträge, Gruppeneinträge stehen
  // ausschließlich in den Gruppen (R6 des Vorgängertickets).
  const alternativen = useMemo(
    () => (selectedKultur ? parseKulturRegeln(selectedKultur.config).alternativen : []),
    [selectedKultur],
  )

  // Wahlpflicht (Annahme A1): „Weiter" ist erst aktiv, wenn je Gruppe genau
  // eine Seite gewählt ist. Kulturen ohne Gruppen sind ohne Wahl gültig
  // (AK2.5, unverändertes Verhalten).
  const wahlVollstaendig = useMemo(
    () => istWahlVollstaendig({ alternativen }, wahl),
    [alternativen, wahl],
  )

  useEffect(() => {
    onValid(selectedId !== null && wahlVollstaendig)
  }, [selectedId, wahlVollstaendig, onValid])

  /** Schreibt das Step-Delta mit der wirksamen Config zur aktuellen Wahl. */
  const schreibeKulturDelta = (item: LibraryItem, wahlNeu: AlternativWahl) => {
    updateStepDelta('kultur', {
      kulturId: item.id,
      kulturName: item.name,
      kulturDescription: item.description,
      // AK2.4: Die Einträge der gewählten Seiten stehen als normale
      // Abschnittseinträge in der Config – der Reducer weist sie wie feste
      // Einträge zu, es gibt keine zweite Zuweisungslogik.
      kulturConfig: wirksameKulturConfig(item.config, wahlNeu),
      alternativWahl: wahlNeu,
    })
  }

  const handleSelect = (item: LibraryItem) => {
    // Erneuter Klick auf die bereits gewählte Karte ändert nichts – eine
    // getroffene Entweder/Oder-Wahl bleibt dabei erhalten.
    if (selectedId === item.id) return
    setSelectedId(item.id)
    // Kulturwechsel: neue Gruppen, keine Vorbelegung (TC-KULT-ALT-01).
    const wahlNeu: AlternativWahl = {}
    setWahl(wahlNeu)
    schreibeKulturDelta(item, wahlNeu)
  }

  /**
   * Wahl einer Seite einer Entweder/Oder-Gruppe (R2): Je Gruppe wird genau
   * eine Seite gewählt – die Wahl der anderen Seite ersetzt die bisherige
   * Entscheidung (nie beide gleichzeitig, TC-KULT-ALT-07).
   */
  const seiteWaehlen = (gruppe: number, seite: 0 | 1) => {
    if (!selectedKultur) return
    const wahlNeu: AlternativWahl = { ...wahl, [gruppe]: seite }
    setWahl(wahlNeu)
    schreibeKulturDelta(selectedKultur, wahlNeu)
  }

  const kulturConfig = selectedKultur ? parseKulturConfig(selectedKultur.config) : null
  const statblockSections: { title: string, entries: KulturEntry[] }[] = kulturConfig
    ? [
        { title: 'Talente', entries: kulturConfig.talente },
        { title: 'Waffentalente', entries: kulturConfig.waffenTalente },
        { title: 'Magieschulen', entries: kulturConfig.magieSchulen },
        { title: 'Stärken', entries: kulturConfig.staerken },
      ].filter((section) => section.entries.length > 0)
    : []

  if (loading) {
    return <div style={styles.loading}>Lade Kulturen...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {filteredKulturen.map((k) => (
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
        {filteredKulturen.length === 0 && (
          <div style={styles.empty}>Keine Kulturen verfügbar für die gewählte Rasse</div>
        )}
      </div>
      {selectedKultur && (
        <div style={styles.detailPanel}>
          <h3 style={styles.detailTitle}>{selectedKultur.name}</h3>
          {selectedKultur.description && (
            <div className="markdown" style={styles.detailText}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedKultur.description}</ReactMarkdown>
            </div>
          )}
          {statblockSections.map((section) => (
            <div key={section.title} style={styles.statblock}>
              <h4 style={styles.statblockTitle}>{section.title}</h4>
              <ul style={styles.statList}>
                {section.entries.map((entry, i) => (
                  <li key={i} style={styles.statItem}>{formatEntry(entry)}</li>
                ))}
              </ul>
            </div>
          ))}
          {alternativen.length > 0 && (
            <div style={styles.altSection}>
              <h4 style={styles.statblockTitle}>Entweder/Oder-Gruppen</h4>
              <p style={styles.altHint}>
                Wähle je Gruppe genau eine Seite – dein Charakter erhält genau die Einträge der gewählten Seite.
              </p>
              {alternativen.map((alternative, gi) => (
                <fieldset key={gi} style={styles.altGroup}>
                  <legend style={styles.altLegend}>Gruppe {gi + 1}</legend>
                  <div style={styles.altSides}>
                    {alternative.seiten.map((seite, si) => {
                      const istGewaehlt = wahl[gi] === si
                      return (
                        <button
                          key={si}
                          type="button"
                          style={{ ...styles.sideCard, ...(istGewaehlt ? styles.sideSelected : {}) }}
                          aria-pressed={istGewaehlt}
                          onClick={() => seiteWaehlen(gi, si === 0 ? 0 : 1)}
                        >
                          <span style={styles.sideLabel}>
                            {istGewaehlt ? '✓ ' : ''}Seite {si + 1}
                          </span>
                          <ul style={styles.sideList}>
                            {seite.map((eintrag, ei) => (
                              <li key={ei} style={styles.sideItem}>
                                {eintrag.name} {eintrag.wert}
                              </li>
                            ))}
                            {seite.length === 0 && (
                              <li key="leer" style={styles.sideItem}>Kein Eintrag</li>
                            )}
                          </ul>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
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
    width: '35%',
    minWidth: 280,
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
  altSection: {
    marginTop: 12,
  },
  altHint: {
    margin: '0 0 8px 0',
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  altGroup: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 10,
    margin: '0 0 10px 0',
    minWidth: 0,
  },
  altLegend: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '0 6px',
  },
  altSides: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 8,
  },
  sideCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    minWidth: 0,
  },
  sideSelected: {
    border: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    boxShadow: '0 0 12px var(--shadow-accent)',
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  sideList: {
    margin: 0,
    paddingLeft: 16,
  },
  sideItem: {
    fontSize: 13,
    color: 'var(--detail-text)',
    marginBottom: 2,
  },
}
