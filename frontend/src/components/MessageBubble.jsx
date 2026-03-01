const CATEGORY_COLORS = {
  safe: 'bg-green-800 text-green-200',
  creepy: 'bg-yellow-800 text-yellow-200',
  threatening: 'bg-red-800 text-red-200',
  explicit: 'bg-pink-800 text-pink-200',
  manipulative: 'bg-orange-800 text-orange-200',
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, onReveal, onBlock, onTrust, senderStatus }) {
  const { text, category, reason, filtered, revealed, timestamp } = message
  const isBlocked = senderStatus === 'blocked'

  return (
    <div className="flex flex-col gap-1 max-w-[85%]">
      {/* Filtered + not yet revealed */}
      {filtered && !revealed ? (
        <div className="relative rounded-2xl rounded-tl-sm bg-gray-700 overflow-hidden min-w-[260px]">
          {/* Blurred text — absolute, purely decorative, does not set height */}
          <p className="absolute inset-0 px-4 py-3 text-sm blur-sm select-none pointer-events-none opacity-60">
            {text}
          </p>

          {/* Overlay content drives the card height */}
          <div className="relative flex flex-col items-center gap-3 bg-gray-900/70 backdrop-blur-[2px] px-4 py-5 text-center">
            <div>
              <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-600 text-gray-200'}`}>
                {category}
              </span>
              <p className="text-xs text-gray-300 mt-2">
                This message was filtered. It may contain harmful content.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={onReveal}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors whitespace-nowrap"
              >
                Reveal Message
              </button>
              {!isBlocked && (
                <button
                  onClick={onBlock}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 transition-colors whitespace-nowrap"
                >
                  Block Sender
                </button>
              )}
              {senderStatus !== 'trusted' && !isBlocked && (
                <button
                  onClick={onTrust}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  Continue Contact
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Safe or revealed message */
        <div className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${revealed ? 'bg-gray-600 ring-1 ring-yellow-600/50' : 'bg-gray-700'}`}>
          <p>{text}</p>
          {revealed && (
            <p className="text-xs text-yellow-400 mt-1 italic">{reason}</p>
          )}
        </div>
      )}

      {/* Timestamp + category badge for safe messages */}
      <div className="flex items-center gap-2 px-1">
        {category !== 'safe' && (revealed || !filtered) && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? ''}`}>
            {category}
          </span>
        )}
        <span className="text-xs text-gray-500">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}
