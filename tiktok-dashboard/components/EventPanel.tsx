'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface EventData {
  icon: string
  text: string
  timestamp: string
  type?: string
}

interface EventPanelProps {
  events: EventData[]
}

export default function EventPanel({ events }: EventPanelProps) {
  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 max-h-[400px] flex flex-col">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4 pb-3 border-b-2 border-yellow-500/30 flex items-center gap-2">
        📊 Live Events
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>Events will appear here...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event, index) => {
              // Daha unique bir key oluştur
              const uniqueKey = `${event.timestamp}-${event.text.substring(0, 20)}-${index}`

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gray-900 border-l-4 border-blue-500 rounded-lg p-3 flex items-center gap-3 hover:border-yellow-500 hover:bg-gray-800 transition-all"
                >
                  <span className="text-2xl">{event.icon}</span>
                  <span className="text-gray-300 font-medium">{event.text}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
