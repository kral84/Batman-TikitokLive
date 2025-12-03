// modules/stats.js
// İstatistik toplama ve yönetimi - TAM VERSİYON

const fs = require('fs');
const path = require('path');

class StatsManager {
    constructor(username = null, streamId = null) {
        this.reset();

        // StreamerProfile cache (10 dakika)
        this.streamerProfileCache = null;
        this.streamerProfileCacheTime = null;
        this.streamerProfileCacheInterval = 10 * 60 * 1000; // 10 dakika

        // ✅ Anlık kayıt için
        this.username = username;
        this.streamId = streamId;
        this.streamFolder = null;
        this.snapshotTimeout = null;

        // Klasör oluştur
        if (username && streamId) {
            this.streamFolder = path.join('./kayitlar', username, streamId);
            try {
                fs.mkdirSync(this.streamFolder, { recursive: true });
                console.log(`✅ Stats klasörü oluşturuldu: ${this.streamFolder}`);

                // İlk snapshot kaydet
                this.saveSnapshot();
            } catch (err) {
                console.error('❌ Stats klasör oluşturma hatası:', err);
            }
        }
    }

    reset() {
        this.streamStartTime = null;
        this.currentRoomInfo = null;
        this.currentViewerCount = 0;
        this.totalUserCount = 0; // Toplam giren kullanıcı

        this.stats = {
            // Temel
            totalDiamonds: 0,
            totalGifts: 0,
            totalMessages: 0,
            totalLikes: 0,
            totalShares: 0,
            totalFollows: 0,
            totalSubscribes: 0,
            currentViewers: 0,
            peakViewers: 0,
            peakViewersTime: null,
            totalUserJoined: 0, // Toplam katılan

            // Kullanıcılar
            uniqueUsers: new Set(),
            uniqueGifters: new Set(),
            uniqueChatters: new Set(),
            moderators: new Set(),
            subscribers: new Set(),
            followers: new Set(),
            newFollowers: new Set(),

            // 🔥 YENİ: Detaylı kullanıcı bilgileri (GELİŞTİRİLMİŞ)
            userDetails: {},

            // Leaderboards
            topGifters: {},
            topChatters: {},
            topLikers: {},
            topViewers: [], // Anlık top gifter listesi

            // Gift analizi
            giftAnalysis: {},
            expensiveGifts: [],

            // Chat analizi
            wordCount: {},
            emojiCount: {},
            messages: [],

            // 🌍 YENİ: Bölgesel Dağılım (fromIdc)
            regionStats: {},

            // 📍 YENİ: Trafik Kaynakları (clientEnterSource)
            trafficSources: {},

            // Zaman serisi
            viewersByMinute: [],
            messagesByMinute: [],
            giftsByMinute: [],

            // Hedefler (Daha gerçekçi değerler)
            goals: {
                viewers: { target: 1000, achieved: false },
                gifts: { target: 50, achieved: false }  // $50 USD
            }
        };
    }

