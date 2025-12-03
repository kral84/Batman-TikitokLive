'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Bat {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  wingAngle: number
  wingSpeed: number
  size: number
  rotation: number
  flapPhase: number
  energy: number
  glideTime: number
}

export default function RealisticBats() {
  const [bats, setBats] = useState<Bat[]>([])

  useEffect(() => {
    // Yarasaları oluştur
    const initialBats: Bat[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      velocityX: (Math.random() - 0.5) * 3,
      velocityY: (Math.random() - 0.5) * 2,
      wingAngle: 0,
      wingSpeed: 0.12 + Math.random() * 0.08,
      size: 0.7 + Math.random() * 0.8,
      rotation: Math.random() * 360,
      flapPhase: Math.random() * Math.PI * 2,
      energy: Math.random() * 100,
      glideTime: 0
    }))
    setBats(initialBats)

    // Gelişmiş fizik motoru
    const physicsEngine = setInterval(() => {
      setBats(prev => prev.map(bat => {
        // Kanat çırpma fazı
        const newFlapPhase = bat.flapPhase + bat.wingSpeed
        const wingCycle = Math.sin(newFlapPhase)
        
        // Kanat çırpma enerjisi
        let newEnergy = bat.energy
        let newGlideTime = bat.glideTime
        
        // Kanat çırparken enerji harca
        if (wingCycle > 0) {
          newEnergy -= 0.5
          newGlideTime = 0
        } else {
          // Süzülürken enerji kazan
          newEnergy += 0.3
          newGlideTime += 1
        }
        
        // Enerji limitleri
        newEnergy = Math.max(0, Math.min(100, newEnergy))
        
        // Kanat çırpma gücü (enerji seviyesine bağlı)
        const flapPower = (newEnergy / 100) * 0.4
        const liftForce = wingCycle > 0 ? wingCycle * flapPower : 0
        
        // Yerçekimi
        const gravity = 0.08
        
        // Hava sürtünmesi
        const drag = 0.98
        
        // Yeni hız hesaplama
        let newVelocityX = bat.velocityX * drag
        let newVelocityY = (bat.velocityY + gravity - liftForce) * drag
        
        // Süzülme durumunda daha az direnç
        if (newGlideTime > 20) {
          newVelocityY *= 0.99
        }
        
        // Yeni pozisyon
        let newX = bat.x + newVelocityX
        let newY = bat.y + newVelocityY
        
        // Sınır kontrolü ve esnek çarpma
        if (newX < 0) {
          newX = 0
          newVelocityX = Math.abs(newVelocityX) * 0.7
        } else if (newX > 100) {
          newX = 100
          newVelocityX = -Math.abs(newVelocityX) * 0.7
        }
        
        if (newY < 0) {
          newY = 0
          newVelocityY = Math.abs(newVelocityY) * 0.7
        } else if (newY > 100) {
          newY = 100
          newVelocityY = -Math.abs(newVelocityY) * 0.7
          // Yerden zıpladığında enerji kazan
          newEnergy = Math.min(100, newEnergy + 20)
        }
        
        // Hareket yönüne göre rotasyon
        const targetRotation = Math.atan2(newVelocityY, newVelocityX) * (180 / Math.PI)
        const newRotation = bat.rotation + (targetRotation - bat.rotation) * 0.1
        
        // Kanat açısı (çırpma döngüsüne göre)
        const newWingAngle = wingCycle * 55 // -55 ile +55 derece arası
        
        return {
          ...bat,
          x: newX,
          y: newY,
          velocityX: newVelocityX,
          velocityY: newVelocityY,
          wingAngle: newWingAngle,
          flapPhase: newFlapPhase,
          rotation: newRotation,
          energy: newEnergy,
          glideTime: newGlideTime
        }
      }))
    }, 33) // 30 FPS

    return () => clearInterval(physicsEngine)
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-black">
      {/* Ay ışığı */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-50 rounded-full blur-xl opacity-30" />
      
      {/* Yıldızlar */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 80}%`,
              opacity: 0.3 + Math.random() * 0.7
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      {/* Ultra gerçekçi yarasalar */}
      {bats.map((bat) => {
        const isFlapping = bat.wingAngle > 0
        const isGliding = bat.glideTime > 20
        
        return (
          <motion.div
            key={bat.id}
            className="absolute pointer-events-none"
            style={{
              left: `${bat.x}%`,
              top: `${bat.y}%`,
              rotate: bat.rotation,
              filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.5))`
            }}
            animate={{
              scale: isGliding ? [1, 1.05, 1] : 1
            }}
            transition={{
              duration: 2,
              repeat: isGliding ? Infinity : 0
            }}
          >
            <svg
              width={bat.size * 60}
              height={bat.size * 45}
              viewBox="0 0 120 90"
              className="drop-shadow-2xl"
            >
              <defs>
                <radialGradient id={`batGrad${bat.id}`}>
                  <stop offset="0%" stopColor="#2a2a2a" />
                  <stop offset="100%" stopColor="#0a0a0a" />
                </radialGradient>
                <filter id={`glow${bat.id}`}>
                  <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Vücut - detaylı */}
              <ellipse 
                cx="60" 
                cy="45" 
                rx="10" 
                ry="16" 
                fill={`url(#batGrad${bat.id})`}
              />
              
              {/* Kafa */}
              <ellipse cx="60" cy="35" rx="8" ry="9" fill="#0a0a0a" />
              
              {/* Kulaklar - pointed */}
              <path 
                d="M 55 30 L 52 22 L 56 30" 
                fill="#0a0a0a"
              />
              <path 
                d="M 65 30 L 68 22 L 64 30" 
                fill="#0a0a0a"
              />
              
              {/* Gözler - kırmızı parlama */}
              <circle cx="57" cy="34" r="1.5" fill="#ff0000" opacity="0.9" filter={`url(#glow${bat.id})`} />
              <circle cx="63" cy="34" r="1.5" fill="#ff0000" opacity="0.9" filter={`url(#glow${bat.id})`} />
              
              {/* Sol Kanat - AÇILIP KAPANAN */}
              <g>
                {/* Ana kanat zarı - DİNAMİK */}
                <motion.path
                  animate={{
                    d: bat.wingAngle > 0 
                      ? "M 50 45 Q 30 20, 8 35 Q 5 42, 10 48 Q 20 52, 30 50 Q 40 48, 50 50"
                      : "M 50 45 Q 42 38, 35 40 Q 32 43, 35 46 Q 40 48, 45 47 Q 48 46, 50 50"
                  }}
                  fill="#000000"
                  fillOpacity="0.9"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  transition={{ 
                    duration: 0.15,
                    ease: "easeOut"
                  }}
                />
                
                {/* Kanat kemikleri - AÇILIP KAPANAN */}
                <motion.line 
                  x1="50" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 30 : 40,
                    y2: bat.wingAngle > 0 ? 25 : 38
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                <motion.line 
                  x1="50" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 20 : 38,
                    y2: bat.wingAngle > 0 ? 35 : 42
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                <motion.line 
                  x1="50" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 15 : 36,
                    y2: bat.wingAngle > 0 ? 45 : 45
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                
                {/* Alt kanat bölümü - DİNAMİK */}
                <motion.path
                  animate={{
                    d: bat.wingAngle > 0
                      ? "M 50 50 Q 40 58, 25 60 Q 20 56, 25 52 Q 35 50, 50 50"
                      : "M 50 50 Q 47 53, 42 54 Q 40 52, 42 50 Q 46 49, 50 50"
                  }}
                  fill="#000000"
                  fillOpacity="0.85"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  transition={{ duration: 0.15 }}
                />
              </g>
              
              {/* Sağ Kanat - AÇILIP KAPANAN */}
              <g>
                {/* Ana kanat zarı - DİNAMİK */}
                <motion.path
                  animate={{
                    d: bat.wingAngle > 0 
                      ? "M 70 45 Q 90 20, 112 35 Q 115 42, 110 48 Q 100 52, 90 50 Q 80 48, 70 50"
                      : "M 70 45 Q 78 38, 85 40 Q 88 43, 85 46 Q 80 48, 75 47 Q 72 46, 70 50"
                  }}
                  fill="#000000"
                  fillOpacity="0.9"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  transition={{ 
                    duration: 0.15,
                    ease: "easeOut"
                  }}
                />
                
                {/* Kanat kemikleri - AÇILIP KAPANAN */}
                <motion.line 
                  x1="70" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 90 : 80,
                    y2: bat.wingAngle > 0 ? 25 : 38
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                <motion.line 
                  x1="70" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 100 : 82,
                    y2: bat.wingAngle > 0 ? 35 : 42
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                <motion.line 
                  x1="70" 
                  y1="45" 
                  animate={{
                    x2: bat.wingAngle > 0 ? 105 : 84,
                    y2: bat.wingAngle > 0 ? 45 : 45
                  }}
                  stroke="#2a2a2a" 
                  strokeWidth="1" 
                  opacity="0.6"
                  transition={{ duration: 0.15 }}
                />
                
                {/* Alt kanat bölümü - DİNAMİK */}
                <motion.path
                  animate={{
                    d: bat.wingAngle > 0
                      ? "M 70 50 Q 80 58, 95 60 Q 100 56, 95 52 Q 85 50, 70 50"
                      : "M 70 50 Q 73 53, 78 54 Q 80 52, 78 50 Q 74 49, 70 50"
                  }}
                  fill="#000000"
                  fillOpacity="0.85"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  transition={{ duration: 0.15 }}
                />
              </g>
              
              {/* Kuyruk */}
              <path
                d="M 60 60 L 58 70 L 60 72 L 62 70 Z"
                fill="#0a0a0a"
              />
              
              {/* Bacaklar */}
              <line x1="57" y1="58" x2="56" y2="65" stroke="#0a0a0a" strokeWidth="1.5" />
              <line x1="63" y1="58" x2="64" y2="65" stroke="#0a0a0a" strokeWidth="1.5" />
              
              {/* Pençeler */}
              <path d="M 56 65 L 54 67 M 56 65 L 56 68 M 56 65 L 58 67" stroke="#0a0a0a" strokeWidth="0.5" />
              <path d="M 64 65 L 62 67 M 64 65 L 64 68 M 64 65 L 66 67" stroke="#0a0a0a" strokeWidth="0.5" />
              
              {/* Vücut detayları - tüyler */}
              <circle cx="60" cy="42" r="1" fill="#1a1a1a" opacity="0.5" />
              <circle cx="60" cy="46" r="1" fill="#1a1a1a" opacity="0.5" />
              <circle cx="60" cy="50" r="1" fill="#1a1a1a" opacity="0.5" />
            </svg>

            {/* Enerji göstergesi (geliştirme için) */}
            {/* <div 
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-700 rounded-full overflow-hidden"
            >
              <div 
                className="h-full bg-red-500"
                style={{ width: `${bat.energy}%` }}
              />
            </div> */}
          </motion.div>
        )
      })}

      {/* Yer - silüet */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent">
        {/* Ağaç silüetleri */}
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1000 100">
          <path d="M 0 100 L 0 60 L 50 40 L 80 60 L 100 50 L 130 70 L 150 100 Z" fill="#0a0a0a" opacity="0.8" />
          <path d="M 150 100 L 150 50 L 180 30 L 200 45 L 220 35 L 240 100 Z" fill="#0a0a0a" opacity="0.8" />
          <path d="M 800 100 L 800 45 L 830 25 L 860 40 L 890 30 L 920 55 L 950 100 Z" fill="#0a0a0a" opacity="0.8" />
          <path d="M 600 100 L 600 55 L 640 35 L 670 50 L 700 100 Z" fill="#0a0a0a" opacity="0.8" />
        </svg>
      </div>

      {/* Sis efekti */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 w-64 h-64 bg-gray-700/10 rounded-full blur-3xl"
            style={{ left: `${i * 18}%` }}
            animate={{
              y: [0, -30, -60, -90],
              opacity: [0.3, 0.4, 0.2, 0],
              scale: [1, 1.3, 1.6, 2]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.2,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* Atmosferik ışık efektleri */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="absolute top-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl opacity-10" />
      </motion.div>
    </div>
  )
}