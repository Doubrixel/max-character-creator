import { useEffect, useState } from 'react'
import {
  isIntegerInput,
  PASSIVE_ATTRIBUTE_STATS,
  PASSIVE_DERIVED_STATS,
} from '@mcc/shared'

const STATS = [...PASSIVE_ATTRIBUTE_STATS, ...PASSIVE_DERIVED_STATS]

interface PassiveBonusFieldsProps {
  aktiv: boolean
  werte: Record<string, number>
  onAktivChange: (aktiv: boolean) => void
  onWerteChange: (werte: Record<string, number>) => void
  idPrefix: string
}

function IntegerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))

  useEffect(() => {
    setDraft(value === undefined ? '' : String(value))
  }, [value])

  const handleChange = (raw: string) => {
    // Zwischenzustände wie "-" bleiben im Entwurf, werden aber nicht gespeichert.
    if (!isIntegerInput(raw)) return
    setDraft(raw)
    if (/^-?\d+$/.test(raw)) {
      const parsed = Number.parseInt(raw, 10)
      onChange(Number.isSafeInteger(parsed) ? parsed : undefined)
    } else {
      onChange(undefined)
    }
  }

  return (
    <div style={styles.statRow}>
      <label htmlFor={id} style={styles.statLabel}>{label}</label>
      <input
        id={id}
        aria-label={label}
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        placeholder="—"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        style={styles.statInput}
      />
    </div>
  )
}

export default function PassiveBonusFields({
  aktiv,
  werte,
  onAktivChange,
  onWerteChange,
  idPrefix,
}: PassiveBonusFieldsProps) {
  const setValue = (key: string, value: number | undefined) => {
    const next = { ...werte }
    if (value === undefined || value === 0) delete next[key]
    else next[key] = value
    onWerteChange(next)
  }

  return (
    <div style={styles.section}>
      <label style={styles.toggleLabel}>
        <input
          type="checkbox"
          checked={aktiv}
          onChange={(e) => onAktivChange(e.target.checked)}
          style={styles.toggle}
        />
        <span>Passiver Bonus</span>
      </label>

      {aktiv && (
        <div style={styles.values} role="group" aria-label="Passive Boni">
          <div style={styles.valuesTitle}>Passive Boni</div>
          <div style={styles.grid}>
            {STATS.map(({ key, label }) => (
              <IntegerField
                key={key}
                id={`${idPrefix}-passive-${key}`}
                label={label}
                value={werte[key]}
                onChange={(value) => setValue(key, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  toggle: { cursor: 'pointer' },
  values: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  valuesTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: 8,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  statInput: {
    width: 80,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
  },
}