    // 💬 Chat mesajı ekle (GELİŞTİRİLMİŞ)
    addChatMessage(data) {
        this.stats.totalMessages++;
        this.stats.uniqueUsers.add(data.uniqueId);
        this.stats.uniqueChatters.add(data.uniqueId);

        // Mesajı kaydet
        this.stats.messages.push({
            username: data.uniqueId,
            message: data.comment,
            timestamp: Date.now()
        });

        // ✅ Memory limiti - Son 500 mesaj
        if (this.stats.messages.length > 500) {
            this.stats.messages.shift(); // İlk elemanı çıkar
        }

        // Kelime analizi
        const words = data.comment.split(/\s+/);
        words.forEach(word => {
            word = word.toLowerCase().replace(/[^\w\s]/g, '');
            if (word.length > 3) {
                this.stats.wordCount[word] = (this.stats.wordCount[word] || 0) + 1;
            }
        });

        // Emoji analizi
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
        const emojis = data.comment.match(emojiRegex);
        if (emojis) {
            emojis.forEach(emoji => {
                this.stats.emojiCount[emoji] = (this.stats.emojiCount[emoji] || 0) + 1;
            });
        }

        // Chatter sayacı
        this.stats.topChatters[data.uniqueId] = (this.stats.topChatters[data.uniqueId] || 0) + 1;

        // 🌍 Bölge istatistiği (fromIdc)
        const region = data.fromIdc || 'unknown';
        if (!this.stats.regionStats[region]) {
            this.stats.regionStats[region] = { messages: 0, users: new Set() };
        }
        this.stats.regionStats[region].messages++;
        this.stats.regionStats[region].users.add(data.uniqueId);

        // Kullanıcı detayları
        this.updateUserDetails(data.uniqueId, {
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            messageCount: this.stats.topChatters[data.uniqueId],
            // YENİ ALANLAR
            followerCount: data.followInfo?.followerCount || 0,
            gifterLevel: data.gifterLevel || 0,
            topGifterRank: data.topGifterRank || null,
            region: region,
            heatLevel: data.roomMessageHeatLevel || 0,
            // Roller (ÇOK ÖNEMLİ!)
            isModerator: data.userIdentity?.isModeratorOfAnchor || false,
            isSubscriber: data.userIdentity?.isSubscriberOfAnchor || false,
            isFollower: data.userIdentity?.isFollowerOfAnchor || false
        });

        // Roller
        if (data.userIdentity?.isModeratorOfAnchor) {
            this.stats.moderators.add(data.uniqueId);
        }
        if (data.userIdentity?.isSubscriberOfAnchor) {
            this.stats.subscribers.add(data.uniqueId);
        }
        if (data.userIdentity?.isFollowerOfAnchor) {
            this.stats.followers.add(data.uniqueId);
        }

        // ✅ Snapshot schedule et
        this.scheduleSnapshot();
    }

    // 🎁 Hediye ekle (GELİŞTİRİLMİŞ)
    addGift(data) {
        const diamondValue = (data.diamondCount || 0) * (data.repeatCount || 1);

        this.stats.totalGifts++;
        this.stats.totalDiamonds += diamondValue;
        this.stats.uniqueUsers.add(data.uniqueId);
        this.stats.uniqueGifters.add(data.uniqueId);

        // Top gifters
        this.stats.topGifters[data.uniqueId] = (this.stats.topGifters[data.uniqueId] || 0) + diamondValue;

        // Gift analizi
        const giftName = data.giftName;
        if (!this.stats.giftAnalysis[giftName]) {
            this.stats.giftAnalysis[giftName] = {
                name: giftName,
                count: 0,
                totalDiamonds: 0,
                gifters: new Set()
            };
        }
        this.stats.giftAnalysis[giftName].count += data.repeatCount || 1;
        this.stats.giftAnalysis[giftName].totalDiamonds += diamondValue;
        this.stats.giftAnalysis[giftName].gifters.add(data.uniqueId);

        // Pahalı hediyeler
        if (diamondValue >= 100) {
            this.stats.expensiveGifts.push({
                username: data.uniqueId,
                nickname: data.nickname,
                giftName: giftName,
                totalDiamonds: diamondValue,
                usd: (diamondValue * 0.005).toFixed(2),
                timestamp: Date.now()
            });

            // ✅ Memory limiti - Son 100 pahalı hediye
            if (this.stats.expensiveGifts.length > 100) {
                this.stats.expensiveGifts.shift(); // İlk elemanı çıkar
            }
        }

        // Kullanıcı detayları
        this.updateUserDetails(data.uniqueId, {
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            giftValue: this.stats.topGifters[data.uniqueId],
            // YENİ ALANLAR
            totalDiamond: data.user?.userHonor?.totalDiamond || 0,
            followerCount: data.followInfo?.followerCount || 0,
            // Roller (GIFT'te de var)
            isModerator: data.userIdentity?.isModeratorOfAnchor || false,
            isSubscriber: data.userIdentity?.isSubscriberOfAnchor || false,
            isFollower: data.userIdentity?.isFollowerOfAnchor || false
        });

        // ✅ Snapshot schedule et
        this.scheduleSnapshot();
    }

