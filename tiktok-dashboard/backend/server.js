const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// TikTok bağlantısı
let tiktokConnection = null;
let isConnected = false;

// Anlık istatistikler
let stats = {
    viewers: 0,
    likes: 0,
    comments: 0,
    gifts: 0,
    revenue: 0,
    followers: 0,
    shares: 0,
    startTime: null,
    peakViewers: 0
};

// Tarihçe (son 60 dakika)
let viewerHistory = [];
let revenueHistory = [];

// Top fanlar
let topFans = {};

// Son yorumlar (max 100)
let recentComments = [];
const MAX_COMMENTS = 100;

// ===========================================
// TIKTOK BAĞLANTISI
// ===========================================

function connectToTikTok(username) {
    if (tiktokConnection) {
        tiktokConnection.disconnect();
    }

    console.log(`🔌 Connecting to @${username}...`);

    tiktokConnection = new TikTokLiveConnection(username, {
        processInitialData: true,
        enableExtendedGiftInfo: true,
        fetchRoomInfoOnConnect: true
    });

    // İstatistikleri sıfırla
    stats = {
        viewers: 0,
        likes: 0,
        comments: 0,
        gifts: 0,
        revenue: 0,
        followers: 0,
        shares: 0,
        startTime: new Date(),
        peakViewers: 0
    };
    topFans = {};
    recentComments = [];

    // BAĞLANTI
    tiktokConnection.on(ControlEvent.CONNECTED, async (state) => {
        isConnected = true;
        console.log(`✅ Connected! Room ID: ${state.roomId}`);

        // Room bilgilerini al
        try {
            const roomInfo = await tiktokConnection.fetchRoomInfo();
            const data = roomInfo.data;

            io.emit('room_info', {
                roomId: data.id_str,
                title: data.title,
                owner: {
                    username: data.owner.display_id,
                    nickname: data.owner.nickname,
                    avatar: data.owner.avatar_large.url_list[0],
                    followers: data.owner.follow_info.follower_count,
                    verified: data.owner.verified
                },
                game: data.game_tag?.[0]?.show_name || null,
                category: data.hashtag?.title || null
            });
        } catch (err) {
            console.error('Room info error:', err.message);
        }

        io.emit('connection_status', { connected: true, username });
    });

    tiktokConnection.on(ControlEvent.DISCONNECTED, () => {
        isConnected = false;
        console.log('🔌 Disconnected');
        io.emit('connection_status', { connected: false });
    });

    tiktokConnection.on(ControlEvent.ERROR, (err) => {
        console.error('❌ Error:', err.message);
        io.emit('error', { message: err.message });
    });

    // İZLEYİCİ SAYISI
    tiktokConnection.on(WebcastEvent.ROOM_USER, (data) => {
        stats.viewers = data.viewerCount || 0;
        if (stats.viewers > stats.peakViewers) {
            stats.peakViewers = stats.viewers;
        }
        io.emit('stats_update', stats);
    });

    // YORUM
    tiktokConnection.on(WebcastEvent.CHAT, (data) => {
        stats.comments++;

        const comment = {
            id: data.msgId,
            username: data.user.uniqueId,
            nickname: data.user.nickname,
            comment: data.comment,
            avatar: data.user.profilePicture?.url?.[0] || '',
            timestamp: new Date().toISOString(),
            isFollower: data.userIdentity?.isFollowerOfAnchor || false,
            isModerator: data.userIdentity?.isModeratorOfAnchor || false,
            isSubscriber: data.userIdentity?.isSubscriberOfAnchor || false,
            level: data.user.badges?.[0]?.combine?.str || '0'
        };

        // Chat feed'e ekle
        recentComments.push(comment);
        if (recentComments.length > MAX_COMMENTS) {
            recentComments.shift();
        }

        io.emit('chat', comment);
        io.emit('stats_update', stats);
    });

    // BEĞENİ
    tiktokConnection.on(WebcastEvent.LIKE, (data) => {
        stats.likes += data.likeCount || 1;
        io.emit('like', {
            username: data.user.uniqueId,
            count: data.likeCount,
            total: data.totalLikeCount
        });
        io.emit('stats_update', stats);
    });

    // TAKİP
    tiktokConnection.on(WebcastEvent.SOCIAL, (data) => {
        if (data.action === "1") { // Follow
            stats.followers++;
            io.emit('follower', {
                username: data.user.uniqueId,
                nickname: data.user.nickname
            });
            io.emit('stats_update', stats);
        } else if (data.action === "2") { // Share
            stats.shares++;
            io.emit('share', {
                username: data.user.uniqueId
            });
            io.emit('stats_update', stats);
        }
    });

    // HEDİYE
    tiktokConnection.on(WebcastEvent.GIFT, (data) => {
        if (!data.gift || !data.gift.diamondCount) return;

        stats.gifts++;
        const diamondValue = data.gift.diamondCount * (data.repeatCount || 1);
        const usdValue = diamondValue * 0.005; // 1 diamond = $0.005
        stats.revenue += usdValue;

        // Top fan güncelle
        const username = data.user.uniqueId;
        if (!topFans[username]) {
            topFans[username] = {
                username: username,
                nickname: data.user.nickname,
                avatar: data.user.profilePicture?.url?.[0] || '',
                totalDiamonds: 0,
                totalGifts: 0,
                totalUSD: 0
            };
        }
        topFans[username].totalDiamonds += diamondValue;
        topFans[username].totalGifts++;
        topFans[username].totalUSD += usdValue;

        io.emit('gift', {
            username: username,
            nickname: data.user.nickname,
            giftName: data.gift.name,
            giftId: data.gift.id,
            repeatCount: data.repeatCount,
            diamondValue: diamondValue,
            usdValue: usdValue,
            giftImage: data.gift.giftPictureUrl,
            repeatEnd: data.repeatEnd === 1
        });

        // Top fanları gönder
        const topFansList = Object.values(topFans)
            .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
            .slice(0, 10);
        io.emit('top_fans', topFansList);

        io.emit('stats_update', stats);
    });

    // MEMBER (Katılım)
    tiktokConnection.on(WebcastEvent.MEMBER, (data) => {
        io.emit('member_join', {
            username: data.user.uniqueId,
            nickname: data.user.nickname,
            isFollower: data.userIdentity?.isFollowerOfAnchor || false
        });
    });

    // Bağlan
    tiktokConnection.connect().catch(err => {
        console.error('Connection failed:', err.message);
        io.emit('error', { message: err.message });
    });
}

