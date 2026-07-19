import { useState } from 'react'
import LibraryTable from './LibraryTable'

const TABS = [
  { id: 'races', label: 'Rassen' },
  { id: 'cultures', label: 'Kulturen' },
  { id: 'trainings', label: 'Ausbildungen' },
  { id: 'masteries', label: 'Meisterschaften' },
  { id: 'spells', label: 'Spells' },
  { id: 'resources', label: 'Ressourcen' },
  { id: 'items', label: 'Items' },
  { id: 'statblocks', label: 'Statblöcke' },
  { id: 'derived-values', label: 'Abgeleitete Werte' },
  { id: 'skills', label: 'Fähigkeiten' },
  { id: 'strengths', label: 'Stärken' },
]

export default function LibraryView() {
  const [activeTab, setActiveTab] = useState('races')

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Bibliothek</h2>
      <div style={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        <LibraryTable key={activeTab} type={activeTab} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '0 0 24px' },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' },
  tabs: {
    display: 'flex', flexWrap: 'wrap', gap: 4,
    borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 0,
  },
  tab: {
    background: 'transparent', border: 'none', borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)', padding: '10px 16px', cursor: 'pointer',
    fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
  },
  tabActive: {
    color: 'var(--accent)', borderBottomColor: 'var(--accent)',
  },
  content: { minHeight: 400 },
}
