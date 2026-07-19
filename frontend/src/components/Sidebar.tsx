import { useTheme } from '../context/ThemeContext'

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
  const { theme, toggleTheme } = useTheme()

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
      <button
        onClick={toggleTheme}
        style={styles.themeToggle}
        aria-label={theme === 'dark' ? 'Zu hellem Theme wechseln' : 'Zu dunklem Theme wechseln'}
      >
        {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>
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
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--border)',
    transition: 'background 0.2s, color 0.2s',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    padding: '0 16px',
    marginBottom: 24,
    color: 'var(--text-primary)',
  },
  list: { listStyle: 'none', margin: 0, padding: 0, flex: 1 },
  item: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s, color 0.15s',
    color: 'var(--text-secondary)',
  },
  itemActive: {
    background: 'var(--bg-sidebar-active)',
    borderLeft: '3px solid var(--accent)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  themeToggle: {
    margin: '12px 16px',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
}
