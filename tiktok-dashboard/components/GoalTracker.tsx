'use client'

import { motion } from 'framer-motion'
import { Target, TrendingUp } from 'lucide-react'

interface GoalTrackerProps {
  goals: {
    viewers: { target: number, achieved: boolean }
    gifts: { target: number, achieved: boolean }
  }
  currentViewers: number
  currentGiftValue: number
}

export default function GoalTracker({ goals, currentViewers, currentGiftValue }: GoalTrackerProps) {
  const viewerProgress = Math.min((currentViewers / goals.viewers.target) * 100, 100)
  const giftProgress = Math.min((currentGiftValue / parseFloat(goals.gifts.target.toString())) * 100, 100)

  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
      <h3 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
        <Target className="w-7 h-7 text-yellow-400" />
        🎯 Hedefler
      </h3>

      <div className="space-y-6">
        {/* İzleyici Hedefi */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-bold text-yellow-400 text-lg">👥 İzleyici Hedefi</div>
              <div className="text-sm text-gray-400">
                {currentViewers.toLocaleString()} / {goals.viewers.target.toLocaleString()}
              </div>
            </div>
            {goals.viewers.achieved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-green-500 text-white px-4 py-2 rounded-full font-bold"
              >
                ✓ Tamamlandı!
              </motion.div>
            )}
          </div>

          <div className="relative">
            <div className="w-full bg-gray-900 border border-gray-700 rounded-full h-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${viewerProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-8 rounded-full flex items-center justify-center text-black font-bold ${
                  goals.viewers.achieved
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                }`}
                style={{
                  boxShadow: goals.viewers.achieved
                    ? '0 0 15px rgba(34, 197, 94, 0.6)'
                    : '0 0 15px rgba(255, 215, 0, 0.6)'
                }}
              >
                {viewerProgress.toFixed(0)}%
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hediye Hedefi */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-bold text-yellow-400 text-lg">💰 Hediye Hedefi</div>
              <div className="text-sm text-gray-400">
                ${currentGiftValue.toFixed(2)} / ${goals.gifts.target.toLocaleString()}
              </div>
            </div>
            {goals.gifts.achieved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-green-500 text-white px-4 py-2 rounded-full font-bold"
              >
                ✓ Tamamlandı!
              </motion.div>
            )}
          </div>

          <div className="relative">
            <div className="w-full bg-gray-900 border border-gray-700 rounded-full h-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${giftProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-8 rounded-full flex items-center justify-center text-black font-bold ${
                  goals.gifts.achieved
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                }`}
                style={{
                  boxShadow: goals.gifts.achieved
                    ? '0 0 15px rgba(34, 197, 94, 0.6)'
                    : '0 0 15px rgba(255, 165, 0, 0.6)'
                }}
              >
                {giftProgress.toFixed(0)}%
              </motion.div>
            </div>
          </div>
        </div>

        {/* İlerleme Özeti */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 border-2 border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="font-bold text-yellow-400">Genel İlerleme</div>
                <div className="text-sm text-gray-400">
                  {goals.viewers.achieved && goals.gifts.achieved
                    ? '🎉 Tüm hedefler tamamlandı!'
                    : goals.viewers.achieved || goals.gifts.achieved
                    ? '💪 Harika gidiyorsun!'
                    : '🚀 Devam et!'}
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-400" style={{ textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}>
              {((viewerProgress + giftProgress) / 2).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