// ===========================================
// PERIYODIK GÖREVLER
// ===========================================

// Her dakika viewer history'ye ekle
setInterval(() => {
    if (isConnected) {
        const now = new Date();
        viewerHistory.push({
            timestamp: now.toISOString(),
            viewers: stats.viewers
        });

        // Son 60 dakika tut
        if (viewerHistory.length > 60) {
            viewerHistory.shift();
        }

        revenueHistory.push({
            timestamp: now.toISOString(),
            revenue: stats.revenue
        });

        if (revenueHistory.length > 60) {
            revenueHistory.shift();
        }

        io.emit('history_update', {
            viewers: viewerHistory,
            revenue: revenueHistory
        });
    }
}, 60000); // Her 1 dakika

// ===========================================
// SOCKET.IO EVENTS
// ===========================================

io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);

    // Mevcut verileri gönder
    socket.emit('stats_update', stats);
    socket.emit('connection_status', { connected: isConnected });
    socket.emit('recent_comments', recentComments);

    const topFansList = Object.values(topFans)
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
        .slice(0, 10);
    socket.emit('top_fans', topFansList);

    socket.emit('history_update', {
        viewers: viewerHistory,
        revenue: revenueHistory
    });

    socket.on('disconnect', () => {
        console.log('👤 Client disconnected:', socket.id);
    });
});

// ===========================================
// REST API ENDPOINTS
// ===========================================

app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        stats: stats,
        uptime: stats.startTime ? Date.now() - stats.startTime.getTime() : 0
    });
});

app.post('/api/connect', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }

    connectToTikTok(username);
    res.json({ success: true, message: `Connecting to @${username}...` });
});

app.post('/api/disconnect', (req, res) => {
    if (tiktokConnection) {
        tiktokConnection.disconnect();
        isConnected = false;
    }
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    res.json(stats);
});

app.get('/api/top-fans', (req, res) => {
    const topFansList = Object.values(topFans)
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
        .slice(0, 20);
    res.json(topFansList);
});

app.get('/api/comments', (req, res) => {
    res.json(recentComments);
});

// ===========================================
// SERVER START
// ===========================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('🚀 TikTok Live Dashboard Server');
    console.log('='.repeat(50));
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO ready`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET  /api/status`);
    console.log(`   POST /api/connect`);
    console.log(`   POST /api/disconnect`);
    console.log(`   GET  /api/stats`);
    console.log(`   GET  /api/top-fans`);
    console.log(`   GET  /api/comments`);
    console.log('='.repeat(50));
});
