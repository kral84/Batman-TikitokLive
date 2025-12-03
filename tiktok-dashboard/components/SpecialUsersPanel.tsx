'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Star, UserCheck, UserPlus, Activity, Zap, Users } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface SpecialUser {
  username: string
  nickname: string
  profilePicture: string
  roles: string[] // ['moderator', 'subscriber', 'follower', 'newFollower']
  userLevel?: number
  followerCount?: number
  lastSeen?: string
  messageCount?: number
  giftValue?: number
}

interface SpecialUsersPanelProps {
  users: SpecialUser[]
}

export default function SpecialUsersPanel({ users }: SpecialUsersPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'moderator' | 'subscriber' | 'follower' | 'active'>('all')

  // Kullanıcıları filtrele
  const filteredUsers = users.filter(user => {
    if (activeTab === 'all') return true
    if (activeTab === 'moderator') return user.roles.includes('moderator')
    if (activeTab === 'subscriber') return user.roles.includes('subscriber')
    if (activeTab === 'follower') return user.roles.includes('follower')
    if (activeTab === 'active') return (user.messageCount || 0) >= 3
    return true
  })

  // Sayıları hesapla
  const counts = {
    all: users.length,
    moderator: users.filter(u => u.roles.includes('moderator')).length,
    subscriber: users.filter(u => u.roles.includes('subscriber')).length,
    follower: users.filter(u => u.roles.includes('follower')).length,
    active: users.filter(u => (u.messageCount || 0) >= 3).length
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'moderator':
        return <Shield className="w-4 h-4 text-red-600" />
      case 'subscriber':
        return <Star className="w-4 h-4 text-purple-600" />
      case 'follower':
        return <UserCheck className="w-4 h-4 text-blue-600" />
      case 'newFollower':
        return <UserPlus className="w-4 h-4 text-green-600" />
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    const badges: any = {
      moderator: { text: 'MOD', color: 'bg-red-500' },
      subscriber: { text: 'SUB', color: 'bg-purple-500' },
      follower: { text: 'FOL', color: 'bg-blue-500' },
      newFollower: { text: 'NEW', color: 'bg-green-500' }
    }
    return badges[role] || null
  }

  const TabButton = ({ tab, label, icon, count }: any) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
        activeTab === tab
          ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-gray-900 shadow-lg scale-105'
          : 'bg-gray-900 text-gray-400 hover:bg-gray-700 border border-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        activeTab === tab ? 'bg-gray-900 text-yellow-400' : 'bg-gray-700 text-gray-300'
      }`}>
        {count}
      </span>
    </button>
  )

  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
      <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
        👑 Özel Kullanıcılar
      </h3>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton
          tab="all"
          label="Hepsi"
          icon={<Users className="w-4 h-4" />}
          count={counts.all}
        />
        <TabButton
          tab="moderator"
          label="Moderatör"
          icon={<Shield className="w-4 h-4" />}
          count={counts.moderator}
        />
        <TabButton
          tab="subscriber"
          label="Abone"
          icon={<Star className="w-4 h-4" />}
          count={counts.subscriber}
        />
        <TabButton
          tab="follower"
          label="Takipçi"
          icon={<UserCheck className="w-4 h-4" />}
          count={counts.follower}
        />
        <TabButton
          tab="active"
          label="Aktif"
          icon={<Activity className="w-4 h-4" />}
          count={counts.active}
        />
      </div>

      {/* User List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Bu kategoride kullanıcı yok</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user, index) => {
              // En önemli rolü belirle
              const primaryRole = user.roles.includes('moderator')
                ? 'moderator'
                : user.roles.includes('subscriber')
                ? 'subscriber'
                : user.roles.includes('follower')
                ? 'follower'
                : 'newFollower'

              let gradientColor = 'from-gray-900/80 to-gray-800/80'
              let borderColor = 'border-gray-700'

              if (user.roles.includes('moderator')) {
                gradientColor = 'from-red-900/30 to-red-800/20'
                borderColor = 'border-red-700/50'
              } else if (user.roles.includes('subscriber')) {
                gradientColor = 'from-purple-900/30 to-purple-800/20'
                borderColor = 'border-purple-700/50'
              } else if (user.roles.includes('follower')) {
                gradientColor = 'from-blue-900/30 to-blue-800/20'
                borderColor = 'border-blue-700/50'
              }

              return (
                <motion.div
                  key={user.username}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className={`bg-gradient-to-r ${gradientColor} rounded-xl p-4 border-2 ${borderColor} hover:shadow-lg hover:border-yellow-500/30 transition-all`}
                >
                  <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <Image
                        src={user.profilePicture || '/placeholder.png'}
                        alt={user.nickname}
                        fill
                        className="rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder.png'
                        }}
                      />
                      {/* Level Badge */}
                      {user.userLevel && user.userLevel > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white">
                          {user.userLevel}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-yellow-400 truncate">
                          {user.nickname}
                        </div>
                        {/* Role Badges */}
                        <div className="flex items-center gap-1">
                          {user.roles.map(role => {
                            const badge = getRoleBadge(role)
                            if (!badge) return null
                            return (
                              <span
                                key={role}
                                className={`${badge.color} text-white text-xs px-2 py-0.5 rounded-full font-bold`}
                              >
                                {badge.text}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div className="text-sm text-gray-300 mb-2">@{user.username}</div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-300">
                        {user.followerCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>{user.followerCount.toLocaleString()}</span>
                          </div>
                        )}
                        {user.messageCount !== undefined && user.messageCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>{user.messageCount} mesaj</span>
                          </div>
                        )}
                        {user.giftValue !== undefined && user.giftValue > 0 && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="font-bold text-yellow-400">
                              💎 {user.giftValue.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Last Seen */}
                      {user.lastSeen && (
                        <div className="text-xs text-gray-500 mt-1">
                          Son görülme: {new Date(user.lastSeen).toLocaleTimeString('tr-TR')}
                        </div>
                      )}
                    </div>

                    {/* Activity Indicator */}
                    {user.messageCount && user.messageCount >= 10 && (
                      <div className="flex-shrink-0">
                        <div className="bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          ÇOK AKTİF
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t-2 border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg p-3 border-2 border-red-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-gray-300">Moderatör</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{counts.moderator}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-3 border-2 border-purple-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-gray-300">Abone</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{counts.subscriber}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-3 border-2 border-blue-700/50">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-gray-300">Takipçi</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{counts.follower}</div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-3 border-2 border-green-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-gray-300">Aktif</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{counts.active}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
