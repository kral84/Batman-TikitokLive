const { WebcastPushConnection } = require('tiktok-live-connector');
const WebSocket = require('ws');

// WebSocket sunucusu oluştur
const wss = new WebSocket.Server({ port: 8080 });

// Bağlı clientları takip et
let connectedClients = new Set();

wss.on('connection', (ws) => {
    console.log('✅ Yeni client bağlandı');
    connectedClients.add(ws);
    
    // Client bağlandığında bilgi gönder
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'WebSocket sunucusuna bağlandınız'
    }));
    
    ws.on('close', () => {
        console.log('❌ Client bağlantısı kesildi');
        connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket hatası:', error);
        connectedClients.delete(ws);
    });
});

// Tüm clientlara mesaj gönder
function broadcast(data) {
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// TikTok Live bağlantısı
let tiktokUsername = 'hasbulla_hushetskiy'; // Buraya istediğiniz kullanıcı adını yazın
let tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

// Bağlantı başarılı
tiktokLiveConnection.connect().then(state => {
    console.info(`🎉 ${tiktokUsername} kullanıcısına bağlanıldı!`);
    broadcast({
        type: 'status',
        message: `${tiktokUsername} kullanıcısına bağlanıldı`,
        connected: true
    });
}).catch(err => {
    console.error('❌ Bağlantı hatası:', err);
    broadcast({
        type: 'error',
        message: 'TikTok Live bağlantısı kurulamadı',
        error: err.message
    });
});

// Bağlantı kesildiğinde
tiktokLiveConnection.on('disconnected', () => {
    console.log('⚠️ TikTok Live bağlantısı kesildi');
    broadcast({
        type: 'status',
        message: 'Bağlantı kesildi',
        connected: false
    });
});

// Chat mesajları
tiktokLiveConnection.on('chat', data => {
    console.log(`💬 ${data.uniqueId}: ${data.comment}`);
    broadcast({
        type: 'chat',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            message: data.comment,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// Hediyeler
tiktokLiveConnection.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) {
        // Combo hediyeler için sadece son değeri göster
        return;
    }
    
    console.log(`🎁 ${data.uniqueId} hediye gönderdi: ${data.giftName} x${data.repeatCount}`);
    broadcast({
        type: 'gift',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            giftName: data.giftName,
            giftId: data.giftId,
            repeatCount: data.repeatCount,
            diamondCount: data.diamondCount,
            giftPictureUrl: data.giftPictureUrl,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// Takip edilme
tiktokLiveConnection.on('social', data => {
    console.log(`👤 ${data.uniqueId} takip etti!`);
    broadcast({
        type: 'follow',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// Paylaşım
tiktokLiveConnection.on('share', data => {
    console.log(`📤 ${data.uniqueId} yayını paylaştı!`);
    broadcast({
        type: 'share',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// Beğeni
tiktokLiveConnection.on('like', data => {
    console.log(`❤️ ${data.uniqueId} beğendi (${data.likeCount} beğeni)`);
    broadcast({
        type: 'like',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            likeCount: data.likeCount,
            totalLikeCount: data.totalLikeCount,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// Katılım
tiktokLiveConnection.on('member', data => {
    console.log(`👋 ${data.uniqueId} yayına katıldı!`);
    broadcast({
        type: 'member',
        data: {
            username: data.uniqueId,
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            timestamp: new Date().toISOString()
        }
    });
});

// İzleyici sayısı
tiktokLiveConnection.on('roomUser', data => {
    console.log(`👥 İzleyici sayısı: ${data.viewerCount}`);
    broadcast({
        type: 'viewerCount',
        data: {
            viewerCount: data.viewerCount,
            timestamp: new Date().toISOString()
        }
    });
});

console.log('🚀 WebSocket sunucusu 8080 portunda çalışıyor...');
console.log('📱 Frontend için: ws://localhost:8080');
