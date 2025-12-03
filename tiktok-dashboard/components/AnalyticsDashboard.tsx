'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Users, Activity, Target, Clock, PlayCircle } from 'lucide-react'

// Interface güncellendi: streamStartTime ve sessionDuration eklendi
interface AnalyticsProps {
  stats: {
    uniqueUsers: number
    uniqueGifters: number
    uniqueChatters: number
    moderators: number
    subscribers: number
    followers: number
    newFollowers: number
    activeUsers: number
    veryActiveUsers: number
    engagementRate: string
    avgGiftValue: string
    avgMessageLength: string
    streamDuration: string // Bu artık Toplam Süre olacak
    peakViewers: number
    peakViewersTime: Date | null
    spamMessages: number
  }
  streamStartTime: Date | null // YENİ
  sessionDuration: string // YENİ
}

export default function AnalyticsDashboard({ stats, streamStartTime, sessionDuration }: AnalyticsProps) {
  // Güvenli değerler - NaN önleme
  const safeStats = {
    uniqueUsers: stats.uniqueUsers || 0,
    uniqueGifters: stats.uniqueGifters || 0,
    uniqueChatters: stats.uniqueChatters || 0,
    moderators: stats.moderators || 0,
    subscribers: stats.subscribers || 0,
    followers: stats.followers || 0,
    newFollowers: stats.newFollowers || 0,
    activeUsers: stats.activeUsers || 0,
    veryActiveUsers: stats.veryActiveUsers || 0,
    engagementRate: stats.engagementRate || '0',
    avgGiftValue: stats.avgGiftValue || '0',
    avgMessageLength: stats.avgMessageLength || '0',
    streamDuration: stats.streamDuration || '0 dakika',
    peakViewers: stats.peakViewers || 0,
    peakViewersTime: stats.peakViewersTime,
    spamMessages: stats.spamMessages || 0
  };

  // Pasif kullanıcılar hesapla
  const passiveUsers = Math.max(0, safeStats.uniqueUsers - safeStats.activeUsers - safeStats.veryActiveUsers);
  
  const StatCard = ({ icon, label, value, color, subtext }: any) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800 border-2 border-gray-700 rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`${color} p-2 rounded-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{value}</div>
          {subtext && <div className="text-xs text-gray-500">{subtext}</div>}
        </div>
      </div>
      <div className="text-sm font-medium text-gray-400">{label}</div>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Üst Özet (Güncellendi) */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl shadow-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
          <Activity className="w-7 h-7 text-yellow-400" />
          Yayın Özeti
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* YENİ: Yayın Başlangıcı */}
          <div>
            <div className="text-3xl font-bold">
              {streamStartTime 
                ? new Date(streamStartTime).toLocaleTimeString('tr-TR') 
                : 'N/A'}
            </div>
            <div className="text-sm opacity-90">Yayın Başlangıcı</div>
            {streamStartTime && (
              <div className="text-xs opacity-75 mt-1">
                {new Date(streamStartTime).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
          
          {/* GÜNCELLENDİ: Toplam Yayın Süresi */}
          <div>
            <div className="text-3xl font-bold">{safeStats.streamDuration}</div>
            <div className="text-sm opacity-90">Toplam Yayın Süresi</div>
            {/* YENİ: Oturum Süresi (Sizin bağlantınız) */}
            <div className="text-lg font-bold text-white/80 mt-1">
              ({sessionDuration} oturum)
            </div>
          </div>
          
          {/* Peak İzleyici */}
          <div>
            <div className="text-3xl font-bold">{safeStats.peakViewers.toLocaleString()}</div>
            <div className="text-sm opacity-90">Peak İzleyici</div>
            {safeStats.peakViewersTime && (
              <div className="text-xs opacity-75 mt-1">
                {new Date(safeStats.peakViewersTime).toLocaleTimeString('tr-TR')}
              </div>
            )}
          </div>
          
          {/* Engagement */}
          <div>
            <div className="text-3xl font-bold">{safeStats.engagementRate}%</div>
            <div className="text-sm opacity-90">Engagement</div>
          </div>

        </div>
      </div>

      {/* Kullanıcı Segmentasyonu */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-yellow-400" />
          Kullanıcı Segmentasyonu
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<span className="text-xl">👥</span>}
            label="Toplam Kullanıcı"
            value={safeStats.uniqueUsers}
            color="bg-blue-900/40"
          />
          <StatCard
            icon={<span className="text-xl">💬</span>}
            label="Sohbet Edenler"
            value={safeStats.uniqueChatters}
            color="bg-green-900/40"
            subtext={`${safeStats.uniqueUsers > 0 ? ((safeStats.uniqueChatters / safeStats.uniqueUsers) * 100).toFixed(0) : 0}% aktif`}
          />
          <StatCard
            icon={<span className="text-xl">🎁</span>}
            label="Hediye Gönderenler"
            value={safeStats.uniqueGifters}
            color="bg-purple-900/40"
            subtext={`${safeStats.uniqueUsers > 0 ? ((safeStats.uniqueGifters / safeStats.uniqueUsers) * 100).toFixed(0) : 0}% dönüşüm`}
          />
          <StatCard
            icon={<span className="text-xl">⭐</span>}
            label="Yeni Takipçi"
            value={safeStats.newFollowers}
            color="bg-yellow-900/40"
          />
        </div>
      </div>

      {/* Aktivite Seviyeleri */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-yellow-400" />
          Aktivite Seviyeleri
        </h3>
        <div className="space-y-4">
          {/* Çok Aktif */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-300">🔴 Çok Aktif (10+ mesaj)</span>
              <span className="font-bold text-red-400">{safeStats.veryActiveUsers}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-red-500 to-pink-500 h-3 rounded-full transition-all"
                style={{ width: `${safeStats.uniqueUsers > 0 ? (safeStats.veryActiveUsers / safeStats.uniqueUsers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Aktif */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-300">🟡 Aktif (3-10 mesaj)</span>
              <span className="font-bold text-yellow-400">{safeStats.activeUsers}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all"
                style={{ width: `${safeStats.uniqueUsers > 0 ? (safeStats.activeUsers / safeStats.uniqueUsers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Pasif */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-300">🟢 Pasif (Sadece izleyen)</span>
              <span className="font-bold text-green-400">
                {passiveUsers}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                style={{
                  width: `${safeStats.uniqueUsers > 0 ? (passiveUsers / safeStats.uniqueUsers) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

     
      {/* Ortalamalar */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-4">📊 Ortalamalar</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border-2 border-yellow-500/50">
            <div className="text-3xl font-bold text-yellow-400" style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}>{safeStats.avgGiftValue}</div>
            <div className="text-sm font-medium text-gray-400 mt-1">💎 Ort. Hediye Değeri</div>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border-2 border-yellow-500/50">
            <div className="text-3xl font-bold text-yellow-400" style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}>{safeStats.avgMessageLength}</div>
            <div className="text-sm font-medium text-gray-400 mt-1">📝 Ort. Mesaj Uzunluğu</div>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border-2 border-yellow-500/50">
            <div className="text-3xl font-bold text-yellow-400" style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}>{safeStats.engagementRate}%</div>
            <div className="text-sm font-medium text-gray-400 mt-1">💪 Engagement Rate</div>
          </div>
        </div>
      </div>

      {/* Spam İstatistiği */}
      {safeStats.spamMessages > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="font-bold text-red-800">Spam Tespiti</div>
              <div className="text-sm text-red-600">
                {safeStats.spamMessages} spam mesaj engellendi
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}