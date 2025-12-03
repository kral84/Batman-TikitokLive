// server.js - MODÜLER VERSİYON - HATA YÖNETİMİ GELİŞTİRİLDİ
// TikTok Live Analytics Backend Server

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// Modüller
const tiktokConnection = require('./modules/connection');
const StatsManager = require('./modules/stats');
const EventHandler = require('./modules/events');
const streamerProfile = require('./modules/streamerProfile');
const fullGiftCatalog = require('./modules/fullGiftCatalog');
const { fetchTikTokProfileAnalysis } = require('./modules/tiktok_profil_analizi');
const { scrapeVideos } = require('./modules/videoyorum');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// =============================================
// HTTP SERVER (Express) - Kullanıcı Kontrolü
// =============================================

const httpApp = express();
const HTTP_PORT = 3001;

httpApp.use(cors());
httpApp.use(express.json());

// İlerleme takibi için Map (username -> progress info)
const scrapingProgress = new Map();
// İptal flag'leri için Map (username -> cancelled flag)
const scrapingCancelled = new Map();

// Global export (videoyorum.js'den erişim için)
global.scrapingCancelled = scrapingCancelled;

// Profil resmi kaydetme fonksiyonu
async function saveProfilePicture(avatarUrl, username, userId) {
    if (!avatarUrl || !username) {
        return null;
    }

    // userId yoksa eski yöntemi kullan (geriye dönük uyumluluk)
    if (!userId) {
        const profilresmiDir = path.join(__dirname, 'Profilresmi');
        if (!fs.existsSync(profilresmiDir)) {
            fs.mkdirSync(profilresmiDir, { recursive: true });
        }
        const filename = `${username}.jpg`;
        const filePath = path.join(profilresmiDir, filename);
        
        if (fs.existsSync(filePath)) {
            console.log(`📸 Profil resmi zaten mevcut: ${filename}`);
            return filePath;
        }
        
        // Eski yöntemle kaydet (userId olmadan)
        return await downloadAndSavePicture(avatarUrl, filePath, filename);
    }

    try {
        // Profilresmi klasörünü oluştur
        const profilresmiDir = path.join(__dirname, 'Profilresmi');
        if (!fs.existsSync(profilresmiDir)) {
            fs.mkdirSync(profilresmiDir, { recursive: true });
        }

        // userId'ye göre klasör oluştur
        const userDir = path.join(profilresmiDir, userId.toString());
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        // En son profil resmi için latest.jpg (hızlı erişim için)
        const latestFilePath = path.join(userDir, 'latest.jpg');
        const metadataPath = path.join(userDir, 'metadata.json');

        // Metadata dosyasını oku (varsa)
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
            try {
                const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                metadata = JSON.parse(metadataContent);
            } catch (err) {
                console.warn(`⚠️ Metadata okunamadı: ${err.message}`);
            }
        }

        // Eğer latest.jpg varsa ve URL aynıysa, tekrar indirme (SPAM ÖNLEME)
        if (fs.existsSync(latestFilePath)) {
            // Metadata varsa ve URL aynıysa, hiçbir şey yapma
            if (metadata && metadata.avatarUrl === avatarUrl) {
                console.log(`📸 Profil resmi zaten mevcut (aynı URL): ${userId}/latest.jpg`);
                return latestFilePath;
            }
            // Metadata yoksa ama latest.jpg varsa, metadata oluştur (URL kontrolü için)
            if (!metadata) {
                const newMetadata = {
                    avatarUrl: avatarUrl,
                    username: username,
                    userId: userId,
                    lastUpdated: new Date().toISOString(),
                    latestTimestamp: fs.statSync(latestFilePath).mtime.getTime()
                };
                fs.writeFileSync(metadataPath, JSON.stringify(newMetadata, null, 2), 'utf8');
                console.log(`📸 Metadata oluşturuldu: ${userId}/metadata.json`);
                return latestFilePath;
            }
        }

        // URL farklıysa veya latest.jpg yoksa, yeni profil resmini kaydet
        const timestamp = Date.now();
        const timestampFilename = `${timestamp}.jpg`;
        const timestampFilePath = path.join(userDir, timestampFilename);

        // Önce timestamp ile kaydet (geçmiş için)
        const timestampResult = await downloadAndSavePicture(avatarUrl, timestampFilePath, `${userId}/${timestampFilename}`);
        
        if (timestampResult) {
            // Başarılı olursa latest.jpg'i de güncelle
            try {
                // Eğer latest.jpg varsa ve URL farklıysa, önceki versiyonu korumak için timestamp ile kopyala
                if (fs.existsSync(latestFilePath) && (!metadata || metadata.avatarUrl !== avatarUrl)) {
                    const latestStat = fs.statSync(latestFilePath);
                    const latestTimestamp = latestStat.mtime.getTime();
                    const oldLatestPath = path.join(userDir, `latest_${latestTimestamp}.jpg`);
                    // Önceki latest'i timestamp ile kaydet (sadece farklıysa ve yoksa)
                    if (!fs.existsSync(oldLatestPath)) {
                        fs.copyFileSync(latestFilePath, oldLatestPath);
                        console.log(`📸 Önceki profil resmi arşivlendi: ${userId}/latest_${latestTimestamp}.jpg`);
                    }
                }
                
                // Yeni profil resmini latest.jpg olarak kaydet
                fs.copyFileSync(timestampFilePath, latestFilePath);
                
                // Metadata'yı güncelle
                const newMetadata = {
                    avatarUrl: avatarUrl,
                    username: username,
                    userId: userId,
                    lastUpdated: new Date().toISOString(),
                    latestTimestamp: timestamp
                };
                fs.writeFileSync(metadataPath, JSON.stringify(newMetadata, null, 2), 'utf8');
                
                console.log(`✅ Profil resmi kaydedildi: ${userId}/latest.jpg ve ${userId}/${timestampFilename}`);
            } catch (copyError) {
                console.error(`⚠️ latest.jpg güncellenirken hata: ${copyError.message}`);
            }
            
            return latestFilePath; // latest.jpg yolunu döndür
        }
        
        return null;

    } catch (error) {
        console.error(`❌ Profil resmi kaydetme hatası: ${error.message}`);
        return null;
    }
}

// Profil resmini indirip kaydetme helper fonksiyonu
async function downloadAndSavePicture(avatarUrl, filePath, displayName) {
    return new Promise((resolve) => {
        try {
            const url = new URL(avatarUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/',
                }
            };

            const fileStream = fs.createWriteStream(filePath);
            
            https.get(options, (response) => {
                if (response.statusCode !== 200) {
                    fileStream.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath); // Hatalı dosyayı sil
                    }
                    console.log(`❌ Profil resmi indirilemedi: ${displayName} (Status: ${response.statusCode})`);
                    return resolve(null);
                }

                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`✅ Profil resmi kaydedildi: ${displayName}`);
                    resolve(filePath);
                });

                fileStream.on('error', (err) => {
                    fileStream.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath); // Hatalı dosyayı sil
                    }
                    console.error(`❌ Profil resmi kaydetme hatası: ${err.message}`);
                    resolve(null);
                });
            }).on('error', (err) => {
                console.error(`❌ Profil resmi indirme hatası: ${err.message}`);
                resolve(null);
            });
        } catch (error) {
            console.error(`❌ Profil resmi indirme hatası: ${error.message}`);
            resolve(null);
        }
    });
}

