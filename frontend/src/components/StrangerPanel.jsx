import { useState } from 'react'

export default function StrangerPanel({ onSend, senderStatus, loading }) {
  const [text, setText] = useState('')

  const isBlocked = senderStatus === 'blocked'

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || loading || isBlocked) return
    onSend(trimmed)
    setText('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 border-r border-gray-700">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Stranger
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Simulates incoming messages</p>
      </div>

      {/* Avatar / status */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-5">
        <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-2xl select-none">
          👤
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-200">Unknown Sender</p>
          {senderStatus === 'trusted' && (
            <span className="text-xs bg-green-700/70 text-green-200 px-2 py-0.5 rounded-full mt-1 inline-block">
              Trusted
            </span>
          )}
          {isBlocked && (
            <span className="text-xs bg-red-800/70 text-red-300 px-2 py-0.5 rounded-full mt-1 inline-block">
              Blocked
            </span>
          )}
        </div>

        {isBlocked ? (
          <div className="w-full text-center bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-5">
            <p className="text-sm text-red-300 font-medium">Sender is blocked</p>
            <p className="text-xs text-red-400/70 mt-1">No more messages can be sent.</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={4}
              disabled={loading}
              className="w-full resize-none rounded-xl bg-gray-700 border border-gray-600 text-sm text-gray-100 px-3 py-2.5 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-sm font-medium transition-colors"
            >
              {loading ? 'Analyzing…' : 'Send Message'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
