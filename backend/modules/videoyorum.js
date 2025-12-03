// Dosya Adı: tiktok_advanced_scraper_v16_no_argus.js
// Gelişmiş İndirici, Metadata ve Yorum Toplayıcı (Sadece X-Gorgon ve X-Ladon)

const https = require('https');
const http = require('http');   // Python API için
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// --- KONFİGÜRASYON ---
const TARGET_SEC_UID = "MS4wLjABAAAAs0VAkjCo3jk-QVk-dAawhVHfoAoCMmexdhG33Q9GqmsoFxc5BrBBynxPXRY7KvVh";
const POST_LIST_API = "https://www.tiktok.com/api/post/item_list/";
const COMMENT_LIST_API = "https://www.tiktok.com/api/comment/list/";

const MAX_ITEMS_TO_COLLECT = 3; // Toplanacak maksimum gönderi sayısı
const COUNT_PER_REQUEST = 10;    // Her istekte kaç öğe isteneceği (Post ve Yorum için)

// PYTHON SIGNATURE API URL'leri 
const PYTHON_BASE_URL = "http://127.0.0.1:8100";
const AID_VALUE = 1988; 

// TikTok oturum çerezi - Environment variable'dan alınır
// Kullanım: .env dosyasına TIKTOK_USER_COOKIE="cookie_değeri" ekleyin
const USER_COOKIE = process.env.TIKTOK_USER_COOKIE || "";

if (!USER_COOKIE) {
    console.warn("⚠️ UYARI: TIKTOK_USER_COOKIE environment variable tanımlı değil. TikTok API istekleri başarısız olabilir.");
}

const GENERAL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.tiktok.com/',
    'Cookie': USER_COOKIE,
};

// Delay fonksiyonu - spam/rate limit önleme için
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// --------------------

/**
 * Yerel Python API'sinden imza çeker.
 */
function fetchPythonSignature(endpoint, postBody) {
    const postData = JSON.stringify(postBody);
    const urlObject = new URL(`${PYTHON_BASE_URL}${endpoint}`);
    
    const options = {
        hostname: urlObject.hostname,
        port: urlObject.port,
        path: urlObject.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => { 
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode !== 200 || json === null) {
                         // Argus hatasını ortadan kaldırdık, bu hata Gorgon/Ladon çekiminde gelirse sorun var demektir.
                         console.error(`\n🔴 Python API Hatası (${endpoint} Status: ${res.statusCode}):`, json || "Python Sunucusu NULL/Boş Yanıt Döndürdü.");
                         return reject(`İmza ${endpoint} API'den alınamadı.`);
                    }
                    resolve(json);
                } catch (e) {
                    reject(`Python API yanıtı JSON olarak ayrıştırılamadı (${endpoint}): ${e.message}`);
                }
            });
        });

        req.on('error', (e) => {
            reject(`Python API'sine bağlanılamadı (${endpoint}). Lütfen sunucunun (uvicorn) çalıştığından emin olun. Hata: ${e.message}`);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * İki imza zincirini (Gorgon ve Ladon) tek bir işlemde hesaplar. X-Argus KALDIRILDI.
 */
async function getSignatures(apiUrlParams) {
    const signatures = {};
    
    // 1. ADIM: X-GORGON'u hesapla
    const gorgonData = await fetchPythonSignature('/x-gorgon', {
        params: apiUrlParams,
        headers: { "Cookie": USER_COOKIE }
    });
    signatures['X-Gorgon'] = gorgonData['X-Gorgon'];
    signatures['X-Khronos'] = gorgonData['X-Khronos'];
    
    // 2. ADIM: X-ARGUS ADIMI KALDIRILDI
    
    // 3. ADIM: X-LADON'u hesapla
    const ladonData = await fetchPythonSignature('/xladon', {
        timestamp: signatures['X-Khronos'],
        aid: AID_VALUE,
        license_id: 1611921764 
    });
    
    if (ladonData && ladonData['x-ladon']) {
        signatures['X-Ladon'] = ladonData['x-ladon'];
    } else {
         throw new Error("X-Ladon verisi Python sunucusundan alınamadı.");
    }
    
    return signatures;
}


/**
 * TikTok API'ye imzalı istek atar.
 */
function signedApiRequest(apiUrl, signatures) {
    const urlObject = new URL(apiUrl);
    
    // Argus kaldırıldı, sadece Gorgon ve Ladon kullanılıyor.
    const finalHeaders = {
        ...GENERAL_HEADERS, 
        'X-Gorgon': signatures['X-Gorgon'],
        'X-Khronos': signatures['X-Khronos'],
        'X-Ladon': signatures['X-Ladon']
    };

    return new Promise((resolve, reject) => {
        const req = https.get(urlObject, { headers: finalHeaders }, (res) => { 
            let data = '';
            res.on('data', (chunk) => data += chunk);

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (json.statusCode === 401 || json.status_code === 401 || json.status_msg === "url doesn't match") {
                         return reject(`❌ API İstek Hatası (Kod: ${json.status_code || 'Bilinmiyor'}). TikTok 3. imzayı (Argus) zorunlu kılıyor olabilir.`);
                    }
                    
                    resolve(json);
                } catch (e) {
                    reject(`API yanıtı JSON olarak ayrıştırılamadı (Engelleme veya sunucu hatası): ${e.message}`);
                }
            });
        });

        req.on('error', (e) => reject("TikTok API isteği sırasında ağ hatası: " + e.message));
        req.end();
    });
}


