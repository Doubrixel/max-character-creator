import { useState, useEffect } from 'react'
import { TYPE_SCHEMAS, SKILL_OPTIONS, STRENGTH_OPTIONS, MASTERY_OPTIONS, MAGIC_SCHOOL_OPTIONS, FULL_MAGIC_SKILLS, SCHOOL_SHORT_MAP, type FieldSchema } from './typeSchemas'
import RasseForm from './RasseForm'
import { useAppContext } from '../../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface LibraryEntry {
  id: string
  name: string
  description: string | null
  config: string | null
  createdAt: number | null
  updatedAt: number | null
}

interface LibraryTableProps {
  type: string
}

function getOptions(field: FieldSchema): { id: string; name: string }[] {
  if (field.key.includes('Talente') || field.key.includes('Waffen')) return SKILL_OPTIONS
  if (field.key.includes('Magie') || field.key === 'schule') return MAGIC_SCHOOL_OPTIONS
  if (field.key.includes('Staerken')) return STRENGTH_OPTIONS
  if (field.key.includes('meisterschaften')) return MASTERY_OPTIONS
  if (field.key.includes('voraussetzung_id')) return [...SKILL_OPTIONS, ...MAGIC_SCHOOL_OPTIONS]
  return SKILL_OPTIONS
}

function parseConfigArray(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

function encodeConfigArray(arr: string[]): string {
  return JSON.stringify(arr)
}

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  let result = ''
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol
      num -= value
    }
  }
  return result
}