    // ❤️ Beğeni ekle
    addLike(data) {
        this.stats.totalLikes += data.likeCount || 1;
        this.stats.uniqueUsers.add(data.uniqueId);
        this.stats.topLikers[data.uniqueId] = (this.stats.topLikers[data.uniqueId] || 0) + (data.likeCount || 1);
    }

    // 👥 Takip ekle (GELİŞTİRİLMİŞ)
    addFollow(data) {
        this.stats.totalFollows++;
        this.stats.newFollowers.add(data.uniqueId);
        this.stats.uniqueUsers.add(data.uniqueId);

        // Takipçi bilgilerini kaydet
        this.updateUserDetails(data.uniqueId, {
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            followerCount: data.followInfo?.followerCount || 0,
            totalDiamond: data.user?.userHonor?.totalDiamond || 0,
            enterSource: data.clientEnterSource || 'unknown'
        });
    }

    // 📤 Paylaşım ekle
    addShare(data) {
        this.stats.totalShares++;
        this.stats.uniqueUsers.add(data.uniqueId);
    }

    // 💎 Abone ekle (YENİ)
    addSubscriber(data) {
        this.stats.totalSubscribes++;
        this.stats.subscribers.add(data.uniqueId);
        this.stats.uniqueUsers.add(data.uniqueId);
    }

    // 🚪 Yeni üye ekle (YENİ - ÇOK ÖNEMLİ!)
    addMember(data, extraData = {}) {
        this.stats.totalUserJoined++;
        this.stats.uniqueUsers.add(data.uniqueId);

        // 📍 Trafik Kaynağı İstatistiği
        const trafficSource = extraData.enterSource || data.clientEnterSource || 'unknown';
        if (!this.stats.trafficSources[trafficSource]) {
            this.stats.trafficSources[trafficSource] = {
                count: 0,
                users: new Set()
            };
        }
        this.stats.trafficSources[trafficSource].count++;
        this.stats.trafficSources[trafficSource].users.add(data.uniqueId);

        // Kullanıcı detaylarını kaydet
        this.updateUserDetails(data.uniqueId, {
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,
            userLevel: extraData.userLevel || 0,
            followerCount: extraData.followerCount || 0,
            totalDiamond: extraData.totalDiamond || 0,
            enterSource: trafficSource,
            enterType: extraData.enterType || 'unknown',
            isModerator: extraData.isModerator || false,
            isSubscriber: extraData.isSubscriber || false,
            isFollower: extraData.isFollower || false
        });

        // Roller
        if (extraData.isModerator) this.stats.moderators.add(data.uniqueId);
        if (extraData.isSubscriber) this.stats.subscribers.add(data.uniqueId);
        if (extraData.isFollower) this.stats.followers.add(data.uniqueId);
    }

    // 👁️ İzleyici sayısını güncelle (GELİŞTİRİLMİŞ)
    updateViewerCount(count, totalUser = null) {
        this.currentViewerCount = count;
        this.stats.currentViewers = count;

        if (totalUser !== null) {
            this.totalUserCount = totalUser;
        }

        if (count > this.stats.peakViewers) {
            this.stats.peakViewers = count;
            this.stats.peakViewersTime = new Date();
        }
    }

    // 🏆 Top Viewers güncelle (YENİ)
    updateTopViewers(topViewers) {
        this.stats.topViewers = topViewers.map(viewer => ({
            username: viewer.user?.uniqueId || 'Unknown',
            nickname: viewer.user?.nickname || 'Unknown',
            coinCount: viewer.coinCount || 0
        }));
    }

