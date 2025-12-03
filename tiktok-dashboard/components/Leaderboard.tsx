'use client'

import { motion } from 'framer-motion'
import { Trophy, MessageSquare, Gift, Heart } from 'lucide-react'

interface LeaderboardProps {
  topGifters: Array<{username: string, diamonds: number, usd: string}>
  topChatters: Array<{username: string, count: number}>
  topLikers: Array<{username: string, likes: number}>
}

export default function Leaderboard({ topGifters, topChatters, topLikers }: LeaderboardProps) {
  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Gifters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-yellow-500">
          <Gift className="w-6 h-6 text-yellow-600" />
          <h3 className="text-xl font-bold text-yellow-400">🏆 Top Hediye Gönderenler</h3>
        </div>
        
        <div className="space-y-3">
          {topGifters.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Henüz hediye yok</p>
          ) : (
            topGifters.map((gifter, index) => (
              <motion.div
                key={gifter.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30' : 'bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{getMedal(index)}</span>
                  <div>
                    <div className="font-semibold text-yellow-400">{gifter.username}</div>
                    <div className="text-sm text-gray-500">
                      💎 {gifter.diamonds.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${gifter.usd}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Top Chatters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-blue-500">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-yellow-400">💬 En Aktif Sohbetçiler</h3>
        </div>
        
        <div className="space-y-3">
          {topChatters.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Henüz mesaj yok</p>
          ) : (
            topChatters.map((chatter, index) => (
              <motion.div
                key={chatter.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  index < 3 ? 'bg-gradient-to-r from-blue-900/40 to-cyan-900/30 border border-blue-700/50' : 'bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{getMedal(index)}</span>
                  <div className="font-semibold text-yellow-400">{chatter.username}</div>
                </div>
                <div className="font-bold text-blue-400">{chatter.count} mesaj</div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Top Likers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-pink-500">
          <Heart className="w-6 h-6 text-pink-600" />
          <h3 className="text-xl font-bold text-yellow-400">❤️ En Çok Beğenenler</h3>
        </div>
        
        <div className="space-y-3">
          {topLikers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Henüz beğeni yok</p>
          ) : (
            topLikers.map((liker, index) => (
              <motion.div
                key={liker.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  index < 3 ? 'bg-gradient-to-r from-pink-900/40 to-rose-900/30 border border-pink-700/50' : 'bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{getMedal(index)}</span>
                  <div className="font-semibold text-yellow-400">{liker.username}</div>
                </div>
                <div className="font-bold text-pink-400">{liker.likes.toLocaleString()}</div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
