// modules/connection.js
// TikTok Live bağlantı yönetimi - HATA YÖNETİMİ EKLENDİ

const { WebcastPushConnection } = require('tiktok-live-connector');
const streamerProfile = require('./streamerProfile');

class TikTokConnection {
    constructor() {
        this.connection = null;
        this.username = null;
        this.isConnected = false;
        this.lastError = null;
    }

    // Yeni kullanıcıya bağlan
    async connect(username, callbacks = {}) {
        try {
            // Eski bağlantıyı kapat
            if (this.connection) {
                console.log('❌ Eski bağlantı kapatılıyor...');
                this.disconnect();
            }

            this.username = username;
            this.lastError = null;
            console.log(`✅ ${username} için bağlantı oluşturuluyor...`);

            // Yeni bağlantı
            this.connection = new WebcastPushConnection(username, {
                processGifts: true,
                fetchRoomInfoOnConnect: false, // <-- DÜZELTİLDİ
                enableReconnect: true,
                enableExtendedGiftInfo: true
            });

            // Bağlan
            const state = await this.connection.connect();
            
            this.isConnected = true;
            console.log(`🎉 ${username} yayınına bağlandı! (Sohbet Akışı)`);

            // Success callback
            if (callbacks.onConnect) {
                // state'i gönder, ANCAK state.roomInfo'nun
                // bu ayarla 'false' geleceğini biliyoruz.
                callbacks.onConnect(state); 
            }

            // Profil bilgilerini güncelleme satırı SİLİNDİ
            // (çünkü bu işi artık server.js yapıyor)

            return { success: true, state };

        } catch (err) {
            this.isConnected = false;
            this.lastError = err;
            
            // Hata türüne göre mesaj
            let errorMessage = '';
            let errorType = 'unknown';
            
            if (err.message.includes("isn't online") || err.name === 'UserOfflineError') {
                errorType = 'offline';
                errorMessage = `❌ ${username} şu anda yayında değil`;
                console.log(`📴 ${username} yayında değil`);
            } else if (err.message.includes('User not found') || err.message.includes('Invalid user')) {
                errorType = 'notFound';
                errorMessage = `❌ ${username} kullanıcısı bulunamadı`;
                console.log(`👤 ${username} bulunamadı`);
            } else if (err.message.includes('Rate limit')) {
                errorType = 'rateLimit';
                errorMessage = `⏰ Çok fazla istek. Lütfen biraz bekleyin.`;
                console.log('⏰ Rate limit hatası');
            } else {
                errorType = 'error';
                errorMessage = `❌ Bağlantı hatası: ${err.message}`;
                console.error('❌ Bağlantı hatası:', err.message);
            }

            // Error callback
            if (callbacks.onError) {
                callbacks.onError({
                    type: errorType,
                    message: errorMessage,
                    error: err
                });
            }

            return { 
                success: false, 
                errorType, 
                message: errorMessage,
                error: err.message 
            };
        }
    }

    // Bağlantıyı kes
    disconnect() {
        if (this.connection) {
            try {
                this.connection.disconnect();
            } catch (err) {
                console.error('⚠️ Disconnect hatası:', err.message);
            }
            this.connection = null;
            this.isConnected = false;
            this.username = null;
            console.log('🔌 Bağlantı kesildi');
        }
    }

    // Event listener ekle
    on(eventName, handler) {
        if (this.connection) {
            this.connection.on(eventName, handler);
        }
    }

    // Mevcut kullanıcı adını al
    getUsername() {
        return this.username;
    }

    // Bağlantı durumu
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            username: this.username,
            lastError: this.lastError ? {
                message: this.lastError.message,
                name: this.lastError.name
            } : null
        };
    }

    // Son hatayı al
    getLastError() {
        return this.lastError;
    }
}

module.exports = new TikTokConnection();