    // 👤 Kullanıcı detaylarını güncelle (GELİŞTİRİLMİŞ)
    updateUserDetails(username, details) {
        if (!this.stats.userDetails[username]) {
            this.stats.userDetails[username] = {
                username: username,
                nickname: '',
                profilePicture: '',
                roles: [], // Artık bu diziyi güncelleyeceğiz
                userLevel: 0,
                followerCount: 0,
                messageCount: 0,
                giftValue: 0,
                totalDiamond: 0,
                gifterLevel: 0,
                topGifterRank: null,
                region: 'unknown',
                enterSource: 'unknown',
                enterType: 'unknown',
                heatLevel: 0,
                isModerator: false,
                isSubscriber: false,
                isFollower: false,
                lastSeen: new Date()
            };
        }

        Object.assign(this.stats.userDetails[username], details);
        this.stats.userDetails[username].lastSeen = new Date();
const user = this.stats.userDetails[username];
        
        // Moderator rolü
        if (user.isModerator && !user.roles.includes('moderator')) {
            user.roles.push('moderator');
        }
        
        // Subscriber rolü
        if (user.isSubscriber && !user.roles.includes('subscriber')) {
            user.roles.push('subscriber');
        }
        
        // Follower rolü
        if (user.isFollower && !user.roles.includes('follower')) {
            user.roles.push('follower');
        }
        
        // New Follower rolü (addMember'dan geliyor)
        if (details.isNewFollower && !user.roles.includes('newFollower')) {
             user.roles.push('newFollower');
        }
    }

    // 📊 Tam istatistikleri al (GELİŞTİRİLMİŞ)
    getFullStats() {
        const totalUSD = this.stats.totalDiamonds * 0.005;
        const totalTRY = totalUSD * 34;

        // Aktivite seviyelerini hesapla
        const activeUsers = Object.values(this.stats.topChatters).filter(count => count >= 3 && count < 10).length;
        const veryActiveUsers = Object.values(this.stats.topChatters).filter(count => count >= 10).length;
        
        // Engagement rate hesapla
        const engagementRate = this.stats.uniqueUsers.size > 0
            ? (((activeUsers + veryActiveUsers) / this.stats.uniqueUsers.size) * 100).toFixed(1)
            : '0';

        // Ortalama hediye değeri
        const avgGiftValue = this.stats.totalGifts > 0
            ? (this.stats.totalDiamonds / this.stats.totalGifts).toFixed(0)
            : '0';

        // Ortalama mesaj uzunluğu
        const avgMessageLength = this.stats.messages.length > 0
            ? (this.stats.messages.reduce((sum, m) => sum + m.message.length, 0) / this.stats.messages.length).toFixed(0)
            : '0';

        return {
            // Temel
            totalDiamonds: this.stats.totalDiamonds,
            totalUSD: totalUSD.toFixed(2),
            totalTRY: totalTRY.toFixed(2),
            totalGifts: this.stats.totalGifts,
            totalMessages: this.stats.totalMessages,
            totalLikes: this.stats.totalLikes,
            totalShares: this.stats.totalShares,
            totalFollows: this.stats.totalFollows,
            totalSubscribes: this.stats.totalSubscribes,
            totalUserJoined: this.stats.totalUserJoined,
            currentViewers: this.stats.currentViewers,
            peakViewers: this.stats.peakViewers,
            peakViewersTime: this.stats.peakViewersTime,

            // Kullanıcılar
            uniqueUsers: this.stats.uniqueUsers.size,
            uniqueGifters: this.stats.uniqueGifters.size,
            uniqueChatters: this.stats.uniqueChatters.size,
            moderators: this.stats.moderators.size,
            subscribers: this.stats.subscribers.size,
            followers: this.stats.followers.size,
            newFollowers: this.stats.newFollowers.size,
            activeUsers: activeUsers,
            veryActiveUsers: veryActiveUsers,

            // Leaderboards
            topGifters: this.getTopGifters(10),
            topChatters: this.getTopChatters(10),
            topLikers: this.getTopLikers(10),
            topViewers: this.stats.topViewers,

            // Analiz
            topWords: this.getTopWords(20),
            topEmojis: this.getTopEmojis(10),
            giftAnalysis: this.getGiftAnalysis(),
            expensiveGifts: this.stats.expensiveGifts.slice(-10),

            // Özel kullanıcılar
            specialUsers: this.getSpecialUsers(),

            // 🌍 YENİ: Bölgesel Dağılım
            regionStats: this.getRegionStats(),

            // 📍 YENİ: Trafik Kaynakları
            trafficStats: this.getTrafficStats(),

            // Engagement ve ortalamalar
            engagementRate: engagementRate,
            avgGiftValue: avgGiftValue,
            avgMessageLength: avgMessageLength,
            spamMessages: 0,

            // Hedefler (Güncellenmiş - achieved kontrolü eklendi)
            goals: {
                viewers: { 
                    target: this.stats.goals.viewers.target, 
                    achieved: this.stats.currentViewers >= this.stats.goals.viewers.target 
                },
                gifts: { 
                    target: this.stats.goals.gifts.target, 
                    achieved: totalUSD >= parseFloat(this.stats.goals.gifts.target) 
                }
            },

            // Zaman
            streamDuration: this.getStreamDuration(),
            streamStartTime: this.streamStartTime,
            
            // 📱 Yayıncı Profili (YENİ)
            streamerProfile: this.getStreamerProfile()
        };
    }
    