/**
 * Verilen post ID'si için yorumları çeker.
 */
async function fetchReplies(awemeId, commentId, shouldDelay = false) {
    let currentCursor = 0;
    let hasMore = true;
    const allReplies = [];
    let totalRequests = 0;
    
    // Yorum cevapları için de sayfalama yapalım - Limit kaldırıldı, tüm cevapları çek
    while (hasMore) {
        // DÜZELTME: 'item_id' yerine 'aweme_id' kullanılıyor.
        const apiUrlParams = `comment_id=${commentId}&aweme_id=${awemeId}&cursor=${currentCursor}&count=${COUNT_PER_REQUEST}&aid=${AID_VALUE}`;
        const apiUrl = `${COMMENT_LIST_API}?${apiUrlParams}`;
        totalRequests++;
        
        try {
            // İmza zinciri hesaplanıyor (Gorgon/Ladon)
            const signatures = await getSignatures(apiUrlParams);
            const response = await signedApiRequest(apiUrl, signatures);

            if (!response.comments || response.comments.length === 0) {
                 hasMore = false;
                 break;
            }
            
            allReplies.push(...response.comments.map(c => ({
                cid: c.cid,
                text: c.text,
                createTime: new Date(c.create_time * 1000).toISOString(),
                create_time: c.create_time,
                user: {
                    nickname: c.user.nickname,
                    uniqueId: c.user.unique_id,
                    userId: c.user.uid || c.user.user_id
                },
                userDisplay: `@${c.user.unique_id} (${c.user.nickname})`,
                likeCount: c.digg_count || 0,
                isReply: true,
            })));
            
            currentCursor = response.cursor || 0;
            hasMore = response.has_more || false;

            // Spam/rate limit önleme için delay (hızlandırıldı: 1.0 -> 0.3 saniye)
            if (shouldDelay && hasMore) {
                await delay(300); // 0.3 saniye (3x daha hızlı)
            }

        } catch (e) {
            console.error(`\t  🔴 Cevap çekme hatası (Sayfa ${totalRequests}): ${e.message}.`);
            break;
        }
    }
    
    return allReplies;
}


/**
 * Verilen post ID'si için TÜM yorumları ve cevaplarını çeker (Çoklu sayfa ve cevap desteği eklendi).
 */
