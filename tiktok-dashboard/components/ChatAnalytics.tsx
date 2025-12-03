'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Hash } from 'lucide-react'

interface ChatAnalyticsProps {
  topWords: Array<{word: string, count: number}>
  topEmojis: Array<{emoji: string, count: number}>
  totalMessages: number
  spamMessages: number
}

export default function ChatAnalytics({ topWords, topEmojis, totalMessages, spamMessages }: ChatAnalyticsProps) {
  const maxWordCount = topWords[0]?.count || 1
  const maxEmojiCount = topEmojis[0]?.count || 1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kelime Bulutu */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-blue-500">
          <Hash className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-yellow-400">📝 En Çok Kullanılan Kelimeler</h3>
        </div>

        {topWords.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Henüz mesaj yok</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topWords.map((word, index) => {
              const size = Math.max(12, (word.count / maxWordCount) * 32)
              const opacity = 0.5 + (word.count / maxWordCount) * 0.5
              
              return (
                <motion.div
                  key={word.word}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg px-3 py-2 border-2 border-blue-300 hover:scale-110 transition-transform cursor-pointer"
                  style={{ opacity }}
                >
                  <span
                    className="font-bold text-blue-800"
                    style={{ fontSize: `${size}px` }}
                  >
                    {word.word}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {word.count}x
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Spam İstatistiği */}
        {spamMessages > 0 && (
          <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div className="text-sm">
                <span className="font-bold text-red-800">{spamMessages}</span>
                <span className="text-red-600"> spam mesaj tespit edildi</span>
                <span className="text-gray-500"> ({((spamMessages / totalMessages) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emoji İstatistikleri */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-yellow-500">
          <MessageCircle className="w-6 h-6 text-yellow-600" />
          <h3 className="text-xl font-bold text-yellow-400">😊 En Popüler Emojiler</h3>
        </div>

        {topEmojis.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Henüz emoji yok</p>
        ) : (
          <div className="space-y-3">
            {topEmojis.map((emoji, index) => {
              const percentage = (emoji.count / maxEmojiCount) * 100
              
              return (
                <motion.div
                  key={emoji.emoji}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{emoji.emoji}</span>
                      <div>
                        <div className="font-bold text-yellow-400">{emoji.count}x</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full"
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Toplam İstatistik */}
        <div className="mt-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 border-2 border-yellow-300">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-400">Toplam Emoji Kullanımı</div>
              <div className="text-2xl font-bold text-yellow-800">
                {topEmojis.reduce((sum, e) => sum + e.count, 0)}
              </div>
            </div>
            <div className="text-6xl">{topEmojis[0]?.emoji || '😊'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
