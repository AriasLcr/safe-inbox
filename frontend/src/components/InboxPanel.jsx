import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function InboxPanel({
  messages,
  senderStatus,
  continueContact,
  onReveal,
  onBlock,
  onTrust,
  onReset,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Your Inbox
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            {senderStatus === 'trusted' && (
              <span className="text-xs bg-green-700/70 text-green-200 px-2 py-0.5 rounded-full">
                Sender Trusted
              </span>
            )}
            {senderStatus === 'blocked' && (
              <span className="text-xs bg-red-800/70 text-red-300 px-2 py-0.5 rounded-full">
                Sender Blocked
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          Reset Thread
        </button>
      </div>

      {/* Continue Contact warning banner */}
      {continueContact && (
        <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-xl bg-yellow-900/40 border border-yellow-700/50 text-xs text-yellow-300">
          ⚠ You have opted into continued contact with this sender. Harmful content will still be flagged.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm select-none">
            No messages yet
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              senderStatus={senderStatus}
              onReveal={() => onReveal(msg.id)}
              onBlock={onBlock}
              onTrust={onTrust}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
