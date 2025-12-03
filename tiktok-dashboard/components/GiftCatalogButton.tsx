'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Download, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

interface GiftCatalogButtonProps {
  ws: WebSocket | null
}

export default function GiftCatalogButton({ ws }: GiftCatalogButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasCatalog, setHasCatalog] = useState(false)

  // Sayfa yüklendiğinde backend'den katalog var mı kontrol et
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      checkCatalog()
    }
  }, [ws])

  const checkCatalog = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({ action: 'checkCatalog' }))

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)
      if (message.type === 'catalogInfo') {
        setHasCatalog(message.data.hasGifts)
        ws.removeEventListener('message', handleMessage)
      }
    }

    ws.addEventListener('message', handleMessage)

    setTimeout(() => {
      ws.removeEventListener('message', handleMessage)
    }, 2000)
  }

  const handleGenerateCatalog = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('WebSocket bağlantısı yok!')
      return
    }

    setIsLoading(true)

    // Eğer katalog varsa direkt göster, yoksa önce çek
    if (hasCatalog) {
      // Katalog var, direkt göster
      ws.send(JSON.stringify({ action: 'generateFullCatalog' }))

      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)
        if (message.type === 'catalogGenerated') {
          setIsLoading(false)

          // Yeni sekmede aç
          const catalogWindow = window.open('', '_blank')
          if (catalogWindow) {
            catalogWindow.document.write(message.html)
            catalogWindow.document.close()
          }

          ws.removeEventListener('message', handleMessage)
        }
      }

      ws.addEventListener('message', handleMessage)

      setTimeout(() => {
        setIsLoading(false)
        ws.removeEventListener('message', handleMessage)
      }, 5000)
    } else {
      // Katalog yok, önce hediyeleri çek
      console.log('📥 Katalog yok, hediyeler çekiliyor...')

      ws.send(JSON.stringify({ action: 'fetchAllGifts' }))

      const handleFetchComplete = (event: MessageEvent) => {
        const message = JSON.parse(event.data)

        if (message.type === 'allGiftsFetched') {
          console.log(`✅ ${message.count} hediye çekildi, katalog oluşturuluyor...`)
          setHasCatalog(true)

          // Hediyeler çekildi, şimdi kataloğu oluştur
          ws.send(JSON.stringify({ action: 'generateFullCatalog' }))

          ws.removeEventListener('message', handleFetchComplete)
          ws.addEventListener('message', handleCatalogGenerated)
        }

        if (message.type === 'fetchError') {
          setIsLoading(false)
          alert('❌ Hediyeler çekilirken hata oluştu')
          ws.removeEventListener('message', handleFetchComplete)
        }
      }

      const handleCatalogGenerated = (event: MessageEvent) => {
        const message = JSON.parse(event.data)

        if (message.type === 'catalogGenerated') {
          setIsLoading(false)

          // Yeni sekmede aç
          const catalogWindow = window.open('', '_blank')
          if (catalogWindow) {
            catalogWindow.document.write(message.html)
            catalogWindow.document.close()
          }

          ws.removeEventListener('message', handleCatalogGenerated)
        }
      }

      ws.addEventListener('message', handleFetchComplete)

      // Timeout
      setTimeout(() => {
        setIsLoading(false)
        ws.removeEventListener('message', handleFetchComplete)
        ws.removeEventListener('message', handleCatalogGenerated)
      }, 30000) // 30 saniye
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleGenerateCatalog}
      disabled={isLoading}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black shadow-lg transition-all ${
        isLoading
          ? 'bg-gray-600 cursor-not-allowed opacity-50'
          : 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700'
      }`}
      style={{
        boxShadow: isLoading ? 'none' : '0 0 20px rgba(255, 215, 0, 0.4)'
      }}
      title="Katalog sayfasını aç"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
          <span>Açılıyor...</span>
        </>
      ) : (
        <>
          <BookOpen className="w-5 h-5" />
          <span>🎁 Tam Katalog</span>
          <ExternalLink className="w-4 h-4" />
        </>
      )}
    </motion.button>
  )
}