async function fetchComments(awemeId, shouldDelay = false) {
    console.log(`\t> Yorumlar çekiliyor (ID: ${awemeId}, Her sayfada ${COUNT_PER_REQUEST} adet)...`);
    
    let currentCursor = 0;
    let hasMore = true;
    const allComments = [];
    let totalRequests = 0;
    
    // 1. ADIM: TÜM ANA YORUMLARI ÇEKME - Limit kaldırıldı
    while (hasMore) { 
        const apiUrlParams = `aweme_id=${awemeId}&cursor=${currentCursor}&count=${COUNT_PER_REQUEST}&aid=${AID_VALUE}`;
        const apiUrl = `${COMMENT_LIST_API}?${apiUrlParams}`;
        totalRequests++;
        
        try {
            const signatures = await getSignatures(apiUrlParams);
            const response = await signedApiRequest(apiUrl, signatures);
            
            if (!response.comments || response.comments.length === 0) {
                 hasMore = false;
                 break;
            }
            
            response.comments.forEach(c => {
                 allComments.push({
                    cid: c.cid,
                    text: c.text,
                    createTime: new Date(c.create_time * 1000).toISOString(),
                    create_time: c.create_time, // Unix timestamp
                    user: {
                        nickname: c.user.nickname,
                        uniqueId: c.user.unique_id,
                        userId: c.user.uid || c.user.user_id
                    },
                    userDisplay: `@${c.user.unique_id} (${c.user.nickname})`, // For backwards compatibility
                    likeCount: c.digg_count || 0,
                    replyCount: c.reply_comment_total,
                    replies: [], // Cevaplar buraya gelecek
                });
            });
            
            currentCursor = response.cursor || 0;
            hasMore = response.has_more || false;
            
            if (response.has_more) {
                console.log(`\t  ...${allComments.length} ana yorum toplandı. Sonraki sayfaya geçiliyor...`);
            }

            // Spam/rate limit önleme için delay (hızlandırıldı: 1.0 -> 0.3 saniye)
            if (shouldDelay && hasMore) {
                await delay(300); // 0.3 saniye (3x daha hızlı)
            }

        } catch (e) {
            console.error(`\t🔴 Ana Yorum çekme hatası (Sayfa ${totalRequests}): ${e.message}.`);
            break;
        }
    }
    
    console.log(`\t✅ Toplam ${allComments.length} ana yorum toplandı.`);

    // 2. ADIM: HER ANA YORUMUN CEVAPLARINI ÇEKME
    console.log(`\t> Toplanan ${allComments.length} ana yorum için cevaplar aranıyor...`);

    for(let i = 0; i < allComments.length; i++) {
        const comment = allComments[i];
        if (comment.replyCount > 0) {
            console.log(`\t  -> Yorum ${i+1}/${allComments.length} (@${comment.user.uniqueId}) için ${comment.replyCount} cevap aranıyor.`);
            const replies = await fetchReplies(awemeId, comment.cid, shouldDelay);
            comment.replies = replies;
            console.log(`\t  -> ${replies.length} cevap çekildi. İlerleme: ${i+1}/${allComments.length}`);

            // Yorumlar arası delay (hızlandırıldı: 0.8 -> 0.2 saniye)
            if (shouldDelay && i < allComments.length - 1) {
                await delay(200); // 0.2 saniye (4x daha hızlı)
            }
        }
    }

    console.log(`\t✅ Tüm yorumlar ve cevaplar toplandı!`);
    return allComments;
}
/**
 * Gönderiden gerekli meta verilerini ayıklar.
 */
function extractMetadata(item) {
    const isVideo = !!item.video;
    const isImage = !!item.imagePost;
    
    const metadata = {
        id: item.id,
        createTime: new Date(item.createTime * 1000).toISOString(),
        description: item.desc || 'Yok',
        type: isVideo ? 'Video' : (isImage ? 'Fotoğraf Koleksiyonu' : 'Diğer'),
        // Müzik bilgileri
        music: item.music ? {
            title: item.music.title,
            author: item.music.author,
        } : null,
        // Etiketler (Hashtag)
        hashtags: item.textExtra ? item.textExtra.filter(t => t.hashtagName).map(t => `#${t.hashtagName}`) : [],
        stats: {
            playCount: item.stats.playCount,
            commentCount: item.stats.commentCount,
            diggCount: item.stats.diggCount,
        },
        // İndirme Linki Bilgileri
        downloadInfo: {
            link: 'N/A', // Artık ana link değil, geriye dönük uyumluluk için tutulabilir
            extension: '',
            urlList: [] // <<< BÜTÜN LİNKLERİ BURAYA KAYDEDECEĞİZ
        }
    };

    if (isVideo && item.video.downloadAddr) {
        metadata.downloadInfo.extension = '.mp4';
        // Video için sadece bir link var
        metadata.downloadInfo.urlList.push(item.video.downloadAddr); 
    } else if (isImage && item.imagePost.images.length > 0) {
        metadata.downloadInfo.extension = '.jpeg';
        // FOTOĞRAF DÜZELTMESİ: Tüm fotoğrafların linklerini topla
        item.imagePost.images.forEach((image, idx) => {
            // En yüksek çözünürlüklü linki al
            const highestQualityUrl = image.imageURL.urlList[0]; 
            if (highestQualityUrl) {
                metadata.downloadInfo.urlList.push(highestQualityUrl);
            }
        });
        // Geriye dönük uyumluluk için ilk linki 'link' alanına da kaydet
        metadata.downloadInfo.link = metadata.downloadInfo.urlList[0] || 'N/A'; 
    }
    
    return metadata;
}

