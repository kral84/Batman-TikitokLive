'use client'

import { useState } from 'react'
import { User, Download, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

interface StreamerProfileButtonProps {
  ws: WebSocket | null
}

export default function StreamerProfileButton({ ws }: StreamerProfileButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleViewProfile = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('WebSocket bağlantısı yok!')
      return
    }

    setIsLoading(true)

    ws.send(JSON.stringify({
      action: 'getStreamerProfile'
    }))

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'streamerProfile') {
        setIsLoading(false)
        
        // Yeni sekmede aç
        const profileWindow = window.open('', '_blank')
        if (profileWindow) {
          profileWindow.document.write(message.html)
          profileWindow.document.close()
        }
        
        ws.removeEventListener('message', handleMessage)
      }
    }

    ws.addEventListener('message', handleMessage)

    setTimeout(() => {
      setIsLoading(false)
      ws.removeEventListener('message', handleMessage)
    }, 5000)
  }

  const handleDownloadJSON = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('WebSocket bağlantısı yok!')
      return
    }

    ws.send(JSON.stringify({
      action: 'downloadStreamerProfile'
    }))

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'profileJSON') {
        const blob = new Blob([JSON.stringify(message.data, null, 2)], { 
          type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `streamer-profile-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        ws.removeEventListener('message', handleMessage)
      }
    }

    ws.addEventListener('message', handleMessage)
  }

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleViewProfile}
        disabled={isLoading}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>Yükleniyor...</span>
          </>
        ) : (
          <>
            <User className="w-5 h-5" />
            <span>👤 Yayıncı Profili</span>
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleDownloadJSON}
        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
        title="Profil JSON'u indir"
      >
        <Download className="w-5 h-5" />
      </motion.button>
    </div>
  )
}
