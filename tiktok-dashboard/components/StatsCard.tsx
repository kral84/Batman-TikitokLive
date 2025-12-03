'use client'

import { motion } from 'framer-motion'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}

export default function StatsCard({ icon, label, value, color }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 border-2 border-gray-700 rounded-xl shadow-lg p-6 hover:border-yellow-500/30 hover:shadow-xl transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${color} text-white p-3 rounded-lg shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-yellow-400 mb-1">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400 font-medium">
        {label}
      </div>
    </motion.div>
  )
}