// Kullanıcı kontrol endpoint'i
httpApp.get('/check-user', async (req, res) => {
    const { username } = req.query;
    
    if (!username) {
        return res.json({ exists: false, error: 'Username gerekli' });
    }

    try {
        console.log(`🔍 Kullanıcı kontrolü: ${username}`);
        
        // ÖNCELİKLE getUserInfo ile kontrol et (yayın kapalı da olsa çalışır)
        const profile = await streamerProfile.fetchProfile(username);
        
        if (!profile) {
            // Profil çekilemedi ama kullanıcı varsa yine de bilgi döndür
            return res.json({ 
                exists: true, 
                profile: {
                    username: username,
                    nickname: username,
                    userId: null,
                    profilePicture: '',
                    bio: '',
                    verified: false,
                    
                    stats: {
                        followers: 0,
                        following: 0,
                        videos: 0,
                        hearts: 0
                    },
                    
                    stream: {
                        status: 'offline', 
                        liveStatus: 0
                    }
                },
                error: 'Yayında değil'
            });
        }

        console.log(`✅ Kullanıcı bulundu: ${profile.nickname} (Durum: ${profile.streamStatus})`);
        console.log(`💡 PK/Battle durumu olabilir, bağlantıya izin veriliyor...`);

        // Profil resmini kaydet (asenkron, response'u beklemeden)
        if (profile.profilePicture) {
            saveProfilePicture(profile.profilePicture, profile.username, profile.userId)
                .catch(err => console.error('Profil resmi kaydetme hatası:', err));
        }

        res.json({ 
            exists: true,
            profile: {
                username: profile.username,
                nickname: profile.nickname,
                userId: profile.userId,
                profilePicture: profile.profilePicture,
                bio: profile.bio,
                verified: profile.verified,
                profileUrl: `https://www.tiktok.com/@${username}`,
                
                stats: {
                    followers: profile.followerCount,
                    following: profile.followingCount,
                    videos: profile.videoCount,
                    hearts: profile.heartCount
                },
                
                stream: {
                    status: 'live', 
                    liveStatus: 1
                }
            }
        });

    } catch (error) {
        console.error(`❌ Kullanıcı kontrol hatası:`, error.message);
        
        // Yayında değil hatası için özel mesaj
        let errorMessage = error.message || 'Kullanıcı kontrol edilemedi';
        if (errorMessage.includes("isn't online")) {
            errorMessage = "Yayında değil";
        }
        
        res.json({ 
            exists: false, 
            error: errorMessage,
            isOffline: errorMessage === "Yayında değil"
        });
    }
});
httpApp.get('/get-advanced-profile', async (req, res) => {
    let { username } = req.query;

    if (!username) {
        return res.status(400).json({ exists: false, error: 'Username gerekli' });
    }

    // Username'i decode et ve temizle
    try {
        username = decodeURIComponent(username).trim();
    } catch (e) {
        // Decode hatası varsa olduğu gibi kullan
        username = String(username).trim();
    }

    if (!username) {
        return res.status(400).json({ exists: false, error: 'Geçersiz username' });
    }

    try {
        console.log(`🔎 Detaylı profil çekiliyor: ${username} (Advanced Scraper)`);

        // Yeni ve detaylı modülümüzü kullanıyoruz
        const advancedProfile = await fetchTikTokProfileAnalysis(username);

        if (!advancedProfile) {
            return res.status(404).json({
                exists: false,
                error: 'Detaylı profil bilgisi scraper ile bulunamadı.'
            });
        }
        
        // Opsiyonel: İlk modülden gelen profil yöneticisini scraper verisiyle güncelleyebiliriz.
        // Bu, istatistiklerin doğru hesaplanması için faydalı olabilir.
        // streamerProfile.updateProfileFromScraper(advancedProfile); 

        console.log(`✅ Detaylı profil başarıyla çekildi: ${advancedProfile.nickname}`);

        // Profil resmini kaydet (en yüksek kaliteli olanı tercih et)
        const avatarUrl = advancedProfile.avatarLarger || 
                         advancedProfile.avatarMedium || 
                         advancedProfile.avatarThumb || 
                         advancedProfile.avatarLarge || '';
        
        if (avatarUrl) {
            saveProfilePicture(avatarUrl, advancedProfile.username, advancedProfile.userId)
                .catch(err => console.error('Profil resmi kaydetme hatası:', err));
        }

        // Scraper'dan gelen tüm zengin veriyi (istatistikler, bio, vb.) döndür
        res.json({
            exists: true,
            profile: {
                ...advancedProfile,
                profileUrl: `https://www.tiktok.com/@${username}`
            }
        });

    } catch (error) {
        console.error(`❌ Detaylı profil çekme hatası:`, error.message);
        console.error(`❌ Hata detayı:`, error.stack);
        
        // Hata mesajını daha kullanıcı dostu hale getir
        let errorMessage = error.message || 'Bilinmeyen hata';
        
        // Username'de boşluk varsa özel mesaj
        if (username.includes(' ')) {
            errorMessage = `Username'de boşluk bulundu: "${username}". TikTok username'leri genellikle boşluk içermez.`;
        }
        
        res.status(500).json({
            exists: false,
            error: `API hatası: ${errorMessage}`,
            username: username // Debug için username'i de döndür
        });
    }
});

// Manuel MP4'e çevirme endpoint'i
const convertingVideos = new Map(); // Convert durumlarını takip et

