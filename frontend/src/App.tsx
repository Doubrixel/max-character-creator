import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/Sidebar'
import CreationView from './components/CreationView'
import ChronicleView from './components/chronicle/ChronicleView'

type Tab = 'creation' | 'chronik' | 'bibliothek'

function AppContent({ activeTab }: { activeTab: Tab }) {
  return (
    <>
      {activeTab === 'creation' && <CreationView />}
      {activeTab === 'chronik' && <ChronicleView />}
      {activeTab === 'bibliothek' && <p style={styles.placeholder}>In Entwicklung</p>}
    </>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('creation')

  return (
    <AppProvider>
      <div style={styles.container}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main style={styles.main}>
          <AppContent activeTab={activeTab} />
        </main>
      </div>
    </AppProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' },
  main: { flex: 1, marginLeft: 200, padding: 24 },
  placeholder: { fontSize: 18, color: 'var(--text-tertiary)', marginTop: 40 },
}

export default App
