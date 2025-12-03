const axios = require('axios');

// Farklı JSON parse yöntemleri (fallback için)
const parseStrategies = [
    // Strateji 1: __UNIVERSAL_DATA_FOR_REHYDRATION__ (şu anki)
    (html) => {
        const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);
        if (!match) return null;
        const data = JSON.parse(match[1]);
        return data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;
    },
    
    // Strateji 2: SIGI_STATE (eski yöntem, hala bazı sayfalarda var)
    (html) => {
        const match = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
        if (!match) return null;
        const data = JSON.parse(match[1]);
        return data?.UserModule?.users?.[Object.keys(data.UserModule.users)[0]];
    },
    
    // Strateji 3: window.__INIT_PROPS__ (alternatif)
    (html) => {
        const match = html.match(/window\.__INIT_PROPS__\s*=\s*({.*?});/s);
        if (!match) return null;
        const data = JSON.parse(match[1]);
        return data?.initialProps?.pageProps?.userInfo;
    }
];

async function fetchTikTokProfileAdvanced(username, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 ${username} profili çekiliyor... (Deneme ${attempt}/${maxRetries})`);
            
            const url = `https://www.tiktok.com/@${username}`;
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000 // 10 saniye timeout
            });

            const html = response.data;
            
            // Tüm stratejileri dene
            let userInfo = null;
            let statsData = null;
            
            for (let i = 0; i < parseStrategies.length; i++) {
                try {
                    console.log(`   📊 Parse stratejisi ${i + 1} deneniyor...`);
                    const result = parseStrategies[i](html);
                    
                    if (result) {
                        if (result.user) {
                            userInfo = result.user;
                            statsData = result.stats;
                        } else {
                            userInfo = result;
                        }
                        console.log(`   ✅ Strateji ${i + 1} başarılı!`);
                        break;
                    }
                } catch (err) {
                    console.log(`   ⚠️ Strateji ${i + 1} başarısız: ${err.message}`);
                }
            }
            
            if (!userInfo) {
                throw new Error('Hiçbir parse stratejisi çalışmadı');
            }

            const profile = {
                username: userInfo.uniqueId || userInfo.id,
                nickname: userInfo.nickname,
                userId: userInfo.id || userInfo.uid,
                signature: userInfo.signature || userInfo.desc || '',
                avatarThumb: userInfo.avatarThumb || userInfo.avatar,
                avatarMedium: userInfo.avatarMedium || userInfo.avatarMedium,
                avatarLarger: userInfo.avatarLarger || userInfo.avatarLarge,
                verified: userInfo.verified || false,
                privateAccount: userInfo.privateAccount || userInfo.secret || false,
                stats: {
                    followerCount: statsData?.followerCount || userInfo.followerCount || 0,
                    followingCount: statsData?.followingCount || userInfo.followingCount || 0,
                    heartCount: statsData?.heartCount || userInfo.heart || 0,
                    videoCount: statsData?.videoCount || userInfo.videoCount || 0,
                    diggCount: statsData?.diggCount || 0
                },
                _metadata: {
                    fetchedAt: new Date().toISOString(),
                    parseStrategy: parseStrategies.indexOf(parseStrategies.find(() => userInfo)) + 1
                }
            };

            console.log('\n✅ Profil başarıyla çekildi!\n');
            console.log('═'.repeat(80));
            console.log('\n📋 TEMEL BİLGİLER:');
            console.log('─'.repeat(80));
            console.log('👤 Kullanıcı Adı:', profile.username);
            console.log('📝 Görünen Ad:', profile.nickname);
            console.log('🆔 User ID:', profile.userId);
            console.log('📄 Bio:', profile.signature || 'Boş');
            console.log('✓ Doğrulanmış:', profile.verified ? '✅ Evet' : '❌ Hayır');
            console.log('🔒 Gizli Hesap:', profile.privateAccount ? '🔐 Evet' : '🔓 Hayır');
            
            console.log('\n📊 İSTATİSTİKLER:');
            console.log('─'.repeat(80));
            console.log('👥 Takipçi:', profile.stats.followerCount.toLocaleString('tr-TR'));
            console.log('💖 Takip Edilen:', profile.stats.followingCount.toLocaleString('tr-TR'));
            console.log('❤️  Toplam Kalp:', profile.stats.heartCount.toLocaleString('tr-TR'));
            console.log('🎬 Video Sayısı:', profile.stats.videoCount.toLocaleString('tr-TR'));
            
            console.log('\n🖼️  AVATAR URL\'LERİ:');
            console.log('─'.repeat(80));
            console.log('📷 Küçük:', profile.avatarThumb);
            console.log('📷 Orta:', profile.avatarMedium);
            console.log('📷 Büyük:', profile.avatarLarger);
            
            console.log('\n🔧 METADATA:');
            console.log('─'.repeat(80));
            console.log('📅 Çekilme Zamanı:', profile._metadata.fetchedAt);
            console.log('🔧 Parse Stratejisi:', profile._metadata.parseStrategy);
            console.log('\n' + '═'.repeat(80));

            return profile;

        } catch (error) {
            console.error(`❌ Deneme ${attempt} başarısız: ${error.message}`);
            
            if (attempt < maxRetries) {
                console.log(`⏳ ${retryDelay}ms bekleyip tekrar denenecek...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                console.error(`❌ Tüm denemeler başarısız oldu`);
                
                // Hata detayları
                if (error.response?.status === 404) {
                    throw new Error('Kullanıcı bulunamadı');
                } else if (error.code === 'ECONNABORTED') {
                    throw new Error('Zaman aşımı - TikTok yanıt vermedi');
                } else if (error.response?.status === 429) {
                    throw new Error('Çok fazla istek - Rate limit aşıldı');
                } else {
                    throw error;
                }
            }
        }
    }
    
    return null;
}

// Test fonksiyonu - birden fazla kullanıcıyı test et
async function testMultipleUsers(usernames) {
    console.log(`\n🧪 ${usernames.length} kullanıcı test ediliyor...\n`);
    
    const results = [];
    
    for (const username of usernames) {
        const result = await fetchTikTokProfileAdvanced(username, {
            maxRetries: 2,
            retryDelay: 1000
        });
        
        results.push({
            username,
            success: result !== null,
            data: result
        });
        
        console.log('\n' + '─'.repeat(80) + '\n');
        
        // Rate limiting için bekle
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Özet
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 TEST SONUCU: ${successful}/${results.length} başarılı`);
    
    return results;
}

// Komut satırından çalıştırma
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('❌ Kullanıcı adı belirtilmedi!');
        console.log('\n📖 Kullanım:');
        console.log('   node tiktok_scraper_advanced.js cessiy0');
        console.log('   node tiktok_scraper_advanced.js cessiy0 maali0100 khaby.lame');
        process.exit(1);
    }
    
    if (args.length === 1) {
        fetchTikTokProfileAdvanced(args[0]);
    } else {
        testMultipleUsers(args);
    }
}

module.exports = { 
    fetchTikTokProfileAdvanced,
    testMultipleUsers 
};