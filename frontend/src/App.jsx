import { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState('loading...')

  useEffect(() => {
    fetch('/api/ping')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('failed to connect'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">PunchHarder</h1>
        <p className="text-lg text-gray-400">
          Backend says: <span className="text-green-400 font-mono">{message}</span>
        </p>
      </div>
    </div>
  )
}

export default App