/**
 * Belirtilen linkteki dosyayı kaydeder.
 */
function downloadItem(itemInfo, folderPath) {
    
    if (itemInfo.downloadInfo.urlList.length === 0) {
        console.log(`\t⚠️ Medya indirilemedi: Kısıtlı/Özel içerik veya link bulunamadı.`);
        return Promise.resolve(false);
    }
    
    const downloadPromises = itemInfo.downloadInfo.urlList.map((videoUrl, index) => {
        return new Promise((resolve) => {
            const fileType = itemInfo.type.split(' ')[0];
            // Dosya adını video/fotoğraf indexi ile oluştur
            const filename = `media_${fileType}_${index + 1}${itemInfo.downloadInfo.extension}`;
            const filePath = path.join(folderPath, filename);

            const downloadHeaders = {
                'Referer': 'https://www.tiktok.com/', 
                'User-Agent': GENERAL_HEADERS['User-Agent'],
                'Cookie': GENERAL_HEADERS['Cookie'], // 403 hatası için eklendi
            };

            const requestOptions = new URL(videoUrl);
            requestOptions.headers = downloadHeaders;

            const req = https.get(requestOptions, (response) => {
                if (response.statusCode !== 200) {
                    console.log(`\t❌ İndirme Hatası (Status: ${response.statusCode}) - ${filename}.`);
                    return resolve(false);
                }

                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`\t✅ Medya İNDİRME BAŞARILI: ${filename}`);
                    resolve(true);
                });

            }).on('error', (err) => {
                console.log(`\t🔴 Ağ Hatası (İndirme: ${filename}): ${err.message}`);
                resolve(false);
            });
            
            req.end();
        });
    });

    // Tüm indirmelerin bitmesini bekle
    return Promise.all(downloadPromises).then(results => results.includes(true));
}


/**
 * Kullanıcının daha önce indirilmiş videolarını kontrol eder
 * @param {string} userFolderPath - Kullanıcı klasörü yolu (backend/Kayitlar/nickname_userId)
 * @returns {Set<string>} - İndirilmiş video ID'lerinin set'i
 */
function getExistingVideoIds(userFolderPath) {
    const existingVideoIds = new Set();
    
    if (!fs.existsSync(userFolderPath)) {
        return existingVideoIds;
    }
    
    try {
        // Tüm timestamp klasörlerini tara
        const timestampFolders = fs.readdirSync(userFolderPath).filter(sub => {
            const subPath = path.join(userFolderPath, sub);
            return fs.statSync(subPath).isDirectory() && /^\d+$/.test(sub);
        });
        
        // Her timestamp klasöründeki video klasörlerini kontrol et
        for (const timestampFolder of timestampFolders) {
            const timestampPath = path.join(userFolderPath, timestampFolder);
            const videoFolders = fs.readdirSync(timestampPath).filter(sub => {
                const subPath = path.join(timestampPath, sub);
                return fs.statSync(subPath).isDirectory() && /^\d+_/.test(sub);
            });
            
            // Video ID'lerini çıkar (format: 1_videoid -> videoid)
            for (const folderName of videoFolders) {
                const videoId = folderName.split('_').slice(1).join('_');
                existingVideoIds.add(videoId);
            }
        }
    } catch (error) {
        console.error(`⚠️ Mevcut videolar kontrol edilirken hata: ${error.message}`);
    }
    
    return existingVideoIds;
}

