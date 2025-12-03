'use client'

import { X } from 'lucide-react'

interface StatusIndicatorProps {
  isConnected: boolean
  statusText: string
  onDisconnect?: () => void
}

export default function StatusIndicator({ isConnected, statusText, onDisconnect }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        {isConnected && (
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <span className="font-medium text-gray-300">{statusText}</span>
      {isConnected && onDisconnect && (
        <button
          onClick={onDisconnect}
          className="ml-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-lg"
          title="Disconnect"
        >
          <X className="w-3 h-3" />
          Disconnect
        </button>
      )}
    </div>
  )
}