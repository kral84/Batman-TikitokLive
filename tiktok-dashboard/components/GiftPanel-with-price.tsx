'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface GiftData {
  username: string
  nickname: string
  giftName: string
  giftId: number
  repeatCount: number
  diamondCount: number
  giftPictureUrl: string
  profilePicture: string
  giftType?: number
  timestamp: string
}

interface GiftPanelProps {
  gifts: GiftData[]
}

// Elması USD'ye çevir (1 elmas ≈ $0.005)
const diamondToUSD = (diamonds: number) => {
  const usd = diamonds * 0.005
  return usd.toFixed(2)
}

// Elması TL'ye çevir (1 USD ≈ 34 TL - güncel kur)
const diamondToTRY = (diamonds: number) => {
  const usd = diamonds * 0.005
  const tryAmount = usd * 34
  return tryAmount.toFixed(2)
}

export default function GiftPanel({ gifts }: GiftPanelProps) {
  // Toplam hediye değerini hesapla
  const totalDiamonds = gifts.reduce((sum, gift) => 
    sum + (gift.diamondCount * gift.repeatCount), 0
  )

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 h-[600px] flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 pb-3 border-b-2 border-primary flex items-center gap-2">
          🎁 Hediyeler
        </h2>
        
        {/* Toplam Değer */}
        {totalDiamonds > 0 && (
          <div className="mt-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-3 border-2 border-yellow-300">
            <div className="text-sm text-gray-600 mb-1">Toplam Hediye Değeri:</div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-2xl">💎</span>
                <span className="font-bold text-xl text-yellow-700">
                  {totalDiamonds.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl">💵</span>
                <span className="font-bold text-lg text-green-600">
                  ${diamondToUSD(totalDiamonds)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl">₺</span>
                <span className="font-bold text-lg text-blue-600">
                  ₺{diamondToTRY(totalDiamonds)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {gifts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Hediyeler burada görünecek...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {gifts.map((gift, index) => {
              const totalDiamond = gift.diamondCount * gift.repeatCount
              const usdValue = diamondToUSD(totalDiamond)
              const tryValue = diamondToTRY(totalDiamond)
              
              // Değere göre renk belirle
              let gradientColor = 'from-yellow-400 via-pink-500 to-purple-600' // Normal
              if (totalDiamond >= 10000) {
                gradientColor = 'from-red-500 via-purple-600 to-pink-600' // Çok yüksek
              } else if (totalDiamond >= 1000) {
                gradientColor = 'from-purple-500 via-pink-500 to-red-500' // Yüksek
              } else if (totalDiamond >= 100) {
                gradientColor = 'from-blue-500 via-purple-500 to-pink-500' // Orta
              }
              
              return (
                <motion.div
                  key={`${gift.timestamp}-${index}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    duration: 0.5 
                  }}
                  className={`bg-gradient-to-r ${gradientColor} rounded-xl p-4 text-white hover:shadow-2xl transition-shadow relative overflow-hidden`}
                >
                  {/* Yüksek değerli hediyeler için özel efekt */}
                  {totalDiamond >= 1000 && (
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-bl-lg font-bold text-xs">
                      🔥 YÜKSEK DEĞER!
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0 bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                      <Image
                        src={gift.giftPictureUrl || '/placeholder.png'}
                        alt={gift.giftName}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder.png'
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-1">
                        {gift.nickname}
                      </div>
                      <div className="text-xl font-semibold mb-2">
                        {gift.giftName} 
                        {gift.repeatCount > 1 && (
                          <span className="ml-2 text-yellow-200">
                            x{gift.repeatCount}
                          </span>
                        )}
                      </div>
                      
                      {/* Değer Bilgileri */}
                      <div className="space-y-1">
                        <div className="text-sm opacity-90 flex items-center gap-2 bg-white/20 rounded px-2 py-1 backdrop-blur-sm w-fit">
                          💎 {totalDiamond.toLocaleString()} Elmas
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm opacity-90 flex items-center gap-1 bg-green-600/50 rounded px-2 py-1 backdrop-blur-sm">
                            💵 ${usdValue}
                          </div>
                          <div className="text-sm opacity-90 flex items-center gap-1 bg-blue-600/50 rounded px-2 py-1 backdrop-blur-sm">
                            ₺ {tryValue}
                          </div>
                        </div>
                      </div>
                      
                      {/* Hediye tipi */}
                      {gift.giftType === 1 && (
                        <div className="mt-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded w-fit font-semibold">
                          🔄 Combo Hediye
                        </div>
                      )}
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
