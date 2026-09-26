interface FilterOption {
  id: string
  label: string
}

interface FilterColumn {
  title: string
  options: FilterOption[]
}

interface FilterPanelProps {
  columns: FilterColumn[]
  selected: Map<number, Set<string>>
  onToggle: (columnIndex: number, id: string) => void
}

export default function FilterPanel({ columns, selected, onToggle }: FilterPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.grid}>
        {columns.map((column, colIndex) => (
          <div key={colIndex} style={styles.column}>
            <div style={styles.columnTitle}>{column.title}</div>
            <div style={styles.options}>
              {column.options.map(option => {
                const isSelected = selected.get(colIndex)?.has(option.id) ?? false
                return (
                  <label key={option.id} style={styles.option}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(colIndex, option.id)}
                      style={styles.checkbox}
                    />
                    <span style={styles.optionLabel}>{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 300,
    overflowY: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: 'var(--text-primary)',
  },
  checkbox: {
    cursor: 'pointer',
    width: 16,
    height: 16,
  },
  optionLabel: {
    userSelect: 'none',
  },
}