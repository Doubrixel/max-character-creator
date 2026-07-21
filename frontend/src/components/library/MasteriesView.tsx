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

interface ParsedMastery {
  name: string
  effekt: string
  kategorie: string
  schwelle: number
  voraussetzung: string
  config: Record<string, string>
}

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function getSkillName(id: string): string {
  return SKILL_OPTIONS.find(s => s.id === id)?.name ?? id
}

function formatVoraussetzung(cfg: Record<string, string>): string {
  const typ = cfg.voraussetzung_typ
  const id = cfg.voraussetzung_id
  const wert = cfg.voraussetzung_wert
  if (!typ || !id) return ''
  if (typ === 'meisterschaft') return `Meisterschaft ${id}`
  if (typ === 'fertigkeitspunkte') return `${getSkillName(id)} ${wert ?? ''}`.trim()
  if (typ === 'schwerpunkt') return `Schwerpunkt ${id}`
  if (typ === 'staerke') return `Stärke ${id}`
  return `${getSkillName(id)} >= ${wert ?? '?'}`
}

function parseMeisterschaftenFile(content: string): ParsedMastery[] {
  const lines = content.split('\n')
  const results: ParsedMastery[] = []

  let currentCategory = 'Allgemein'
  let currentSchwelle = 1
  let currentName = ''
  let currentEffect = ''
  let currentVoraussetzung = ''

  const entryRegex = /^\*\*(.+?)((?:\s*\(([^)]+)\))?\s*:\*\*\s*)(.*)$/

  const finalizeEntry = () => {
    if (!currentName) return
    const nameClean = currentName.trim()
    const effectClean = currentEffect.trim()
    if (!effectClean) return

    const voraussetzung = currentVoraussetzung.trim()
    const config: Record<string, string> = {
      effekt: effectClean,
      kosten: currentSchwelle <= 2 ? '1' : currentSchwelle === 3 ? '2' : '3',
      kategorie: 'pflicht',
      schwelle: String(currentSchwelle),
      kategorie_name: currentCategory,
    }

    if (voraussetzung) {
      const meisterMatch = voraussetzung.match(/^Meisterschaft\s+(?:.+?\s+in\s+der\s+Fertigkeit\s+)?(.+?)$/i)
      if (meisterMatch) {
        config.voraussetzung_typ = 'meisterschaft'
        config.voraussetzung_id = meisterMatch[1].trim()
      } else {
        const fpMatch = voraussetzung.match(/^Fertigkeitspunkte\s+(\S+)\s+(\d+)$/i)
        if (fpMatch) {
          config.voraussetzung_typ = 'fertigkeitspunkte'
          config.voraussetzung_id = fpMatch[1].toLowerCase()
          config.voraussetzung_wert = fpMatch[2]
        } else if (voraussetzung.startsWith('Schwerpunkt')) {
          config.voraussetzung_typ = 'schwerpunkt'
          config.voraussetzung_id = voraussetzung.replace(/^Schwerpunkt\s+/i, '').trim()
        } else if (voraussetzung.startsWith('Stärke')) {
          config.voraussetzung_typ = 'staerke'
          config.voraussetzung_id = voraussetzung.replace(/^Stärke\s+/i, '').trim()
        }
      }
    }

    results.push({
      name: nameClean,
      effekt: effectClean,
      kategorie: 'pflicht',
      schwelle: currentSchwelle,
      voraussetzung,
      config,
    })

    currentName = ''
    currentEffect = ''
    currentVoraussetzung = ''
  }

  for (const line of lines) {
    if (line.startsWith('***')) {
      finalizeEntry()
      currentCategory = line.replace(/\*+/g, '').trim()
      continue
    }

    if (line.match(/^\*\*Schwelle\s+\d/)) {
      finalizeEntry()
      const schwelleMatch = line.match(/\d+/)
      if (schwelleMatch) currentSchwelle = parseInt(schwelleMatch[0])
      continue
    }

    if (line.match(/^_{3,}$/)) {
      finalizeEntry()
      continue
    }

    if (line.match(/^---+$/)) {
      finalizeEntry()
      continue
    }

    const entryMatch = line.match(entryRegex)
    if (entryMatch) {
      finalizeEntry()
      currentName = entryMatch[1].trim()
      if (entryMatch[3]) currentName += ` (${entryMatch[3]})`
      if (entryMatch[4]) currentEffect = entryMatch[4]
      continue
    }

    if (line.match(/^Voraussetzung(?:en)?:/i)) {
      currentVoraussetzung = line.replace(/^Voraussetzung(?:en)?:\s*/i, '')
      continue
    }

    if (currentName) {
      if (line.trim() === '') {
        currentEffect += '\n'
      } else {
        currentEffect += (currentEffect ? ' ' : '') + line
      }
    }
  }

  finalizeEntry()
  return results
}

