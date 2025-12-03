'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import LandingPage from '@/components/LandingPage'
import ChatPanel from '@/components/ChatPanel'
import GiftPanel from '@/components/GiftPanel'
import EventPanel from '@/components/EventPanel'
import StatsCard from '@/components/StatsCard'
import StatusIndicator from '@/components/StatusIndicator'
import EmotePanel from '@/components/EmotePanel'
import QuestionPanel from '@/components/QuestionPanel'
import Leaderboard from '@/components/Leaderboard'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import GoalTracker from '@/components/GoalTracker'
import ChatAnalytics from '@/components/ChatAnalytics'
import GiftAnalysis from '@/components/GiftAnalysis'
import AlertSystem from '@/components/AlertSystem'
import SpecialUsersPanel from '@/components/SpecialUsersPanel'
import GiftCatalogButton from '@/components/GiftCatalogButton'
import StreamerProfileCard from '@/components/StreamerProfileCard'
import { 
  MessageSquare, 
  Gift, 
  Heart, 
  Users,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface Stats {
  viewers: number
  messages: number
  gifts: number
  likes: number
  questions: number
  emotes: number
}

interface ChatMessage {
  username: string
  nickname: string
  message: string
  profilePicture: string
  isFollower?: boolean
  isModerator?: boolean
  isSubscriber?: boolean
  isGiftGiver?: boolean
  badges?: Array<{type: string, name: string, displayType?: string}>
  followerCount?: number
  userLevel?: number
  heatLevel?: number
  timestamp: string
}

interface GiftData {
  username: string
  nickname: string
  giftName: string
  giftId: number
  repeatCount: number
  diamondCount: number
  totalDiamonds?: number
  usdValue?: string
  tryValue?: string
  giftPictureUrl: string
  profilePicture: string
  giftType?: number
  timestamp: string
}

interface EventData {
  icon: string
  text: string
  timestamp: string
  type?: string
}

interface EmoteData {
  username: string
  nickname: string
  emoteName: string
  emoteImageUrl: string
  timestamp: string
}

interface QuestionData {
  username: string
  nickname: string
  question: string
  questionId: string
  timestamp: string
}

interface Alert {
  id: string
  type: 'highValueGift' | 'viewerMilestone' | 'goalAchieved'
  data: any
  timestamp: number
}

interface FullStats {
  // Temel
  totalDiamonds: number
  totalUSD: string
  totalTRY: string
  totalGifts: number
  totalMessages: number
  totalLikes: number
  totalShares: number
  totalFollows: number
  currentViewers: number
  peakViewers: number
  peakViewersTime: Date | null
  
  // Kullanıcılar
  uniqueUsers: number
  uniqueGifters: number
  uniqueChatters: number
  moderators: number
  subscribers: number
  followers: number
  newFollowers: number
  activeUsers: number
  veryActiveUsers: number
  
  // Leaderboards
  topGifters: Array<{username: string, diamonds: number, usd: string}>
  topChatters: Array<{username: string, count: number}>
  topLikers: Array<{username: string, likes: number}>
  
  // Analiz
  topWords: Array<{word: string, count: number}>
  topEmojis: Array<{emoji: string, count: number}>
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
  
  // Özel kullanıcılar
  specialUsers: Array<{
    username: string
    nickname: string
    profilePicture: string
    roles: string[]
    userLevel: number
    followerCount: number
    messageCount: number
    giftValue: number
    lastSeen: string
  }>
  
  // Engagement
  engagementRate: string
  spamMessages: number
  
  // Zaman
  streamDuration: string
  streamStartTime: Date | null
  
  // Hedefler
  goals: {
    viewers: { target: number, achieved: boolean }
    gifts: { target: number, achieved: boolean }
  }
  
  // Ortalamalar
  avgGiftValue: string
  avgMessageLength: string
  
  // Yayıncı Profili
  streamerProfile?: {
    username?: string
    nickname?: string
    profilePicture?: string
    bio?: string
    verified?: boolean
    payGrade?: number
    payScore?: number
    topVipNo?: number
    fanTicketCount?: number
    badgeList?: Array<{name?: string, type?: number}>
    followerCount?: number
    followingCount?: number
    videoCount?: number
    heartCount?: number
    liveStatus?: number
    viewerCount?: number
  }
}

export default function Home() {
  const searchParams = useSearchParams()
  const usernameFromUrl = searchParams.get('username')
  
  // Landing page kontrolü
  const [showDashboard, setShowDashboard] = useState(!!usernameFromUrl)
  const [username, setUsername] = useState(usernameFromUrl || '')
  
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [statusText, setStatusText] = useState('Bağlanıyor...')
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  
  // Basit istatistikler
  const [stats, setStats] = useState<Stats>({
    viewers: 0,
    messages: 0,
    gifts: 0,
    likes: 0,
    questions: 0,
    emotes: 0
  })
  
  // Detaylı istatistikler
  const [fullStats, setFullStats] = useState<FullStats | null>(null)
  
  // Panel verileri
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [gifts, setGifts] = useState<GiftData[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [emotes, setEmotes] = useState<EmoteData[]>([])
  const [questions, setQuestions] = useState<QuestionData[]>([])
  
  // Alert sistemi
  const [alerts, setAlerts] = useState<Alert[]>([])
const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionDuration, setSessionDuration] = useState('0 dakika')

  useEffect(() => {
    // Eğer username varsa bağlan
    if (username && showDashboard) {
      connectWebSocket()
    }
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [username, showDashboard])

  const connectWebSocket = () => {
    const socket = new WebSocket('ws://localhost:8080')

    socket.onopen = () => {
      console.log('✅ WebSocket bağlantısı kuruldu')
      setIsConnected(true)
      setStatusText('Bağlı')
setSessionStartTime(new Date());
      
      // Username'i server'a gönder
      if (username) {
        socket.send(JSON.stringify({
          action: 'connect',
          username: username
        }))
      }
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleMessage(message)
    }

    socket.onclose = () => {
      console.log('❌ WebSocket bağlantısı kesildi')
      setIsConnected(false)
      setStatusText('Bağlantı kesildi')
    }

    socket.onerror = (error) => {
      console.error('WebSocket hatası:', error)
      setIsConnected(false)
      setStatusText('Hata oluştu')
    }

    setWs(socket)
  }

  const handleMessage = (message: any) => {
    switch (message.type) {
		case 'connected':
        setIsConnected(true)
        // Durum yazısını sunucudan gelen kullanıcı adıyla günceller
        setStatusText(`Bağlı: @${message.username}`) 
        break
      
      case 'connectionError':
        setIsConnected(false)
        // Durum yazısını sunucudan gelen hata mesajıyla günceller
        setStatusText(message.message || 'Bağlantı Hatası')
        break
      case 'chat':
        console.log('💬 Chat data:', {
          nickname: message.data.nickname,
          badges: message.data.badges,
          userLevel: message.data.userLevel
        })

        // Duplicate kontrolü - aynı kullanıcı + mesaj + zaman aralığı
        setChatMessages(prev => {
          const isDuplicate = prev.some(msg =>
            msg.username === message.data.username &&
            msg.message === message.data.message &&
            Math.abs(new Date(msg.timestamp).getTime() - new Date(message.data.timestamp).getTime()) < 2000 // 2 saniye içinde
          )

          if (isDuplicate) {
            return prev
          }

          setStats(prevStats => ({ ...prevStats, messages: prevStats.messages + 1 }))
          return [message.data, ...prev].slice(0, 30) // 100 → 30: Performans için azaltıldı
        })
        break
      
      case 'gift':
        // Duplicate kontrolü - aynı kullanıcı + hediye + zaman
        setGifts(prev => {
          const isDuplicate = prev.some(gift =>
            gift.username === message.data.username &&
            gift.giftId === message.data.giftId &&
            Math.abs(new Date(gift.timestamp).getTime() - new Date(message.data.timestamp).getTime()) < 2000
          )

          if (isDuplicate) {
            return prev
          }

          setStats(prevStats => ({ ...prevStats, gifts: prevStats.gifts + 1 }))
          return [message.data, ...prev].slice(0, 20) // 50 → 20: Performans için azaltıldı
        })
        break
      
      case 'follow':
        addEvent('👤', `${message.data.nickname} takip etti!`, 'follow')
        break
      
      case 'share':
        addEvent('📤', `${message.data.nickname} paylaştı!`, 'share')
        break
      
      case 'like':
        setStats(prev => ({ ...prev, likes: prev.likes + message.data.likeCount }))
        addEvent('❤️', `${message.data.nickname} beğendi!`, 'like')
        break
      
      case 'member':
        // Backend'den gelen zengin bilgiyi al
        const nickname = message.data.nickname;
        const trafficSource = message.data.trafficSource || 'Bilinmeyen';
        const enterMethod = message.data.enterMethod || ''; // örn: Tıklama, Kaydırma

        // Etkinlik metnini bu bilgilerle oluştur
        const eventText = `${nickname} katıldı! (Kaynak: ${trafficSource} / ${enterMethod})`;
        
        addEvent('👋', eventText, 'member')
        break
      
      case 'emote':
        setEmotes(prev => [message.data, ...prev].slice(0, 20)) // 30 → 20: Performans için azaltıldı
        setStats(prev => ({ ...prev, emotes: prev.emotes + 1 }))
        addEvent('😊', `${message.data.nickname} ${message.data.emoteName} gönderdi!`, 'emote')
        break

      case 'question':
        setQuestions(prev => [message.data, ...prev].slice(0, 15)) // 20 → 15: Performans için azaltıldı
        setStats(prev => ({ ...prev, questions: prev.questions + 1 }))
        addEvent('❓', `${message.data.nickname} soru sordu!`, 'question')
        break
      
      case 'envelope':
        addEvent('💰', `Zarf hediyesi: ${message.data.coins} coin!`, 'envelope')
        break
      
      case 'subscribe':
        addEvent('⭐', `${message.data.nickname} abone oldu!`, 'subscribe')
        break
      
      case 'linkMicBattle':
        addEvent('⚔️', `Mic Battle başladı!`, 'battle')
        break
      
      case 'linkMicArmies':
        addEvent('🎖️', `Link Mic Armies etkinliği!`, 'armies')
        break
      
      case 'intro':
        addEvent('📢', message.data.introText || 'Giriş mesajı', 'intro')
        break
      
      
      case 'viewerCount':
        setStats(prev => ({ ...prev, viewers: message.data.viewerCount }))
        break
      
      case 'status':
        setIsConnected(message.connected)
        setStatusText(message.message)
        break
      
      case 'roomInfo':
        console.log('Oda bilgisi:', message.data)
        break
      
      case 'roomInfoUpdate':
        console.log('Oda güncellendi:', message.data)
        break
      
      // Gelişmiş istatistikler
      case 'fullStats':
      case 'stats':
        console.log('📊 FullStats alındı:', {
          hasStreamerProfile: !!message.data.streamerProfile,
          streamerProfile: message.data.streamerProfile
        })
        setFullStats(message.data)
        // Basit istatistikleri de güncelle
        if (message.data.currentViewers !== undefined) {
          setStats(prev => ({ ...prev, viewers: message.data.currentViewers }))
        }
        break
      
      // Alert sistemi
      case 'alert':
        const newAlert: Alert = {
          id: Date.now().toString(),
          type: message.alertType,
          data: message.data,
          timestamp: Date.now()
        }
        setAlerts(prev => [...prev, newAlert])
        
        // 5 saniye sonra otomatik kaldır
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== newAlert.id))
        }, 5000)
        break
      
      // Video kaydı başladı
      case 'recordingStarted':
        setIsRecording(true)
        console.log('📹 Video kaydı başladı')
        break
      
      // Video kaydı durdu
      case 'recordingStopped':
        setIsRecording(false)
        console.log('🛑 Video kaydı durduruldu')
        break
      
      // Yayın sona erdi - kaydı durdur
      case 'streamEnd':
        setIsRecording(false)
        setIsConnected(false)
        setStatusText('Yayın sona erdi')
        addEvent('🔴', 'Yayın sona erdi!', 'streamEnd')
        break
    }
  }
