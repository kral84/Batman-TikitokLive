// modules/events.js
// TikTok Live event handler'ları - TAM VERSİYON

// Stats will be passed as instance in constructor
const streamerProfile = require('./streamerProfile');
const fs = require('fs');
const path = require('path');

class EventHandler {
    constructor(broadcastFn, statsManager, username = null, streamId = null) {
        this.broadcast = broadcastFn;
        this.stats = statsManager || require('./stats').default; // Use passed instance or default
        this.username = username;
        this.streamId = streamId;
        this.streamFolder = null;

        // Anlık kayıt için klasör oluştur
        if (username && streamId) {
            this.streamFolder = path.join('./kayitlar', username, streamId);
            try {
                fs.mkdirSync(this.streamFolder, { recursive: true });
                console.log(`✅ Stream klasörü oluşturuldu: ${this.streamFolder}`);
            } catch (err) {
                console.error('❌ Klasör oluşturma hatası:', err);
            }
        }
    }

    // ✅ ANLIK KAYIT - Generic save metodu
    saveEvent(type, data) {
        if (!this.streamFolder) return; // Kayıt aktif değilse

        const eventData = {
            type: type,
            data: data,
            timestamp: Date.now()
        };

        const eventsFile = path.join(this.streamFolder, 'events.jsonl');

        // Async append (non-blocking!)
        fs.appendFile(
            eventsFile,
            JSON.stringify(eventData) + '\n',
            (err) => {
                if (err) console.error(`❌ Event kayıt hatası [${type}]:`, err.message);
            }
        );
    }

    // Event handler'ları bağla
    setupEvents(connection) {
        // Chat
        connection.on('chat', (data) => this.handleChat(data));
        
        // Gift
        connection.on('gift', (data) => this.handleGift(data));
        
        // Like
        connection.on('like', (data) => this.handleLike(data));
        
        // Follow
        connection.on('social', (data) => this.handleSocial(data));
        
        // Share
        connection.on('share', (data) => this.handleShare(data));
        
        // Member
        connection.on('member', (data) => this.handleMember(data));
        
        // Viewer count
        connection.on('roomUser', (data) => this.handleRoomUser(data));
        
        // Stream end
        connection.on('streamEnd', () => this.handleStreamEnd());
        
        // Connected
        connection.on('connected', (state) => this.handleConnected(state));
        
        // Disconnected
        connection.on('disconnected', () => this.handleDisconnected());
        
        // Emote
        connection.on('emote', (data) => this.handleEmote(data));
        
        // Question
        connection.on('questNew', (data) => this.handleQuestion(data));
        
        // Envelope (zarf hediyesi)
        connection.on('envelope', (data) => this.handleEnvelope(data));
        
        // Subscribe
        connection.on('subscribe', (data) => this.handleSubscribe(data));
        
        // Link Mic Battle
        connection.on('linkMicBattle', (data) => this.handleLinkMicBattle(data));
        
        // Link Mic Armies
        connection.on('linkMicArmies', (data) => this.handleLinkMicArmies(data));
        
        // Intro
        connection.on('intro', (data) => this.handleIntro(data));
        
        // Room Info
        connection.on('roomInfo', (data) => this.handleRoomInfo(data));
		
		connection.on('control', (data) => this.handleControl(data));
        connection.on('goal', (data) => this.handleGoal(data));
        connection.on('product', (data) => this.handleProduct(data));
        connection.on('rank', (data) => this.handleRank(data));

        // Error handling
        connection.on('error', (err) => this.handleError(err));
    }

    // 🔥 YARDIMCI FONKSİYONLAR
    
    // Kullanıcı seviyesini badge'lerden çıkar
    getUserLevel(data) {
        if (data.user?.badges) {
            const levelBadge = data.user.badges.find(badge => badge.combine?.str);
            if (levelBadge?.combine?.str) {
                return levelBadge.combine.str;
            }
        }
        return '0';
    }
    
    // Kullanıcının tüm badge'lerini al (seviye badge'i dahil)
    getUserBadges(data) {
        const badges = [];
        
        // User badges (seviye badge'leri dahil)
        if (data.user?.badges && Array.isArray(data.user.badges)) {
            data.user.badges.forEach(badge => {
                if (badge.combine?.str) {
                    badges.push({
                        type: 'level',
                        name: badge.combine.str,
                        displayType: badge.displayType
                    });
                } else if (badge.type) {
                    badges.push({
                        type: badge.type,
                        name: badge.name || `${badge.type}_${badge.type}`,
                        displayType: badge.displayType
                    });
                }
            });
        }
        
        // Data badges (ek badge'ler)
        if (data.badges && Array.isArray(data.badges)) {
            data.badges.forEach(badge => {
                badges.push({
                    type: badge.type,
                    name: badge.name || `${badge.type}`,
                    displayType: badge.displayType
                });
            });
        }
        
        return badges;
    }

