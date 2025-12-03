'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Video, Download, Loader2, AlertCircle, CheckCircle, Play, MessageCircle, Folder, Clock, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import BatmanFightAnimation from '@/components/BatmanFightAnimation'

interface RecentSearch {
  username: string
  nickname: string
  avatar: string
  userId?: string // Profil resmi dosya adı için
  timestamp: number
}

interface ScrapedUser {
  username: string
  userId?: string
  nickname?: string
  avatar?: string
  profilePicture?: string // Backend'den gelen profil resmi yolu
  userFolderPath?: string
  folderPath?: string // Geriye dönük uyumluluk için
  videoCount: number
  timestamp: number
  latestTimestamp?: number
  oldestTimestamp?: number
}

interface VideoData {
  id: string
  folderPath: string
  metadata: any
  comments: any[]
  videoUrl: string
  thumbnail: string
  media?: Array<{
    type: 'video' | 'image'
    url: string
    filename: string
  }>
  mediaCount?: number
}

export default function BatmanWatchMan() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [profileData, setProfileData] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isScrapingVideos, setIsScrapingVideos] = useState(false)
  const [videoCount, setVideoCount] = useState<number | 'all'>('all')
  const [skipComments, setSkipComments] = useState(false)
  const [error, setError] = useState('')
  const [scrapingProgress, setScrapingProgress] = useState(0)
  const [scrapedVideos, setScrapedVideos] = useState(0)
  const [scrapingMessage, setScrapingMessage] = useState('')
  const [totalVideos, setTotalVideos] = useState(0)
  const [progressIntervalRef, setProgressIntervalRef] = useState<NodeJS.Timeout | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [scrapedUsers, setScrapedUsers] = useState<ScrapedUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ScrapedUser | null>(null)
  const [userVideos, setUserVideos] = useState<VideoData[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'search' | 'archive'>('search')
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())
  const [failedBackendAvatars, setFailedBackendAvatars] = useState<Set<string>>(new Set()) // Backend URL'leri için ayrı failed listesi
  const [userAvatars, setUserAvatars] = useState<Map<string, string>>(new Map())
  const [loadingAvatars, setLoadingAvatars] = useState<Set<string>>(new Set())
  const fetchingRef = useRef<Set<string>>(new Set())

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('batman-recent-searches')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Eski verilerde avatar olmayabilir veya geçersiz olabilir, temizle
        const cleaned = parsed.map((search: RecentSearch) => {
          const avatar = search.avatar || ''
          // Avatar URL'sinin geçerli olup olmadığını kontrol et
          const isValidAvatar = avatar && 
                               avatar.trim() !== '' && 
                               (avatar.startsWith('http://') || avatar.startsWith('https://'))
          
          return {
            ...search,
            avatar: isValidAvatar ? avatar : '' // Geçersizse boş string
          }
        })
        setRecentSearches(cleaned)
        // Temizlenmiş veriyi tekrar kaydet
        localStorage.setItem('batman-recent-searches', JSON.stringify(cleaned))
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
    }
  }, [])

  // Load scraped users
  useEffect(() => {
    loadScrapedUsers()
  }, [])

  // Scraped users yüklendiğinde avatar'ları çek
  useEffect(() => {
    scrapedUsers.forEach((user) => {
      if (user.username && !user.avatar) {
        // Username'deki boşlukları temizle
        const cleanUsername = user.username.trim().replace(/\s+/g, '');
        
        // Geçerli username kontrolü
        if (!cleanUsername) {
          console.warn(`⚠️ Geçersiz username atlandı: "${user.username}"`);
          return;
        }
        
        // State'leri callback içinde kontrol et
        setUserAvatars(prevAvatars => {
          setFailedAvatars(prevFailed => {
            if (!prevAvatars.has(cleanUsername) && !prevFailed.has(cleanUsername) && !fetchingRef.current.has(cleanUsername)) {
              fetchUserAvatar(cleanUsername)
            }
            return prevFailed
          })
          return prevAvatars
        })
      }
    })
  }, [scrapedUsers])

  const loadScrapedUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/scraped-users')
      const data = await response.json()
      if (data.success) {
        setScrapedUsers(data.users)
      }
    } catch (err) {
      console.error('Failed to load scraped users:', err)
    }
  }

  const fetchUserAvatar = async (username: string) => {
    // Username'deki boşlukları temizle ve trim yap
    const cleanUsername = username.trim().replace(/\s+/g, '')
    if (!cleanUsername) {
      console.warn(`⚠️ Geçersiz username atlandı: "${username}"`)
      return
    }
    
    // Eğer zaten fetch ediliyorsa veya yüklenmişse atla
    if (fetchingRef.current.has(cleanUsername) || userAvatars.has(cleanUsername) || failedAvatars.has(cleanUsername)) {
      return
    }
    
    // Fetch işlemini başlat
    fetchingRef.current.add(cleanUsername)
    setLoadingAvatars(prev => new Set(prev).add(cleanUsername))
    
    try {
      // Username'i URL encode et
      const encodedUsername = encodeURIComponent(cleanUsername)
      const response = await fetch(`http://localhost:3001/get-advanced-profile?username=${encodedUsername}`)
      
      // Response status kontrolü
      if (!response.ok) {
        // 500 veya diğer hatalar için failed listesine ekle (sessizce)
        if (response.status >= 500) {
          // Sadece debug için log, kullanıcıya gösterme
          console.warn(`⚠️ Server error (${response.status}) for username: ${cleanUsername} - Avatar yüklenemedi`)
        } else {
          console.warn(`⚠️ Client error (${response.status}) for username: ${cleanUsername} - Avatar yüklenemedi`)
        }
        setFailedAvatars(prev => new Set(prev).add(cleanUsername))
        return
      }
      
      const data = await response.json()
      
      if (data.exists && data.profile) {
        const avatar = data.profile.avatarLarger || 
                      data.profile.avatarMedium || 
                      data.profile.avatarThumb || 
                      data.profile.avatarLarge || 
                      data.profile.profilePicture || 
                      ''
        
        if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://'))) {
          setUserAvatars(prev => {
            const newMap = new Map(prev)
            newMap.set(cleanUsername, avatar)
            return newMap
          })
        } else {
          setFailedAvatars(prev => new Set(prev).add(cleanUsername))
        }
      } else {
        setFailedAvatars(prev => new Set(prev).add(cleanUsername))
      }
    } catch (err) {
      console.error(`Failed to fetch avatar for ${cleanUsername}:`, err)
      setFailedAvatars(prev => new Set(prev).add(cleanUsername))
    } finally {
      fetchingRef.current.delete(cleanUsername)
      setLoadingAvatars(prev => {
        const newSet = new Set(prev)
        newSet.delete(cleanUsername)
        return newSet
      })
    }
  }

  const saveRecentSearch = (profile: any) => {
    // Avatar için tüm olası field'ları kontrol et
    const avatar = profile.avatarLarger || 
                   profile.avatarMedium || 
                   profile.avatarThumb || 
                   profile.avatarLarge || 
                   profile.profilePicture || 
                   profile.avatar || 
                   '' // Fallback: boş string

    // Avatar URL'sinin geçerli olup olmadığını kontrol et
    const isValidAvatar = avatar && 
                         avatar.trim() !== '' && 
                         (avatar.startsWith('http://') || avatar.startsWith('https://'))

    const newSearch: RecentSearch = {
      username: profile.username,
      nickname: profile.nickname,
      avatar: isValidAvatar ? avatar : '', // Geçersizse boş string
      userId: profile.userId || profile.id || undefined, // Profil resmi dosya adı için
      timestamp: Date.now()
    }

    const updated = [newSearch, ...recentSearches.filter(s => s.username !== profile.username)]
      .slice(0, 10)

    setRecentSearches(updated)
    localStorage.setItem('batman-recent-searches', JSON.stringify(updated))
  }

  const searchProfile = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setIsLoadingProfile(true)
    setError('')
    setProfileData(null)

    try {
      const response = await fetch(`http://localhost:3001/get-advanced-profile?username=${username}`)
      const data = await response.json()

      if (data.exists && data.profile) {
        setProfileData(data.profile)
        saveRecentSearch(data.profile)
      } else {
        setError('Profile not found')
      }
    } catch (err) {
      setError('Failed to fetch profile')
      console.error(err)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const startVideoScraping = async () => {
    if (!profileData) return

    setIsScrapingVideos(true)
    setError('')
    setScrapingProgress(0)
    setScrapedVideos(0)

    try {
      const response = await fetch('http://localhost:3001/scrape-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileData.username,
          secUid: profileData.secUid,
          count: videoCount,
          nickname: profileData.nickname,
          userId: profileData.userId,
          skipComments: skipComments
        })
      })

      const data = await response.json()

      if (data.success) {
        // Polling ile ilerleme bilgisini çek
        const progressInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`http://localhost:3001/scrape-progress/${encodeURIComponent(profileData.username)}`)
            const progressData = await progressResponse.json()
            
            if (progressData.status === 'scraping') {
              setScrapingProgress(progressData.progress || 0)
              setScrapedVideos(progressData.scrapedVideos || 0)
              setTotalVideos(progressData.totalVideos || 0)
              setScrapingMessage(progressData.message || 'İşleniyor...')
            } else if (progressData.status === 'cancelled') {
              setScrapingMessage('❌ İptal edildi')
              clearInterval(progressInterval)
              setProgressIntervalRef(null)
              setTimeout(() => {
                setIsScrapingVideos(false)
                setScrapingProgress(0)
                setScrapedVideos(0)
                setScrapingMessage('')
                setTotalVideos(0)
              }, 2000)
            } else if (progressData.status === 'completed') {
              setScrapingProgress(100)
              setScrapedVideos(progressData.scrapedVideos || 0)
              setTotalVideos(progressData.totalVideos || 0)
              setScrapingMessage(progressData.message || 'Tamamlandı!')
              clearInterval(progressInterval)
              setTimeout(() => {
                setIsScrapingVideos(false)
                loadScrapedUsers() // Refresh list
                setActiveTab('archive') // Switch to archive tab
              }, 2000)
            } else if (progressData.status === 'error') {
              setError(progressData.error || 'Scraping failed')
              setIsScrapingVideos(false)
              clearInterval(progressInterval)
            } else if (progressData.status === 'not_found') {
              // Scraping tamamlandı ama progress silinmiş
              clearInterval(progressInterval)
              setIsScrapingVideos(false)
              loadScrapedUsers()
              setActiveTab('archive')
            }
          } catch (err) {
            console.error('Progress check error:', err)
          }
        }, 1000) // Her 1 saniyede bir kontrol et
        
        // Interval'ı kaydet (iptal için)
        setProgressIntervalRef(progressInterval)
      } else {
        setError(data.error || 'Scraping failed')
        setIsScrapingVideos(false)
      }
    } catch (err) {
      setError('Failed to scrape videos')
      console.error(err)
      setIsScrapingVideos(false)
    }
  }

  const loadUserVideos = async (user: ScrapedUser) => {
    try {
      // Yeni yöntem: username ve userId kullan (tüm timestamp klasörlerindeki videoları getir)
      let url = ''
      if (user.username && user.userId) {
        url = `http://localhost:3001/user-videos?username=${encodeURIComponent(user.username)}&userId=${encodeURIComponent(user.userId)}`
      } else if (user.folderPath) {
        // Geriye dönük uyumluluk: eski folderPath yöntemi
        url = `http://localhost:3001/user-videos?folderPath=${encodeURIComponent(user.folderPath)}`
      } else {
        console.error('Cannot load videos: missing username/userId or folderPath')
        return
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setUserVideos(data.videos)
        setSelectedUser(user)
      }
    } catch (err) {
      console.error('Failed to load videos:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="border-b border-yellow-500/30 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 flex items-center gap-3">
                <span className="text-4xl">🦇</span>
                Batman WatchMan
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  activeTab === 'search'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Search
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  activeTab === 'archive'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Folder className="w-4 h-4 inline mr-2" />
                Archive ({scrapedUsers.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            {/* Search Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 shadow-2xl mb-8"
            >
              <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
                <Search className="w-6 h-6" />
                Search TikTok Profile
              </h2>

              <div className="flex gap-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchProfile()}
                  placeholder="Enter username (e.g., khaby.lame)"
                  className="flex-1 px-6 py-4 rounded-lg bg-gray-900 border-2 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition-colors"
                  disabled={isLoadingProfile || isScrapingVideos}
                />
                <button
                  onClick={searchProfile}
                  disabled={isLoadingProfile || isScrapingVideos}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isLoadingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Search
                    </>
                  )}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400 flex items-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </motion.div>
              )}
            </motion.div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !profileData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 shadow-2xl mb-8"
              >
                <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Searches
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {recentSearches.map((search) => (
                    <button
                      key={search.username}
                      onClick={() => {
                        setUsername(search.username)
                        searchProfile()
                      }}
                      className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-yellow-500 transition-all"
                    >
                      <div className="relative w-16 h-16 mb-2 flex items-center justify-center">
                        {(() => {
                          // Backend'den profil resmi URL'lerini oluştur (yeni format: userId klasörü)
                          const backendUrls: string[] = []
                          
                          // Yeni format: userId klasörü içinde latest.jpg (varsa)
                          if (search.userId) {
                            backendUrls.push(`http://localhost:3001/profile-picture/${encodeURIComponent(search.userId.toString())}`)
                          }
                          
                          // Eski format fallback: username_userId.jpg
                          if (search.userId) {
                            const filename1 = `${search.username}_${search.userId}.jpg`
                            backendUrls.push(`http://localhost:3001/profile-picture/${encodeURIComponent(filename1)}`)
                          }
                          
                          // Eski format fallback: username.jpg
                          const filename2 = `${search.username}.jpg`
                          backendUrls.push(`http://localhost:3001/profile-picture/${encodeURIComponent(filename2)}`)
                          
                          // Avatar kaynağını belirle: önce backend URL'leri, sonra kaydedilen avatar URL
                          const backendUrl = backendUrls[0] // İlk backend URL'ini kullan (yeni format öncelikli)
                          const fallbackUrl = search.avatar && search.avatar.trim() !== '' ? search.avatar : null
                          
                          // Avatar kaynağını belirle: önce backend, sonra fallback
                          const backendKey = `backend_${search.username}`
                          const hasBackendFailed = failedBackendAvatars.has(backendKey)
                          const hasFallbackFailed = failedAvatars.has(search.username)
                          
                          let avatarSrc: string | null = null
                          if (backendUrl && !hasBackendFailed) {
                            avatarSrc = backendUrl
                          } else if (fallbackUrl && !hasFallbackFailed) {
                            avatarSrc = fallbackUrl
                          }
                          
                          const hasAvatar = !!avatarSrc
                          
                          return (
                            <>
                              {hasAvatar && avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={search.nickname}
                                  className="w-16 h-16 rounded-full border-2 border-yellow-500 object-cover bg-gray-800"
                                  onError={() => {
                                    // Avatar yüklenemezse
                                    if (avatarSrc === backendUrl) {
                                      // Backend URL başarısız oldu, fallback'i dene (eğer varsa)
                                      const backendKey = `backend_${search.username}`
                                      setFailedBackendAvatars(prev => new Set(prev).add(backendKey))
                                      // Component otomatik olarak yeniden render olacak ve fallback URL'i deneyecek
                                    } else if (avatarSrc === fallbackUrl) {
                                      // Fallback URL de başarısız oldu
                                      setFailedAvatars(prev => new Set(prev).add(search.username))
                                    }
                                  }}
                                  onLoad={(e) => {
                                    // Avatar başarıyla yüklendiğinde placeholder'ı gizle
                                    const target = e.target as HTMLImageElement;
                                    const placeholder = target.nextElementSibling as HTMLElement;
                                    if (placeholder) placeholder.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="absolute inset-0 w-16 h-16 rounded-full border-2 border-yellow-500 bg-yellow-500/20 flex items-center justify-center text-2xl font-bold text-yellow-400"
                                style={{ 
                                  display: hasAvatar ? 'none' : 'flex' 
                                }}
                              >
                                {search.nickname ? search.nickname.charAt(0).toUpperCase() : search.username.charAt(0).toUpperCase()}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      <div className="text-sm font-bold text-yellow-400 truncate w-full text-center">
                        {search.nickname}
                      </div>
                      <div className="text-xs text-gray-500 truncate w-full text-center">
                        @{search.username}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Profile Data */}
            <AnimatePresence>
              {profileData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 shadow-2xl mb-8"
                >
                  <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
                    <User className="w-6 h-6" />
                    Profile Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Avatar & Basic Info */}
                    <div className="flex items-center gap-4">
                      <img
                        src={profileData.avatarLarger || profileData.avatarThumb}
                        alt={profileData.nickname}
                        className="w-24 h-24 rounded-full border-4 border-yellow-500 shadow-lg"
                      />
                      <div>
                        <h3 className="text-2xl font-bold text-yellow-400">{profileData.nickname}</h3>
                        <p className="text-gray-400">@{profileData.username}</p>
                        {profileData.verified && <span className="text-yellow-500">✓ Verified</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-yellow-400">{(profileData.stats?.followerCount || 0).toLocaleString()}</div>
                        <div className="text-sm text-gray-400">Followers</div>
                      </div>
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-yellow-400">{(profileData.stats?.videoCount || 0).toLocaleString()}</div>
                        <div className="text-sm text-gray-400">Videos</div>
                      </div>
                    </div>
                  </div>

                  {/* Video Scraping Section */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Video Scraping
                    </h3>

                    <div className="flex flex-wrap gap-4 mb-6">
                      <label className="text-gray-300 font-semibold">Select number of videos:</label>
                      <div className="flex gap-3">
                        {[5, 10, 15, 20, 'all'].map((count) => (
                          <button
                            key={count}
                            onClick={() => setVideoCount(count as number | 'all')}
                            disabled={isScrapingVideos}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${
                              videoCount === count
                                ? 'bg-yellow-500 text-black'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {count === 'all' ? 'ALL' : count}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sadece Video Seçeneği */}
                    <div className="mb-6 flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <input
                        type="checkbox"
                        id="skipComments"
                        checked={skipComments}
                        onChange={(e) => setSkipComments(e.target.checked)}
                        disabled={isScrapingVideos}
                        className="w-5 h-5 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="skipComments" className="text-gray-300 cursor-pointer flex items-center gap-2">
                        <Video className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium">Sadece Video</span>
                        <span className="text-gray-500 text-sm">(Yorumları alma)</span>
                      </label>
                    </div>

                    <button
                      onClick={startVideoScraping}
                      disabled={isScrapingVideos}
                      className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isScrapingVideos ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Start Scraping
                        </>
                      )}
                    </button>

                    {scrapedVideos > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-400 flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Successfully scraped {scrapedVideos} videos!
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {!selectedUser ? (
              /* Users List */
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
                  <Folder className="w-6 h-6" />
                  Scraped Users ({scrapedUsers.length})
                </h2>

                {scrapedUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No scraped users yet. Start scraping to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scrapedUsers.map((user, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => loadUserVideos(user)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-700 hover:border-yellow-500 rounded-xl p-6 transition-all text-left"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            {(() => {
                              // Önce backend'den gelen profil resmini kontrol et
                              const backendAvatar = user.profilePicture ? `http://localhost:3001${user.profilePicture}` : null
                              const hasAvatar = backendAvatar || (user.avatar || userAvatars.get(user.username)) && !failedAvatars.has(user.username)
                              const isLoading = !backendAvatar && loadingAvatars.has(user.username)
                              const showPlaceholder = !hasAvatar
                              
                              return (
                                <>
                                  {hasAvatar ? (
                                    <img
                                      src={backendAvatar || user.avatar || userAvatars.get(user.username) || ''}
                                      alt={user.nickname || user.username}
                                      className="w-16 h-16 rounded-full border-2 border-yellow-500 object-cover bg-gray-800"
                                      onError={() => {
                                        setFailedAvatars(prev => new Set(prev).add(user.username))
                                      }}
                                      onLoad={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        const placeholder = target.nextElementSibling as HTMLElement;
                                        if (placeholder) placeholder.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  {/* Placeholder: İlk harf veya batman logosu */}
                                  {showPlaceholder && (
                                    <div 
                                      className="absolute inset-0 w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500"
                                    >
                                      {isLoading ? (
                                        <span className="text-3xl animate-pulse">🦇</span>
                                      ) : (
                                        <span className="text-2xl font-bold text-yellow-400">
                                          {user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-yellow-400">@{user.username}</h3>
                            <p className="text-sm text-gray-400">
                              {user.latestTimestamp 
                                ? `Last: ${new Date(user.latestTimestamp).toLocaleDateString()}`
                                : new Date(user.timestamp).toLocaleDateString()}
                            </p>
                            {user.oldestTimestamp && user.latestTimestamp && user.oldestTimestamp !== user.latestTimestamp && (
                              <p className="text-xs text-gray-500">
                                {new Date(user.oldestTimestamp).toLocaleDateString()} - {new Date(user.latestTimestamp).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Video className="w-4 h-4" />
                            <span>{user.videoCount} videos</span>
                          </div>
                          <div className="text-yellow-400 font-bold">View →</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Videos Grid */
              <div>
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 shadow-2xl mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                      <User className="w-6 h-6" />
                      @{selectedUser.username}
                    </h2>
                    <button
                      onClick={() => {
                        setSelectedUser(null)
                        setUserVideos([])
                      }}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
                    >
                      ← Back to Users
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {userVideos.map((video, idx) => (
                      <motion.button
                        key={video.id}
                        onClick={() => {
                          setSelectedVideo(video)
                          setCurrentMediaIndex(0)
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-yellow-500 transition-all group"
                      >
                        {video.thumbnail ? (
                          // Check if thumbnail is video or image
                          (() => {
                            const isVideoThumbnail = video.thumbnail.match(/\.(mp4|mov|avi)$/i)
                            return isVideoThumbnail ? (
                              <video
                                src={video.thumbnail}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={video.thumbnail}
                                alt={`Video ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )
                          })()
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-12 h-12 text-gray-600" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-16 h-16 text-yellow-500" />
                        </div>

                        {/* Media Type Indicator */}
                        {video.media && video.media.length > 0 && (
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                            {video.media.length > 1 ? (
                              <>
                                <ImageIcon className="w-3 h-3 text-yellow-400" />
                                <span className="text-white text-xs font-medium">{video.media.length}</span>
                              </>
                            ) : (
                              <>
                                {video.media[0].type === 'video' ? (
                                  <Video className="w-3 h-3 text-yellow-400" />
                                ) : (
                                  <ImageIcon className="w-3 h-3 text-yellow-400" />
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                          <div className="flex items-center gap-2 text-white text-sm">
                            <MessageCircle className="w-4 h-4" />
                            <span>{video.comments.length}</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Video Player Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-yellow-500 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              >
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                  {/* Media Player/Carousel */}
                  <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                    {(() => {
                      // Get media array or fallback to single videoUrl
                      const mediaItems = selectedVideo.media && selectedVideo.media.length > 0
                        ? selectedVideo.media
                        : selectedVideo.videoUrl
                        ? [{ type: 'video' as const, url: selectedVideo.videoUrl, filename: 'video' }]
                        : []

                      if (mediaItems.length === 0) {
                        return (
                          <div className="text-gray-500 text-center">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No media found</p>
                          </div>
                        )
                      }

                      const currentMedia = mediaItems[currentMediaIndex]
                      const hasMultiple = mediaItems.length > 1

                      return (
                        <>
                          {/* Current Media */}
                          <div className="max-w-full max-h-full flex items-center justify-center">
                            {currentMedia.type === 'video' ? (
                              <video
                                key={currentMedia.url}
                                src={currentMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-full rounded-lg"
                              />
                            ) : (
                              <img
                                key={currentMedia.url}
                                src={currentMedia.url}
                                alt={currentMedia.filename}
                                className="max-w-full max-h-full rounded-lg object-contain"
                              />
                            )}
                          </div>

                          {/* Navigation Arrows (only if multiple items) */}
                          {hasMultiple && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentMediaIndex((prev) =>
                                    prev === 0 ? mediaItems.length - 1 : prev - 1
                                  )
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-yellow-500/70 text-white p-3 rounded-full transition-all hover:scale-110"
                              >
                                <ChevronLeft className="w-6 h-6" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentMediaIndex((prev) =>
                                    prev === mediaItems.length - 1 ? 0 : prev + 1
                                  )
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-yellow-500/70 text-white p-3 rounded-full transition-all hover:scale-110"
                              >
                                <ChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}

                          {/* Media Counter & Type Indicator */}
                          {hasMultiple && (
                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/50 flex items-center gap-2">
                              {currentMedia.type === 'video' ? (
                                <Video className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-yellow-400" />
                              )}
                              <span className="text-white font-medium text-sm">
                                {currentMediaIndex + 1} / {mediaItems.length}
                              </span>
                            </div>
                          )}

                          {/* Dot Indicators */}
                          {hasMultiple && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {mediaItems.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentMediaIndex(idx)
                                  }}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    idx === currentMediaIndex
                                      ? 'bg-yellow-400 w-8'
                                      : 'bg-gray-500 hover:bg-gray-400'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Comments Sidebar */}
                  <div className="w-full md:w-96 bg-gray-900 flex flex-col max-h-[50vh] md:max-h-full">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Comments ({selectedVideo.comments.length})
                      </h3>
                      <button
                        onClick={() => setSelectedVideo(null)}
                        className="text-gray-400 hover:text-yellow-400 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedVideo.comments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No comments</p>
                      ) : (
                        selectedVideo.comments.map((comment: any, idx: number) => {
                          // Debug: log comment structure
                          if (idx === 0) {
                            console.log('Comment structure:', comment)
                          }

                          // Extract user info from different possible structures
                          let userName = 'Unknown'
                          let userUniqueId = ''

                          // Check if user is an object
                          if (typeof comment.user === 'object' && comment.user !== null) {
                            userName = comment.user.nickname || comment.user.uniqueId || 'Unknown'
                            userUniqueId = comment.user.uniqueId || ''
                          }
                          // Check if user is a string (old format: "@username (Nickname)")
                          else if (typeof comment.user === 'string') {
                            const match = comment.user.match(/@(\w+)\s*\(([^)]+)\)/)
                            if (match) {
                              userName = match[2] // Nickname
                              userUniqueId = match[1] // username
                            } else {
                              userName = comment.user
                            }
                          }
                          // Check for userDisplay (new format backup)
                          else if (comment.userDisplay) {
                            const match = comment.userDisplay.match(/@(\w+)\s*\(([^)]+)\)/)
                            if (match) {
                              userName = match[2]
                              userUniqueId = match[1]
                            }
                          }

                          const commentText = comment.text || comment.comment || comment.content || 'No text'
                          const likeCount = comment.likeCount || comment.like_count || comment.digg_count || 0
                          const profileUrl = userUniqueId ? `https://www.tiktok.com/@${userUniqueId}` : null

                          // Helper function to render a single comment
                          const renderComment = (c: any, isReply = false) => {
                            // Extract user info
                            let cUserName = 'Unknown'
                            let cUserUniqueId = ''

                            if (typeof c.user === 'object' && c.user !== null) {
                              cUserName = c.user.nickname || c.user.uniqueId || 'Unknown'
                              cUserUniqueId = c.user.uniqueId || ''
                            } else if (typeof c.user === 'string') {
                              const match = c.user.match(/@(\w+)\s*\(([^)]+)\)/)
                              if (match) {
                                cUserName = match[2]
                                cUserUniqueId = match[1]
                              } else {
                                cUserName = c.user
                              }
                            } else if (c.userDisplay) {
                              const match = c.userDisplay.match(/@(\w+)\s*\(([^)]+)\)/)
                              if (match) {
                                cUserName = match[2]
                                cUserUniqueId = match[1]
                              }
                            }

                            const cText = c.text || c.comment || c.content || 'No text'
                            const cLikeCount = c.likeCount || c.like_count || c.digg_count || 0
                            const cProfileUrl = cUserUniqueId ? `https://www.tiktok.com/@${cUserUniqueId}` : null

                            return (
                              <div className={`flex items-start gap-3 ${isReply ? 'ml-8 mt-2' : ''}`}>
                                <div className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0`}>
                                  <User className={`${isReply ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-500`} />
                                </div>
                                <div className="flex-1">
                                  {cProfileUrl ? (
                                    <a
                                      href={cProfileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`font-bold text-yellow-400 ${isReply ? 'text-xs' : 'text-sm'} hover:text-yellow-300 transition-colors inline-flex items-center gap-1`}
                                    >
                                      {cUserName}
                                      <span className="text-xs opacity-50">↗</span>
                                    </a>
                                  ) : (
                                    <div className={`font-bold text-yellow-400 ${isReply ? 'text-xs' : 'text-sm'}`}>
                                      {cUserName}
                                    </div>
                                  )}
                                  <div className={`text-gray-300 ${isReply ? 'text-xs' : 'text-sm'} mt-1`}>
                                    {cText}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    {cLikeCount > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span>❤️</span>
                                        <span>{cLikeCount.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {c.create_time && (
                                      <div className="flex items-center gap-1">
                                        <span>🕐</span>
                                        <span>{new Date(c.create_time * 1000).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {isReply && (
                                      <span className="text-yellow-500/50 text-xs">↳ Reply</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={idx} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors">
                              {/* Main Comment */}
                              {renderComment(comment, false)}

                              {/* Replies (if any) */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                  <div className="text-xs text-gray-500 mb-2 ml-8 flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}</span>
                                  </div>
                                  {comment.replies.map((reply: any, replyIdx: number) => (
                                    <div key={replyIdx} className="mb-2 last:mb-0">
                                      {renderComment(reply, true)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Loading Overlay */}
        {isScrapingVideos && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
            {/* Background Music */}
            <audio
              autoPlay
              loop
              className="hidden"
              src="http://localhost:3001/sounds/dkt1.mp4"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-yellow-500 rounded-2xl p-12 max-w-4xl w-full mx-4 text-center shadow-2xl overflow-hidden"
            >
              {/* Kapatma butonu */}
              <button
                onClick={async () => {
                  if (profileData && progressIntervalRef) {
                    try {
                      // Backend'e iptal isteği gönder
                      await fetch(`http://localhost:3001/scrape-cancel/${encodeURIComponent(profileData.username)}`, {
                        method: 'POST'
                      })
                      
                      // Interval'ı temizle
                      clearInterval(progressIntervalRef)
                      setProgressIntervalRef(null)
                      
                      // State'leri sıfırla
                      setIsScrapingVideos(false)
                      setScrapingProgress(0)
                      setScrapedVideos(0)
                      setScrapingMessage('')
                      setTotalVideos(0)
                    } catch (err) {
                      console.error('Cancel error:', err)
                      // Yine de kapat
                      clearInterval(progressIntervalRef)
                      setProgressIntervalRef(null)
                      setIsScrapingVideos(false)
                    }
                  } else {
                    setIsScrapingVideos(false)
                  }
                }}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Animasyonlu arka plan */}
              <div className="absolute inset-0 opacity-30">
                <BatmanFightAnimation />
              </div>

              {/* İçerik */}
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-yellow-400 mb-4">Scraping Videos</h2>
                <div className="w-full bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scrapingProgress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600"
                  />
                </div>
                <p className="text-gray-400 text-lg mb-2">
                  {scrapingProgress}% Complete
                  {totalVideos > 0 && ` (${scrapedVideos}/${totalVideos} video)`}
                </p>
                {scrapingMessage && (
                  <p className="text-yellow-400 text-sm mb-2">{scrapingMessage}</p>
                )}
                <p className="text-gray-500 text-sm">⚠️ Please do not close or refresh this page</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
