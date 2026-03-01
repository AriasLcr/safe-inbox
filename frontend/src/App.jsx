import { useState, useEffect } from 'react'
import StrangerPanel from './components/StrangerPanel'
import InboxPanel from './components/InboxPanel'

const API = 'http://localhost:8000'

export default function App() {
  const [messages, setMessages] = useState([])
  const [senderStatus, setSenderStatus] = useState('normal')
  const [continueContact, setContinueContact] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load existing state on mount
  useEffect(() => {
    fetch(`${API}/state`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages.map(m => ({ ...m, revealed: false })))
        setSenderStatus(data.sender_status)
        setContinueContact(data.continue_contact)
      })
      .catch(() => {})
  }, [])

  async function sendMessage(text) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail ?? 'Failed to send message')
        return
      }
      const msg = await res.json()
      setMessages(prev => [...prev, { ...msg, revealed: false }])
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  async function updateSenderStatus(status) {
    try {
      const res = await fetch(`${API}/sender-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      setSenderStatus(data.sender_status)
      setContinueContact(data.continue_contact)
    } catch {
      setError('Failed to update sender status')
    }
  }

  async function resetSession() {
    try {
      await fetch(`${API}/reset`, { method: 'POST' })
      setMessages([])
      setSenderStatus('normal')
      setContinueContact(false)
      setError(null)
    } catch {
      setError('Failed to reset session')
    }
  }

  function revealMessage(id) {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, revealed: true } : m))
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 font-sans">
      {/* Top bar */}
      <header className="flex items-center px-6 py-3 bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span className="font-semibold text-white tracking-tight">SafeInbox</span>
        </div>
        <span className="ml-3 text-xs text-gray-500">AI-powered message filtering</span>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-5 py-2 bg-red-900/60 border-b border-red-700/50 text-sm text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Stranger panel */}
        <div className="w-72 flex-shrink-0">
          <StrangerPanel
            onSend={sendMessage}
            senderStatus={senderStatus}
            loading={loading}
          />
        </div>

        {/* Right: Inbox panel */}
        <div className="flex-1 overflow-hidden">
          <InboxPanel
            messages={messages}
            senderStatus={senderStatus}
            continueContact={continueContact}
            onReveal={revealMessage}
            onBlock={() => updateSenderStatus('blocked')}
            onTrust={() => updateSenderStatus('trusted')}
            onReset={resetSession}
          />
        </div>
      </div>
    </div>
  )
}