    // Trafik kaynağını Türkçe'ye çevir
    getTrafficSourceName(source) {
        const sources = {
            'homepage_hot-live_cell': 'Keşfet (Ana Sayfa)',
            'homepage_follow-live_cell': 'Takip Edilenler',
            'search_result-live_cell': 'Arama Sonuçları',
            'message-live_cover': 'Mesaj/Bildirim',
            'live_merge-toplive_live_cover': 'Canlı Yayın Birleştirme',
            'live_merge-live_cover': 'Canlı Yayın Akışı',
            'inner_push-inner_push': 'Uygulama İçi Bildirim',
            'follow_recommend-inner_push': 'Takip Önerisi Bildirimi',
            'homepage_hot-video_head': 'Ana Sayfa Video Banner',
            'live_detail-right_anchor': 'Canlı Detay (Sağ Çapa/Öneri)',
            'homepage_hot-live_cover': 'Keşfet (Ana Sayfa Kapak)',
            'others_homepage-video_head': 'Diğerleri (Ana Sayfa Video Banner)',
            'general_search-live_cover': 'Genel Arama (Kapak)',
            'follow_recommend-message': 'Takip Önerisi (Mesaj Bildirimi)',
            'homepage_follow-live_cover': 'Takip (Kapak)',
	'general_search-others_photo': 'Genel Arama (Diğer Fotoğraf)', 
        'personal_homepage-video_head': 'Kişisel Ana Sayfa (Video Banner)',
            'push-push': 'Anında Bildirim (Push)', // 
            'follow_recommend-homepage_follow': 'Takip Önerisi (Takip Akışı)', // 
            'others_homepage-others_photo': 'Diğerleri (Ana Sayfa/Diğer Fotoğraf)', // 
            'unknown': 'Bilinmeyen'
        };
        return sources[source] || source || 'Bilinmeyen';
    }

    // Bölge kodunu Türkçe'ye çevir
    getRegionName(idc) {
        const regions = {
            'my2': '🇹🇷 Türkiye (İstanbul)',
            'my3': '🇹🇷 Türkiye (İzmir/Ek Sunucu)',
            'my': '🌏 Asya (Singapur)',
            'va': '🇺🇸 ABD (Virginia)',
            'sg': '🇸🇬 Singapur',
            'useast2b': '🇺🇸 ABD (Doğu)',
            'useast5': '🇺🇸 ABD (Doğu)',
            'no1a': '🌍 Avrupa/Global (no1a)',
            'unknown': '🌍 Bilinmeyen'
        };
        return regions[idc] || `🌍 ${idc}`;
    }

    // Enter type'ı Türkçe'ye çevir
    getEnterTypeName(type) {
        const types = {
            'click': 'Tıklama',
            'draw': 'Kaydırma',
            'auto': 'Otomatik',
            'unknown': 'Bilinmeyen'
        };
        return types[type] || type || 'Bilinmeyen';
    }

