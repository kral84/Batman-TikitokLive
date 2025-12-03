// streamerProfile.js - ULTRA ADVANCED VERSION (getUserInfo'suz)
// TikTok Live Yayıncı Profil Yönetimi - Canlı ve Offline Destek

const { WebcastPushConnection } = require('tiktok-live-connector');

class StreamerProfileManager {
    constructor() {
        this.profile = {
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
            diggCount: 0,
            
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
            roomId: '',
            
            // Yayın bilgileri
            streamStatus: 'offline',
            liveStatus: 0,
            liveStartTime: null,
            streamDuration: 0,
            viewerCount: 0,
            peakViewers: 0,
            totalViewers: 0,
            likeCount: 0,
            
            // Son güncelleme
            lastUpdated: null,
            lastFetched: null
        };

        // 📊 Yayın Geçmişi
        this.streamHistory = [];

        // 📈 Takipçi Artışı Takibi
        this.followerTracking = {
            initial: 0,
            current: 0,
            peak: 0,
            checkpoints: [],
            lastCheck: null
        };

        // ⏱️ Periyodik güncelleme
        this.updateInterval = null;
        this.updateFrequency = 5 * 60 * 1000; // 5 dakika

        // 🎯 Hedefler
        this.goals = {
            followerTarget: null,
            viewerTarget: null,
            likeTarget: null
        };
    }

    // 🔄 Profil Bilgisini Çek (WebcastPushConnection ile) - GÜNCELLENDİ
    async fetchProfile(username) {
        try {
            console.log(`🔍 Profil bilgisi çekiliyor: @${username}`);
            
            const tempConnection = new WebcastPushConnection(username, {
                fetchRoomInfoOnConnect: true
            });

            let state;
            try {
                state = await tempConnection.connect();
            } catch (error) {
                if (error.state && error.state.roomInfo) {
                    state = error.state;
                } else {
                    throw error;
                }
            }

            const roomData = state.roomInfo?.data || state.roomInfo;
            this.profile.roomInfo = state.roomInfo; // roomInfo'yu hafızaya al
            
            if (!roomData) {
                tempConnection.disconnect();
                throw new Error('Profil bilgisi alınamadı (roomInfo boş)');
            }

            // --- YENİ ESNEK YAPI ---
            // 'owner' nesnesi gelmese bile çökme,
            // 'roomData' içinden alınabilen bilgileri al.

            this.profile.roomId = roomData.id_str || roomData.id || '';
            this.profile.liveStatus = roomData.status === 2 ? 1 : 0;
            this.profile.streamStatus = roomData.status === 2 ? 'live' : 'offline';
            
            if (this.profile.streamStatus === 'live') {
                this.profile.roomTitle = roomData.title || 'Yayın';
                this.profile.roomCover = roomData.cover?.url_list?.[0] || '';
                this.profile.totalViewers = roomData.user_count || 0;
                
                if (roomData.create_time) {
                    this.profile.liveStartTime = new Date(roomData.create_time * 1000);
                }
            }

            // 'owner' nesnesi varsa, detayları doldur
            if (roomData.owner) {
                console.log('✅ "owner" bilgisi bulundu, tam profil yükleniyor.');
                const owner = roomData.owner;

                // Temel bilgiler
                this.profile.username = owner.display_id || owner.unique_id || username;
                this.profile.nickname = owner.nickname || owner.nick_name || '';
                this.profile.userId = owner.id_str || owner.id || '';
                this.profile.profilePicture = owner.avatar_thumb?.url_list?.[0] || '';
                this.profile.avatarMedium = owner.avatar_medium?.url_list?.[0] || '';
                this.profile.avatarLarge = owner.avatar_large?.url_list?.[0] || '';
                this.profile.bio = owner.bio_description || owner.bio || '';
                this.profile.verified = owner.verified || false;

                // Sosyal istatistikler
                if (owner.follow_info) {
                    this.profile.followerCount = owner.follow_info.follower_count || 0;
                    this.profile.followingCount = owner.follow_info.following_count || 0;
                }
                if (owner.stats) {
                    this.profile.followerCount = owner.stats.follower_count || this.profile.followerCount;
                    // ... (diğer stats bilgileri)
                }
                
            } else {
                // 'owner' yoksa (battle vs.), kullanıcı adını manuel ayarla
                console.warn('⚠️ "owner" bilgisi eksik. Yalnızca yayın durumu alınıyor.');
                this.profile.username = username;
                this.profile.nickname = username;
            }
            
            this.profile.lastFetched = new Date();
            this.profile.lastUpdated = new Date();

            tempConnection.disconnect();

            console.log(`✅ Profil güncellendi: ${this.profile.nickname} (@${this.profile.username})`);
            console.log(`   🔴 Yayın: ${this.profile.streamStatus}`);
            if (this.profile.liveStartTime) {
                console.log(`   🕒 Başlangıç: ${this.profile.liveStartTime.toLocaleString('tr-TR')}`);
            }

            return this.profile;

        } catch (error) {
            console.error('❌ Profil çekme hatası (catch):', error.message);
            return null;
        }
    }