async function mainScraperAndDownloader(secUid = null, maxItems = null, username = null, nickname = null, userId = null, baseDir = null) {
    let currentCursor = '0';
    let hasMore = true;
    let totalCollected = 0;
    const collectedItems = []; // ✅ Local array, her çağrıda temiz başlıyor

    // Use parameters or fallback to defaults
    const targetSecUid = secUid || TARGET_SEC_UID;
    const maxItemsToCollect = maxItems === 'all' ? 999999 : (maxItems || MAX_ITEMS_TO_COLLECT);
    const folderPrefix = username || 'TikTok_Verileri';
    const shouldDelay = maxItems === 'all'; // Delay sadece "hepsi" seçildiğinde

    // baseDir parametresi verilmişse onu kullan (server.js'den geliyor), yoksa __dirname kullan
    const backendDir = baseDir || path.resolve(__dirname, '..');
    
    // Mevcut videoları kontrol et (sadece nickname ve userId varsa)
    let existingVideoIds = new Set();
    let userFolderPath = null;
    
    if (nickname && userId) {
        userFolderPath = path.resolve(backendDir, 'Kayitlar', `${nickname}_${userId}`);
        existingVideoIds = getExistingVideoIds(userFolderPath);
        console.log(`🔍 Mevcut videolar kontrol ediliyor... ${existingVideoIds.size} adet video zaten indirilmiş.`);
    }
    
    // Batman WatchMan: Kayitlar/nickname_userId/timestamp formatı
    const timestamp = Date.now();
    let rootFolderName;
    
    if (nickname && userId) {
        // backend/Kayitlar/nickname_userId/timestamp formatında kaydet
        rootFolderName = path.resolve(backendDir, 'Kayitlar', `${nickname}_${userId}`, timestamp.toString());
    } else {
        // Fallback durumunda da backend klasörüne kaydet
        rootFolderName = path.resolve(backendDir, `${folderPrefix}_${timestamp}`);
    }
    
    // Klasörü oluştur
    fs.mkdirSync(rootFolderName, { recursive: true });

    console.log(`--- TikTok Gelişmiş İndirici Başlatıldı (Gorgon/Ladon Modu) ---`);
    console.log(`Veriler "${rootFolderName}" klasörüne kaydedilecektir.`);
    console.log(`Target: ${username || 'Default'}, SecUid: ${targetSecUid.substring(0, 20)}...`);
    console.log(`Max Items: ${maxItemsToCollect === 999999 ? 'ALL' : maxItemsToCollect}`);

    // --- 1. ADIM: GÖNDERİ LİNKLERİNİ TOPLAMA ---
    console.log(`\n--- 1. ADIM: Gönderi Listesi Çekiliyor ---`);

    while (totalCollected < maxItemsToCollect && hasMore) {
        const apiUrlParams = `secUid=${targetSecUid}&cursor=${currentCursor}&count=${COUNT_PER_REQUEST}&aid=${AID_VALUE}`;
        const apiUrl = `${POST_LIST_API}?${apiUrlParams}`;
        
        try {
            console.log(`> İmza zinciri hesaplanıyor (Argus atlandı)...`);
            const signatures = await getSignatures(apiUrlParams);
            
            console.log(`> Sayfa Çekiliyor (Cursor: ${currentCursor}, Toplanan: ${totalCollected})`);
            const pageData = await signedApiRequest(apiUrl, signatures);
            
            if (!pageData.itemList || pageData.itemList.length === 0) {
                 hasMore = false;
                 if (totalCollected === 0) console.log("⚠️ İlk sayfada gönderi bulunamadı. Erişim engeli veya profil gizli.");
                 break;
            }

            for (const item of pageData.itemList) {
                if (totalCollected >= maxItemsToCollect) break; // ✅ Parametreyi kullan

                // Mevcut videoları kontrol et - eğer video zaten indirilmişse atla
                if (existingVideoIds.has(item.id)) {
                    console.log(`\t⏭️ Video zaten mevcut, atlanıyor: ${item.id}`);
                    continue;
                }

                collectedItems.push(item);
                totalCollected++;
            }

            hasMore = pageData.hasMore;
            currentCursor = pageData.cursor || '0';

            // Spam/rate limit önleme için delay (sadece "all" seçiliyse)
            if (shouldDelay && hasMore && totalCollected < maxItemsToCollect) {
                console.log(`> Sonraki sayfa için 2 saniye bekleniyor...`);
                await delay(2000); // 2 saniye
            }

        } catch (error) {
            console.error(`\n🔴 Genel Hata (Listeleme): ${error}`);
            break;
        }
    }
    
    console.log(`\n🎉 TOPLAMA BİTTİ: ${collectedItems.length} adet gönderi bulundu.`);

    // --- 2. ADIM: TOPLANAN ÖĞELERİ İŞLEME VE İNDİRME ---
    console.log(`\n--- 2. ADIM: Veri İşleme ve İndirme ---`);
    
    for (let i = 0; i < collectedItems.length; i++) {
        const item = collectedItems[i];
        const index = i + 1;
        
        console.log(`\n[${index}/${collectedItems.length}] İşleniyor: ${item.id}`);
        
        // 2.1 Klasör Oluşturma
        const folderName = `${index}_${item.id}`;
        const itemFolderPath = path.join(rootFolderName, folderName);
        fs.mkdirSync(itemFolderPath, { recursive: true });
        console.log(`\t> Klasör oluşturuldu: ${folderName}`);
        
        // 2.2 Meta Veri Ayıklama ve Kaydetme
        const metadata = extractMetadata(item);
        fs.writeFileSync(
            path.join(itemFolderPath, 'post_metadata.json'), 
            JSON.stringify(metadata, null, 2)
        );
        console.log('\t> Metadata kaydedildi.');
        
        // 2.3 Yorumları Çekme ve Kaydetme
        // Not: Video zaten varsa buraya gelmez (yukarıda filtrelenir), 
        // ama yine de kontrol edelim - eğer comments.json zaten varsa tekrar çekmeyelim
        const commentsPath = path.join(itemFolderPath, 'comments.json');
        if (!fs.existsSync(commentsPath)) {
            const comments = await fetchComments(item.id, shouldDelay);
            fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2));
            console.log(`\t> Yorumlar (${comments.length} adet) kaydedildi.`);
        } else {
            console.log(`\t⏭️ Yorumlar zaten mevcut, atlanıyor.`);
        }
        
        // 2.4 Medya İndirme
        // Medya dosyalarının varlığını kontrol et
        const hasMedia = metadata.downloadInfo.urlList.some((url, idx) => {
            const fileType = metadata.type.split(' ')[0];
            const filename = `media_${fileType}_${idx + 1}${metadata.downloadInfo.extension}`;
            const filePath = path.join(itemFolderPath, filename);
            return fs.existsSync(filePath);
        });
        
        if (!hasMedia && metadata.downloadInfo.urlList.length > 0) {
            await downloadItem(metadata, itemFolderPath);
        } else if (hasMedia) {
            console.log(`\t⏭️ Medya dosyaları zaten mevcut, atlanıyor.`);
        }

        // Spam/rate limit önleme için delay (hızlandırıldı: 1.5 -> 0.5 saniye)
        if (shouldDelay && i < collectedItems.length - 1) {
            console.log(`\t> Sonraki video için 0.5 saniye bekleniyor...`);
            await delay(500); // 0.5 saniye (3x daha hızlı)
        }
    }

    console.log(`\n--- TÜM İŞLEMLER TAMAMLANDI. ---`);
    console.log(`Verileriniz "${rootFolderName}" klasöründe düzenli bir şekilde bulunmaktadır.`);

    return {
        success: true,
        totalItems: collectedItems.length,
        folderPath: rootFolderName
    };
}

