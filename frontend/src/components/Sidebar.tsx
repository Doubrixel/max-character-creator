type Tab = 'creation' | 'chronik' | 'bibliothek'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'creation', label: 'Creation' },
  { key: 'chronik', label: 'Chronik' },
  { key: 'bibliothek', label: 'Bibliothek' },
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <nav style={styles.sidebar}>
      <h2 style={styles.title}>Max Character</h2>
      <ul style={styles.list}>
        {tabs.map(({ key, label }) => (
          <li
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              ...styles.item,
              ...(activeTab === key ? styles.itemActive : {}),
            }}
          >
            {label}
          </li>
        ))}
      </ul>
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 200,
    height: '100vh',
    background: '#1a1a2e',
    color: '#eee',
    padding: '24px 0',
  },
  title: { fontSize: 16, fontWeight: 700, padding: '0 16px', marginBottom: 24 },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  item: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s',
  },
  itemActive: {
    background: '#16213e',
    borderLeft: '3px solid #e94560',
    fontWeight: 600,
  },
}
