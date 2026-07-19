import { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error('Failed to fetch:', err))
  }, [])

  return (
    <div>
      <h1>Hello World</h1>
      <p>{message || 'Loading...'}</p>
    </div>
  )
}

export default App
