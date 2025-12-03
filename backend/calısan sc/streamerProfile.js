// streamerProfile.js - COMPLETE VERSION
let streamerProfile = {
    // Temel bilgiler
    username: '',
    nickname: '',
    userId: '',
    profilePicture: '',
    avatarLarge: '',
    avatarMedium: '',
    bio: '',
    
    // Sosyal istatistikler
    followerCount: 0,
    followingCount: 0,
    videoCount: 0,
    heartCount: 0,
    
    // Doğrulama
    verified: false,
    verifiedContent: '',
    verifiedReason: '',
    
    // Profil detayları
    constellation: '',
    accountCreateTime: null,
    userRole: 0,
    userAttr: {},
    
    // Seviye & Rozet
    payGrade: 0,
    payScore: 0,
    topVipNo: 0,
    fanTicketCount: 0,
    badgeList: [],
    
    // Oda bilgileri
    roomInfo: null,
    roomTitle: '',
    roomCover: '',
    
    // Yayın bilgileri
    streamStatus: 'offline',
    liveStartTime: null,
    streamDuration: 0,
    viewerCount: 0,
    totalViewers: 0,
    likeCount: 0,
    
    // Son güncelleme
    lastUpdated: null
};

function updateStreamerProfile(roomInfo) {
    if (!roomInfo) return;
    
    try {
        const roomData = roomInfo.data || roomInfo;
        const owner = roomData.owner;
        
        console.log('🔍 roomData:', roomData ? 'VAR' : 'YOK');
        console.log('👤 owner:', owner ? 'VAR' : 'YOK');
        
        if (owner) {
            // Temel bilgiler
            streamerProfile.username = owner.display_id || owner.id_str || owner.unique_id || '';
            streamerProfile.nickname = owner.nickname || owner.nick_name || '';
            streamerProfile.userId = owner.id_str || owner.id || owner.uid || '';
            
            // Avatar'lar (3 boyut)
            streamerProfile.profilePicture = owner.avatar_thumb?.url_list?.[0] || '';
            streamerProfile.avatarMedium = owner.avatar_medium?.url_list?.[0] || '';
            streamerProfile.avatarLarge = owner.avatar_large?.url_list?.[0] || '';
            
            streamerProfile.bio = owner.bio_description || owner.bio || '';
            
            // Doğrulama
            streamerProfile.verified = owner.verified || false;
            streamerProfile.verifiedContent = owner.verified_content || '';
            streamerProfile.verifiedReason = owner.verified_reason || '';
            
            // Profil detayları
            streamerProfile.constellation = owner.constellation || '';
            streamerProfile.accountCreateTime = owner.create_time ? new Date(owner.create_time * 1000) : null;
            streamerProfile.userRole = owner.user_role || 0;
            streamerProfile.userAttr = owner.user_attr || {};
            
            // Seviye & Rozet
            streamerProfile.payGrade = owner.pay_grade?.grade || owner.pay_grade || 0;
            streamerProfile.payScore = owner.pay_score || 0;
            streamerProfile.topVipNo = owner.top_vip_no || 0;
            streamerProfile.fanTicketCount = owner.fan_ticket_count || 0;
            streamerProfile.badgeList = owner.badge_list || [];
            
            // Sosyal istatistikler
            if (owner.follow_info) {
                streamerProfile.followerCount = owner.follow_info.follower_count || 0;
                streamerProfile.followingCount = owner.follow_info.following_count || 0;
            }
            
            if (owner.stats) {
                streamerProfile.followerCount = owner.stats.follower_count || streamerProfile.followerCount;
                streamerProfile.followingCount = owner.stats.following_count || streamerProfile.followingCount;
                streamerProfile.videoCount = owner.stats.video_count || 0;
                streamerProfile.heartCount = owner.stats.heart_count || 0;
            }
            
            console.log('✅ Nickname:', streamerProfile.nickname);
            console.log('✅ Takipçi:', streamerProfile.followerCount);
            console.log('✅ Hesap Oluşturma:', streamerProfile.accountCreateTime ? streamerProfile.accountCreateTime.toLocaleDateString('tr-TR') : 'Bilinmiyor');
        }
        
        // Oda bilgileri
        streamerProfile.roomInfo = roomInfo;
        streamerProfile.roomTitle = roomData.title || 'Yayın';
        streamerProfile.roomCover = roomData.cover?.url_list?.[0] || '';
        
        // Yayın bilgileri
        streamerProfile.streamStatus = roomData.status === 2 ? 'live' : 'offline';
        
        if (roomData.create_time) {
            streamerProfile.liveStartTime = new Date(roomData.create_time * 1000);
            // Yayın süresi (dakika)
            streamerProfile.streamDuration = Math.floor((Date.now() - streamerProfile.liveStartTime.getTime()) / 60000);
        }
        
        streamerProfile.likeCount = roomData.like_count || 0;
        streamerProfile.totalViewers = roomData.user_count || 0;
        streamerProfile.lastUpdated = new Date();
        
        console.log('✅ Yayın Durumu:', streamerProfile.streamStatus);
        if (streamerProfile.streamStatus === 'live') {
            console.log('✅ Yayın Başlangıç:', streamerProfile.liveStartTime.toLocaleString('tr-TR'));
            console.log('✅ Yayın Süresi:', streamerProfile.streamDuration, 'dakika');
        }
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
    }
}