    // 💬 CHAT EVENT
    handleChat(data) {
        // Stats'e ekle
        this.stats.addChatMessage(data);

        // Moderatör kontrolü (DOĞRU ALAN!)
        const isModerator = data.userIdentity?.isModeratorOfAnchor || false;
        const isSubscriber = data.userIdentity?.isSubscriberOfAnchor || false;
        const isFollower = data.userIdentity?.isFollowerOfAnchor || false;
        const isMutualFollowing = data.userIdentity?.isMutualFollowingWithAnchor || false;

        // Kullanıcı seviyesi
        const userLevel = this.getUserLevel(data);

		const isGiftGiver = data.userIdentity?.isGiftGiverOfAnchor || false;

        // Takipçi sayısı
        const followerCount = data.followInfo?.followerCount || 0;

        // Gifter bilgileri
        const gifterLevel = data.gifterLevel || 0;
        const topGifterRank = data.topGifterRank || null;

        // Bölge bilgisi (Sunucu konumu)
        const fromIdc = data.fromIdc || 'unknown';
        const regionName = this.getRegionName(fromIdc);

        // Heat Level (Yayın yoğunluğu)
        const heatLevel = data.roomMessageHeatLevel || 0;

        // Client Send Time (Gecikme hesaplamak için)
        const clientSendTime = data.clientSendTime || null;

        const chatData = {
            // Temel Bilgiler
            username: data.uniqueId,
            nickname: data.nickname,
            message: data.comment,
            profilePicture: data.profilePictureUrl,

            // Roller ve Durum
            isModerator: isModerator,
            isSubscriber: isSubscriber,
            isFollower: isFollower,
            isMutualFollowing: isMutualFollowing,
            isGiftGiver: isGiftGiver,

            // Seviye ve İstatistikler
            userLevel: userLevel,
            followerCount: followerCount,
            gifterLevel: gifterLevel,
            topGifterRank: topGifterRank,

            // Yayın Yoğunluğu
            heatLevel: heatLevel,

            // Konum ve Teknik
            fromIdc: fromIdc,
            region: regionName,
            clientSendTime: clientSendTime,

            // Badges (tüm badge'ler dahil seviye)
            badges: this.getUserBadges(data),

            timestamp: new Date().toISOString()
        };

        this.broadcast({
            type: 'chat',
            data: chatData
        });

        // ✅ ANLIK KAYIT
        this.saveEvent('chat', chatData);
    }

    // 🎁 GIFT EVENT
    handleGift(data) {
        if (data.giftType === 1 && !data.repeatEnd) {
            return; // Streak gift, sadece son tekrarı gönder
        }

        // Stats'e ekle
        this.stats.addGift(data);

        const diamondCount = (data.diamondCount || 0) * (data.repeatCount || 1);
        const usdValue = (diamondCount * 0.005).toFixed(2);
        const tryValue = (diamondCount * 0.005 * 34).toFixed(2);

        // Kullanıcı bilgileri
        const userLevel = this.getUserLevel(data);
        const followerCount = data.followInfo?.followerCount || 0;
        
        // Toplam harcama (user.userHonor.totalDiamond)
        const totalDiamond = data.user?.userHonor?.totalDiamond || 0;

        const giftData = {
            // Temel
            username: data.uniqueId,
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,

            // Hediye Bilgileri
            giftName: data.giftName,
            giftId: data.giftId,
            repeatCount: data.repeatCount || 1,
            diamondCount: diamondCount,
            usdValue: usdValue,
            tryValue: tryValue,
            giftPictureUrl: data.giftPictureUrl,
            giftType: data.giftType,

            // Kullanıcı Bilgileri
            userLevel: userLevel,
            followerCount: followerCount,
            totalDiamond: totalDiamond,

            timestamp: new Date().toISOString()
        };

        this.broadcast({
            type: 'gift',
            data: giftData
        });

        // ✅ ANLIK KAYIT
        this.saveEvent('gift', giftData);

        // Yüksek değerli hediye alert'i
        if (diamondCount >= 1000) {
            this.broadcast({
                type: 'alert',
                alertType: 'highValueGift',
                data: {
                    username: data.uniqueId,
                    nickname: data.nickname,
                    giftName: data.giftName,
                    diamonds: diamondCount,
                    usd: usdValue
                }
            });
        }
    }

    // ❤️ LIKE EVENT
    handleLike(data) {
        this.stats.addLike(data);

        const likeData = {
            username: data.uniqueId,
            nickname: data.nickname,
            likeCount: data.likeCount,
            totalLikeCount: data.totalLikeCount,
            timestamp: new Date().toISOString()
        };

        this.broadcast({
            type: 'like',
            data: likeData
        });

        // ✅ ANLIK KAYIT
        this.saveEvent('like', likeData);
    }

    // 👥 SOCIAL EVENT (Follow)
    handleSocial(data) {
        if (data.displayType === 'pm_main_follow_message_viewer_2') {
            this.stats.addFollow(data);

            // Takipçi bilgileri
            const followerCount = data.followInfo?.followerCount || 0;
            const userLevel = this.getUserLevel(data);
            const totalDiamond = data.user?.userHonor?.totalDiamond || 0;
            
            // Trafik kaynağı (social event'inde de var!)
            const enterSource = data.clientEnterSource || 'unknown';
            const trafficSource = this.getTrafficSourceName(enterSource);

            const followData = {
                username: data.uniqueId,
                nickname: data.nickname,
                profilePicture: data.profilePictureUrl,

                // Ek Bilgiler
                followerCount: followerCount,
                userLevel: userLevel,
                totalDiamond: totalDiamond,
                enterSource: enterSource,
                trafficSource: trafficSource,

                timestamp: new Date().toISOString()
            };

            this.broadcast({
                type: 'follow',
                data: followData
            });

            // ✅ ANLIK KAYIT
            this.saveEvent('follow', followData);
        }
    }

