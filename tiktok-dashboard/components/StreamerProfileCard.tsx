'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { User, Shield, CheckCircle, Trophy, Medal, Users, Heart, Video, Star, Clock, Eye, TrendingUp, Calendar } from 'lucide-react'

interface StreamerProfile {
  username?: string
  nickname?: string
  profilePicture?: string
  bio?: string
  verified?: boolean
  verifiedReason?: string

  // Levels & Badges
  levels?: {
    payGrade?: number
    payScore?: number
    topVipNo?: number
    fanTicketCount?: number
    badgeCount?: number
  }
  badgeList?: Array<{name?: string, type?: number}>

  // Stats (from backend)
  stats?: {
    followers?: number
    following?: number
    videos?: number
    hearts?: number
    diggs?: number
  }

  // Profile Details
  profileDetails?: {
    constellation?: string
    accountCreateTime?: string
    accountAge?: number
    userRole?: number
  }

  // Stream Info
  stream?: {
    title?: string
    cover?: string
    status?: string
    startTime?: string
    duration?: number
    durationFormatted?: string
    currentViewers?: number
    peakViewers?: number
    totalViewers?: number
    likes?: number
  }

  // Follower Growth
  followerGrowth?: {
    initial?: number
    current?: number
    growth?: number
    percentage?: string
    peak?: number
    status?: string
  }

  // Legacy support (old format)
  followerCount?: number
  followingCount?: number
  videoCount?: number
  heartCount?: number
  payGrade?: number
  payScore?: number
  topVipNo?: number
  fanTicketCount?: number
  liveStatus?: number
  viewerCount?: number
}

interface StreamerProfileCardProps {
  profile: StreamerProfile | null
}

export default function StreamerProfileCard({ profile }: StreamerProfileCardProps) {
  if (!profile || !profile.username) {
    console.log('📱 Streamer profile loading:', profile)
    return (
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
        <div className="text-center py-4">
          <p className="text-yellow-400/70">Loading streamer profile...</p>
        </div>
      </div>
    )
  }

  // Support both new and legacy data formats
  const stats = profile.stats || {
    followers: profile.followerCount || 0,
    following: profile.followingCount || 0,
    videos: profile.videoCount || 0,
    hearts: profile.heartCount || 0
  }

  const levels = profile.levels || {
    payGrade: profile.payGrade || 0,
    payScore: profile.payScore || 0,
    topVipNo: profile.topVipNo || 0,
    fanTicketCount: profile.fanTicketCount || 0
  }

  const stream = profile.stream || {}
  const profileDetails = profile.profileDetails || {}
  const followerGrowth = profile.followerGrowth || {}

  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 text-white hover:border-yellow-500/30 transition-all">
      <div className="flex items-start gap-4 mb-4">
        {/* Profile Picture */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <Image
            src={profile.profilePicture || '/placeholder.png'}
            alt={profile.nickname || profile.username}
            fill
            className="rounded-full border-4 border-yellow-500/30 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder.png'
            }}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-yellow-400">
              {profile.nickname || profile.username}
            </h3>
            {profile.verified && (
              <CheckCircle className="w-5 h-5 text-yellow-400" fill="currentColor" />
            )}
          </div>
          <p className="text-sm text-gray-300">@{profile.username}</p>
          {profile.verifiedReason && (
            <p className="text-xs text-yellow-400/70 mt-1">✓ {profile.verifiedReason}</p>
          )}
          {profile.bio && (
            <p className="text-sm mt-2 text-gray-400 line-clamp-2">{profile.bio}</p>
          )}
          {profileDetails.accountAge && profileDetails.accountAge > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Account age: {profileDetails.accountAge} days</span>
              {profileDetails.constellation && <span className="ml-2">• {profileDetails.constellation}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stream Title (if live) */}
      {stream.status === 'live' && stream.title && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 rounded-lg border border-yellow-500/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-semibold text-yellow-400">LIVE</p>
          </div>
          <p className="text-sm mt-1 text-white">{stream.title}</p>
          {stream.durationFormatted && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{stream.durationFormatted}</span>
            </div>
          )}
        </div>
      )}

      {/* Content Statistics - Priority 1 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.videos !== undefined && stats.videos > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">Videos</div>
              <div className="text-base font-bold text-yellow-400">{stats.videos.toLocaleString()}</div>
            </div>
          </div>
        )}

        {stats.hearts !== undefined && stats.hearts > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">Hearts</div>
              <div className="text-base font-bold text-yellow-400">{stats.hearts.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Follower Stats with Growth - Priority 2 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-400">Followers</div>
            <div className="text-base font-bold text-yellow-400">{stats.followers?.toLocaleString() || 0}</div>
            {followerGrowth.growth !== undefined && followerGrowth.growth !== 0 && (
              <div className={`text-xs flex items-center gap-1 ${followerGrowth.growth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                <TrendingUp className="w-3 h-3" />
                <span>{followerGrowth.growth > 0 ? '+' : ''}{followerGrowth.growth} ({followerGrowth.percentage}%)</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
          <User className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-400">Following</div>
            <div className="text-base font-bold text-yellow-400">{stats.following?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>

      {/* Stream Metrics - Priority 2 */}
      {stream.status === 'live' && (stream.peakViewers || stream.totalViewers || stream.likes) && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stream.currentViewers !== undefined && (
            <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3 h-3" />
                <span>Now</span>
              </div>
              <div className="text-sm font-bold text-yellow-400">{stream.currentViewers.toLocaleString()}</div>
            </div>
          )}

          {stream.peakViewers !== undefined && stream.peakViewers > 0 && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3 h-3" />
                <span>Peak</span>
              </div>
              <div className="text-sm font-bold text-yellow-400">{stream.peakViewers.toLocaleString()}</div>
            </div>
          )}

          {stream.likes !== undefined && stream.likes > 0 && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Heart className="w-3 h-3" />
                <span>Likes</span>
              </div>
              <div className="text-sm font-bold text-yellow-400">{stream.likes.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* Levels & Badges */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {levels.payGrade && levels.payGrade > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">Level</div>
              <div className="text-sm font-bold text-yellow-400">Lv.{levels.payGrade}</div>
            </div>
          </div>
        )}

        {levels.fanTicketCount && levels.fanTicketCount > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">Fan Tickets</div>
              <div className="text-sm font-bold text-yellow-400">{levels.fanTicketCount.toLocaleString()}</div>
            </div>
          </div>
        )}

        {levels.topVipNo && levels.topVipNo > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">VIP No</div>
              <div className="text-sm font-bold text-yellow-400">#{levels.topVipNo}</div>
            </div>
          </div>
        )}

        {levels.payScore && levels.payScore > 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xs text-gray-400">Pay Score</div>
              <div className="text-sm font-bold text-yellow-400">{levels.payScore.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Badge List */}
      {profile.badgeList && profile.badgeList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Badges:</div>
          <div className="flex flex-wrap gap-2">
            {profile.badgeList.slice(0, 5).map((badge, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-semibold text-yellow-400"
              >
                {badge.name || `Badge ${index + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
