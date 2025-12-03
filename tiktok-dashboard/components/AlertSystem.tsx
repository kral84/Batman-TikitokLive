'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Target, Gift, Users } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Alert {
  id: string
  type: 'highValueGift' | 'viewerMilestone' | 'goalAchieved'
  data: any
  timestamp: number
}

interface AlertSystemProps {
  alerts: Alert[]
  onDismiss: (id: string) => void
}

export default function AlertSystem({ alerts, onDismiss }: AlertSystemProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)

  const playSound = () => {
    if (!soundEnabled) return
    
    try {
      // Web Audio API ile basit bip sesi
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // Ses tonu (Hz)
      oscillator.type = 'sine' // Yumuşak ses
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      // Web Audio API desteklenmiyorsa sessizce atla
    }
  }

  useEffect(() => {
    if (alerts.length > 0 && soundEnabled) {
      playSound()
    }
  }, [alerts.length, soundEnabled])

  const getAlertConfig = (alert: Alert) => {
    switch (alert.type) {
      case 'highValueGift':
        return {
          icon: <Gift className="w-8 h-8" />,
          title: '🔥 Yüksek Değerli Hediye!',
          description: `${alert.data.nickname} ${alert.data.giftName} gönderdi!`,
          value: `💎 ${(alert.data.totalDiamonds || alert.data.diamonds || 0).toLocaleString()} ($${alert.data.usd || '0.00'})`,
          color: 'from-red-500 to-pink-600'
        }
      case 'viewerMilestone':
        return {
          icon: <Users className="w-8 h-8" />,
          title: '🎉 İzleyici Rekoru!',
          description: `${(alert.data.viewers || 0).toLocaleString()} izleyiciye ulaştınız!`,
          value: 'Tebrikler!',
          color: 'from-blue-500 to-purple-600'
        }
      case 'goalAchieved':
        return {
          icon: <Target className="w-8 h-8" />,
          title: '🎯 Hedef Tamamlandı!',
          description: `${alert.data.goalType === 'viewers' ? 'İzleyici' : 'Hediye'} hedefine ulaştınız!`,
          value: alert.data.goalType === 'viewers' 
            ? `${(alert.data.value || 0).toLocaleString()} izleyici` 
            : `$${(alert.data.value || 0).toFixed(2)}`,
          color: 'from-green-500 to-emerald-600'
        }
      default:
        return {
          icon: <TrendingUp className="w-8 h-8" />,
          title: 'Bildirim',
          description: '',
          value: '',
          color: 'from-gray-500 to-gray-600'
        }
    }
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {alerts.map((alert) => {
          const config = getAlertConfig(alert)
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`bg-gradient-to-r ${config.color} text-white rounded-2xl shadow-2xl p-6 relative overflow-hidden`}
            >
              {/* Animasyonlu arka plan */}
              <motion.div
                className="absolute inset-0 bg-white opacity-10"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* İçerik */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {config.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-xl mb-2">{config.title}</h4>
                    <p className="text-sm opacity-90 mb-2">{config.description}</p>
                    <div className="text-lg font-bold">{config.value}</div>
                  </div>
                  
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                onAnimationComplete={() => onDismiss(alert.id)}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
      
      {/* Ses kontrolü */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg p-2 text-sm transition-colors"
      >
        {soundEnabled ? '🔊 Ses Açık' : '🔇 Ses Kapalı'}
      </button>
    </div>
  )
}