export default function MasteriesView() {
  const [entries, setEntries] = useState<MasteryEntry[]>([])
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
  const [effekt, setEffekt] = useState('')
  const [kosten, setKosten] = useState('1')
  const [kategorie, setKategorie] = useState('pflicht')
  const [schwelle, setSchwelle] = useState('1')
  const [voraussetzungTyp, setVoraussetzungTyp] = useState('keine')
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

  const getKosten = (e: MasteryEntry): string => {
    return parseConfig(e.config).kosten ?? '?'
  }
  const getEffekt = (e: MasteryEntry): string => {
    return parseConfig(e.config).effekt ?? ''
  }

  const getVoraussetzungDisplay = (e: MasteryEntry): string => {
    return formatVoraussetzung(parseConfig(e.config))
  }

  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  const resetForm = () => {
    setName('')
    setDescription('')
    setEffekt('')
    setKosten('1')
    setKategorie('pflicht')
    setSchwelle('1')
    setVoraussetzungTyp('keine')
    setVoraussetzungId('')
    setVoraussetzungWert('6')
    setEditingId(null)
  }

  const buildConfig = () => {
    const cfg: Record<string, string> = {
      effekt,
      kosten,
      kategorie,
      schwelle,
    }
    if (voraussetzungTyp !== 'keine' && voraussetzungId) {
      cfg.voraussetzung_typ = voraussetzungTyp
      cfg.voraussetzung_id = voraussetzungId
      if (voraussetzungWert) cfg.voraussetzung_wert = voraussetzungWert
    }
    return cfg
  }

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
    setSchwelle(cfg.schwelle ?? '1')
    setVoraussetzungTyp(cfg.voraussetzung_typ ?? 'keine')
    setVoraussetzungId(cfg.voraussetzung_id ?? '')
    setVoraussetzungWert(cfg.voraussetzung_wert ?? '6')
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const content = await file.text()
      const parsed = parseMeisterschaftenFile(content)
      let imported = 0
      let skipped = 0
      const existingNames = new Set(entries.map(en => en.name.toLowerCase()))
      for (const entry of parsed) {
        if (existingNames.has(entry.name.toLowerCase())) {
          skipped++
          continue
        }
        await fetch(`${API_BASE}/api/library/masteries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            description: null,
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

  const renderVoraussetzungFields = () => {
    if (voraussetzungTyp === 'keine') return null

    if (voraussetzungTyp === 'meisterschaft') {
      return (
        <div style={styles.formRow}>
          <label style={styles.label}>Meisterschaftsname</label>
          <input
            style={styles.input}
            placeholder="z.B. Kampf mit zwei Waffen"
            value={voraussetzungId}
            onChange={e => setVoraussetzungId(e.target.value)}
          />
        </div>
      )
    }

    if (voraussetzungTyp === 'schwerpunkt' || voraussetzungTyp === 'staerke') {
      return (
        <div style={styles.formRow}>
          <label style={styles.label}>{voraussetzungTyp === 'schwerpunkt' ? 'Schwerpunkt' : 'Stärke'} Name</label>
          <input
            style={styles.input}
            placeholder={voraussetzungTyp === 'schwerpunkt' ? 'z.B. Wettervorhersage' : 'z.B. Tiervertrauter'}
            value={voraussetzungId}
            onChange={e => setVoraussetzungId(e.target.value)}
          />
        </div>
      )
    }

    return (
      <>
        <div style={styles.formRow}>
          <label style={styles.label}>Skill</label>
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
          <label style={styles.label}>Min-Wert</label>
          <input
            style={styles.input}
            type="number"
            placeholder="6"
            value={voraussetzungWert}
            onChange={e => setVoraussetzungWert(e.target.value)}
          />
        </div>
      </>
    )
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  const renderGrid = (items: MasteryEntry[]) => (
    <div style={styles.grid}>
      {items.map(entry => {
        const cfg = parseConfig(entry.config)
        const schwelleNr = cfg.schwelle ?? ''
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
                {schwelleNr && `S${schwelleNr} · `}Kosten: {getKosten(entry)}
              </span>
            </div>
          </div>
        )
      })}
      {items.length === 0 && (
        <div style={styles.gridEmpty}>Keine Einträge vorhanden.</div>
      )}
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
          <div style={styles.headerLeft}>
            <span style={styles.count}>{entries.length} Meisterschaften</span>
            <button style={styles.filterBtn} disabled>Filter</button>
          </div>
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
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ ...styles.formRow, flex: 1 }}>
                <label style={styles.label}>Kosten (Punkte)</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="1"
                  value={kosten}
                  onChange={e => setKosten(e.target.value)}
                />
              </div>
              <div style={{ ...styles.formRow, flex: 1 }}>
                <label style={styles.label}>Schwelle</label>
                <select
                  style={styles.select}
                  value={schwelle}
                  onChange={e => setSchwelle(e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div style={{ ...styles.formRow, flex: 1 }}>
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
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Voraussetzung</label>
              <select
                style={styles.select}
                value={voraussetzungTyp}
                onChange={e => { setVoraussetzungTyp(e.target.value); setVoraussetzungId('') }}
              >
                <option value="keine">Keine</option>
                <option value="meisterschaft">Meisterschaft</option>
                <option value="skill >= wert">Skill {'>='} Wert</option>
                <option value="magie >= wert">Magie {'>='} Wert</option>
                <option value="fertigkeitspunkte">Fertigkeitspunkte</option>
                <option value="schwerpunkt">Schwerpunkt</option>
                <option value="staerke">Stärke</option>
              </select>
            </div>
            {renderVoraussetzungFields()}
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

        {renderGrid(entries)}
      </div>

      <div style={styles.detailPanel}>
        {selectedEntry ? (
          <div style={styles.detailContent}>
            <h3 style={styles.detailName}>{selectedEntry.name}</h3>
            <div style={styles.detailMeta}>
              {(() => {
                const cfg = parseConfig(selectedEntry.config)
                const parts: string[] = []
                parts.push(`Kosten: ${getKosten(selectedEntry)}`)
                if (cfg.schwelle) parts.push(`Schwelle ${cfg.schwelle}`)
                if (cfg.kategorie_name) parts.push(cfg.kategorie_name)
                return parts.join(' · ')
              })()}
            </div>
            {getVoraussetzungDisplay(selectedEntry) && (
              <div style={styles.detailMeta}>
                Voraussetzung: {getVoraussetzungDisplay(selectedEntry)}
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
  successBanner: {
    background: 'var(--bg-success, rgba(76,175,80,0.1))', border: '1px solid var(--success)',
    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'var(--success)', fontSize: 14,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  count: { fontSize: 13, color: 'var(--text-secondary)' },
  filterBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-tertiary)', borderRadius: 6, padding: '8px 16px', fontSize: 13,
    opacity: 0.5, cursor: 'not-allowed',
  },
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