function updateViewerCount(count) {
    streamerProfile.viewerCount = count;
    if (count > streamerProfile.totalViewers) {
        streamerProfile.totalViewers = count;
    }
    
    // Yayın süresini güncelle
    if (streamerProfile.liveStartTime && streamerProfile.streamStatus === 'live') {
        streamerProfile.streamDuration = Math.floor((Date.now() - streamerProfile.liveStartTime.getTime()) / 60000);
    }
}

function getProfileJSON() {
    return {
        // Temel
        username: streamerProfile.username,
        nickname: streamerProfile.nickname,
        userId: streamerProfile.userId,
        profilePicture: streamerProfile.profilePicture,
        avatarMedium: streamerProfile.avatarMedium,
        avatarLarge: streamerProfile.avatarLarge,
        bio: streamerProfile.bio,
        
        // Doğrulama
        verified: streamerProfile.verified,
        verifiedContent: streamerProfile.verifiedContent,
        verifiedReason: streamerProfile.verifiedReason,
        
        // Profil detayları
        profileDetails: {
            constellation: streamerProfile.constellation,
            accountCreateTime: streamerProfile.accountCreateTime,
            accountAge: streamerProfile.accountCreateTime 
                ? Math.floor((Date.now() - streamerProfile.accountCreateTime.getTime()) / (1000 * 60 * 60 * 24))
                : 0,
            userRole: streamerProfile.userRole
        },
        
        // Seviye & Rozet
        levels: {
            payGrade: streamerProfile.payGrade,
            payScore: streamerProfile.payScore,
            topVipNo: streamerProfile.topVipNo,
            fanTicketCount: streamerProfile.fanTicketCount,
            badgeCount: streamerProfile.badgeList.length
        },
        
        // Sosyal
        stats: {
            followers: streamerProfile.followerCount,
            following: streamerProfile.followingCount,
            videos: streamerProfile.videoCount,
            hearts: streamerProfile.heartCount
        },
        
        // Yayın
        stream: {
            title: streamerProfile.roomTitle,
            cover: streamerProfile.roomCover,
            status: streamerProfile.streamStatus,
            startTime: streamerProfile.liveStartTime,
            duration: streamerProfile.streamDuration,
            durationFormatted: formatDuration(streamerProfile.streamDuration),
            currentViewers: streamerProfile.viewerCount,
            totalViewers: streamerProfile.totalViewers,
            likes: streamerProfile.likeCount
        },
        
        lastUpdated: streamerProfile.lastUpdated
    };
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} dakika`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} saat ${mins} dakika`;
}