    // 🎬 Yayın Bilgisini Güncelle (connected event'inden)
    updateStreamerProfile(roomInfo) {
        if (!roomInfo) return;
        
        try {
            const roomData = roomInfo.data || roomInfo;
            const owner = roomData.owner;
            
            if (owner) {
                // Temel bilgiler
                this.profile.username = owner.display_id || owner.id_str || owner.unique_id || this.profile.username;
                this.profile.nickname = owner.nickname || owner.nick_name || this.profile.nickname;
                this.profile.userId = owner.id_str || owner.id || owner.uid || this.profile.userId;
                
                // Avatar'lar
                this.profile.profilePicture = owner.avatar_thumb?.url_list?.[0] || this.profile.profilePicture;
                this.profile.avatarMedium = owner.avatar_medium?.url_list?.[0] || this.profile.avatarMedium;
                this.profile.avatarLarge = owner.avatar_large?.url_list?.[0] || this.profile.avatarLarge;
                
                this.profile.bio = owner.bio_description || owner.bio || this.profile.bio;
                
                // Doğrulama
                this.profile.verified = owner.verified || this.profile.verified;
                this.profile.verifiedContent = owner.verified_content || '';
                this.profile.verifiedReason = owner.verified_reason || '';
                
                // Profil detayları
                this.profile.constellation = owner.constellation || '';
                this.profile.accountCreateTime = owner.create_time ? new Date(owner.create_time * 1000) : null;
                this.profile.userRole = owner.user_role || 0;
                this.profile.userAttr = owner.user_attr || {};
                
                // Seviye & Rozet
                this.profile.payGrade = owner.pay_grade?.grade || owner.pay_grade || 0;
                this.profile.payScore = owner.pay_score || 0;
                this.profile.topVipNo = owner.top_vip_no || 0;
                this.profile.fanTicketCount = owner.fan_ticket_count || 0;
                this.profile.badgeList = owner.badge_list || [];
                
                // Sosyal istatistikler
                if (owner.follow_info) {
                    this.profile.followerCount = owner.follow_info.follower_count || this.profile.followerCount;
                    this.profile.followingCount = owner.follow_info.following_count || this.profile.followingCount;
                }
                
                if (owner.stats) {
                    this.profile.followerCount = owner.stats.follower_count || this.profile.followerCount;
                    this.profile.followingCount = owner.stats.following_count || this.profile.followingCount;
                    this.profile.videoCount = owner.stats.video_count || this.profile.videoCount;
                    this.profile.heartCount = owner.stats.heart_count || this.profile.heartCount;
                }
            }
            
            // Oda bilgileri
            this.profile.roomInfo = roomInfo;
            this.profile.roomTitle = roomData.title || 'Yayın';
            this.profile.roomCover = roomData.cover?.url_list?.[0] || '';
            this.profile.roomId = roomData.id_str || roomData.id || '';
            
            // Yayın bilgileri
            this.profile.streamStatus = roomData.status === 2 ? 'live' : 'offline';
            this.profile.liveStatus = roomData.status === 2 ? 1 : 0;
            
            if (roomData.create_time) {
                this.profile.liveStartTime = new Date(roomData.create_time * 1000);
                this.updateStreamDuration();
            }
            
            this.profile.likeCount = roomData.like_count || 0;
            this.profile.totalViewers = roomData.user_count || 0;
            this.profile.lastUpdated = new Date();
            
            // Takipçi takibini başlat (yayın başlangıcında)
            if (this.profile.streamStatus === 'live' && this.followerTracking.initial === 0) {
                this.startFollowerTracking();
            }

            console.log('✅ Yayın bilgisi güncellendi');
            
        } catch (error) {
            console.error('❌ Yayın bilgisi güncelleme hatası:', error.message);
        }
    }

