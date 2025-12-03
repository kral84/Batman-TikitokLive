'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, Users, Loader2, CheckCircle, XCircle, Clock, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface LandingPageProps {
  onConnect: (username: string) => void
}

interface RecentUser {
  username: string
  nickname: string
  profilePicture: string
  timestamp: number
}

export default function LandingPage({ onConnect }: LandingPageProps) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [error, setError] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])

  // LocalStorage'dan son kullanıcıları yükle
  useEffect(() => {
    const saved = localStorage.getItem('tiktok-recent-users')
    if (saved) {
      try {
        setRecentUsers(JSON.parse(saved))
      } catch (e) {
        console.error('Recent users yükleme hatası:', e)
      }
    }
  }, [])

  // Son kullanıcıları kaydet
  const saveRecentUser = (profile: any) => {
    const newUser: RecentUser = {
      username: profile.username,
      nickname: profile.nickname,
      profilePicture: profile.profilePicture,
      timestamp: Date.now()
    }

    // Mevcut listeyi güncelle
    const updated = [
      newUser,
      ...recentUsers.filter(u => u.username !== profile.username)
    ].slice(0, 5) // Son 5 kullanıcı

    setRecentUsers(updated)
    localStorage.setItem('tiktok-recent-users', JSON.stringify(updated))
  }

  // Son kullanıcıyı sil
  const removeRecentUser = (username: string) => {
    const updated = recentUsers.filter(u => u.username !== username)
    setRecentUsers(updated)
    localStorage.setItem('tiktok-recent-users', JSON.stringify(updated))
  }

  const checkUsername = async () => {
    if (!username.trim()) {
      setError('Lütfen bir kullanıcı adı girin')
      return
    }

    setIsChecking(true)
    setError('')
    setProfileData(null)

    try {
      // Backend'e kontrol isteği gönder
  const response = await fetch(`http://localhost:3001/check-user?username=${username}`)
      const data = await response.json()

      if (data.exists) {
        setProfileData(data.profile)
        
        // Profil var ama offline ise
        if (data.error === 'Yayında değil' || data.profile.stream?.status === 'offline') {
          setIsOffline(true)
          setError('Yayında değil')
        } else {
          setIsOffline(false)
          setError('')
        }
        
        saveRecentUser(data.profile) // 👈 Kaydet
      } else {
        setError(data.error || 'Kullanıcı bulunamadı')
        setIsOffline(data.isOffline || false)
      }
    } catch (err) {
      setError('Bağlantı hatası. Server çalışıyor mu?')
      console.error('Kontrol hatası:', err)
    } finally {
      setIsChecking(false)
    }
  }

  const goToDashboard = () => {
    // Parent component'e username'i gönder
    onConnect(username)
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(https://img-s1.onedio.com/id-620e3524530b0d05292eb0f9/rev-0/w-600/h-337/f-jpg/s-9f96996b57cc89cbf14c532e1d231156cb428d28.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background Music */}
      <audio
        autoPlay
        loop
        className="hidden"
        src="http://localhost:3001/sounds/maintema.mp4"
      />
      
      {/* Dark cinematic overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/75 to-black/90 backdrop-blur-[1px]"></div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-yellow-400 mb-4 tracking-wider" style={{textShadow: '0 0 20px rgba(251, 191, 36, 0.5)'}}>
            🦇 Gotham TikTok
          </h1>
          <p className="text-xl text-gray-300">
            The Dark Knight of Live Stream Monitoring
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-8 mb-6"
        >
          <div className="flex flex-col gap-4">
            <label className="text-lg font-semibold text-gray-300">
              Target Username
            </label>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  onKeyPress={(e) => e.key === 'Enter' && checkUsername()}
                  placeholder="Enter TikTok username..."
                  className="w-full px-6 py-4 text-lg bg-gray-900 border-2 border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg focus:border-yellow-500 focus:outline-none transition-all"
                  disabled={isChecking}
                />
                {username && (
                  <button
                    onClick={() => setUsername('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    ✕
                  </button>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={checkUsername}
                disabled={isChecking || !username}
                className={`px-8 py-4 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg ${
                  isChecking || !username
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-yellow-500/50'
                }`}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 px-4 py-3 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile URL Display */}
            <AnimatePresence>
              {profileData && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900 border border-gray-600 px-4 py-3 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-medium">📱 Profile URL:</span>
                      <span className="text-gray-300 font-mono text-sm">
                        {profileData.profileUrl || `https://www.tiktok.com/@${username}`}
                      </span>
                    </div>
                    <button
                      onClick={(event) => {
                        const url = profileData.profileUrl || `https://www.tiktok.com/@${username}`;
                        navigator.clipboard.writeText(url);
                        // Show a brief success message
                        const button = event.target as HTMLButtonElement;
                        const originalText = button.textContent;
                        button.textContent = '✅ Copied!';
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 2000);
                      }}
                      className="px-3 py-1 bg-yellow-500 text-gray-900 text-xs rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Yayında Değil - Profil Butonu */}
            <AnimatePresence>
              {isOffline && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-6 mt-4"
                >
                  <div className="text-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        try {
                          console.log('🔎 Profil çekiliyor...')
                          const response = await fetch(`http://localhost:3001/get-advanced-profile?username=${username}`)
                          const data = await response.json()
                          
                          if (data.exists && data.profile) {
                            const profileWindow = window.open('', '_blank', 'width=900,height=1200')

                            if (profileWindow) {
                              profileWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>${data.profile.nickname} - TikTok Profil Analizi</title>
                                  <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%); min-height: 100vh; padding: 20px; }
                                    .container { max-width: 900px; margin: 0 auto; background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 20px; padding: 35px; box-shadow: 0 20px 80px rgba(0,0,0,0.9), 0 0 40px rgba(255,215,0,0.1); border: 1px solid #2a2a2a; }
                                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 25px; border-bottom: 2px solid #2a2a2a; position: relative; background: linear-gradient(180deg, rgba(42,42,42,0.2) 0%, transparent 100%); padding-top: 20px; border-radius: 15px; }
                                    .live-badge { position: absolute; top: 15px; right: 15px; background: linear-gradient(135deg, #dc0000, #ff4500); color: white; padding: 10px 20px; border-radius: 25px; font-size: 13px; font-weight: bold; animation: pulse 2s infinite; box-shadow: 0 4px 20px rgba(220,0,0,0.4); }
                                    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.02); } }
                                    .avatar-container { position: relative; width: 130px; height: 130px; margin: 0 auto 20px; }
                                    .avatar { width: 130px; height: 130px; border-radius: 50%; border: 5px solid #FFD700; box-shadow: 0 8px 30px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.2); object-fit: cover; }
                                    .avatar-placeholder { position: absolute; inset: 0; width: 130px; height: 130px; border-radius: 50%; background: #333; border: 5px solid #FFD700; display: flex; align-items: center; justify-content: center; color: #FFD700; font-size: 48px; font-weight: bold; box-shadow: 0 8px 30px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.2); }
                                    .username { font-size: 32px; font-weight: 900; color: #FFD700; margin-bottom: 8px; text-shadow: 0 2px 10px rgba(255,215,0,0.3); letter-spacing: 0.5px; }
                                    .userid { color: #888; font-size: 15px; font-weight: 500; }
                                    .verified { color: #FFD700; filter: drop-shadow(0 0 8px rgba(255,215,0,0.6)); }
                                    .bio { margin: 25px 0; padding: 18px; background: linear-gradient(135deg, #1f1f1f 0%, #151515 100%); border-radius: 12px; color: #ccc; font-size: 14px; line-height: 1.7; border: 1px solid #2a2a2a; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3); }
                                    .section-title { font-size: 20px; font-weight: 900; color: #FFD700; margin: 35px 0 20px; padding-bottom: 12px; border-bottom: 3px solid #FFD700; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(255,215,0,0.3); }
                                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 25px 0; }
                                    .stat { background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); color: white; padding: 25px; border-radius: 15px; text-align: center; border: 1px solid #3a3a3a; box-shadow: 0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,215,0,0.1); transition: all 0.3s ease; }
                                    .stat:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255,215,0,0.2), inset 0 1px 0 rgba(255,215,0,0.2); border-color: #FFD700; }
                                    .stat-value { font-size: 32px; font-weight: 900; color: #FFD700; text-shadow: 0 2px 10px rgba(255,215,0,0.3); }
                                    .stat-label { font-size: 13px; opacity: 0.8; margin-top: 8px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                                    .meta { background: linear-gradient(135deg, #1f1f1f 0%, #151515 100%); padding: 20px; border-radius: 12px; margin-top: 15px; border: 1px solid #2a2a2a; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3); }
                                    .meta-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px; }
                                    .meta-item:last-child { border-bottom: none; }
                                    .meta-label { color: #888; font-weight: 600; }
                                    .meta-value { color: #FFD700; font-weight: 700; text-shadow: 0 1px 4px rgba(255,215,0,0.2); }
                                    .privacy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
                                    .privacy-item { background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); padding: 16px; border-radius: 10px; border-left: 4px solid #FFD700; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: all 0.3s ease; }
                                    .privacy-item:hover { transform: translateX(3px); box-shadow: 0 6px 20px rgba(255,215,0,0.15); }
                                    .privacy-label { font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                                    .privacy-value { font-size: 15px; color: #FFD700; font-weight: 700; }
                                    .badge { display: inline-block; padding: 6px 14px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #0a0a0a; border-radius: 15px; font-size: 11px; font-weight: 900; margin-left: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(255,215,0,0.4); }
                                    .commerce-badge { background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%); }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <div class="header">
                                      ${data.profile.liveStatus?.isLive ? '<div class="live-badge">🔴 CANLI YAYINDA</div>' : ''}
                                      <div class="avatar-container">
                                        <img src="${data.profile.avatarLarger || data.profile.avatarThumb || ''}" alt="${data.profile.nickname}" class="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <div class="avatar-placeholder" style="display: ${data.profile.avatarLarger || data.profile.avatarThumb ? 'none' : 'flex'}">${(data.profile.nickname || data.profile.username || '?').charAt(0).toUpperCase()}</div>
                                      </div>
                                      <div class="username">
                                        ${data.profile.nickname}
                                        ${data.profile.verified ? '<span class="verified">✓</span>' : ''}
                                        ${data.profile.commerce?.isCommerceUser ? '<span class="badge commerce-badge">💼 İşletme</span>' : ''}
                                        ${data.profile.commerce?.isTTSeller ? '<span class="badge commerce-badge">🛍️ Satıcı</span>' : ''}
                                      </div>
                                      <div class="userid">@${data.profile.username}</div>
                                      <div class="userid" style="margin-top: 8px; color: #999;">🆔 ${data.profile.userId}</div>
                                    </div>

                                    ${data.profile.signature ? `<div class="bio">📝 ${data.profile.signature}</div>` : ''}

                                    <!-- İstatistikler -->
                                    <div class="section-title">📈 Sosyal İstatistikler</div>
                                    <div class="stats">
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.followerCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">👥 Takipçi</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.followingCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">💖 Takip Edilen</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.heartCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">❤️ Toplam Kalp</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.videoCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">🎬 Video Sayısı</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.friendCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">🤝 Karşılıklı Arkadaş</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${(data.profile.stats.diggCount || 0).toLocaleString()}</div>
                                        <div class="stat-label">👍 Beğendiği Video</div>
                                      </div>
                                    </div>

                                    <!-- Tarihçe Bilgileri -->
                                    <div class="section-title">📅 Tarihçe ve Hesap Bilgileri</div>
                                    <div class="meta">
                                      <div class="meta-item">
                                        <span class="meta-label">🎂 Hesap Oluşturulma:</span>
                                        <span class="meta-value">${data.profile.createTimeFormatted || 'Bilinmiyor'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">✏️ Son İsim Değişikliği:</span>
                                        <span class="meta-value">${data.profile.nickNameModifyTimeFormatted || 'Bilinmiyor'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">🔒 Hesap Türü:</span>
                                        <span class="meta-value">${data.profile.privateAccount ? '🔐 Özel Hesap' : '🔓 Herkese Açık'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">🎥 CANLI Durum:</span>
                                        <span class="meta-value">${data.profile.liveStatus?.isLive ? `🔴 Şu an CANLI (Oda: ${data.profile.liveStatus.roomId})` : '⚪ Çevrimdışı'}</span>
                                      </div>
                                    </div>

                                    <!-- Gizlilik Ayarları -->
                                    <div class="section-title">🔒 Gizlilik ve İçerik Ayarları</div>
                                    <div class="privacy-grid">
                                      <div class="privacy-item">
                                        <div class="privacy-label">💬 Yorum Ayarı</div>
                                        <div class="privacy-value">${data.profile.privacy?.commentSettingFormatted || 'Bilinmiyor'}</div>
                                      </div>
                                      <div class="privacy-item">
                                        <div class="privacy-label">🎭 Düet Ayarı</div>
                                        <div class="privacy-value">${data.profile.privacy?.duetSettingFormatted || 'Bilinmiyor'}</div>
                                      </div>
                                      <div class="privacy-item">
                                        <div class="privacy-label">✂️ Stitch Ayarı</div>
                                        <div class="privacy-value">${data.profile.privacy?.stitchSettingFormatted || 'Bilinmiyor'}</div>
                                      </div>
                                      <div class="privacy-item">
                                        <div class="privacy-label">⬇️ İndirme İzni</div>
                                        <div class="privacy-value">${data.profile.privacy?.downloadSettingFormatted || 'Bilinmiyor'}</div>
                                      </div>
                                      <div class="privacy-item">
                                        <div class="privacy-label">👀 Takip Listesi Gizliliği</div>
                                        <div class="privacy-value">${data.profile.privacy?.followingVisibilityFormatted || 'Bilinmiyor'}</div>
                                      </div>
                                    </div>

                                    <!-- Teknik ve Coğrafi Bilgiler -->
                                    <div class="section-title">🌍 Coğrafi ve Teknik Bilgiler</div>
                                    <div class="meta">
                                      <div class="meta-item">
                                        <span class="meta-label">📍 Bölge:</span>
                                        <span class="meta-value">${data.profile.geo?.city || 'Bilinmiyor'} / ${data.profile.geo?.subdivisions || 'Bilinmiyor'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">🌐 Dil:</span>
                                        <span class="meta-value">${data.profile.technical?.language || 'Bilinmiyor'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">🔐 Güvenli ID:</span>
                                        <span class="meta-value" style="font-size: 11px;">${data.profile.secUid || 'Bilinmiyor'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span class="meta-label">📸 Profil Fotoğrafı:</span>
                                        <span class="meta-value"><a href="${data.profile.avatarLarger || '#'}" target="_blank" style="color: #FFD700;">Büyük Boyut</a></span>
                                      </div>
                                    </div>

                                    <!-- Metadata -->
                                    <div class="meta" style="margin-top: 30px; font-size: 12px; color: #999;">
                                      <div class="meta-item">
                                        <span>📅 Veri Çekilme Zamanı:</span>
                                        <span>${new Date(data.profile._metadata.fetchedAt).toLocaleString('tr-TR')}</span>
                                      </div>
                                      <div class="meta-item">
                                        <span>🔧 Kaynak:</span>
                                        <span>${data.profile._metadata.source}</span>
                                      </div>
                                    </div>
                                  </div>
                                </body>
                                </html>
                              `)
                              profileWindow.document.close()
                            }
                          }
                        } catch (error) {
                          console.error('Profil yükleme hatası:', error)
                          alert('Profil yüklenirken bir hata oluştu')
                        }
                      }}
                      className="px-8 py-4 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/50 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Users className="w-5 h-5" />
                      <span>View Profile</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Son Aramalar */}
        {recentUsers.length > 0 && !profileData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-400">Recent Searches</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {recentUsers.map((user) => (
                <motion.button
                  key={user.username}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setUsername(user.username)
                    checkUsername()
                  }}
                  className="relative bg-gray-900 border border-gray-700 rounded-xl p-3 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20 transition-all group"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecentUser(user.username)
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full border-2 border-gray-700 overflow-hidden bg-gray-700 flex items-center justify-center">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.nickname}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm"
                        style={{ display: user.profilePicture ? 'none' : 'flex' }}
                      >
                        {user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                      </div>
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="font-semibold text-gray-200 text-sm truncate">
                        {user.nickname}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Profile Card */}
        <AnimatePresence>
          {profileData && !isOffline && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-start gap-6 mb-6">
                {/* Profile Picture */}
                <div className="relative w-24 h-24 rounded-full border-4 border-yellow-500/30 overflow-hidden bg-gray-700 flex items-center justify-center">
                  {profileData.profilePicture ? (
                    <img
                      src={profileData.profilePicture}
                      alt={profileData.nickname || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl"
                    style={{ display: profileData.profilePicture ? 'none' : 'flex' }}
                  >
                    {profileData.nickname ? profileData.nickname.charAt(0).toUpperCase() : profileData.username ? profileData.username.charAt(0).toUpperCase() : '?'}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-yellow-400">
                      {profileData.nickname}
                    </h2>
                    {profileData.verified && (
                      <CheckCircle className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <p className="text-gray-400 mb-3">@{profileData.username}</p>
                  {profileData.bio && (
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {profileData.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {profileData.stats.followers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">👥 Followers</div>
                </div>
                <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {profileData.stats.following.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">➕ Following</div>
                </div>
              </div>

              {/* Stream Status */}
              <div className={`p-6 rounded-lg mb-6 border-2 ${
                profileData.stream.status === 'live'
                  ? 'bg-red-900/30 border-red-500'
                  : 'bg-gray-900 border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profileData.stream.status === 'live' ? (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <div className="text-white">
                          <div className="font-bold text-lg">🔴 LIVE NOW</div>
                          <div className="text-sm opacity-90">
                            {profileData.stream.title}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-gray-300">
                          <div className="font-bold text-lg">📴 Offline</div>
                          <div className="text-sm opacity-90">
                            Not currently streaming
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {profileData.stream.status === 'live' && (
                    <div className="text-white text-right">
                      <div className="text-2xl font-bold">
                        {profileData.stream.totalViewers}
                      </div>
                      <div className="text-sm opacity-90">👁️ Viewers</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {profileData.stream.status === 'live' ? (
                  <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToDashboard}
                      className="flex-1 py-4 rounded-lg font-bold text-gray-900 flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/50"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Analyze Stream</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        // Advanced scraper ile detaylı profil çek
                        try {
                          console.log('🔎 Advanced profil çekiliyor...')
                          const response = await fetch(`http://localhost:3001/get-advanced-profile?username=${username}`)
                          const data = await response.json()
                          
                          if (data.exists && data.profile) {
                            // Detaylı profili yeni pencerede göster
                            const profileWindow = window.open('', '_blank', 'width=800,height=1000')
                            
                            if (profileWindow) {
                              profileWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>${data.profile.nickname} - Detaylı Profil</title>
                                  <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
                                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
                                    .avatar-container { position: relative; width: 120px; height: 120px; margin: 0 auto 15px; }
                                    .avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid #667eea; object-fit: cover; }
                                    .avatar-placeholder { position: absolute; inset: 0; width: 120px; height: 120px; border-radius: 50%; background: #e0e0e0; border: 4px solid #667eea; display: flex; align-items: center; justify-content: center; color: #667eea; font-size: 40px; font-weight: bold; }
                                    .username { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
                                    .userid { color: #666; font-size: 14px; }
                                    .verified { color: #1DA1F2; }
                                    .bio { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px; color: #555; font-size: 14px; line-height: 1.6; }
                                    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
                                    .stat { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; text-align: center; }
                                    .stat-value { font-size: 28px; font-weight: bold; }
                                    .stat-label { font-size: 12px; opacity: 0.9; margin-top: 5px; }
                                    .meta { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; }
                                    .meta-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
                                    .meta-item:last-child { border-bottom: none; }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <div class="header">
                                      <div class="avatar-container">
                                        <img src="${data.profile.avatarThumb || ''}" alt="${data.profile.nickname}" class="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <div class="avatar-placeholder" style="display: ${data.profile.avatarThumb ? 'none' : 'flex'}">${(data.profile.nickname || data.profile.username || '?').charAt(0).toUpperCase()}</div>
                                      </div>
                                      <div class="username">${data.profile.nickname} ${data.profile.verified ? '<span class="verified">✓</span>' : ''}</div>
                                      <div class="userid">@${data.profile.username}</div>
                                    </div>
                                    ${data.profile.signature ? `<div class="bio">${data.profile.signature}</div>` : ''}
                                    <div class="stats">
                                      <div class="stat">
                                        <div class="stat-value">${data.profile.stats.followerCount.toLocaleString()}</div>
                                        <div class="stat-label">👥 Takipçi</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${data.profile.stats.followingCount.toLocaleString()}</div>
                                        <div class="stat-label">💖 Takip</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${data.profile.stats.heartCount.toLocaleString()}</div>
                                        <div class="stat-label">❤️ Toplam Kalp</div>
                                      </div>
                                      <div class="stat">
                                        <div class="stat-value">${data.profile.stats.videoCount.toLocaleString()}</div>
                                        <div class="stat-label">🎬 Video</div>
                                      </div>
                                    </div>
                                    <div class="meta">
                                      <div class="meta-item">
                                        <strong>🆔 User ID:</strong>
                                        <span>${data.profile.userId}</span>
                                      </div>
                                      <div class="meta-item">
                                        <strong>🔒 Gizli Hesap:</strong>
                                        <span>${data.profile.privateAccount ? 'Evet' : 'Hayır'}</span>
                                      </div>
                                      <div class="meta-item">
                                        <strong>📅 Çekilme:</strong>
                                        <span>${new Date(data.profile._metadata.fetchedAt).toLocaleString('tr-TR')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </body>
                                </html>
                              `)
                              profileWindow.document.close()
                            }
                          }
                        } catch (error) {
                          console.error('Profil yükleme hatası:', error)
                          alert('Profil yüklenirken bir hata oluştu')
                        }
                  }}
                  className="px-8 py-4 rounded-lg font-bold bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600 hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span>Profile</span>
                </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      // Advanced scraper ile detaylı profil çek
                      try {
                        console.log('🔎 Advanced profil çekiliyor...')
                        const response = await fetch(`http://localhost:3001/get-advanced-profile?username=${username}`)
                        const data = await response.json()
                        
                        if (data.exists && data.profile) {
                          // Detaylı profili yeni pencerede göster
                          const profileWindow = window.open('', '_blank', 'width=800,height=1000')
                          
                          if (profileWindow) {
                            profileWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>${data.profile.nickname} - Detaylı Profil</title>
                                <style>
                                  * { margin: 0; padding: 0; box-sizing: border-box; }
                                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                                  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
                                  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
                                  .avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 15px; border: 4px solid #667eea; }
                                  .username { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
                                  .userid { color: #666; font-size: 14px; }
                                  .verified { color: #1DA1F2; }
                                  .bio { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px; color: #555; font-size: 14px; line-height: 1.6; }
                                  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
                                  .stat { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; text-align: center; }
                                  .stat-value { font-size: 28px; font-weight: bold; }
                                  .stat-label { font-size: 12px; opacity: 0.9; margin-top: 5px; }
                                  .meta { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; }
                                  .meta-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
                                  .meta-item:last-child { border-bottom: none; }
                                </style>
                              </head>
                              <body>
                                <div class="container">
                                  <div class="header">
                                    <div class="avatar-container">
                                      <img src="${data.profile.avatarThumb || ''}" alt="${data.profile.nickname}" class="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                      <div class="avatar-placeholder" style="display: ${data.profile.avatarThumb ? 'none' : 'flex'}">${(data.profile.nickname || data.profile.username || '?').charAt(0).toUpperCase()}</div>
                                    </div>
                                    <div class="username">${data.profile.nickname} ${data.profile.verified ? '<span class="verified">✓</span>' : ''}</div>
                                    <div class="userid">@${data.profile.username}</div>
                                  </div>
                                  ${data.profile.signature ? `<div class="bio">${data.profile.signature}</div>` : ''}
                                  <div class="stats">
                                    <div class="stat">
                                      <div class="stat-value">${data.profile.stats.followerCount.toLocaleString()}</div>
                                      <div class="stat-label">👥 Takipçi</div>
                                    </div>
                                    <div class="stat">
                                      <div class="stat-value">${data.profile.stats.followingCount.toLocaleString()}</div>
                                      <div class="stat-label">💖 Takip</div>
                                    </div>
                                    <div class="stat">
                                      <div class="stat-value">${data.profile.stats.heartCount.toLocaleString()}</div>
                                      <div class="stat-label">❤️ Toplam Kalp</div>
                                    </div>
                                    <div class="stat">
                                      <div class="stat-value">${data.profile.stats.videoCount.toLocaleString()}</div>
                                      <div class="stat-label">🎬 Video</div>
                                    </div>
                                  </div>
                                  <div class="meta">
                                    <div class="meta-item">
                                      <strong>🆔 User ID:</strong>
                                      <span>${data.profile.userId}</span>
                                    </div>
                                    <div class="meta-item">
                                      <strong>🔒 Gizli Hesap:</strong>
                                      <span>${data.profile.privateAccount ? 'Evet' : 'Hayır'}</span>
                                    </div>
                                    <div class="meta-item">
                                      <strong>📅 Çekilme:</strong>
                                      <span>${new Date(data.profile._metadata.fetchedAt).toLocaleString('tr-TR')}</span>
                                    </div>
                                  </div>
                                </div>
                              </body>
                              </html>
                            `)
                            profileWindow.document.close()
                          }
                        }
                      } catch (error) {
                        console.error('Profil yükleme hatası:', error)
                        alert('Profil yüklenirken bir hata oluştu')
                      }
                    }}
                    className="flex-1 py-4 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    <span>View Profile</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features */}
        {!profileData && !isChecking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
          >
            <motion.button
              onClick={() => window.location.href = '/kayitlar'}
              className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 p-6 rounded-xl text-gray-200 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <div className="text-3xl mb-3">📦</div>
              <h3 className="font-bold mb-2 text-yellow-400">Kayıtlar</h3>
              <p className="text-sm opacity-80">
                Kaydedilmiş yayınları görüntüle
              </p>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/batman-watchman')}
              className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 p-6 rounded-xl text-gray-200 hover:border-yellow-500/50 transition-all cursor-pointer"
            >
              <div className="text-3xl mb-3">🦇</div>
              <h3 className="font-bold mb-2 text-yellow-400">Batman WatchMan</h3>
              <p className="text-sm opacity-80">
                Advanced video scraping & profile analysis
              </p>
            </motion.button>
            <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 p-6 rounded-xl text-gray-200 hover:border-yellow-500/50 transition-all">
              <div className="text-3xl mb-3">👤</div>
              <h3 className="font-bold mb-2 text-yellow-400">Profile Intel</h3>
              <p className="text-sm opacity-80">
                Detailed streamer profile and statistics
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}