    // 📱 Yayıncı Profili Bilgilerini Al (10 dakika cache ile)
    getStreamerProfile() {
        // Cache kontrolü
        const now = Date.now();
        if (this.streamerProfileCache && this.streamerProfileCacheTime && 
            (now - this.streamerProfileCacheTime) < this.streamerProfileCacheInterval) {
            // Cache'den dön
            return this.streamerProfileCache;
        }
        
        try {
            // Backend streamerProfile modülüne erişim
            const streamerProfileModule = require('./streamerProfile');
            // Export yapısına göre: { streamerProfile: manager.profile, manager: manager }
            const profile = streamerProfileModule.manager?.profile || streamerProfileModule.streamerProfile || {};
            
            const profileData = {
                username: profile.username || '',
                nickname: profile.nickname || '',
                profilePicture: profile.profilePicture || profile.avatarMedium || '',
                bio: profile.bio || '',
                verified: profile.verified || false,
                
                // Rozet ve Seviye
                payGrade: profile.payGrade || 0,
                payScore: profile.payScore || 0,
                topVipNo: profile.topVipNo || 0,
                fanTicketCount: profile.fanTicketCount || 0,
                badgeList: profile.badgeList || [],
                
                // İstatistikler
                followerCount: profile.followerCount || 0,
                followingCount: profile.followingCount || 0,
                videoCount: profile.videoCount || 0,
                heartCount: profile.heartCount || 0,
                
                // Yayın bilgileri
                liveStatus: profile.liveStatus || 0,
                viewerCount: profile.totalViewers || profile.viewerCount || 0
            };
            
            // Cache'e kaydet
            this.streamerProfileCache = profileData;
            this.streamerProfileCacheTime = now;
            
            console.log('📱 Yayıncı Profili güncellendi (cache):', {
                username: profileData.username,
                nickname: profileData.nickname,
                payGrade: profileData.payGrade
            });
            
            return profileData;
        } catch (error) {
            console.error('❌ Yayıncı profili çekme hatası:', error.message);
            console.error('Stack:', error.stack);
            return null;
        }
    }

    // 🏆 Top Gifters
    getTopGifters(limit = 10) {
        return Object.entries(this.stats.topGifters)
            .map(([username, diamonds]) => ({
                username,
                diamonds,
                usd: (diamonds * 0.005).toFixed(2),
                nickname: this.stats.userDetails[username]?.nickname || username
            }))
            .sort((a, b) => b.diamonds - a.diamonds)
            .slice(0, limit);
    }

