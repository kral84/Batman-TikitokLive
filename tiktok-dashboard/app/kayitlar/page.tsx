'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Calendar, Clock, Users, Gift, MessageSquare, Video, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Recording {
  username: string
  streamId: string
  info: any
  finalStats: any
  hasVideo: boolean
  createdAt: string
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('http://localhost:3001/list-recordings')
      const data = await response.json()

      if (data.recordings) {
        setRecordings(data.recordings)
      }
    } catch (err) {
      console.error('Kayıtlar yüklenemedi:', err)
      setError('Kayıtlar yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startTime: string) => {
    // Duration hesapla (finalStats'den)
    return 'N/A'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Geri Dön</span>
          </button>

          <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2" style={{textShadow: '0 0 20px rgba(251, 191, 36, 0.5)'}}>
            📦 Kaydedilmiş Yayınlar
          </h1>
          <p className="text-gray-400">Tüm kaydedilmiş canlı yayınları görüntüleyin</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Recordings Grid */}
        {!isLoading && !error && recordings.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-2">Henüz kayıt yok</h3>
            <p className="text-gray-500">Canlı yayın analizi yaptığınızda kayıtlar burada görünecek</p>
          </div>
        )}

        {!isLoading && !error && recordings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map((recording) => (
              <motion.div
                key={`${recording.username}-${recording.streamId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-800 border-2 border-gray-700 rounded-xl overflow-hidden hover:border-yellow-500 transition-all cursor-pointer shadow-lg"
                onClick={() => window.location.href = `/kayit/${recording.username}/${recording.streamId}`}
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                  {recording.hasVideo ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent"></div>
                      <div className="relative z-10 text-center">
                        <div className="text-6xl mb-2">📹</div>
                        <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 inline-flex">
                          <Video className="w-5 h-5" />
                          <span>Video Kaydı Mevcut</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-6xl opacity-50">📊</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-6">
                  {/* Profile */}
                  <div className="flex items-center gap-3 mb-4">
                    {recording.info?.profile?.profilePicture && (
                      <img
                        src={recording.info.profile.profilePicture}
                        alt={recording.username}
                        className="w-12 h-12 rounded-full border-2 border-gray-600"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/48'
                        }}
                      />
                    )}
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-white truncate">
                        {recording.info?.profile?.nickname || recording.username}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">@{recording.username}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(recording.createdAt)}</span>
                  </div>

                  {/* Stats */}
                  {recording.finalStats && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-400 mb-1">
                          <Gift className="w-4 h-4" />
                          <span className="text-xs font-semibold">Hediye</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {recording.finalStats.totalGifts?.toLocaleString() || 0}
                        </div>
                      </div>

                      <div className="bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs font-semibold">Mesaj</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {recording.finalStats.totalMessages?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500 transition-all flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = `/kayit/${recording.username}/${recording.streamId}`
                    }}
                  >
                    <Play className="w-5 h-5" />
                    <span>İncele</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