httpApp.post('/convert-to-mp4/:username/:streamId', async (req, res) => {
    try {
        const { username, streamId } = req.params;
        const streamPath = path.join(__dirname, 'kayitlar', username, streamId);
        const tsPath = path.join(streamPath, 'video.ts');
        const mp4Path = path.join(streamPath, 'video.mp4');

        // MP4 zaten varsa
        if (fs.existsSync(mp4Path)) {
            return res.json({ success: true, message: 'MP4 zaten mevcut', status: 'completed' });
        }

        // TS dosyası yoksa
        if (!fs.existsSync(tsPath)) {
            return res.status(404).json({ error: 'Video dosyası bulunamadı' });
        }

        // Zaten çevriliyor mu?
        const convertKey = `${username}/${streamId}`;
        if (convertingVideos.has(convertKey)) {
            return res.json({
                success: false,
                message: 'Video zaten çevriliyor',
                status: 'converting'
            });
        }

        // Convert işlemini başlat
        convertingVideos.set(convertKey, { status: 'converting', progress: 0 });

        res.json({ success: true, message: 'Dönüştürme başlatıldı', status: 'converting' });

        // Arkaplanda convert et
        console.log(`🔄 MP4'e çevirme başlatıldı: ${convertKey}`);

        const convertProcess = spawn('ffmpeg', [
            '-i', tsPath,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-preset', 'ultrafast', // Hızlı dönüşüm için
            '-crf', '23',
            '-movflags', '+faststart', // Web streaming için optimize
            mp4Path
        ]);

        // 60 saniye timeout
        const timeout = setTimeout(() => {
            if (convertProcess && !convertProcess.killed) {
                console.log(`⏱️ Timeout: ${convertKey} - 60 saniye aşıldı, iptal ediliyor`);
                convertProcess.kill('SIGKILL');
                convertingVideos.set(convertKey, { status: 'timeout', progress: 0 });

                // Yarım kalmış MP4'ü sil
                if (fs.existsSync(mp4Path)) {
                    fs.unlinkSync(mp4Path);
                }

                setTimeout(() => convertingVideos.delete(convertKey), 5000);
            }
        }, 60000); // 60 saniye

        let duration = 0;
        convertProcess.stderr.on('data', (data) => {
            const line = data.toString();

            // Duration'ı yakala
            if (line.includes('Duration:')) {
                const match = line.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
                if (match) {
                    duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
                }
            }

            // Progress'i yakala
            if (line.includes('time=') && duration > 0) {
                const match = line.match(/time=(\d{2}):(\d{2}):(\d{2})/);
                if (match) {
                    const current = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
                    const progress = Math.min(Math.round((current / duration) * 100), 99);
                    convertingVideos.set(convertKey, { status: 'converting', progress });
                }
            }
        });

        convertProcess.on('close', (code) => {
            clearTimeout(timeout); // Timeout'u iptal et

            if (code === 0 && fs.existsSync(mp4Path)) {
                console.log(`✅ MP4'e çevrildi: ${convertKey}`);
                convertingVideos.set(convertKey, { status: 'completed', progress: 100 });

                // TS dosyasını sil
                setTimeout(() => {
                    if (fs.existsSync(tsPath)) {
                        fs.unlinkSync(tsPath);
                        console.log(`🗑️ TS dosyası silindi: ${convertKey}`);
                    }
                    convertingVideos.delete(convertKey);
                }, 5000);
            } else {
                console.error(`❌ Dönüştürme başarısız: ${convertKey} (Kod: ${code})`);
                convertingVideos.set(convertKey, { status: 'failed', progress: 0 });

                // Yarım kalmış MP4'ü sil
                if (fs.existsSync(mp4Path)) {
                    fs.unlinkSync(mp4Path);
                }

                setTimeout(() => convertingVideos.delete(convertKey), 30000);
            }
        });

        convertProcess.on('error', (err) => {
            clearTimeout(timeout);
            console.error(`❌ Dönüştürme hatası: ${convertKey}`, err);
            convertingVideos.set(convertKey, { status: 'failed', progress: 0 });
            setTimeout(() => convertingVideos.delete(convertKey), 30000);
        });

    } catch (error) {
        console.error('❌ Convert endpoint hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Convert durumu kontrolü
httpApp.get('/convert-status/:username/:streamId', (req, res) => {
    const { username, streamId } = req.params;
    const convertKey = `${username}/${streamId}`;
    const streamPath = path.join(__dirname, 'kayitlar', username, streamId);
    const mp4Path = path.join(streamPath, 'video.mp4');

    // MP4 varsa completed
    if (fs.existsSync(mp4Path)) {
        return res.json({ status: 'completed', progress: 100 });
    }

    // Converting durumunu kontrol et
    const converting = convertingVideos.get(convertKey);
    if (converting) {
        return res.json(converting);
    }

    // Hiçbiri yoksa not_started
    res.json({ status: 'not_started', progress: 0 });
});

// Batman WatchMan - Video Scraping Endpoint
httpApp.post('/scrape-videos', async (req, res) => {
    try {
        const { username, secUid, count, nickname, userId, skipComments } = req.body;

        if (!secUid) {
            return res.status(400).json({ success: false, error: 'secUid is required' });
        }

        const progressKey = username || `user_${Date.now()}`;
        
        // Eğer zaten scraping yapılıyorsa
        if (scrapingProgress.has(progressKey) && scrapingProgress.get(progressKey).status === 'scraping') {
            return res.json({
                success: false,
                error: 'Scraping already in progress for this user'
            });
        }

        // İlerleme bilgisini başlat
        scrapingProgress.set(progressKey, {
            status: 'scraping',
            progress: 0,
            totalVideos: 0,
            scrapedVideos: 0,
            currentBatch: 0,
            totalBatches: 0,
            message: 'Başlatılıyor...'
        });

        console.log(`🦇 Batman WatchMan: Starting video scrape for ${username || 'user'}`);
        console.log(`   SecUid: ${secUid.substring(0, 30)}...`);
        console.log(`   Count: ${count}`);
        console.log(`   Save Path: ${path.join(__dirname, 'Kayitlar', `${nickname}_${userId}`, Date.now().toString())}`);

        // Batch processing için import
        const { batchScrapeVideos } = require('./modules/videoyorum');
        
        // İptal flag'ini temizle (yeni scraping başlarken)
        scrapingCancelled.delete(progressKey);
        
        // Async olarak scraping'i başlat (hemen response dön)
        batchScrapeVideos(secUid, count, username, nickname, userId, __dirname, skipComments || false, progressKey, (progress) => {
            // İlerleme callback'i
            scrapingProgress.set(progressKey, progress);
        }).then((result) => {
            // Başarılı tamamlandı
            scrapingProgress.set(progressKey, {
                status: 'completed',
                progress: 100,
                totalVideos: result.totalItems,
                scrapedVideos: result.totalItems,
                message: `✅ ${result.totalItems} video başarıyla indirildi!`
            });
            
            // 30 saniye sonra ilerleme bilgisini sil
            setTimeout(() => {
                scrapingProgress.delete(progressKey);
            }, 30000);
        }).catch((error) => {
            // Hata oluştu
            console.error('❌ Video scraping error:', error);
            scrapingProgress.set(progressKey, {
                status: 'error',
                progress: 0,
                error: error.message || 'Failed to scrape videos',
                message: `❌ Hata: ${error.message || 'Failed to scrape videos'}`
            });
            
            // 30 saniye sonra ilerleme bilgisini sil
            setTimeout(() => {
                scrapingProgress.delete(progressKey);
            }, 30000);
        });

        // Hemen response dön
        res.json({
            success: true,
            message: 'Scraping started',
            progressKey: progressKey
        });

    } catch (error) {
        console.error('❌ Video scraping error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to scrape videos'
        });
    }
});

// İlerleme endpoint'i
httpApp.get('/scrape-progress/:username', (req, res) => {
    const { username } = req.params;
    const progressKey = username;
    
    const progress = scrapingProgress.get(progressKey);
    
    if (!progress) {
        return res.json({
            status: 'not_found',
            message: 'No scraping in progress'
        });
    }
    
    res.json(progress);
});

// İptal endpoint'i
httpApp.post('/scrape-cancel/:username', (req, res) => {
    const { username } = req.params;
    const progressKey = username;
    
    const progress = scrapingProgress.get(progressKey);
    
    if (!progress || progress.status !== 'scraping') {
        return res.json({
            success: false,
            message: 'No active scraping to cancel'
        });
    }
    
    // İptal flag'ini set et
    scrapingCancelled.set(progressKey, true);
    
    // İptal durumunu işaretle
    scrapingProgress.set(progressKey, {
        ...progress,
        status: 'cancelled',
        message: '❌ İptal edildi'
    });
    
    console.log(`🛑 Scraping iptal edildi: ${username}`);
    
    res.json({
        success: true,
        message: 'Scraping cancelled'
    });
});

// Batman WatchMan - Get list of scraped users (grouped by username)
httpApp.get('/scraped-users', (req, res) => {
    try {
        const kayitlarDir = path.join(__dirname, 'Kayitlar');
        
        // Kayitlar klasörü yoksa boş dizi döndür
        if (!fs.existsSync(kayitlarDir)) {
            return res.json({ success: true, users: [] });
        }

        const userFolders = fs.readdirSync(kayitlarDir).filter(file => {
            const fullPath = path.join(kayitlarDir, file);
            return fs.statSync(fullPath).isDirectory() && /_.+$/.test(file); // nickname_userId formatı
        });

        // Kullanıcıları username bazında grupla
        const usersMap = new Map();

        // Her kullanıcı klasörü için (nickname_userId formatında)
        for (const userFolderName of userFolders) {
            const userFolderPath = path.join(kayitlarDir, userFolderName);
            
            // Bu kullanıcı klasörü içindeki timestamp klasörlerini bul
            const timestampFolders = fs.readdirSync(userFolderPath).filter(sub => {
                const subPath = path.join(userFolderPath, sub);
                return fs.statSync(subPath).isDirectory() && /^\d+$/.test(sub); // Sadece sayı (timestamp)
            });

            // Username ve userId'yi çıkar (nickname_userId formatından)
            const lastUnderscoreIndex = userFolderName.lastIndexOf('_');
            const username = userFolderName.substring(0, lastUnderscoreIndex);
            const userId = userFolderName.substring(lastUnderscoreIndex + 1);

            // Tüm timestamp klasörlerindeki videoları say
            let totalVideoCount = 0;
            let latestTimestamp = 0;
            let oldestTimestamp = Infinity;

            for (const timestampFolder of timestampFolders) {
                const timestampPath = path.join(userFolderPath, timestampFolder);
                
                // Video klasörlerini say (1_videoid, 2_videoid formatında)
                const videoFolders = fs.readdirSync(timestampPath).filter(sub => {
                    const subPath = path.join(timestampPath, sub);
                    return fs.statSync(subPath).isDirectory() && /^\d+_/.test(sub);
                });

                totalVideoCount += videoFolders.length;
                const timestamp = parseInt(timestampFolder);
                if (timestamp > latestTimestamp) latestTimestamp = timestamp;
                if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
            }

            // Aynı username için mevcut kaydı güncelle veya yeni oluştur
                if (usersMap.has(username)) {
                    const existing = usersMap.get(username);
                    existing.videoCount += totalVideoCount;
                    if (latestTimestamp > existing.latestTimestamp) {
                        existing.latestTimestamp = latestTimestamp;
                    }
                    if (oldestTimestamp < existing.oldestTimestamp) {
                        existing.oldestTimestamp = oldestTimestamp;
                    }
                    
                    // Profil resmi yolunu güncelle (eğer yoksa)
                    if (!existing.profilePicture) {
                        const profilresmiDir = path.join(__dirname, 'Profilresmi');
                        let profilePicturePath = null;
                        
                        // Yeni format: userId klasörü içinde latest.jpg
                        if (userId) {
                            const userDir = path.join(profilresmiDir, userId.toString());
                            const latestFilePath = path.join(userDir, 'latest.jpg');
                            if (fs.existsSync(latestFilePath)) {
                                profilePicturePath = `/profile-picture/${encodeURIComponent(userId.toString())}`;
                            }
                        }
                        
                        // Eski format fallback (userId yoksa veya yeni format bulunamazsa)
                        if (!profilePicturePath) {
                            if (userId) {
                                const filename = `${username}_${userId}.jpg`;
                                const filePath = path.join(profilresmiDir, filename);
                                if (fs.existsSync(filePath)) {
                                    profilePicturePath = `/profile-picture/${encodeURIComponent(filename)}`;
                                }
                            }
                            
                            if (!profilePicturePath) {
                                const filename = `${username}.jpg`;
                                const filePath = path.join(profilresmiDir, filename);
                                if (fs.existsSync(filePath)) {
                                    profilePicturePath = `/profile-picture/${encodeURIComponent(filename)}`;
                                }
                            }
                        }
                        
                        if (profilePicturePath) {
                            existing.profilePicture = profilePicturePath;
                        }
                    }
                } else {
                // Profil resmi yolunu kontrol et
                const profilresmiDir = path.join(__dirname, 'Profilresmi');
                let profilePicturePath = null;
                
                // Yeni format: userId klasörü içinde latest.jpg
                if (userId) {
                    const userDir = path.join(profilresmiDir, userId.toString());
                    const latestFilePath = path.join(userDir, 'latest.jpg');
                    if (fs.existsSync(latestFilePath)) {
                        profilePicturePath = `/profile-picture/${encodeURIComponent(userId.toString())}`;
                    }
                }
                
                // Eski format fallback (userId yoksa veya yeni format bulunamazsa)
                if (!profilePicturePath) {
                    if (userId) {
                        const filename = `${username}_${userId}.jpg`;
                        const filePath = path.join(profilresmiDir, filename);
                        if (fs.existsSync(filePath)) {
                            profilePicturePath = `/profile-picture/${encodeURIComponent(filename)}`;
                        }
                    }
                    
                    if (!profilePicturePath) {
                        const filename = `${username}.jpg`;
                        const filePath = path.join(profilresmiDir, filename);
                        if (fs.existsSync(filePath)) {
                            profilePicturePath = `/profile-picture/${encodeURIComponent(filename)}`;
                        }
                    }
                }
                
                usersMap.set(username, {
                    username,
                    userId,
                    profilePicture: profilePicturePath, // Profil resmi URL'si
                    userFolderPath: userFolderPath, // Tüm timestamp klasörlerinin üst klasörü
                    videoCount: totalVideoCount,
                    latestTimestamp,
                    oldestTimestamp,
                    timestamp: latestTimestamp // En son scraping zamanı (geriye dönük uyumluluk için)
                });
            }
        }

        // Map'i array'e çevir ve en son scraping zamanına göre sırala
        const users = Array.from(usersMap.values());
        users.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error loading scraped users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Batman WatchMan - Get videos for a specific user (all timestamps combined)
httpApp.get('/user-videos', (req, res) => {
    try {
        const { folderPath, username, userId } = req.query;

        let userFolderPath;

        // Eğer username ve userId verilmişse, tüm timestamp klasörlerini tara
        if (username && userId) {
            userFolderPath = path.join(__dirname, 'Kayitlar', `${username}_${userId}`);
            
            if (!fs.existsSync(userFolderPath)) {
                return res.status(404).json({ success: false, error: 'User folder not found' });
            }
        } else if (folderPath) {
            // Geriye dönük uyumluluk: folderPath verilmişse (eski timestamp klasörü)
            const resolvedPath = path.resolve(folderPath);
            const backendPath = path.resolve(__dirname);

            if (!resolvedPath.startsWith(backendPath)) {
                return res.status(403).json({ success: false, error: 'Invalid path' });
            }

            if (!fs.existsSync(resolvedPath)) {
                return res.status(404).json({ success: false, error: 'Folder not found' });
            }

            // Eğer folderPath bir timestamp klasörüyse, sadece o klasörü tara
            userFolderPath = resolvedPath;
        } else {
            return res.status(400).json({ success: false, error: 'folderPath or (username and userId) required' });
        }

        const allVideos = [];
        const videoIdSet = new Set(); // Duplicate video kontrolü için

        // Eğer username ve userId verilmişse, tüm timestamp klasörlerini tara
        if (username && userId) {
            const timestampFolders = fs.readdirSync(userFolderPath).filter(sub => {
                const subPath = path.join(userFolderPath, sub);
                return fs.statSync(subPath).isDirectory() && /^\d+$/.test(sub); // Sadece sayı (timestamp)
            });

            // Her timestamp klasöründen videoları topla
            for (const timestampFolder of timestampFolders) {
                const timestampPath = path.join(userFolderPath, timestampFolder);
                const videoFolders = fs.readdirSync(timestampPath)
                    .filter(item => {
                        const itemPath = path.join(timestampPath, item);
                        return fs.statSync(itemPath).isDirectory() && /^\d+_/.test(item);
                    })
                    .sort((a, b) => {
                        const numA = parseInt(a.split('_')[0]);
                        const numB = parseInt(b.split('_')[0]);
                        return numA - numB;
                    });

                // Bu timestamp klasöründeki videoları ekle
                for (const folderName of videoFolders) {
                    const videoId = folderName.split('_').slice(1).join('_');
                    
                    // Aynı video ID'si varsa atla (duplicate kontrolü)
                    if (videoIdSet.has(videoId)) {
                        continue;
                    }
                    videoIdSet.add(videoId);

                    const videoPath = path.join(timestampPath, folderName);
                    const videoData = readVideoData(videoPath, timestampPath, folderName, timestampFolder);
                    if (videoData) {
                        allVideos.push(videoData);
                    }
                }
            }
        } else {
            // Eski yöntem: sadece belirtilen folderPath'teki videoları oku
            const videoFolders = fs.readdirSync(userFolderPath)
                .filter(item => {
                    const itemPath = path.join(userFolderPath, item);
                    return fs.statSync(itemPath).isDirectory() && /^\d+_/.test(item);
                })
                .sort((a, b) => {
                    const numA = parseInt(a.split('_')[0]);
                    const numB = parseInt(b.split('_')[0]);
                    return numA - numB;
                });

            for (const folderName of videoFolders) {
                const videoPath = path.join(userFolderPath, folderName);
                const videoData = readVideoData(videoPath, userFolderPath, folderName, path.basename(userFolderPath));
                if (videoData) {
                    allVideos.push(videoData);
                }
            }
        }

        // Videoları metadata'daki createTime'a göre sırala (en yeni önce)
        allVideos.sort((a, b) => {
            const timeA = a.metadata?.createTime ? new Date(a.metadata.createTime).getTime() : 0;
            const timeB = b.metadata?.createTime ? new Date(b.metadata.createTime).getTime() : 0;
            return timeB - timeA;
        });

        res.json({ success: true, videos: allVideos });
    } catch (error) {
        console.error('Error loading user videos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function: Video verilerini okur
function readVideoData(videoPath, basePath, folderName, timestampFolder) {
    try {
        const videoId = folderName.split('_').slice(1).join('_');

        // Read metadata
        let metadata = {};
        const metadataPath = path.join(videoPath, 'post_metadata.json');
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        // Read comments
        let comments = [];
        const commentsPath = path.join(videoPath, 'comments.json');
        if (fs.existsSync(commentsPath)) {
            comments = JSON.parse(fs.readFileSync(commentsPath, 'utf8'));
        }

        // Find ALL media files (videos and images)
        const allFiles = fs.readdirSync(videoPath);

        const videoFiles = allFiles.filter(f =>
            f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.avi')
        );

        const imageFiles = allFiles.filter(f =>
            f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')
        );

        // Create media array with all videos and images
        const media = [];

        // URL için base path'i belirle
        const urlBasePath = path.basename(path.dirname(basePath)); // nickname_userId
        const urlTimestampPath = timestampFolder;

        // Add all videos
        videoFiles.forEach(file => {
            media.push({
                type: 'video',
                url: `http://localhost:3001/scraped-video/${encodeURIComponent(urlBasePath)}/${encodeURIComponent(urlTimestampPath)}/${folderName}/${file}`,
                filename: file
            });
        });

        // Add all images
        imageFiles.forEach(file => {
            media.push({
                type: 'image',
                url: `http://localhost:3001/scraped-video/${encodeURIComponent(urlBasePath)}/${encodeURIComponent(urlTimestampPath)}/${folderName}/${file}`,
                filename: file
            });
        });

        // Thumbnail: first image or first video
        let thumbnailUrl = '';
        if (imageFiles.length > 0) {
            thumbnailUrl = `http://localhost:3001/scraped-video/${encodeURIComponent(urlBasePath)}/${encodeURIComponent(urlTimestampPath)}/${folderName}/${imageFiles[0]}`;
        } else if (videoFiles.length > 0) {
            thumbnailUrl = `http://localhost:3001/scraped-video/${encodeURIComponent(urlBasePath)}/${encodeURIComponent(urlTimestampPath)}/${folderName}/${videoFiles[0]}`;
        }

        // Backwards compatibility
        const videoUrl = videoFiles.length > 0 ? `http://localhost:3001/scraped-video/${encodeURIComponent(urlBasePath)}/${encodeURIComponent(urlTimestampPath)}/${folderName}/${videoFiles[0]}` : '';

        return {
            id: videoId,
            folderPath: videoPath,
            metadata,
            comments,
            videoUrl,
            thumbnail: thumbnailUrl,
            media,
            mediaCount: media.length,
            scrapedAt: timestampFolder // Hangi timestamp klasöründen geldiği
        };
    } catch (error) {
        console.error(`Error reading video data from ${videoPath}:`, error);
        return null;
    }
}

// Serve profile pictures
// Format 1: /profile-picture/:userId (latest.jpg döndürür)
// Format 2: /profile-picture/:userId/:filename (belirli bir dosyayı döndürür)
// Format 3: /profile-picture/:filename (eski format - geriye dönük uyumluluk için)

// Format 2: İki parametre (userId/filename) - ÖNCE tanımlanmalı (daha spesifik)
httpApp.get('/profile-picture/:userId/:filename', (req, res) => {
    try {
        const { userId, filename } = req.params;
        const profilresmiDir = path.join(__dirname, 'Profilresmi');
        
        const decodedUserId = decodeURIComponent(userId);
        const decodedFilename = decodeURIComponent(filename);
        const filePath = path.join(profilresmiDir, decodedUserId, decodedFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Profile picture not found' });
        }

        // Set content type
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error serving profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Format 1 & 3: Tek parametre (userId veya eski filename) - SONRA tanımlanmalı (daha genel)
httpApp.get('/profile-picture/:userIdOrFilename', (req, res) => {
    try {
        const { userIdOrFilename } = req.params;
        const profilresmiDir = path.join(__dirname, 'Profilresmi');
        let filePath = null;

        const decoded = decodeURIComponent(userIdOrFilename);
        
        // Önce userId klasörü var mı kontrol et
        const userDir = path.join(profilresmiDir, decoded);
        if (fs.existsSync(userDir) && fs.statSync(userDir).isDirectory()) {
            // userId klasörü varsa latest.jpg'i döndür
            filePath = path.join(userDir, 'latest.jpg');
        } else {
            // Eski format: direkt filename (geriye dönük uyumluluk)
            filePath = path.join(profilresmiDir, decoded);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Profile picture not found' });
        }

        // Set content type
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error serving profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve sound files
httpApp.get('/sounds/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const decodedFilename = decodeURIComponent(filename);
        const filePath = path.join(__dirname, 'sounds', decodedFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Sound file not found' });
        }

        // Set content type based on extension
        const ext = path.extname(decodedFilename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.mp4' || ext === '.m4a') {
            contentType = 'video/mp4';
        } else if (ext === '.mp3') {
            contentType = 'audio/mpeg';
        } else if (ext === '.wav') {
            contentType = 'audio/wav';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error serving sound file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve scraped video files
// Format: /scraped-video/:userFolder/:timestampFolder/:videoFolder/:fileName
httpApp.get('/scraped-video/:userFolder/:timestampFolder/:videoFolder/:fileName', (req, res) => {
    try {
        const { userFolder, timestampFolder, videoFolder, fileName } = req.params;
        const filePath = path.join(__dirname, 'Kayitlar', userFolder, timestampFolder, videoFolder, fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set content type based on extension
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error serving scraped file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Video dosyasını stream et
httpApp.get('/stream-video/:username/:streamId', (req, res) => {
    try {
        const { username, streamId } = req.params;
        const streamPath = path.join(__dirname, 'kayitlar', username, streamId);

        // Önce mp4, yoksa ts dosyasını kontrol et
        let videoPath = path.join(streamPath, 'video.mp4');
        let contentType = 'video/mp4';

        if (!fs.existsSync(videoPath)) {
            videoPath = path.join(streamPath, 'video.ts');
            contentType = 'video/MP2T';

            if (!fs.existsSync(videoPath)) {
                return res.status(404).json({ error: 'Video bulunamadı' });
            }
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Range request (video seek için)
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Normal request
            const head = {
                'Content-Length': fileSize,
                'Content-Type': contentType,
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('❌ Video stream hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Belirli bir kaydın detayını getir
httpApp.get('/get-recording/:username/:streamId', async (req, res) => {
    try {
        const { username, streamId } = req.params;
        const streamPath = path.join(__dirname, 'kayitlar', username, streamId);

        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        const recording = {
            username,
            streamId,
            info: null,
            finalStats: null,
            events: [],
            giftCatalog: null,
            hasVideo: false,
            files: []
        };

        // info.json
        const infoPath = path.join(streamPath, 'info.json');
        if (fs.existsSync(infoPath)) {
            recording.info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        }

        // stats_final.json
        const finalStatsPath = path.join(streamPath, 'stats_final.json');
        if (fs.existsSync(finalStatsPath)) {
            recording.finalStats = JSON.parse(fs.readFileSync(finalStatsPath, 'utf8'));
        }

        // events.jsonl (son 1000 event)
        const eventsPath = path.join(streamPath, 'events.jsonl');
        if (fs.existsSync(eventsPath)) {
            const eventsContent = fs.readFileSync(eventsPath, 'utf8');
            const eventLines = eventsContent.trim().split('\n').filter(line => line);

            // Son 1000 eventi al (performans için)
            const recentEvents = eventLines.slice(-1000);
            recording.events = recentEvents.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(e => e !== null);
        }

        // gift_catalog.json
        const catalogPath = path.join(streamPath, 'gift_catalog.json');
        if (fs.existsSync(catalogPath)) {
            recording.giftCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        }

        // video dosyası kontrolü (mp4 veya ts)
        const videoMp4Path = path.join(streamPath, 'video.mp4');
        const videoTsPath = path.join(streamPath, 'video.ts');
        recording.hasVideo = fs.existsSync(videoMp4Path) || fs.existsSync(videoTsPath);

        // Tüm dosyaları listele
        recording.files = fs.readdirSync(streamPath);

        res.json({ recording });
    } catch (error) {
        console.error('❌ Kayıt detayı alınamadı:', error);
        res.status(500).json({ error: error.message });
    }
});

// Kayıtları listele
httpApp.get('/list-recordings', async (req, res) => {
    try {
        const recordingsDir = path.join(__dirname, 'kayitlar');

        if (!fs.existsSync(recordingsDir)) {
            return res.json({ recordings: [] });
        }

        const recordings = [];
        const usernames = fs.readdirSync(recordingsDir);

        for (const username of usernames) {
            const userPath = path.join(recordingsDir, username);
            const stats = fs.statSync(userPath);

            if (stats.isDirectory()) {
                const streamIds = fs.readdirSync(userPath);

                for (const streamId of streamIds) {
                    const streamPath = path.join(userPath, streamId);
                    const streamStats = fs.statSync(streamPath);

                    if (streamStats.isDirectory()) {
                        const infoPath = path.join(streamPath, 'info.json');
                        const finalStatsPath = path.join(streamPath, 'stats_final.json');
                        const videoMp4Path = path.join(streamPath, 'video.mp4');
                        const videoTsPath = path.join(streamPath, 'video.ts');

                        let info = null;
                        let finalStats = null;

                        if (fs.existsSync(infoPath)) {
                            info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                        }

                        if (fs.existsSync(finalStatsPath)) {
                            finalStats = JSON.parse(fs.readFileSync(finalStatsPath, 'utf8'));
                        }

                        recordings.push({
                            username,
                            streamId,
                            info,
                            finalStats,
                            hasVideo: fs.existsSync(videoMp4Path) || fs.existsSync(videoTsPath),
                            createdAt: streamStats.birthtime,
                            path: streamPath
                        });
                    }
                }
            }
        }

        // En yeniden en eskiye sırala
        recordings.sort((a, b) => b.createdAt - a.createdAt);

        res.json({ recordings });
    } catch (error) {
        console.error('❌ Kayıtlar listelenemedi:', error);
        res.status(500).json({ error: error.message });
    }
});

httpApp.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP API Server: http://localhost:${HTTP_PORT}`);
});

// =============================================
// WEBSOCKET SERVER
// =============================================

const WS_PORT = 8080;
const wss = new WebSocket.Server({ port: WS_PORT });
const connectedClients = new Set();

console.log(`🚀 WebSocket Server: ws://localhost:${WS_PORT}`);

// Video Kayıt Sistemi (Global değişkenler)
let isRecording = false;
let recordingProcess = null;
let currentRecordingPath = null;

// Global scope'a ekle (events.js'den erişilebilsin)
global.isRecording = isRecording;
global.recordingProcess = recordingProcess;

// Broadcast fonksiyonu
function broadcast(data) {
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (err) {
                console.error('⚠️ Broadcast hatası:', err.message);
            }
        }
    });
}

// Event handler ve stats manager (connect'te oluşturulacak)
let eventHandler = null;
let statsManager = null;
let currentStreamId = null;
let currentUsername = null;

// WebSocket bağlantıları
wss.on('connection', (ws) => {
    console.log('👤 Yeni client bağlandı');
    connectedClients.add(ws);

    // Client mesajları
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleClientMessage(data, ws);
        } catch (e) {
            console.error('❌ Mesaj parse hatası:', e.message);
        }
    });

    // Client ayrıldı
    ws.on('close', () => {
        console.log('👋 Client ayrıldı');
        connectedClients.delete(ws);
    });

    // Client hata
    ws.on('error', (error) => {
        console.error('⚠️ WebSocket client hatası:', error.message);
    });
});

// Client mesaj işleyici
async function handleClientMessage(data, ws) {
    try {
        switch(data.action) {
            // Yeni kullanıcıya bağlan
            case 'connect':
                if (data.username) {
                    console.log(`🔗 Yayına bağlanılıyor: ${data.username}`);

                    // ✅ Stream ID oluştur
                    currentStreamId = Date.now().toString();
                    currentUsername = data.username;

                    // ✅ Yeni StatsManager ve EventHandler oluştur
                    statsManager = new StatsManager(currentUsername, currentStreamId);
                    eventHandler = new EventHandler(broadcast, statsManager, currentUsername, currentStreamId);

                    console.log(`📁 Stream ID: ${currentStreamId}`);

		// "/check-user" adımından gelen mevcut profili al
                    const preFetchedProfile = streamerProfile.manager.profile;

                    // Eğer o profil hala hafızadaysa ve kullanıcı adı eşleşiyorsa,
                    // başlangıç saatini daha bağlanmayı denemeden ayarla!
                    if (preFetchedProfile && preFetchedProfile.liveStartTime && preFetchedProfile.username.toLowerCase() === data.username.toLowerCase()) {
                        console.log('⚡️ Ön-yüklenmiş yayın saati istatistiklere kopyalanıyor...');
                        statsManager.setStreamStartTime(preFetchedProfile.liveStartTime);
                    }


                    // Kullanıcı yayında, bağlan
                    const result = await tiktokConnection.connect(data.username, {
                        onConnect: (state) => {
// Hafızadaki (check-user'dan gelen) profil bilgisini al
                            const profileInfo = streamerProfile.getProfileJSON();

                            // Eğer o profil bilgisi varsa (ki olmalı),
                            // event.js'nin ihtiyaç duyduğu verileri manuel olarak güncelle.
                            if (profileInfo && profileInfo.stream.startTime) {
                                console.log('✅ Hafızadaki profil bilgisi kullanılıyor...');

                                // 1. Yayın Başlangıç Saatini ayarla
                                statsManager.setStreamStartTime(new Date(profileInfo.stream.startTime));

                                // 2. Profil modülünü tam veriyle güncelle
                               streamerProfile.updateStreamerProfile(streamerProfile.manager.profile.roomInfo);
                            }

                            // ✅ Stream info.json kaydet
                            const streamFolder = path.join('./kayitlar', currentUsername, currentStreamId);
                            const infoPath = path.join(streamFolder, 'info.json');
                            const streamInfo = {
                                username: currentUsername,
                                streamId: currentStreamId,
                                startTime: statsManager.streamStartTime || new Date(),
                                profile: profileInfo
                            };
                            fs.writeFileSync(infoPath, JSON.stringify(streamInfo, null, 2));
                            console.log(`📝 Stream info kaydedildi: ${infoPath}`);

                            // Event handler'ları kur
                            eventHandler.setupEvents(tiktokConnection.connection);

                            // Takipçi takibini başlat
                            streamerProfile.startFollowerTracking();

                            // Periyodik güncelleme (5 dakika)
                            streamerProfile.startPeriodicUpdate(5 * 60 * 1000);

                            broadcast({
                                type: 'connected',
                                message: `✅ ${data.username} yayınına bağlandı`,
                                username: data.username,
                                profile: streamerProfile.getProfileJSON()
                            });
                        },
                        onError: (error) => {
                            broadcast({
                                type: 'connectionError',
                                errorType: error.type,
                                message: error.message,
                                username: data.username
                            });
                        }
                    });

                    // Başarısızsa frontend'e bildir
                    if (!result.success) {
                        broadcast({
                            type: 'connectionError',
                            errorType: result.errorType,
                            message: result.message,
                            username: data.username
                        });
                    }
                }
                break;

            // Bağlantıyı kes
            case 'disconnect':
                // ✅ Final snapshot kaydet
                if (statsManager) {
                    statsManager.saveFinalSnapshot();
                    console.log(`💾 Final snapshot kaydedildi`);
                }

                tiktokConnection.disconnect();
                streamerProfile.stopPeriodicUpdate();

                broadcast({
                    type: 'disconnected',
                    message: 'Bağlantı kesildi'
                });

                // ✅ Değişkenleri temizle
                eventHandler = null;
                statsManager = null;
                currentStreamId = null;
                currentUsername = null;
                break;

            // İstatistik al
            case 'getStats':
                if (statsManager) {
                    // StreamerProfile'dan gerçek yayın başlangıç zamanını al
                    const profile = streamerProfile.manager.profile;
                    if (profile && profile.liveStartTime) {
                        statsManager.setStreamStartTime(profile.liveStartTime);
                    }

                    ws.send(JSON.stringify({
                        type: 'fullStats',
                        data: statsManager.getFullStats()
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'İstatistik verisi henüz hazır değil'
                    }));
                }
                break;

            // Yayıncı profili
            case 'getStreamerProfile':
                const profileData = streamerProfile.getProfileJSON();
                ws.send(JSON.stringify({
                    type: 'streamerProfile',
                    data: profileData
                }));
                break;

            // Profil JSON indir
            case 'downloadStreamerProfile':
                const profileJson = streamerProfile.getProfileJSON();
                ws.send(JSON.stringify({
                    type: 'profileJSON',
                    data: profileJson
                }));
                break;

            // Takipçi artışı analizi
            case 'getFollowerGrowth':
                const growth = streamerProfile.getFollowerGrowthAnalysis();
                ws.send(JSON.stringify({
                    type: 'followerGrowth',
                    data: growth
                }));
                break;

            // Yayın özeti (yayın bitince)
            case 'getStreamSummary':
                const summary = streamerProfile.endStream();
                ws.send(JSON.stringify({
                    type: 'streamSummary',
                    data: summary
                }));
                break;
            // Hediye Kataloğu - Kontrol et
            case 'checkCatalog':
                const catalogInfo = fullGiftCatalog.getCatalogInfo();
                ws.send(JSON.stringify({
                    type: 'catalogInfo',
                    data: catalogInfo
                }));
                break;

	// Hediye Kataloğu - Tüm hediyeleri TikTok'tan çek
            case 'fetchAllGifts':
                try {
                    // fullGiftCatalog.js'deki fonksiyonu çağır
                    const gifts = await fullGiftCatalog.fetchAllGiftsFromTikTok();

                    // ✅ Eğer stream aktifse, yayıncının klasörüne de kaydet
                    if (currentUsername && currentStreamId) {
                        const streamFolder = path.join(__dirname, 'kayitlar', currentUsername, currentStreamId);
                        const catalogPath = path.join(streamFolder, 'gift_catalog.json');
                        const catalogData = fullGiftCatalog.getCatalogJSON();

                        fs.writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2));
                        console.log(`💾 Hediye kataloğu yayıncının klasörüne kaydedildi: ${catalogPath}`);
                    }

                    // Sadece bu isteği yapan client'a (ws) cevap ver
                    ws.send(JSON.stringify({
                        type: 'allGiftsFetched',
                        count: gifts.length
                    }));

                } catch (error) {
                    // Hata olursa client'a bildir
                    ws.send(JSON.stringify({
                        type: 'fetchError',
                        message: error.message
                    }));
                }
                break;

            // Hediye Kataloğu - HTML oluştur
            case 'generateFullCatalog':
                const catalogData = fullGiftCatalog.getCatalogJSON();
                const html = fullGiftCatalog.generateCatalogHTML(catalogData);
                
                // Client'a HTML'i gönder
                ws.send(JSON.stringify({
                    type: 'catalogGenerated',
                    html: html
                }));
                break;

            // Hediye Kataloğu - JSON indir
            case 'downloadFullCatalogJSON':
                const jsonData = fullGiftCatalog.getCatalogJSON();
                
                // Client'a JSON verisini gönder
                ws.send(JSON.stringify({
                    type: 'catalogJSON',
                    data: jsonData
                }));
                break;

            // Video Kaydı Toggle
            case 'toggleRecording':
                if (isRecording) {
                    // Kaydı durdur
                    stopRecording();
                    broadcast({
                        type: 'recordingStopped',
                        message: 'Video kaydı durduruldu'
                    });
                } else {
                    // Kaydı başlat
                    startRecording();
                    broadcast({
                        type: 'recordingStarted',
                        message: 'Video kaydı başladı'
                    });
                }
                break;

            default:
                console.log('❓ Bilinmeyen action:', data.action);
        }
    } catch (error) {
        console.error('❌ Mesaj işleme hatası:', error.message);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Sunucu hatası: ' + error.message
        }));
    }
}

// =============================================
// VIDEO KAYIT FONKSİYONLARI
// =============================================

function startRecording() {
    if (isRecording) {
        console.log('⚠️ Video kaydı zaten devam ediyor');
        return;
    }

    if (!tiktokConnection.connection) {
        console.error('❌ TikTok bağlantısı yok, video kaydı başlatılamadı');
        return;
    }

    // StreamProfile'dan roomInfo'yu al
    const roomInfo = streamerProfile.manager.profile.roomInfo;
    if (!roomInfo) {
        console.error('❌ Room bilgisi henüz yüklenmedi. Lütfen birkaç saniye bekleyin.');
        return;
    }

    const streamUrl = findBestStreamUrl(roomInfo.data?.stream_url || roomInfo.stream_url);
    if (!streamUrl) {
        console.error('❌ Video akış URL\'si bulunamadı');
        console.log('📊 RoomInfo detayları:', JSON.stringify(roomInfo, null, 2));
        return;
    }

    isRecording = true;
    global.isRecording = true; // Global'e kaydet

    // ✅ StreamId klasörüne kaydet
    if (currentStreamId && currentUsername) {
        const recordDir = path.join(__dirname, 'kayitlar', currentUsername, currentStreamId);

        // Klasör yoksa oluştur
        if (!fs.existsSync(recordDir)) {
            fs.mkdirSync(recordDir, { recursive: true });
        }

        currentRecordingPath = path.join(recordDir, 'video.ts');
        console.log(`📁 Video streamId klasörüne kaydedilecek: ${currentStreamId}`);
    } else {
        // Fallback: Eski yöntem (bağlantı yoksa)
        const timestamp = Date.now();
        const username = streamerProfile.manager.profile.username || 'unknown';
        const recordDir = path.join(__dirname, 'kayitlar');

        if (!fs.existsSync(recordDir)) {
            fs.mkdirSync(recordDir, { recursive: true });
        }

        currentRecordingPath = path.join(recordDir, `KAYIT_${username}_${timestamp}.ts`);
        console.log('⚠️ StreamId bulunamadı, eski formatta kaydediliyor');
    }
    
    console.log(`📹 Video kaydı başlatılıyor...`);
    console.log(`💾 Dosya: ${currentRecordingPath}`);
    console.log(`📡 URL: ${streamUrl}`);

    // FFmpeg ile kayıt
    recordingProcess = spawn('ffmpeg', [
        '-i', streamUrl,
        '-c', 'copy',
        '-bsf:a', 'aac_adtstoasc',
        currentRecordingPath
    ]);
    global.recordingProcess = recordingProcess; // Global'e kaydet

    recordingProcess.stderr.on('data', (data) => {
        const line = data.toString();
        if (line.includes('error') || line.includes('failed')) {
            console.error('📹 FFmpeg hatası:', line.trim());
        }
    });

    recordingProcess.on('close', (code) => {
        console.log(`📹 Video kaydı tamamlandı (Kod: ${code})`);
        
        // TS'i MP4'e çevir
        if (code === 0 && currentRecordingPath && fs.existsSync(currentRecordingPath)) {
            convertToMp4(currentRecordingPath);
        }
        
        recordingProcess = null;
        global.recordingProcess = null;
        currentRecordingPath = null;
        isRecording = false;
        global.isRecording = false;
    });

    recordingProcess.on('error', (err) => {
        console.error('❌ FFmpeg başlatılamadı:', err.message);
        recordingProcess = null;
        global.recordingProcess = null;
        currentRecordingPath = null;
        isRecording = false;
        global.isRecording = false;
    });
}

function stopRecording() {
    if (!isRecording) {
        console.log('⚠️ Video kaydı zaten durmuş');
        return;
    }

    console.log('🛑 Video kaydı durduruluyor...');
    isRecording = false;
    global.isRecording = false;
    
    if (recordingProcess && !recordingProcess.killed) {
        recordingProcess.kill('SIGINT');
    }
    if (global.recordingProcess && !global.recordingProcess.killed) {
        global.recordingProcess.kill('SIGINT');
    }
}

async function convertToMp4(tsFilePath) {
    const mp4FilePath = tsFilePath.replace('.ts', '.mp4');
    console.log(`🔄 MP4'e çevriliyor: ${mp4FilePath}`);

    return new Promise((resolve, reject) => {
        const convertProcess = spawn('ffmpeg', [
            '-i', tsFilePath,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-preset', 'fast',
            '-crf', '23',
            '-movflags', '+faststart', // Web streaming için optimize
            mp4FilePath
        ]);

        // Progress logları
        convertProcess.stderr.on('data', (data) => {
            const line = data.toString();
            if (line.includes('time=')) {
                // Progress göster
                process.stdout.write(`\r🔄 MP4'e çeviriliyor...`);
            }
        });

        convertProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ MP4'e çevrildi: ${mp4FilePath}`);
                // TS dosyasını sil
                if (fs.existsSync(tsFilePath)) {
                    fs.unlinkSync(tsFilePath);
                    console.log(`🗑️ TS dosyası silindi`);
                }
                resolve(mp4FilePath);
            } else {
                console.error(`\n❌ Dönüştürme başarısız (Kod: ${code})`);
                reject(code);
            }
        });

        convertProcess.on('error', (err) => {
            console.error('❌ Dönüştürme hatası:', err);
            reject(err);
        });
    });
}

function findBestStreamUrl(streamUrls) {
    if (!streamUrls) return null;
    if (streamUrls.flv_pull_url?.FULL_HD1) return streamUrls.flv_pull_url.FULL_HD1;
    if (streamUrls.flv_pull_url?.HD1) return streamUrls.flv_pull_url.HD1;
    if (streamUrls.flv_pull_url?.SD1) return streamUrls.flv_pull_url.SD1;
    if (streamUrls.flv_pull_url?.SD2) return streamUrls.flv_pull_url.SD2;
    if (streamUrls.rtmp_pull_url) return streamUrls.rtmp_pull_url;
    if (streamUrls.hls_pull_url) return streamUrls.hls_pull_url;
    return null;
}

// =============================================
// PERİYODİK GÖREVLER
// =============================================

// Her 10 saniyede istatistik gönder
setInterval(() => {
    if (tiktokConnection.isConnected && connectedClients.size > 0 && statsManager) {
        // StreamerProfile'dan gerçek yayın başlangıç zamanını al
        const profile = streamerProfile.manager.profile;
        if (profile && profile.liveStartTime) {
            statsManager.setStreamStartTime(profile.liveStartTime);
        }

        broadcast({
            type: 'stats',
            data: statsManager.getFullStats()
        });
    }
}, 10000);


// =============================================
// HATA YÖNETİMİ
// =============================================

process.on('uncaughtException', (error) => {
    console.error('🚨 Yakalanmamış hata:', error.message);
    // Sunucuyu kapatma, sadece logla
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Yakalanmamış promise reddi:', reason);
    // Sunucuyu kapatma, sadece logla
});

// =============================================
// SERVER BAŞLATILDI
// =============================================

console.log('');
console.log('🎉 TikTok Live Analytics Server Hazır!');
console.log('📡 WebSocket: ws://localhost:8080');
console.log('🌐 HTTP API: http://localhost:3001');
console.log('💡 Frontend\'den kullanıcı bekleniyor...');
console.log('💎 Kur: 1💎 = $0.005 | 1$ = ₺34');
console.log('');