    // 👁️ İzleyici Sayısını Güncelle
    updateViewerCount(count) {
        this.profile.viewerCount = count;
        
        if (count > this.profile.peakViewers) {
            this.profile.peakViewers = count;
        }
        
        if (count > this.profile.totalViewers) {
            this.profile.totalViewers = count;
        }
        
        this.updateStreamDuration();
    }

    // ⏱️ Yayın Süresini Güncelle
    updateStreamDuration() {
        if (this.profile.liveStartTime && this.profile.streamStatus === 'live') {
            this.profile.streamDuration = Math.floor((Date.now() - this.profile.liveStartTime.getTime()) / 60000);
        }
    }

    // 📈 Takipçi Takibini Başlat
    startFollowerTracking() {
        this.followerTracking.initial = this.profile.followerCount;
        this.followerTracking.current = this.profile.followerCount;
        this.followerTracking.peak = this.profile.followerCount;
        this.followerTracking.lastCheck = new Date();
        
        this.followerTracking.checkpoints.push({
            timestamp: new Date(),
            count: this.profile.followerCount,
            label: 'Yayın Başlangıcı'
        });

        console.log(`📊 Takipçi takibi başladı: ${this.followerTracking.initial} takipçi`);
    }

    // 🔄 Takipçi Sayısını Güncelle ve Kontrol Et
    async updateFollowerCount() {
        try {
            const freshProfile = await this.fetchProfile(this.profile.username);
            
            if (freshProfile) {
                const oldCount = this.followerTracking.current;
                const newCount = freshProfile.followerCount;
                
                this.followerTracking.current = newCount;
                
                if (newCount > this.followerTracking.peak) {
                    this.followerTracking.peak = newCount;
                }

                // Değişiklik varsa checkpoint ekle
                if (newCount !== oldCount) {
                    const growth = newCount - oldCount;
                    
                    this.followerTracking.checkpoints.push({
                        timestamp: new Date(),
                        count: newCount,
                        growth: growth,
                        label: growth > 0 ? `+${growth} yeni takipçi` : `${growth} takipçi kaybı`
                    });

                    console.log(`📈 Takipçi güncellendi: ${oldCount} → ${newCount} (${growth > 0 ? '+' : ''}${growth})`);
                    
                    return {
                        changed: true,
                        oldCount,
                        newCount,
                        growth
                    };
                }
            }

            return { changed: false };

        } catch (error) {
            console.error('❌ Takipçi güncelleme hatası:', error.message);
            return { changed: false, error: error.message };
        }
    }

    // 🔄 Periyodik Güncellemeyi Başlat
    startPeriodicUpdate(frequency = null) {
        if (frequency) {
            this.updateFrequency = frequency;
        }

        // Önceki interval'i temizle
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log(`⏰ Periyodik güncelleme başlatıldı (${this.updateFrequency / 1000} saniye)`);

        this.updateInterval = setInterval(async () => {
            console.log('🔄 Otomatik profil güncelleniyor...');
            
            const result = await this.updateFollowerCount();
            
            if (result.changed) {
                console.log(`✅ Takipçi değişikliği tespit edildi: ${result.growth > 0 ? '+' : ''}${result.growth}`);
            }

        }, this.updateFrequency);
    }

