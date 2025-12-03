'use client'

import { motion } from 'framer-motion'
import { Gift, TrendingUp, Users } from 'lucide-react'

interface GiftAnalysisProps {
  giftAnalysis: Array<{
    name: string
    count: number
    totalDiamonds: number
    uniqueGifters: number
    avgValue: string
  }>
  expensiveGifts: Array<{
    username: string
    nickname: string
    giftName: string
    totalDiamonds: number
    usd: string
    timestamp: number
  }>
}

export default function GiftAnalysis({ giftAnalysis, expensiveGifts }: GiftAnalysisProps) {
  const totalGifts = giftAnalysis.reduce((sum, g) => sum + g.count, 0)
  const totalValue = giftAnalysis.reduce((sum, g) => sum + g.totalDiamonds, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hediye Dağılımı */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-yellow-500/50">
          <Gift className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-yellow-400">🎁 Hediye Dağılımı</h3>
        </div>

        {giftAnalysis.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Henüz hediye yok</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {giftAnalysis.slice(0, 15).map((gift, index) => {
              const valuePercentage = totalValue > 0 ? (gift.totalDiamonds / totalValue) * 100 : 0
              
              return (
                <motion.div
                  key={gift.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 border-2 border-yellow-500/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-yellow-400">{gift.name}</div>
                      <div className="text-xs text-gray-400">
                        {gift.count}x gönderildi • {gift.uniqueGifters} farklı kişi
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-400" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}>💎 {gift.totalDiamonds.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Ort: {gift.avgValue} 💎</div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                      style={{ width: `${valuePercentage}%`, boxShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Toplam değerin %{valuePercentage.toFixed(1)}'i
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Özet */}
        <div className="mt-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 border-2 border-yellow-500/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Toplam Hediye Çeşidi</div>
              <div className="text-2xl font-bold text-yellow-400" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}>{giftAnalysis.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">En Popüler</div>
              <div className="text-lg font-bold text-yellow-400 truncate" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}>
                {giftAnalysis[0]?.name || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* En Pahalı Hediyeler */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-yellow-500/50">
          <TrendingUp className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-yellow-400">💰 En Değerli Hediyeler</h3>
        </div>

        {expensiveGifts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Henüz hediye yok</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {expensiveGifts.map((gift, index) => {
              let bgColor = 'from-gray-900 to-gray-800'
              let borderColor = 'border-yellow-500/50'
              let glowIntensity = '0.3'

              if (gift.totalDiamonds >= 10000) {
                borderColor = 'border-yellow-500'
                glowIntensity = '0.6'
              } else if (gift.totalDiamonds >= 1000) {
                borderColor = 'border-yellow-500/70'
                glowIntensity = '0.5'
              }

              return (
                <motion.div
                  key={`${gift.timestamp}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-r ${bgColor} rounded-xl p-4 border-2 ${borderColor} relative`}
                  style={{ boxShadow: `0 0 15px rgba(255, 215, 0, ${glowIntensity})` }}
                >
                  {/* Sıralama rozeti */}
                  <div className="absolute top-2 left-2 bg-black border-2 border-yellow-500/50 rounded-full w-8 h-8 flex items-center justify-center font-bold text-yellow-400 shadow-lg">
                    {index + 1}
                  </div>

                  <div className="ml-10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-yellow-400">{gift.nickname}</div>
                        <div className="text-sm text-gray-400">@{gift.username}</div>
                      </div>
                      {gift.totalDiamonds >= 10000 && (
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-2 py-1 rounded text-xs font-bold">
                          🔥 MEGA
                        </div>
                      )}
                    </div>

                    <div className="text-lg font-bold text-yellow-400 mb-1" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}>
                      {gift.giftName}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span>💎</span>
                        <span className="font-bold text-yellow-400">
                          {gift.totalDiamonds.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💵</span>
                        <span className="font-bold text-green-400">
                          ${gift.usd}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(gift.timestamp).toLocaleTimeString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Toplam */}
        {expensiveGifts.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 border-2 border-yellow-500/50">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Top {expensiveGifts.length} Toplam Değer</div>
                <div className="text-2xl font-bold text-yellow-400" style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}>
                  💎 {expensiveGifts.reduce((sum, g) => sum + g.totalDiamonds, 0).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">USD</div>
                <div className="text-2xl font-bold text-green-400" style={{ textShadow: '0 0 15px rgba(34, 197, 94, 0.4)' }}>
                  ${expensiveGifts.reduce((sum, g) => sum + parseFloat(g.usd), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