// Export for use as module
module.exports = {
    scrapeVideos: mainScraperAndDownloader
};

// Batch processing için yeni fonksiyon
async function batchScraperAndDownloader(secUid, maxItems, username, nickname, userId, baseDir, skipComments = false, progressKey = null, progressCallback) {
    const BATCH_SIZE = 20; // 20'şer 20'şer işle
    let currentCursor = '0';
    let hasMore = true;
    let totalProcessed = 0;
    let totalCollected = 0;
    let batchNumber = 0;
    
    // İptal kontrolü için global scrapingCancelled Map'ine erişim
    const checkCancelled = () => {
        if (!progressKey) return false;
        try {
            // Global scrapingCancelled Map'ine eriş
            const cancelledMap = global.scrapingCancelled;
            return cancelledMap && cancelledMap.get(progressKey) === true;
        } catch (e) {
            return false;
        }
    };
    
    const targetSecUid = secUid || TARGET_SEC_UID;
    const maxItemsToCollect = maxItems === 'all' ? 999999 : (maxItems || MAX_ITEMS_TO_COLLECT);
    const shouldDelay = maxItems === 'all';
    
    const backendDir = baseDir || path.resolve(__dirname, '..');
    
    // Mevcut videoları kontrol et
    let existingVideoIds = new Set();
    let userFolderPath = null;
    
    if (nickname && userId) {
        userFolderPath = path.resolve(backendDir, 'Kayitlar', `${nickname}_${userId}`);
        existingVideoIds = getExistingVideoIds(userFolderPath);
        console.log(`🔍 Mevcut videolar kontrol ediliyor... ${existingVideoIds.size} adet video zaten indirilmiş.`);
    }
    
    const timestamp = Date.now();
    let rootFolderName;
    
    if (nickname && userId) {
        rootFolderName = path.resolve(backendDir, 'Kayitlar', `${nickname}_${userId}`, timestamp.toString());
    } else {
        rootFolderName = path.resolve(backendDir, `TikTok_Verileri_${timestamp}`);
    }
    
    fs.mkdirSync(rootFolderName, { recursive: true });
    
    // Toplam video sayısını tahmin etmek için önce birkaç sayfa çek
    let estimatedTotal = 0;
    let tempCursor = '0';
    let tempHasMore = true;
    let tempCount = 0;
    
    if (maxItems === 'all') {
        // "Hepsi" seçildiyse, önce toplam sayıyı tahmin et (ilk 3 sayfa)
        while (tempHasMore && tempCount < 3) {
            const apiUrlParams = `secUid=${targetSecUid}&cursor=${tempCursor}&count=${COUNT_PER_REQUEST}&aid=${AID_VALUE}`;
            const apiUrl = `${POST_LIST_API}?${apiUrlParams}`;
            
            try {
                const signatures = await getSignatures(apiUrlParams);
                const pageData = await signedApiRequest(apiUrl, signatures);
                
                if (!pageData.itemList || pageData.itemList.length === 0) {
                    tempHasMore = false;
                    break;
                }
                
                estimatedTotal += pageData.itemList.length;
                tempHasMore = pageData.hasMore;
                tempCursor = pageData.cursor || '0';
                tempCount++;
            } catch (error) {
                break;
            }
        }
        // Tahmin: Her sayfada ~10 video var, toplam sayfa sayısını bilmiyoruz, bu yüzden büyük bir sayı kullan
        estimatedTotal = estimatedTotal > 0 ? estimatedTotal * 10 : 1000; // Tahmini toplam
    } else {
        estimatedTotal = maxItemsToCollect;
    }
    
    // İlerleme callback'i
    if (progressCallback) {
        progressCallback({
            status: 'scraping',
            progress: 0,
            totalVideos: estimatedTotal,
            scrapedVideos: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(estimatedTotal / BATCH_SIZE),
            message: 'Başlatılıyor...'
        });
    }
    
    // Batch processing döngüsü
    while (totalProcessed < maxItemsToCollect && hasMore) {
        // İptal kontrolü
        if (checkCancelled()) {
            console.log(`🛑 Scraping iptal edildi, durduruluyor...`);
            if (progressCallback) {
                progressCallback({
                    status: 'cancelled',
                    progress: Math.min(100, Math.round((totalProcessed / estimatedTotal) * 100)),
                    totalVideos: estimatedTotal,
                    scrapedVideos: totalProcessed,
                    message: '❌ İptal edildi'
                });
            }
            break;
        }
        
        batchNumber++;
        const batchItems = [];
        
        // 20 video çek
        while (batchItems.length < BATCH_SIZE && totalCollected < maxItemsToCollect && hasMore) {
            const apiUrlParams = `secUid=${targetSecUid}&cursor=${currentCursor}&count=${COUNT_PER_REQUEST}&aid=${AID_VALUE}`;
            const apiUrl = `${POST_LIST_API}?${apiUrlParams}`;
            
            try {
                const signatures = await getSignatures(apiUrlParams);
                const pageData = await signedApiRequest(apiUrl, signatures);
                
                if (!pageData.itemList || pageData.itemList.length === 0) {
                    hasMore = false;
                    break;
                }
                
                for (const item of pageData.itemList) {
                    if (totalCollected >= maxItemsToCollect) break;
                    
                    if (existingVideoIds.has(item.id)) {
                        continue;
                    }
                    
                    batchItems.push(item);
                    totalCollected++;
                    
                    if (batchItems.length >= BATCH_SIZE) break;
                }
                
                hasMore = pageData.hasMore;
                currentCursor = pageData.cursor || '0';
                
            } catch (error) {
                console.error(`\n🔴 Genel Hata (Listeleme): ${error}`);
                hasMore = false;
                break;
            }
        }
        
        if (batchItems.length === 0) {
            break;
        }
        
        // İlerleme güncelle
        if (progressCallback) {
            progressCallback({
                status: 'scraping',
                progress: Math.min(100, Math.round((totalProcessed / estimatedTotal) * 100)),
                totalVideos: estimatedTotal,
                scrapedVideos: totalProcessed,
                currentBatch: batchNumber,
                totalBatches: Math.ceil(estimatedTotal / BATCH_SIZE),
                message: `Batch ${batchNumber}: ${batchItems.length} video çekiliyor...`
            });
        }
        
        // 20 videoyu işle ve indir
        for (let i = 0; i < batchItems.length; i++) {
            // İptal kontrolü (her video öncesi)
            if (checkCancelled()) {
                console.log(`🛑 Scraping iptal edildi, durduruluyor...`);
                if (progressCallback) {
                    progressCallback({
                        status: 'cancelled',
                        progress: Math.min(100, Math.round((totalProcessed / estimatedTotal) * 100)),
                        totalVideos: estimatedTotal,
                        scrapedVideos: totalProcessed,
                        message: '❌ İptal edildi'
                    });
                }
                break;
            }
            
            const item = batchItems[i];
            const index = totalProcessed + 1;
            
            console.log(`\n[${index}/${estimatedTotal}] İşleniyor: ${item.id}`);
            
            const folderName = `${index}_${item.id}`;
            const itemFolderPath = path.join(rootFolderName, folderName);
            fs.mkdirSync(itemFolderPath, { recursive: true });
            
            const metadata = extractMetadata(item);
            fs.writeFileSync(
                path.join(itemFolderPath, 'post_metadata.json'),
                JSON.stringify(metadata, null, 2)
            );
            
            // Yorumları çek (skipComments false ise)
            if (!skipComments) {
                const commentsPath = path.join(itemFolderPath, 'comments.json');
                if (!fs.existsSync(commentsPath)) {
                    const comments = await fetchComments(item.id, shouldDelay);
                    fs.writeFileSync(commentsPath, JSON.stringify(comments, null, 2));
                }
            } else {
                // Sadece video seçildiyse, boş comments.json oluştur
                const commentsPath = path.join(itemFolderPath, 'comments.json');
                if (!fs.existsSync(commentsPath)) {
                    fs.writeFileSync(commentsPath, JSON.stringify([], null, 2));
                }
            }
            
            const hasMedia = metadata.downloadInfo.urlList.some((url, idx) => {
                const fileType = metadata.type.split(' ')[0];
                const filename = `media_${fileType}_${idx + 1}${metadata.downloadInfo.extension}`;
                const filePath = path.join(itemFolderPath, filename);
                return fs.existsSync(filePath);
            });
            
            if (!hasMedia && metadata.downloadInfo.urlList.length > 0) {
                await downloadItem(metadata, itemFolderPath);
            }
            
            totalProcessed++;
            
            // İlerleme güncelle
            if (progressCallback) {
                progressCallback({
                    status: 'scraping',
                    progress: Math.min(100, Math.round((totalProcessed / estimatedTotal) * 100)),
                    totalVideos: estimatedTotal,
                    scrapedVideos: totalProcessed,
                    currentBatch: batchNumber,
                    totalBatches: Math.ceil(estimatedTotal / BATCH_SIZE),
                    message: `İşleniyor: ${totalProcessed}/${estimatedTotal} video`
                });
            }
            
            if (shouldDelay && i < batchItems.length - 1) {
                await delay(500);
            }
        }
        
        // Batch arası delay (sadece "all" seçiliyse)
        if (shouldDelay && hasMore && totalProcessed < maxItemsToCollect) {
            await delay(2000);
        }
    }
    
    return {
        success: true,
        totalItems: totalProcessed,
        folderPath: rootFolderName
    };
}

// Export batch function
module.exports.batchScrapeVideos = batchScraperAndDownloader;

// If run directly (not imported)
if (require.main === module) {
    mainScraperAndDownloader();
}