useEffect(() => {
    if (!isConnected || !sessionStartTime) {
      return;
    }

    // Her 5 saniyede bir oturum süresini güncelle
    const interval = setInterval(() => {
      const now = Date.now();
      const durationMs = now - sessionStartTime.getTime();
      
      const totalMinutes = Math.floor(durationMs / 60000);

      if (totalMinutes < 1) {
        setSessionDuration('< 1 dakika');
      } else if (totalMinutes < 60) {
        setSessionDuration(`${totalMinutes} dakika`);
      } else {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        setSessionDuration(`${hours} saat ${mins} dakika`);
      }
    }, 5000); // 5 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [isConnected, sessionStartTime]);

  const addEvent = (icon: string, text: string, type?: string) => {
    const newEvent: EventData = {
      icon,
      text,
      type,
      timestamp: new Date().toISOString()
    }

    // Duplicate kontrolü - son 5 saniye içinde aynı text'e sahip event varsa ekleme
    setEvents(prev => {
      const now = new Date().getTime()
      const recentEvents = prev.filter(e => {
        const eventTime = new Date(e.timestamp).getTime()
        return (now - eventTime) < 5000 // Son 5 saniye
      })

      // Aynı text varsa ekleme
      const isDuplicate = recentEvents.some(e => e.text === text)
      if (isDuplicate) {
        return prev
      }

      return [newEvent, ...prev].slice(0, 50) // Performans için 50'de tutuldu
    })
  }

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  // Eğer username yoksa landing page göster
  if (!showDashboard || !username) {
    return (
      <LandingPage 
        onConnect={(selectedUsername) => {
          setUsername(selectedUsername)
          setShowDashboard(true)
        }}
      />
    )
  }

 return (
  <div
    className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-6 relative"
    style={{
      backgroundImage: 'url(https://img-s1.onedio.com/id-620e3524530b0d05292eb0f9/rev-0/w-600/h-337/f-jpg/s-9f96996b57cc89cbf14c532e1d231156cb428d28.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}
  >
    {/* Dark cinematic overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90 backdrop-blur-[1px]"></div>

    {/* Alert System */}
    <AlertSystem alerts={alerts} onDismiss={handleDismissAlert} />
    <div className="max-w-[1920px] mx-auto relative z-10">
      {/* Header */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 flex items-center gap-3" style={{textShadow: '0 0 20px rgba(251, 191, 36, 0.5)'}}>
            🦇 TikTok Live Analytics
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={async () => {
                  if (!ws || ws.readyState !== WebSocket.OPEN) {
                    alert('WebSocket bağlantısı yok!')
                    return
                  }
                  
                  ws.send(JSON.stringify({
                    action: 'toggleRecording'
                  }))
                  
                  console.log('📹 Video kaydı toggle edildi')
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-600 shadow-lg shadow-red-500/50 hover:bg-red-700' 
                    : 'bg-green-500 shadow-lg shadow-green-400/50 hover:bg-green-600'
                }`}
                title={isRecording ? "Video Kaydediliyor (Durdurmak için tıklayın)" : "Video Kaydı Başlat"}
              >
                <span className="text-2xl text-white">{isRecording ? '⏹️' : '▶️'}</span>
              </button>
              {isRecording && (
                <span className="text-sm text-red-400 font-semibold animate-pulse">
                  Recording...
                </span>
              )}
            </div>
          </h1>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Hediye Kataloğu */}
            <GiftCatalogButton ws={ws} />

            {/* Analytics Toggle */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                showAnalytics
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/50'
                  : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showAnalytics ? (
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analytics ON
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Analytics OFF
                </span>
              )}
            </button>
            
            <StatusIndicator 
              isConnected={isConnected} 
              statusText={statusText} 
              onDisconnect={() => {
                if (ws) {
                  ws.send(JSON.stringify({ action: 'disconnect' }))
                  ws.close()
                }
                setIsConnected(false)
                setStatusText('Bağlantı kesildi')
                setSessionStartTime(null)
                setWs(null)
              }}
            />
          </div>
        </div>
      </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard
            icon={<Users className="w-6 h-6" />}
            label="Viewers"
            value={stats.viewers}
            color="bg-blue-600"
          />
          <StatsCard
            icon={<MessageSquare className="w-6 h-6" />}
            label="Messages"
            value={stats.messages}
            color="bg-green-600"
          />
          <StatsCard
            icon={<Gift className="w-6 h-6" />}
            label="Gifts"
            value={stats.gifts}
            color="bg-yellow-500"
          />
          <StatsCard
            icon={<Heart className="w-6 h-6" />}
            label="Likes"
            value={stats.likes}
            color="bg-pink-600"
          />
          <StatsCard
            icon={<span className="text-2xl">❓</span>}
            label="Questions"
            value={stats.questions}
            color="bg-orange-600"
          />
          <StatsCard
            icon={<span className="text-2xl">😊</span>}
            label="Emojis"
            value={stats.emotes}
            color="bg-purple-600"
          />
        </div>

        {/* Yayıncı Profili - Hedefler'in üzerinde */}
        {fullStats && (
          <div className="mb-6">
            <StreamerProfileCard profile={fullStats.streamerProfile || null} />
          </div>
        )}

        {/* Analytics Section */}
        {showAnalytics && fullStats && (
          <div className="space-y-6 mb-6">
            {/* Hedef Takibi */}
            <GoalTracker 
              goals={fullStats.goals}
              currentViewers={fullStats.currentViewers}
              currentGiftValue={parseFloat(fullStats.totalUSD || '0')}
            />

            {/* Özel Kullanıcılar Paneli */}
            <SpecialUsersPanel users={fullStats.specialUsers || []} />

            {/* Leaderboard */}
            <Leaderboard 
              topGifters={fullStats.topGifters || []}
              topChatters={fullStats.topChatters || []}
              topLikers={fullStats.topLikers || []}
            />

            {/* Analytics Dashboard */}
            <AnalyticsDashboard 
              stats={fullStats} 
              streamStartTime={fullStats.streamStartTime || null}
              sessionDuration={sessionDuration}
            />

            {/* Chat Analytics */}
            <ChatAnalytics 
              topWords={fullStats.topWords || []}
              topEmojis={fullStats.topEmojis || []}
              totalMessages={fullStats.totalMessages}
              spamMessages={fullStats.spamMessages}
            />

            {/* Gift Analysis */}
            <GiftAnalysis 
              giftAnalysis={fullStats.giftAnalysis || []}
              expensiveGifts={fullStats.expensiveGifts || []}
            />
          </div>
        )}

        {/* Main Content - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ChatPanel messages={chatMessages} />
          <GiftPanel gifts={gifts} />
          <EmotePanel emotes={emotes} />
        </div>

        {/* Bottom Content - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuestionPanel questions={questions} />
          <EventPanel events={events} />
        </div>
      </div>
    </div>
  )
}