    // 📤 SHARE EVENT
    handleShare(data) {
        this.stats.addShare(data);

        const shareData = {
            username: data.uniqueId,
            nickname: data.nickname,
            timestamp: new Date().toISOString()
        };

        this.broadcast({
            type: 'share',
            data: shareData
        });

        // ✅ ANLIK KAYIT
        this.saveEvent('share', shareData);
    }

    // 🚪 MEMBER EVENT (En önemli trafik verisi burada!)
    handleMember(data) {
        // Trafik kaynağı bilgileri (ÇOK ÖNEMLİ!)
        const enterSource = data.clientEnterSource || 'unknown';
        const enterType = data.clientEnterType || 'unknown';
        const trafficSource = this.getTrafficSourceName(enterSource);
        const enterMethod = this.getEnterTypeName(enterType);

        // Kullanıcı bilgileri
        const userLevel = this.getUserLevel(data);
        const followerCount = data.followInfo?.followerCount || 0;
        const totalDiamond = data.user?.userHonor?.totalDiamond || 0;

        // Roller
        const isModerator = data.userIdentity?.isModeratorOfAnchor || false;
        const isSubscriber = data.userIdentity?.isSubscriberOfAnchor || false;
        const isFollower = data.userIdentity?.isFollowerOfAnchor || false;
        const isNewFollower = data.userIdentity?.isNewFollowerOfAnchor || false;

        // Stats'e kaydet
        this.stats.addMember(data, {
            enterSource,
            enterType,
            userLevel,
            followerCount,
            totalDiamond,
            isModerator,
            isSubscriber,
            isFollower
        });

        const memberData = {
            // Temel
            username: data.uniqueId,
            nickname: data.nickname,
            profilePicture: data.profilePictureUrl,

            // TRAFİK BİLGİSİ (ÖNEMLİ!)
            enterSource: enterSource,
            enterType: enterType,
            trafficSource: trafficSource,
            enterMethod: enterMethod,

            // Kullanıcı İstatistikleri
            userLevel: userLevel,
            followerCount: followerCount,
            totalDiamond: totalDiamond,

            // Roller ve Durum
            isModerator: isModerator,
            isSubscriber: isSubscriber,
            isFollower: isFollower,
            isNewFollower: isNewFollower,

            timestamp: new Date().toISOString()
        };

        this.broadcast({
            type: 'member',
            data: memberData
        });

        // ✅ ANLIK KAYIT
        this.saveEvent('member', memberData);
    }

    // 👁️ ROOM USER EVENT (İzleyici sayısı + Top Gifters)
    handleRoomUser(data) {
        const viewerCount = data.viewerCount || 0;
        const totalUser = data.totalUser || 0; // Yayın başından beri toplam giren
        
        // Top Gifters listesi
        const topViewers = data.topViewers || [];
        
        this.stats.updateViewerCount(viewerCount, totalUser);
        this.stats.updateTopViewers(topViewers);
        streamerProfile.updateViewerCount(viewerCount);

        this.broadcast({
            type: 'viewerCount',
            data: {
                viewerCount: viewerCount,
                totalUser: totalUser,
                topViewers: topViewers.map(viewer => ({
                    username: viewer.user?.uniqueId || 'Unknown',
                    nickname: viewer.user?.nickname || 'Unknown',
                    coinCount: viewer.coinCount || 0
                }))
            }
        });
    }

    // 🔚 STREAM END
    handleStreamEnd() {
        // Video kaydı varsa durdur
        const { spawn } = require('child_process');
        if (global.recordingProcess && !global.recordingProcess.killed) {
            console.log('🛑 Yayın sona erdi, video kaydı durduruluyor...');
            global.recordingProcess.kill('SIGINT');
        }
        
        this.broadcast({
            type: 'streamEnd',
            data: {
                message: 'Yayın sona erdi',
                timestamp: new Date().toISOString()
            }
        });
    }