    // 💬 Top Chatters
    getTopChatters(limit = 10) {
        return Object.entries(this.stats.topChatters)
            .map(([username, count]) => ({ 
                username, 
                count,
                nickname: this.stats.userDetails[username]?.nickname || username
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // ❤️ Top Likers
    getTopLikers(limit = 10) {
        return Object.entries(this.stats.topLikers)
            .map(([username, likes]) => ({ 
                username, 
                likes,
                nickname: this.stats.userDetails[username]?.nickname || username
            }))
            .sort((a, b) => b.likes - a.likes)
            .slice(0, limit);
    }

    // 📝 Top Words
    getTopWords(limit = 20) {
        return Object.entries(this.stats.wordCount)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // 😀 Top Emojis
    getTopEmojis(limit = 10) {
        return Object.entries(this.stats.emojiCount)
            .map(([emoji, count]) => ({ emoji, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // 🎁 Gift Analizi
    getGiftAnalysis() {
        return Object.values(this.stats.giftAnalysis)
            .map(gift => ({
                name: gift.name,
                count: gift.count,
                totalDiamonds: gift.totalDiamonds,
                uniqueGifters: gift.gifters.size,
                avgValue: (gift.totalDiamonds / gift.count).toFixed(0)
            }))
            .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
            .slice(0, 20);
    }

    // 🌟 Özel Kullanıcılar
   getSpecialUsers() {
        return Object.values(this.stats.userDetails)
        // YENİ FİLTRE: Herhangi bir özel role sahipse VEYA yeterince etkileşimde bulunduysa listeye girsin.
        .filter(user => 
            user.isModerator ||             // Moderatörse her zaman listeye gir
            user.isSubscriber ||            // Abone ise her zaman listeye gir
            user.isFollower ||              // Takipçiyse (isteğe bağlı, kaldırılabilir)
            user.messageCount > 0 ||        // En az bir mesaj yazdıysa
            user.giftValue > 0              // Hediye gönderdiyse
        )
        .sort((a, b) => (b.giftValue + b.messageCount) - (a.giftValue + a.messageCount))
        .slice(0, 200); // Sınırı 20'den 200'e yükselttik, böylece daha çok kişiyi görürüz
}

    // 🌍 YENİ: Bölgesel İstatistikler
    getRegionStats() {
        return Object.entries(this.stats.regionStats)
            .map(([region, data]) => ({
                region,
                messages: data.messages,
                uniqueUsers: data.users.size,
                percentage: ((data.messages / this.stats.totalMessages) * 100).toFixed(1)
            }))
            .sort((a, b) => b.messages - a.messages);
    }

    // 📍 YENİ: Trafik Kaynağı İstatistikleri
    getTrafficStats() {
        const total = this.stats.totalUserJoined || 1;
        return Object.entries(this.stats.trafficSources)
            .map(([source, data]) => ({
                source,
                count: data.count,
                uniqueUsers: data.users.size,
                percentage: ((data.count / total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
    }

    // ⏱️ Yayın Süresi
    getStreamDuration() {
        if (!this.streamStartTime) return '0 dakika';
        const duration = Math.floor((Date.now() - this.streamStartTime.getTime()) / 60000);
        if (duration < 60) return `${duration} dakika`;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return `${hours} saat ${mins} dakika`;
    }

    // 🕐 Yayın başlangıcını ayarla
    setStreamStartTime(time) {
        this.streamStartTime = time || new Date();
    }

    // ✅ Debounced snapshot (1 saniyede bir)
    scheduleSnapshot() {
        if (!this.streamFolder) return; // Kayıt aktif değilse

        clearTimeout(this.snapshotTimeout);
        this.snapshotTimeout = setTimeout(() => {
            this.saveSnapshot();
        }, 1000); // 1 saniye
    }

    // ✅ Snapshot kaydet
    saveSnapshot() {
        if (!this.streamFolder) return; // Kayıt aktif değilse

        try {
            const stats = this.getFullStats();
            const snapshotPath = path.join(this.streamFolder, 'stats_snapshot.json');

            // Async write (non-blocking)
            fs.writeFile(
                snapshotPath,
                JSON.stringify(stats, null, 2),
                (err) => {
                    if (err) {
                        console.error('❌ Snapshot kayıt hatası:', err.message);
                    }
                }
            );
        } catch (err) {
            console.error('❌ Snapshot oluşturma hatası:', err.message);
        }
    }

    // ✅ Final snapshot (yayın bitince)
    saveFinalSnapshot() {
        if (!this.streamFolder) return;

        try {
            const stats = this.getFullStats();
            const finalPath = path.join(this.streamFolder, 'stats_final.json');

            // Sync write (yayın bitişinde bloklaması önemli değil)
            fs.writeFileSync(finalPath, JSON.stringify(stats, null, 2));
            console.log(`✅ Final stats kaydedildi: ${finalPath}`);
        } catch (err) {
            console.error('❌ Final snapshot hatası:', err.message);
        }
    }
}

// Export both class and a default instance for backward compatibility
module.exports = StatsManager;
module.exports.default = new StatsManager();