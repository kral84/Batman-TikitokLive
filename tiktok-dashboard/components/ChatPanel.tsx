'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
// Rozetler ve ikonlar için eklendi
import { Shield, CheckCircle, Star, Gift } from 'lucide-react'

// Interface güncellendi: Backend'den gelen tüm verileri alacak
interface ChatMessage {
  username: string
  nickname: string
  message: string
  profilePicture: string
  timestamp: string
  
  // Yeni eklenen alanlar
  isModerator?: boolean
  isSubscriber?: boolean
  isFollower?: boolean
  isGiftGiver?: boolean
  badges?: Array<{type: string, name: string}>
  userLevel?: number
  followerCount?: number
  heatLevel?: number
}

interface ChatPanelProps {
  messages: ChatMessage[]
}

export default function ChatPanel({ messages }: ChatPanelProps) {
  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 h-[600px] flex flex-col">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4 pb-3 border-b-2 border-yellow-500/30 flex items-center gap-2">
        💬 Live Chat
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Messages will appear here...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              // Unique key oluştur - index kullanma çünkü array başa eleman eklenince tüm index'ler değişiyor
              const uniqueKey = `${msg.username}-${msg.timestamp}-${msg.message.substring(0, 20)}`

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex gap-3 hover:border-yellow-500/30 hover:shadow-md transition-all"
                >
                {/* Profil Resmi */}
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image
                    src={msg.profilePicture || '/placeholder.png'}
                    alt={msg.nickname}
                    fill
                    className="rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder.png'
                    }}
                  />
                </div>
                
                {/* Mesaj İçeriği (Güncellendi) */}
                <div className="flex-1 min-w-0">
                  
                  {/* Güncellenmiş Kullanıcı Adı ve Rozet Alanı */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    
                    {/* Moderatör Rozeti */}
                    {msg.isModerator && (
                      <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" title="Moderator" />
                    )}

                    {/* Abone Rozeti (Varsa) */}
                    {msg.isSubscriber && (
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" title="Subscriber" />
                    )}

                    {/* Takipçi Rozeti (Varsa) */}
                    {msg.isFollower && (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" title="Follower" />
                    )}

                    {/* Hediye Veren Rozeti (Varsa) */}
                    {msg.isGiftGiver && (
                      <Gift className="w-4 h-4 text-pink-400 flex-shrink-0" title="Gift Giver" />
                    )}

                    {/* Badge'ler (Event'lerden) */}
                    {msg.badges && msg.badges.length > 0 && (
                      <>
                        {msg.badges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-semibold bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700"
                            title={badge.name || badge.type}
                          >
                            {badge.name || badge.type}
                          </span>
                        ))}
                      </>
                    )}

                    {/* Kullanıcı Seviyesi (Varsa) */}
                    {msg.userLevel && msg.userLevel > 0 && (
                      <span
                        className="text-xs font-bold bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded-full border border-gray-600"
                        title={`Level ${msg.userLevel}`}
                      >
                        Lv.{msg.userLevel}
                      </span>
                    )}

                    {/* Kullanıcı Adı */}
                    <span className="font-semibold text-yellow-400 truncate">
                      {msg.nickname}
                    </span>

                    <span className="text-gray-500 text-xs ml-1 truncate">
                      @{msg.username}
                    </span>

                    {/* Heat Level (Yayın Yoğunluğu) */}
                    {msg.heatLevel && msg.heatLevel > 0 && (
                      <div className="ml-2 flex items-center gap-1 text-xs">
                        <span className="text-orange-400">🔥</span>
                        <span className="text-orange-400 font-semibold">Heat: {msg.heatLevel}</span>
                      </div>
                    )}
                  </div>

                  {/* Mesaj */}
                  <p className="text-gray-300 break-words">{msg.message}</p>
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