    // ✅ CONNECTED
    handleConnected(state) {
        console.log('✅ TikTok Live\'a bağlandı');
        
        let actualStreamStartTime = new Date(); // Varsayılan: şu an

        if (state.roomInfo) {
            streamerProfile.updateStreamerProfile(state.roomInfo);
            
            // Yayıncının GERÇEK başlangıç saatini al
            const roomData = state.roomInfo.data || state.roomInfo;
            if (roomData && roomData.create_time) {
                // create_time saniye cinsindendir, milisaniyeye çevir
                actualStreamStartTime = new Date(roomData.create_time * 1000); 
                console.log(`✅ Gerçek Yayın Başlangıcı: ${actualStreamStartTime.toLocaleString('tr-TR')}`);
            }
        }

        // Stats modülüne gerçek başlangıç saatini kaydet
        this.stats.setStreamStartTime(actualStreamStartTime);

        this.broadcast({
            type: 'status',
            connected: true,
            message: 'Yayına bağlandı'
        });
    }

    // ❌ DISCONNECTED
    handleDisconnected() {
        console.log('❌ TikTok Live bağlantısı kesildi');

        this.broadcast({
            type: 'status',
            connected: false,
            message: 'Bağlantı kesildi'
        });
    }

    // 😀 EMOTE EVENT
    handleEmote(data) {
        this.broadcast({
            type: 'emote',
            data: {
                username: data.uniqueId,
                nickname: data.nickname,
                emoteName: data.emote?.name || 'Unknown',
                emoteImageUrl: data.emote?.image?.imageUrl || '',
                timestamp: new Date().toISOString()
            }
        });
    }

    // ❓ QUESTION EVENT
    handleQuestion(data) {
        this.broadcast({
            type: 'question',
            data: {
                username: data.uniqueId,
                nickname: data.nickname,
                question: data.questionText,
                questionId: data.questionId,
                timestamp: new Date().toISOString()
            }
        });
    }

    // ✉️ ENVELOPE EVENT (Zarf hediyesi)
    handleEnvelope(data) {
        this.broadcast({
            type: 'envelope',
            data: {
                coins: data.coins || 0,
                timestamp: new Date().toISOString()
            }
        });
    }

    // 💎 SUBSCRIBE EVENT
    handleSubscribe(data) {
        this.stats.addSubscriber(data);
        
        this.broadcast({
            type: 'subscribe',
            data: {
                username: data.uniqueId,
                nickname: data.nickname,
                profilePicture: data.profilePictureUrl,
                timestamp: new Date().toISOString()
            }
        });
    }

    // ⚔️ LINK MIC BATTLE
    handleLinkMicBattle(data) {
        this.broadcast({
            type: 'linkMicBattle',
            data: {
                battleUsers: data.battleUsers || [],
                timestamp: new Date().toISOString()
            }
        });
    }

    // 🪖 LINK MIC ARMIES
    handleLinkMicArmies(data) {
        this.broadcast({
            type: 'linkMicArmies',
            data: {
                battleUsers: data.battleUsers || [],
                timestamp: new Date().toISOString()
            }
        });
    }

    // 📢 INTRO
    handleIntro(data) {
        this.broadcast({
            type: 'intro',
            data: {
                introText: data.description || 'Giriş mesajı',
                timestamp: new Date().toISOString()
            }
        });
    }

    // 📊 ROOM INFO
    handleRoomInfo(data) {
        console.log('📊 Oda bilgisi:', {
            title: data.title,
            viewers: data.user_count,
            likes: data.like_count
        });
        
        if (data) {
            streamerProfile.updateStreamerProfile(data);
        }

        this.broadcast({
            type: 'roomInfo',
            data: {
                title: data.title,
                viewerCount: data.user_count || 0,
                likeCount: data.like_count || 0,
                timestamp: new Date().toISOString()
            }
        });
    }

    // ❌ ERROR HANDLER
    handleError(err) {
        console.error('❌ TikTok Live Connection Error:', {
            message: err.message || err,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });

        // Broadcast error to frontend
        this.broadcast({
            type: 'error',
            data: {
                message: err.message || 'Unknown error occurred',
                code: err.code || 'UNKNOWN_ERROR',
                timestamp: new Date().toISOString()
            }
        });

        // Log error statistics
        this.stats.recordError({
            type: 'connection_error',
            message: err.message,
            timestamp: Date.now()
        });
    }
}

module.exports = EventHandler;