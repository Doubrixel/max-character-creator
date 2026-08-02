import { useAppContext } from '../context/AppContext'

export default function ErrorBanner() {
  const { apiError, clearApiError } = useAppContext()

  if (!apiError) return null

  return (
    <div style={styles.banner}>
      <span style={styles.message}>{apiError}</span>
      <button style={styles.closeButton} onClick={clearApiError}>
        ✕
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 16px',
    marginBottom: 16,
    background: 'var(--bg-error)',
    color: 'var(--accent)',
    border: '1px solid var(--danger)',
    borderRadius: 8,
    fontSize: 14,
  },
  message: {
    flex: 1,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 6px',
  },
}