function generateProfileHTML(profileData) {
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };
    
    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profileData.nickname || 'Profil'} - TikTok Profil</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 30px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 20px;
        }
        .profile-header { text-align: center; margin-bottom: 40px; }
        .profile-pic {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            border: 5px solid #667eea;
            margin: 0 auto 20px;
            display: block;
            object-fit: cover;
        }
        .nickname {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .verified { color: #1da1f2; }
        .username { color: #666; font-size: 1.2rem; margin-bottom: 10px; }
        .bio { color: #555; margin: 15px 0; line-height: 1.6; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }
        .stat-value { font-size: 1.8rem; font-weight: bold; margin-bottom: 5px; }
        .stat-label { font-size: 0.9rem; opacity: 0.9; }
        .section-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
            margin: 30px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
        }
        .info-label { color: #666; font-size: 0.85rem; margin-bottom: 5px; }
        .info-value { color: #333; font-size: 1.1rem; font-weight: 600; }
        .stream-live {
            background: linear-gradient(135deg, #f093fb, #f5576c);
            color: white;
            padding: 30px;
            border-radius: 20px;
            margin: 20px 0;
        }
        .stream-offline {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
            color: white;
            padding: 20px;
            border-radius: 20px;
            text-align: center;
        }
        .live-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .live-dot {
            width: 12px;
            height: 12px;
            background: #ff0000;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .stream-title { font-size: 1.5rem; margin-bottom: 20px; }
        .stream-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }
        .stream-stat { text-align: center; }
        .stream-stat-value { font-size: 1.5rem; font-weight: bold; }
        .stream-stat-label { font-size: 0.9rem; opacity: 0.9; margin-top: 5px; }
        .btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
        }
        .btn:hover { background: #5568d3; }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-icon { font-size: 5rem; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            ${profileData.nickname ? `
            <div class="profile-header">
                <img src="${profileData.profilePicture}" alt="${profileData.nickname}" class="profile-pic"
                     onerror="this.src='https://via.placeholder.com/150'">
                <div class="nickname">
                    ${profileData.nickname}
                    ${profileData.verified ? '<span class="verified">✓</span>' : ''}
                </div>
                <div class="username">@${profileData.username}</div>
                ${profileData.bio ? `<div class="bio">${profileData.bio}</div>` : ''}
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(profileData.stats.followers)}</div>
                    <div class="stat-label">👥 Takipçi</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(profileData.stats.following)}</div>
                    <div class="stat-label">➕ Takip</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(profileData.stats.videos)}</div>
                    <div class="stat-label">🎬 Video</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(profileData.stats.hearts)}</div>
                    <div class="stat-label">❤️ Beğeni</div>
                </div>
            </div>
            
            <div class="section-title">📋 Profil Detayları</div>
            <div class="info-grid">
                ${profileData.profileDetails.constellation ? `
                <div class="info-item">
                    <div class="info-label">Burç</div>
                    <div class="info-value">${profileData.profileDetails.constellation}</div>
                </div>
                ` : ''}
                
                ${profileData.profileDetails.accountCreateTime ? `
                <div class="info-item">
                    <div class="info-label">Hesap Oluşturma</div>
                    <div class="info-value">${new Date(profileData.profileDetails.accountCreateTime).toLocaleDateString('tr-TR')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Hesap Yaşı</div>
                    <div class="info-value">${profileData.profileDetails.accountAge} gün</div>
                </div>
                ` : ''}
                
                ${profileData.levels.payGrade > 0 ? `
                <div class="info-item">
                    <div class="info-label">Seviye</div>
                    <div class="info-value">Level ${profileData.levels.payGrade}</div>
                </div>
                ` : ''}
                
                ${profileData.levels.payScore > 0 ? `
                <div class="info-item">
                    <div class="info-label">Puan</div>
                    <div class="info-value">${formatNumber(profileData.levels.payScore)}</div>
                </div>
                ` : ''}
            </div>
            
            ${profileData.stream.status === 'live' ? `
            <div class="section-title">🔴 Canlı Yayın</div>
            <div class="stream-live">
                <div class="live-badge">
                    <span class="live-dot"></span>
                    CANLI YAYIN
                </div>
                <div class="stream-title">${profileData.stream.title}</div>
                <div class="stream-stats">
                    <div class="stream-stat">
                        <div class="stream-stat-value">👁️ ${formatNumber(profileData.stream.currentViewers)}</div>
                        <div class="stream-stat-label">Anlık İzleyici</div>
                    </div>
                    <div class="stream-stat">
                        <div class="stream-stat-value">📊 ${formatNumber(profileData.stream.totalViewers)}</div>
                        <div class="stream-stat-label">Toplam İzleyici</div>
                    </div>
                    <div class="stream-stat">
                        <div class="stream-stat-value">❤️ ${formatNumber(profileData.stream.likes)}</div>
                        <div class="stream-stat-label">Beğeni</div>
                    </div>
                    <div class="stream-stat">
                        <div class="stream-stat-value">⏱️ ${profileData.stream.durationFormatted}</div>
                        <div class="stream-stat-label">Yayın Süresi</div>
                    </div>
                    <div class="stream-stat">
                        <div class="stream-stat-value">🕐 ${new Date(profileData.stream.startTime).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</div>
                        <div class="stream-stat-label">Başlangıç</div>
                    </div>
                </div>
            </div>
            ` : `
            <div class="stream-offline">
                <h3>📴 Yayın Kapalı</h3>
            </div>
            `}
            ` : `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h2>Profil Bilgisi Yok</h2>
                <p>Yayına bağlandığınızda profil bilgileri yüklenecek.</p>
            </div>
            `}
            
            <button class="btn" onclick="downloadJSON()">💾 JSON İndir</button>
        </div>
    </div>
    
    <script>
        function downloadJSON() {
            const data = ${JSON.stringify(profileData, null, 2)};
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tiktok-profile-${profileData.username}-${Date.now()}.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    </script>
</body>
</html>`;
}

module.exports = {
    streamerProfile,
    updateStreamerProfile,
    updateViewerCount,
    getProfileJSON,
    generateProfileHTML
};