    // ⏸️ Periyodik Güncellemeyi Durdur
    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Periyodik güncelleme durduruldu');
        }
    }

    // 🏁 Yayını Bitir ve Özet Oluştur
    endStream() {
        if (this.profile.streamStatus !== 'live') {
            console.log('⚠️ Zaten yayın kapalı');
            return null;
        }

        const streamSummary = {
            title: this.profile.roomTitle,
            startTime: this.profile.liveStartTime,
            endTime: new Date(),
            duration: this.profile.streamDuration,
            durationFormatted: this.formatDuration(this.profile.streamDuration),
            peakViewers: this.profile.peakViewers,
            totalViewers: this.profile.totalViewers,
            likeCount: this.profile.likeCount,
            followerGrowth: {
                initial: this.followerTracking.initial,
                final: this.followerTracking.current,
                growth: this.followerTracking.current - this.followerTracking.initial,
                percentage: ((this.followerTracking.current - this.followerTracking.initial) / this.followerTracking.initial * 100).toFixed(2),
                peak: this.followerTracking.peak,
                checkpoints: this.followerTracking.checkpoints
            },
            profile: {
                username: this.profile.username,
                nickname: this.profile.nickname,
                followerCount: this.profile.followerCount,
                verified: this.profile.verified
            }
        };

        this.streamHistory.push(streamSummary);
        this.profile.streamStatus = 'offline';
        this.profile.liveStatus = 0;
        this.profile.viewerCount = 0;
        this.stopPeriodicUpdate();

        console.log('🏁 Yayın sonlandı');
        return streamSummary;
    }

    // 📊 Takipçi Artışı Analizi
    getFollowerGrowthAnalysis() {
        const initial = this.followerTracking.initial;
        const current = this.followerTracking.current;
        const growth = current - initial;
        const percentage = initial > 0 ? ((growth / initial) * 100).toFixed(2) : '0';

        return {
            initial: initial,
            current: current,
            growth: growth,
            percentage: percentage,
            peak: this.followerTracking.peak,
            status: growth > 0 ? 'increasing' : growth < 0 ? 'decreasing' : 'stable',
            checkpoints: this.followerTracking.checkpoints,
            averageGrowthPerHour: this.calculateAverageGrowthRate()
        };
    }

    // 📉 Ortalama Büyüme Oranı
    calculateAverageGrowthRate() {
        if (!this.profile.liveStartTime || this.followerTracking.initial === 0) {
            return 0;
        }

        const hours = (Date.now() - this.profile.liveStartTime.getTime()) / (1000 * 60 * 60);
        const growth = this.followerTracking.current - this.followerTracking.initial;

        return hours > 0 ? Math.round(growth / hours) : 0;
    }

    // 🎯 Hedef Belirleme
    setGoal(type, target) {
        if (!['follower', 'viewer', 'like'].includes(type)) {
            console.error('❌ Geçersiz hedef tipi:', type);
            return false;
        }

        this.goals[`${type}Target`] = target;
        console.log(`🎯 Hedef belirlendi: ${type} = ${target}`);
        return true;
    }

    // ✅ Hedef Kontrolü
    checkGoals() {
        const achievements = [];

        if (this.goals.followerTarget && this.profile.followerCount >= this.goals.followerTarget) {
            achievements.push({
                type: 'follower',
                target: this.goals.followerTarget,
                current: this.profile.followerCount,
                achieved: true
            });
        }

        if (this.goals.viewerTarget && this.profile.peakViewers >= this.goals.viewerTarget) {
            achievements.push({
                type: 'viewer',
                target: this.goals.viewerTarget,
                current: this.profile.peakViewers,
                achieved: true
            });
        }

        if (this.goals.likeTarget && this.profile.likeCount >= this.goals.likeTarget) {
            achievements.push({
                type: 'like',
                target: this.goals.likeTarget,
                current: this.profile.likeCount,
                achieved: true
            });
        }

        return achievements;
    }

    // 🕐 Süre Formatlama
    formatDuration(minutes) {
        if (!minutes || minutes === 0) return '0 dakika';
        if (minutes < 60) return `${minutes} dakika`;
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} saat ${mins} dakika`;
    }

    // 📊 JSON Çıktısı
    getProfileJSON() {
        return {
            username: this.profile.username,
            nickname: this.profile.nickname,
            userId: this.profile.userId,
            profilePicture: this.profile.profilePicture,
            avatarMedium: this.profile.avatarMedium,
            avatarLarge: this.profile.avatarLarge,
            bio: this.profile.bio,
            verified: this.profile.verified,
            verifiedContent: this.profile.verifiedContent,
            verifiedReason: this.profile.verifiedReason,
            profileDetails: {
                constellation: this.profile.constellation,
                accountCreateTime: this.profile.accountCreateTime,
                accountAge: this.profile.accountCreateTime 
                    ? Math.floor((Date.now() - this.profile.accountCreateTime.getTime()) / (1000 * 60 * 60 * 24))
                    : 0,
                userRole: this.profile.userRole
            },
            levels: {
                payGrade: this.profile.payGrade,
                payScore: this.profile.payScore,
                topVipNo: this.profile.topVipNo,
                fanTicketCount: this.profile.fanTicketCount,
                badgeCount: this.profile.badgeList.length
            },
            stats: {
                followers: this.profile.followerCount,
                following: this.profile.followingCount,
                videos: this.profile.videoCount,
                hearts: this.profile.heartCount,
                diggs: this.profile.diggCount
            },
            stream: {
                title: this.profile.roomTitle,
                cover: this.profile.roomCover,
                status: this.profile.streamStatus,
                startTime: this.profile.liveStartTime,
                duration: this.profile.streamDuration,
                durationFormatted: this.formatDuration(this.profile.streamDuration),
                currentViewers: this.profile.viewerCount,
                peakViewers: this.profile.peakViewers,
                totalViewers: this.profile.totalViewers,
                likes: this.profile.likeCount
            },
            followerGrowth: this.getFollowerGrowthAnalysis(),
            streamHistory: this.streamHistory,
            goals: this.goals,
            goalsAchieved: this.checkGoals(),
            lastUpdated: this.profile.lastUpdated,
            lastFetched: this.profile.lastFetched
        };
    }

    // 📄 HTML Oluştur (kısaltılmış - gerekirse tamamlanır)
    generateProfileHTML() {
        const profileData = this.getProfileJSON();
        return `<!DOCTYPE html><html><head><title>${profileData.nickname} - Profil</title></head><body><h1>${profileData.nickname}</h1><p>Takipçi: ${profileData.stats.followers}</p></body></html>`;
    }
}

// Singleton instance
const streamerProfileManager = new StreamerProfileManager();

module.exports = {
    StreamerProfileManager,
    streamerProfile: streamerProfileManager.profile,
    fetchProfile: (username) => streamerProfileManager.fetchProfile(username),
    updateStreamerProfile: (roomInfo) => streamerProfileManager.updateStreamerProfile(roomInfo),
    updateViewerCount: (count) => streamerProfileManager.updateViewerCount(count),
    getProfileJSON: () => streamerProfileManager.getProfileJSON(),
    generateProfileHTML: () => streamerProfileManager.generateProfileHTML(),
    startFollowerTracking: () => streamerProfileManager.startFollowerTracking(),
    updateFollowerCount: () => streamerProfileManager.updateFollowerCount(),
    startPeriodicUpdate: (frequency) => streamerProfileManager.startPeriodicUpdate(frequency),
    stopPeriodicUpdate: () => streamerProfileManager.stopPeriodicUpdate(),
    endStream: () => streamerProfileManager.endStream(),
    getFollowerGrowthAnalysis: () => streamerProfileManager.getFollowerGrowthAnalysis(),
    setGoal: (type, target) => streamerProfileManager.setGoal(type, target),
    checkGoals: () => streamerProfileManager.checkGoals(),
    manager: streamerProfileManager
};