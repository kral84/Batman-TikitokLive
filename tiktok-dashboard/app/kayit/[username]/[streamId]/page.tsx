'use client'

import { useState, useEffect, use } from 'react'
import { ArrowLeft, Calendar, Clock, Users, Gift, MessageSquare, Heart, Share2, UserPlus, Video, Download, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface StreamViewerProps {
  params: Promise<{
    username: string
    streamId: string
  }>
}

export default function StreamViewer({ params }: StreamViewerProps) {
  // ✅ Next.js 15: params Promise'i unwrap et
  const { username, streamId } = use(params)

  const [recording, setRecording] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'stats' | 'chat' | 'gifts' | 'members' | 'likes' | 'video' | 'events'>('stats')
  const [videoReady, setVideoReady] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [convertProgress, setConvertProgress] = useState(0)
  const [convertError, setConvertError] = useState('')

  useEffect(() => {
    fetchRecording()
  }, [username, streamId])

  // MP4 dosyası hazır mı kontrol et (polling)
  useEffect(() => {
    if (!recording?.hasVideo) return

    const checkVideoReady = async () => {
      try {
        const response = await fetch(`http://localhost:3001/convert-status/${username}/${streamId}`)
        const data = await response.json()

        if (data.status === 'completed') {
          setVideoReady(true)
          setIsConverting(false)
          setConvertProgress(100)
        } else if (data.status === 'converting') {
          setIsConverting(true)
          setConvertProgress(data.progress || 0)
          setVideoReady(false)
        } else if (data.status === 'timeout') {
          setIsConverting(false)
          setVideoReady(false)
          setConvertError('Dönüştürme 60 saniyede tamamlanamadı ve iptal edildi.')
        } else if (data.status === 'failed') {
          setIsConverting(false)
          setVideoReady(false)
          setConvertError('Dönüştürme başarısız oldu.')
        } else {
          setVideoReady(false)
        }
      } catch (err) {
        console.error('Video kontrolü hatası:', err)
      }
    }

    checkVideoReady()

    // Converting sırasında veya video hazır değilse polling yap
    const interval = setInterval(() => {
      if (isConverting || !videoReady) {
        checkVideoReady()
      }
    }, 2000) // 2 saniye

    return () => clearInterval(interval)
  }, [recording, username, streamId, videoReady, isConverting])

  // Manuel convert fonksiyonu
  const startConversion = async () => {
    try {
      setIsConverting(true)
      setConvertProgress(0)
      setConvertError('')

      const response = await fetch(`http://localhost:3001/convert-to-mp4/${username}/${streamId}`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!data.success) {
        setIsConverting(false)
        setConvertError(data.message || 'Dönüştürme başlatılamadı')
      }

      // 60 saniye timeout - frontend tarafında
      setTimeout(() => {
        if (isConverting && !videoReady) {
          setIsConverting(false)
          setConvertError('Dönüştürme 60 saniyede tamamlanamadı.')
        }
      }, 60000)

    } catch (err) {
      console.error('Convert hatası:', err)
      setIsConverting(false)
      setConvertError('Dönüştürme başlatılırken hata oluştu')
    }
  }

  const fetchRecording = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:3001/get-recording/${username}/${streamId}`)
      const data = await response.json()

      if (data.recording) {
        setRecording(data.recording)
      } else {
        setError('Kayıt bulunamadı')
      }
    } catch (err) {
      console.error('Kayıt yüklenemedi:', err)
      setError('Kayıt yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('tr-TR')
  }

  const getEventsByType = (type: string) => {
    if (!recording?.events) return []
    return recording.events.filter((e: any) => e.type === type)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-2">❌ Hata</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => window.location.href = '/kayitlar'}
            className="mt-6 px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400"
          >
            Kayıtlara Dön
          </button>
        </div>
      </div>
    )
  }

  const chatEvents = getEventsByType('chat')
  const giftEvents = getEventsByType('gift')
  const memberEvents = getEventsByType('member')
  const likeEvents = getEventsByType('like')
  const stats = recording.finalStats || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = '/kayitlar'}
            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kayıtlara Dön</span>
          </button>

          <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              {recording.info?.profile?.profilePicture && (
                <img
                  src={recording.info.profile.profilePicture}
                  alt={username}
                  className="w-20 h-20 rounded-full border-4 border-yellow-500/30"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/80'
                  }}
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-yellow-400 mb-1">
                  {recording.info?.profile?.nickname || username}
                </h1>
                <p className="text-gray-400 mb-2">@{username}</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(recording.info?.startTime)}</span>
                  </div>
                  {recording.hasVideo && (
                    <div className="flex items-center gap-1 text-red-400">
                      <Video className="w-4 h-4" />
                      <span>Video Mevcut</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.totalDiamonds?.toLocaleString() || 0}💎</div>
                <div className="text-xs text-gray-400 mt-1">Elmas</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-pink-400">{stats.totalGifts?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Hediye</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.totalMessages?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Mesaj</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.totalLikes?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Beğeni</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.totalFollows?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-400 mt-1">Takip</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'stats', label: '📊 İstatistikler', icon: Users, show: true },
            { id: 'chat', label: `💬 Chat (${chatEvents.length})`, icon: MessageSquare, show: true },
            { id: 'gifts', label: `🎁 Hediyeler (${giftEvents.length})`, icon: Gift, show: true },
            { id: 'members', label: `👥 Girenler (${memberEvents.length})`, icon: Users, show: true },
            { id: 'likes', label: `❤️ Beğeniler (${likeEvents.length})`, icon: Heart, show: true },
            { id: 'video', label: '📹 Video', icon: Video, show: recording.hasVideo },
            { id: 'events', label: '📋 Eventler', icon: Calendar, show: true }
          ]
            .filter(tab => tab.show)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Content */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-6">
          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">📊 Detaylı İstatistikler</h2>

              {/* Top Gifters */}
              {stats.topGifters && stats.topGifters.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-300 mb-3">🏆 En Çok Hediye Göndere nler</h3>
                  <div className="grid gap-3">
                    {stats.topGifters.slice(0, 10).map((gifter: any, index: number) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</div>
                          <div>
                            <div className="font-bold text-white">{gifter.username}</div>
                            <div className="text-sm text-gray-400">{gifter.giftCount} hediye</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-yellow-400">{gifter.totalDiamonds?.toLocaleString()}💎</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expensive Gifts */}
              {stats.expensiveGifts && stats.expensiveGifts.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-300 mb-3">💰 Değerli Hediyeler</h3>
                  <div className="grid gap-3">
                    {stats.expensiveGifts.slice(0, 10).map((gift: any, index: number) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{gift.giftImage || '🎁'}</div>
                          <div>
                            <div className="font-bold text-white">{gift.giftName}</div>
                            <div className="text-sm text-gray-400">@{gift.username}</div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-yellow-400">{gift.diamondCount?.toLocaleString()}💎</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">💬 Chat Mesajları ({chatEvents.length})</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {chatEvents.slice(-100).reverse().map((event: any, index: number) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {event.data?.profilePicture && (
                        <img
                          src={event.data.profilePicture}
                          alt={event.data.username}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/40'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-yellow-400">{event.data?.nickname || event.data?.username}</span>
                          {event.data?.isModerator && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">MOD</span>}
                          {event.data?.isSubscriber && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">SUB</span>}
                        </div>
                        <p className="text-gray-300">{event.data?.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gifts Tab */}
          {activeTab === 'gifts' && (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">🎁 Hediyeler ({giftEvents.length})</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {giftEvents.slice(-100).reverse().map((event: any, index: number) => {
                  const diamondCount = event.data?.diamondCount || 0
                  const repeatCount = event.data?.repeatCount || 1
                  const totalDiamonds = diamondCount * repeatCount
                  const usdValue = (totalDiamonds * 0.005).toFixed(2)
                  const tryValue = (totalDiamonds * 0.005 * 34).toFixed(2)

                  return (
                    <div key={index} className="bg-gray-900 rounded-lg p-4 border-l-4 border-pink-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Gift Image/Icon */}
                          <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                            {event.data?.giftPictureUrl ? (
                              <img
                                src={event.data.giftPictureUrl}
                                alt={event.data?.giftName}
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling.style.display = 'block'
                                }}
                              />
                            ) : null}
                            <div className="text-4xl" style={{display: event.data?.giftPictureUrl ? 'none' : 'block'}}>
                              {event.data?.giftImage || '🎁'}
                            </div>
                          </div>

                          {/* Gift Info */}
                          <div className="flex-1">
                            <div className="font-bold text-white text-lg mb-1">{event.data?.giftName || 'Bilinmeyen Hediye'}</div>
                            <div className="flex items-center gap-2 mb-1">
                              <img
                                src={event.data?.profilePicture || 'https://via.placeholder.com/24'}
                                alt={event.data?.username}
                                className="w-6 h-6 rounded-full"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/24'
                                }}
                              />
                              <span className="text-sm text-gray-400">@{event.data?.username}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleTimeString('tr-TR')}
                            </div>
                          </div>
                        </div>

                        {/* Price Info */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-400 mb-1">
                            {totalDiamonds.toLocaleString()}💎
                          </div>
                          {repeatCount > 1 && (
                            <div className="text-sm bg-purple-600 text-white px-2 py-1 rounded-full inline-block mb-1">
                              x{repeatCount}
                            </div>
                          )}
                          <div className="text-sm text-green-400">${usdValue}</div>
                          <div className="text-xs text-gray-400">₺{tryValue}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Members Tab (Odaya Girenler) */}
          {activeTab === 'members' && (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">👥 Odaya Girenler ({memberEvents.length})</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {memberEvents.slice(-100).reverse().map((event: any, index: number) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Profile Picture */}
                        <img
                          src={event.data?.profilePicture || 'https://via.placeholder.com/48'}
                          alt={event.data?.username}
                          className="w-12 h-12 rounded-full border-2 border-blue-500"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/48'
                          }}
                        />

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="font-bold text-white text-lg">{event.data?.nickname || event.data?.username}</div>
                          <div className="text-sm text-gray-400">@{event.data?.username}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {event.data?.isModerator && (
                              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">MOD</span>
                            )}
                            {event.data?.isSubscriber && (
                              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">SUB</span>
                            )}
                            {event.data?.isFollower && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">TAKİPÇİ</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        {event.data?.followerCount && (
                          <div className="text-sm text-gray-400">
                            👥 {event.data.followerCount.toLocaleString()} takipçi
                          </div>
                        )}
                        {event.data?.userLevel && (
                          <div className="text-sm text-yellow-400">
                            Lvl {event.data.userLevel}
                          </div>
                        )}
                        {event.data?.trafficSource && (
                          <div className="text-xs text-gray-500 mt-1">
                            📍 {event.data.trafficSource}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleTimeString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Likes Tab */}
          {activeTab === 'likes' && (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">❤️ Beğeniler ({likeEvents.length})</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {likeEvents.slice(-100).reverse().map((event: any, index: number) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-3 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Profile Picture */}
                        <img
                          src={event.data?.profilePicture || 'https://via.placeholder.com/40'}
                          alt={event.data?.username}
                          className="w-10 h-10 rounded-full border-2 border-red-500"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/40'
                          }}
                        />

                        {/* User Info */}
                        <div>
                          <div className="font-bold text-white">{event.data?.nickname || event.data?.username}</div>
                          <div className="text-sm text-gray-400">@{event.data?.username}</div>
                        </div>
                      </div>

                      {/* Like Count */}
                      <div className="text-right">
                        <div className="text-3xl mb-1">❤️</div>
                        {event.data?.likeCount && (
                          <div className="text-lg font-bold text-red-400">
                            x{event.data.likeCount.toLocaleString()}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && recording.hasVideo && (
            <div className="relative">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">📹 Video Kaydı</h2>

              {/* Video Hazır - MP4 Player */}
              {videoReady ? (
                <>
                  <div className="bg-black rounded-xl overflow-hidden">
                    <video
                      controls
                      className="w-full max-h-[600px]"
                      preload="metadata"
                      style={{ objectFit: 'contain' }}
                    >
                      <source src={`http://localhost:3001/stream-video/${username}/${streamId}`} type="video/mp4" />
                      Tarayıcınız video oynatmayı desteklemiyor.
                    </video>
                  </div>
                  <div className="mt-4 bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white mb-1">🎬 Video Kaydı</h3>
                        <p className="text-sm text-gray-400">Yayın sırasında kaydedilen video - MP4 formatında</p>
                      </div>
                      <a
                        href={`http://localhost:3001/stream-video/${username}/${streamId}`}
                        download={`${username}_${streamId}_video.mp4`}
                        className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>İndir</span>
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                /* Video Hazır Değil - Manuel Convert */
                <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-2 border-orange-500 rounded-xl p-8 text-center">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-orange-400 mb-2">Video Henüz Hazır Değil</h3>
                  <p className="text-gray-300 mb-6">
                    Video kaydı <strong>TS formatında</strong>. Tarayıcıda izlemek için <strong>MP4 formatına</strong> çevrilmesi gerekiyor.
                  </p>

                  {convertError && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400">
                      {convertError}
                    </div>
                  )}

                  <button
                    onClick={startConversion}
                    disabled={isConverting}
                    className="px-8 py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors text-lg"
                  >
                    {isConverting ? 'Dönüştürülüyor...' : '🔄 MP4\'e Çevir'}
                  </button>

                  <p className="text-sm text-gray-500 mt-4">
                    ⚠️ Dönüştürme sırasında başka işlem yapamazsınız
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    (Maksimum 60 saniye)
                  </p>
                </div>
              )}

              {/* Fullscreen Blocking Overlay - Converting */}
              {isConverting && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="max-w-md w-full p-8">
                    <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 text-center border-2 border-blue-500 shadow-2xl">
                      <div className="text-7xl mb-6">
                        <div className="inline-block animate-spin">🔄</div>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-3">MP4'e Çevriliyor</h2>
                      <p className="text-blue-200 mb-6">Video dönüştürülüyor, lütfen bekleyin...</p>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden mb-4">
                        <div
                          className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-full transition-all duration-500 flex items-center justify-center text-white font-bold text-sm"
                          style={{ width: `${convertProgress}%` }}
                        >
                          {convertProgress > 0 && `%${convertProgress}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>

                      <p className="text-gray-400 text-sm">
                        ⚠️ Bu işlem sırasında başka işlem yapamazsınız
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        60 saniye içinde tamamlanmazsa otomatik iptal edilecektir
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">📋 Tüm Eventler ({recording.events?.length || 0})</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recording.events?.slice(-100).reverse().map((event: any, index: number) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-yellow-400">{event.type?.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString('tr-TR')}</span>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
