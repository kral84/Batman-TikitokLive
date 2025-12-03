'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface EmoteData {
  username: string
  nickname: string
  emoteName: string
  emoteImageUrl: string
  timestamp: string
}

interface EmotePanelProps {
  emotes: EmoteData[]
}

export default function EmotePanel({ emotes }: EmotePanelProps) {
  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 h-[600px] flex flex-col">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-orange-500 flex items-center gap-2">
        😊 Emoji & Sticker
      </h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {emotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Emoji ve stickerlar burada görünecek...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {emotes.map((emote, index) => {
              // Unique key oluştur - index kullanma
              const uniqueKey = `${emote.username}-${emote.timestamp}-${emote.emoteName}`

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl p-4 hover:shadow-lg transition-shadow border-2 border-orange-200"
                >
                <div className="flex items-center gap-4">
                  {emote.emoteImageUrl && (
                    <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg p-2 shadow-md">
                      <Image
                        src={emote.emoteImageUrl}
                        alt={emote.emoteName}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="font-bold text-orange-700 text-lg mb-1">
                      {emote.nickname}
                    </div>
                    <div className="text-2xl font-semibold text-orange-900">
                      {emote.emoteName}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(emote.timestamp).toLocaleTimeString('tr-TR')}
                    </div>
                  </div>
                </div>
              </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