export default function LibraryTable({ type }: LibraryTableProps) {
  const { reportApiError } = useAppContext()
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configFields, setConfigFields] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [rasseEditingId, setRasseEditingId] = useState<string | null>(null)
  const [rasseName, setRasseName] = useState('')
  const [rasseConfig, setRasseConfig] = useState<Record<string, string>>({})
  const [races, setRaces] = useState<LibraryEntry[]>([])
  const [skills, setSkills] = useState<{ id: string; name: string; type: string }[]>([])
  const [strengths, setStrengths] = useState<{ id: string; name: string }[]>([])

  const schema = TYPE_SCHEMAS[type]
  const fields = schema?.fields ?? []

  const load = () => {
    fetch(`${API_BASE}/api/library/${type}`)
      .then(r => r.json())
      .then((data: LibraryEntry[]) => { setEntries(data); setLoading(false) })
      .catch(() => { setLoading(false); reportApiError('Bibliotheksdaten konnten nicht geladen werden') })
  }

  useEffect(() => { load() }, [type])

  useEffect(() => {
    if (type === 'cultures') {
      fetch(`${API_BASE}/api/library/races`).then(r => r.json()).then(setRaces).catch(() => reportApiError('Bibliotheksdaten konnten nicht geladen werden'))
      fetch(`${API_BASE}/api/library/skills`).then(r => r.json()).then((data: { id: string; name: string; type: string }[]) => setSkills(data)).catch(() => reportApiError('Bibliotheksdaten konnten nicht geladen werden'))
      fetch(`${API_BASE}/api/library/strengths`).then(r => r.json()).then((data: { id: string; name: string }[]) => setStrengths(data)).catch(() => reportApiError('Bibliotheksdaten konnten nicht geladen werden'))
    }
  }, [type])

  const resetForm = () => {
    setName('')
    setDescription('')
    setConfigFields({})
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      config: JSON.stringify(configFields) || null,
    }
    if (editingId) {
      await fetch(`${API_BASE}/api/library/${type}/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`${API_BASE}/api/library/${type}`, {
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
    const res = await fetch(`${API_BASE}/api/library/${type}/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(null)
      setDeleteError(null)
      load()
    } else {
      const data = await res.json()
      setDeleteError(data.message || 'Löschen fehlgeschlagen')
      setDeleteConfirm(null)
    }
  }

  const startEdit = (entry: LibraryEntry) => {
    if (type === 'races') {
      setRasseEditingId(entry.id)
      setRasseName(entry.name)
      setRasseConfig(entry.config ? JSON.parse(entry.config) : {})
      setShowForm(true)
      return
    }
    setName(entry.name)
    setDescription(entry.description ?? '')
    try {
      const cfg = entry.config ? JSON.parse(entry.config) : {}
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(cfg)) {
        if (Array.isArray(v)) flat[k] = encodeConfigArray(v)
        else if (typeof v === 'object' && v !== null) flat[k] = JSON.stringify(v)
        else flat[k] = String(v ?? '')
      }
      setConfigFields(flat)
    } catch {
      setConfigFields({})
    }
    setEditingId(entry.id)
    setShowForm(true)
  }

  const setField = (key: string, value: string) => {
    setConfigFields(prev => ({ ...prev, [key]: value }))
  }

  const parseStaerkenFile = (content: string): { name: string; description: string; config: Record<string, string> }[] => {
    const results: { name: string; description: string; config: Record<string, string> }[] = []
    const regex = /\*\*(.+?)\s*\((\d+)(\*?)\):\*\*\s*([\s\S]*?)(?=\n\n\*\*|\n*$)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const name = match[1].trim()
      const kosten = match[2]
      const creationOnly = match[3] === '*'
      const description = match[4].trim().replace(/\n/g, ' ')
      results.push({
        name,
        description,
        config: {
          kosten,
          nur_bei_erstellung: creationOnly ? 'true' : 'false',
        },
      })
    }
    return results
  }

  const parseSpellsFile = (content: string): { name: string; description: string; config: Record<string, string> }[] => {
    const results: { name: string; description: string; config: Record<string, string> }[] = []
    const lines = content.split('\n')
    let i = 0

    const gradToSchulenwert = (grad: number): number => {
      if (grad === 0) return 1
      return grad * 3
    }

    while (i < lines.length) {
      const line = lines[i]
      const titleMatch = line.match(/^\*\*(.+?)\s*\((Spruch|Ritus)\)\*\*/)
      if (!titleMatch) {
        i++
        continue
      }

      const name = titleMatch[1].trim()
      const artefakt = titleMatch[2]
      const blockStart = i + 1
      let blockEnd = blockStart

      while (blockEnd < lines.length) {
        const nextLine = lines[blockEnd]
        if (nextLine.match(/^\*\*.+\((Spruch|Ritus)\)\*\*/)) break
        blockEnd++
      }

      const blockLines = lines.slice(blockStart, blockEnd)
      const fields: Record<string, string> = {}
      const erfolgsgradeLines: string[] = []

      let j = 0
      while (j < blockLines.length) {
        const bLine = blockLines[j]
        const fieldMatch = bLine.match(/^(Schulen|Typus|Schwierigkeit|Kosten|Zauberdauer|Reichweite|Wirkungsdauer|Wirkungsbereich):\s*(.*)$/)
        if (fieldMatch) {
          fields[fieldMatch[1]] = fieldMatch[2].trim()
          j++
          continue
        }
        if (bLine.match(/^Wirkung:\s*/)) {
          const wirkungLines: string[] = [bLine.replace(/^Wirkung:\s*/, '').trim()]
          j++
          while (j < blockLines.length) {
            const nextLine = blockLines[j]
            if (nextLine.match(/^(Wirkungsdauer|Wirkungsbereich|Erfolgsgrade):/) || nextLine.match(/^---$/)) break
            if (nextLine.trim() === '') {
              j++
              continue
            }
            wirkungLines.push(nextLine.trim())
            j++
          }
          fields['Wirkung'] = wirkungLines.join('\n')
          continue
        }
        if (bLine.match(/^Erfolgsgrade:\s*/)) {
          j++
          while (j < blockLines.length) {
            const nextLine = blockLines[j]
            if (nextLine.trim().startsWith('•')) {
              erfolgsgradeLines.push(nextLine.trim())
              j++
            } else {
              break
            }
          }
          continue
        }
        j++
      }

      if (erfolgsgradeLines.length === 0) {
        i = blockEnd
        continue
      }

      const schulenRaw = fields['Schulen'] || ''
      const schulenParts = schulenRaw.split(',').map(s => s.trim()).filter(Boolean)
      const schulen: { id: string; name: string; wert: number }[] = []

      for (const part of schulenParts) {
        const match = part.match(/^(.+?)\s+(\d+)$/)
        if (match) {
          const shortName = match[1]
          const grad = parseInt(match[2], 10)
          const wert = gradToSchulenwert(grad)
          const mapped = SCHOOL_SHORT_MAP[shortName]
          if (mapped) {
            schulen.push({ id: mapped.id, name: mapped.name, wert })
          }
        }
      }

      const config: Record<string, string> = {
        typus: fields['Typus'] || '',
        schwierigkeit: fields['Schwierigkeit'] || '',
        kosten: fields['Kosten'] || '',
        zauberdauer: fields['Zauberdauer'] || '',
        reichweite: fields['Reichweite'] || '',
        artefakt,
        schulen: JSON.stringify(schulen),
        wirkungsdauer: fields['Wirkungsdauer'] || '',
        wirkungsbereich: fields['Wirkungsbereich'] || '',
        erfolgsgrade: erfolgsgradeLines.join('\n'),
      }

      results.push({ name, description: fields['Wirkung'] || '', config })
      i = blockEnd
    }

    return results
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const content = await file.text()
      const parsed = type === 'spells' ? parseSpellsFile(content) : parseStaerkenFile(content)
      let imported = 0
      let skipped = 0
      const existingNames = new Set(entries.map((en) => en.name.toLowerCase()))
      for (const entry of parsed) {
        if (existingNames.has(entry.name.toLowerCase())) {
          skipped++
          continue
        }
        await fetch(`${API_BASE}/api/library/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            description: entry.description,
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

  const toggleMultiSelect = (key: string, id: string) => {
    setConfigFields(prev => {
      const current = parseConfigArray(prev[key])
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      return { ...prev, [key]: encodeConfigArray(next) }
    })
  }

  if (loading) return <div style={styles.loading}>Lade...</div>

  return (
    <div>
      {deleteError && (
        <div style={styles.errorBanner}>
          {deleteError}
          <button style={styles.errorClose} onClick={() => setDeleteError(null)}>×</button>
        </div>
      )}
      <div style={styles.header}>
        <span style={styles.count}>{entries.length} Einträge</span>
        <div style={styles.headerActions}>
          {(type === 'strengths' || type === 'spells') && (
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
          )}
          <button
            style={styles.addBtn}
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
          >
            {showForm ? 'Abbrechen' : '+ Neu'}
          </button>
        </div>
      </div>
      {importResult && (
        <div style={styles.successBanner}>
          Import abgeschlossen: {importResult.imported} importiert, {importResult.skipped} übersprungen (bereits vorhanden).
          <button style={styles.errorClose} onClick={() => setImportResult(null)}>×</button>
        </div>
      )}

      {showForm && type === 'races' && (
        <RasseForm
          editingId={rasseEditingId}
          initialName={rasseName}
          initialConfig={rasseConfig}
          onSaved={() => { setShowForm(false); setRasseEditingId(null); load() }}
          onCancel={() => { setShowForm(false); setRasseEditingId(null) }}
        />
      )}

      {showForm && type !== 'races' && (
        <div style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.label}>Name *</label>
            <input
              style={styles.input}
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Beschreibung</label>
            <textarea
              style={styles.textarea}
              placeholder="Beschreibung..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {fields.map(field => (
            <div key={field.key} style={styles.formRow}>
              {field.type !== 'checkbox' && (
                <label style={styles.label}>{field.label}</label>
              )}

              {field.type === 'skillSelect' ? (
                <div style={styles.chipContainer}>
                  {getOptions(field).map(opt => {
                    const selected = parseConfigArray(configFields[field.key]).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        style={{
                          ...styles.chip,
                          ...(selected ? styles.chipSelected : {}),
                        }}
                        onClick={() => toggleMultiSelect(field.key, opt.id)}
                      >
                        {selected ? '✓ ' : ''}{opt.name}
                      </button>
                    )
                  })}
                </div>
              ) : field.type === 'raceSelect' ? (
                <div>
                  <div style={styles.chipContainer}>
                    {races.map(race => {
                      const selected = parseConfigArray(configFields[field.key]).includes(race.id)
                      return (
                        <button
                          key={race.id}
                          type="button"
                          style={{
                            ...styles.chip,
                            ...(selected ? styles.chipRaceSelected : {}),
                          }}
                          onClick={() => toggleMultiSelect(field.key, race.id)}
                        >
                          {race.name}
                        </button>
                      )
                    })}
                    {races.length === 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Noch keine Rassen vorhanden.
                      </span>
                    )}
                  </div>
                </div>
              ) : field.type === 'select' ? (
                <select
                  style={styles.select}
                  value={configFields[field.key] ?? ''}
                  onChange={e => setField(field.key, e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  style={styles.textarea}
                  placeholder={field.placeholder}
                  value={configFields[field.key] ?? ''}
                  onChange={e => setField(field.key, e.target.value)}
                  rows={3}
                />
              ) : field.type === 'number' ? (
                <input
                  style={styles.input}
                  type="number"
                  placeholder={field.placeholder}
                  value={configFields[field.key] ?? ''}
                  onChange={e => setField(field.key, e.target.value)}
                />
              ) : field.type === 'schoolValues' ? (
                <div style={styles.schoolValuesContainer}>
                  {FULL_MAGIC_SKILLS.map(skill => {
                    let schulenArr: { id: string; name: string; wert: number }[] = []
                    try {
                      schulenArr = JSON.parse(configFields[field.key] || '[]')
                    } catch { schulenArr = [] }
                    const current = schulenArr.find(s => s.id === skill.id)
                    const wert = current?.wert ?? 0
                    return (
                      <div key={skill.id} style={styles.schoolValueRow}>
                        <span style={styles.schoolValueName}>{skill.name}</span>
                        <input
                          style={{ ...styles.input, width: 60, textAlign: 'center' }}
                          type="number"
                          min={0}
                          max={99}
                          value={wert}
                          onChange={e => {
                            const newWert = parseInt(e.target.value, 10) || 0
                            let arr: { id: string; name: string; wert: number }[] = []
                            try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                            const idx = arr.findIndex(s => s.id === skill.id)
                            if (newWert > 0) {
                              if (idx >= 0) arr[idx].wert = newWert
                              else arr.push({ id: skill.id, name: skill.name, wert: newWert })
                            } else if (idx >= 0) {
                              arr.splice(idx, 1)
                            }
                            setField(field.key, JSON.stringify(arr))
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : field.type === 'skillPoints' ? (
                <div>
                  <div style={styles.pointsList}>
                    {(() => {
                      let arr: { id: string; name: string; punkte: number }[] = []
                      try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                      const filteredSkills = field.key === 'magieSchulen'
                        ? skills.filter(s => s.type === 'magie')
                        : field.key === 'waffenTalente'
                          ? skills.filter(s => s.type === 'kampf')
                          : skills.filter(s => s.type === 'fertigkeit')
                      return arr.map((item, idx) => (
                        <div key={idx} style={styles.pointsRow}>
                          <select
                            style={{ ...styles.input, flex: 2 }}
                            value={item.id}
                            onChange={e => {
                              const newId = e.target.value
                              const skill = skills.find(s => s.id === newId)
                              const newArr = [...arr]
                              newArr[idx] = { id: newId, name: skill?.name || newId, punkte: item.punkte }
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          >
                            <option value="">Skill wählen...</option>
                            {filteredSkills.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <input
                            style={{ ...styles.input, flex: 1, textAlign: 'center' }}
                            type="number"
                            min={0}
                            max={18}
                            placeholder="Punkte"
                            value={item.punkte}
                            onChange={e => {
                              const newArr = [...arr]
                              newArr[idx] = { ...item, punkte: parseInt(e.target.value, 10) || 0 }
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          />
                          <button
                            type="button"
                            style={styles.removeBtn}
                            onClick={() => {
                              const newArr = arr.filter((_, i) => i !== idx)
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    })()}
                  </div>
                  <button
                    type="button"
                    style={styles.addEntryBtn}
                    onClick={() => {
                      let arr: { id: string; name: string; punkte: number }[] = []
                      try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                      arr.push({ id: '', name: '', punkte: 0 })
                      setField(field.key, JSON.stringify(arr))
                    }}
                  >
                    + Eintrag hinzufügen
                  </button>
                </div>
              ) : field.type === 'strengthPoints' ? (
                <div>
                  <div style={styles.pointsList}>
                    {(() => {
                      let arr: { id: string; name: string; anzahl: number }[] = []
                      try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                      return arr.map((item, idx) => (
                        <div key={idx} style={styles.pointsRow}>
                          <select
                            style={{ ...styles.input, flex: 2 }}
                            value={item.id}
                            onChange={e => {
                              const newId = e.target.value
                              const strength = strengths.find(s => s.id === newId)
                              const newArr = [...arr]
                              newArr[idx] = { id: newId, name: strength?.name || newId, anzahl: item.anzahl }
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          >
                            <option value="">Stärke wählen...</option>
                            {strengths.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <input
                            style={{ ...styles.input, flex: 1, textAlign: 'center' }}
                            type="number"
                            min={0}
                            max={5}
                            placeholder="Anzahl"
                            value={item.anzahl}
                            onChange={e => {
                              const newArr = [...arr]
                              newArr[idx] = { ...item, anzahl: parseInt(e.target.value, 10) || 0 }
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          />
                          <button
                            type="button"
                            style={styles.removeBtn}
                            onClick={() => {
                              const newArr = arr.filter((_, i) => i !== idx)
                              setField(field.key, JSON.stringify(newArr))
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    })()}
                  </div>
                  <button
                    type="button"
                    style={styles.addEntryBtn}
                    onClick={() => {
                      let arr: { id: string; name: string; anzahl: number }[] = []
                      try { arr = JSON.parse(configFields[field.key] || '[]') } catch { arr = [] }
                      arr.push({ id: '', name: '', anzahl: 0 })
                      setField(field.key, JSON.stringify(arr))
                    }}
                  >
                    + Eintrag hinzufügen
                  </button>
                </div>
              ) : field.type === 'checkbox' ? (
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={configFields[field.key] === 'true'}
                    onChange={e => setField(field.key, e.target.checked ? 'true' : 'false')}
                  />
                  <span>{field.label}</span>
                </label>
              ) : (
                <input
                  style={styles.input}
                  type="text"
                  placeholder={field.placeholder}
                  value={configFields[field.key] ?? ''}
                  onChange={e => setField(field.key, e.target.value)}
                />
              )}
            </div>
          ))}

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

      <div style={styles.list}>
        {entries.length === 0 ? (
          <p style={styles.empty}>Noch keine Einträge vorhanden.</p>
        ) : (
          entries.map(entry => {
            let summary = ''
            try {
              const cfg = entry.config ? JSON.parse(entry.config) : {}
              const vals = Object.entries(cfg).map(([k, v]) => {
                if (!v || v === '' || v === '[]') return null
                try {
                  const parsed = JSON.parse(v as string)
                  if (Array.isArray(parsed)) {
                    if (k === 'staerken') {
                      return parsed.filter((s: { anzahl: number }) => s.anzahl > 0)
                        .map((s: { name: string; anzahl: number }) => s.anzahl > 1 ? `${s.name} ${toRoman(s.anzahl)}` : s.name)
                        .join(', ')
                    }
                    if (k === 'talente' || k === 'waffenTalente' || k === 'magieSchulen') {
                      return parsed.filter((s: { punkte: number }) => s.punkte > 0)
                        .map((s: { name: string; punkte: number }) => `${s.name} ${s.punkte}`)
                        .join(', ')
                    }
                    if (k === 'gaengigFuer') {
                      return parsed.length > 0 ? `${parsed.length} Rasse(n)` : null
                    }
                    return null
                  }
                } catch {}
                return v
              }).filter(Boolean)
              summary = vals.slice(0, 3).join(' · ')
            } catch {}
            return (
              <div key={entry.id} style={styles.row}>
                <div style={styles.rowContent}>
                  <div style={styles.rowName}>{entry.name}</div>
                  {entry.description && (
                    <div style={styles.rowDesc}>{entry.description}</div>
                  )}
                  {summary && (
                    <div style={styles.rowConfig}>{summary}</div>
                  )}
                </div>
                <div style={styles.rowActions}>
                  <button style={styles.editBtn} onClick={() => startEdit(entry)}>
                    Bearbeiten
                  </button>
                  <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(entry.id)}>
                    Löschen
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Eintrag löschen?</h3>
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
  count: { fontSize: 13, color: 'var(--text-secondary)' },
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
  form: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
  },
  formRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: {
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  },
  input: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    width: '100%',
  },
  select: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    width: '100%',
  },
  textarea: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', resize: 'vertical', width: '100%',
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  schoolValuesContainer: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8,
  },
  schoolValueRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 10px',
  },
  schoolValueName: {
    fontSize: 13, color: 'var(--text-primary)',
  },
  pointsList: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  pointsRow: {
    display: 'flex', gap: 8, alignItems: 'center',
  },
  removeBtn: {
    background: 'var(--danger)', border: 'none', color: '#fff',
    borderRadius: 4, width: 28, height: 28, cursor: 'pointer',
    fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addEntryBtn: {
    background: 'transparent', border: '1px dashed var(--border)',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
    fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, width: '100%',
  },
  chipContainer: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  chip: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  chipSelected: {
    background: 'var(--accent)', borderColor: 'var(--accent)',
    color: '#fff',
  },
  chipRaceSelected: {
    background: 'rgba(234,179,8,0.2)', borderColor: 'rgba(234,179,8,0.5)',
    color: 'var(--text-primary)',
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
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: 'var(--text-tertiary)', fontSize: 14 },
  row: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 16px',
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  rowDesc: {
    fontSize: 13, color: 'var(--text-secondary)', marginTop: 2,
    whiteSpace: 'normal', wordWrap: 'break-word',
    maxHeight: '4.5em', overflow: 'hidden',
    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
  },
  rowConfig: {
    fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4,
    fontStyle: 'italic',
  },
  rowActions: { display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 },
  editBtn: {
    background: 'transparent', border: '1px solid var(--accent)',
    color: 'var(--accent)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid var(--danger)',
    color: 'var(--danger)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
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
