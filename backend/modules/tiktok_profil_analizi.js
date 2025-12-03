// Dosya Adı: tiktok_profil_analizi.js
// TikTok Web Sitesinden Detaylı Profil Verisi Çekme ve Analizi

const axios = require('axios');

// === YARDIMCI FONKSİYONLAR ===

// Sayı formatlama (Örn: 100000 -> 100.000)
const formatNumber = (numStr) => {
  const num = Number(numStr);
  if (isNaN(num)) return 'Bilinmiyor';
  return new Intl.NumberFormat('tr-TR').format(num);
};

// Unix timestamp formatlama (saniye -> okunabilir tarih)
const formatDate = (timestamp) => {
  if (!timestamp) return "Bilinmiyor";
  const num = Number(timestamp);
  if (isNaN(num)) return "Bilinmiyor";
  // TikTok saniye (seconds) formatında timestamp kullanır
  return new Date(num * 1000).toLocaleString("tr-TR", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// JSON içindeki metinleri (biyo, nickname) düzgün göstermek
const formatText = (text) => {
  if (!text) return "Yok";
  try {
    // Kaçış karakterlerini (örneğin \n) düzeltmek için
    return JSON.parse(JSON.stringify(text));
  } catch (e) {
    return text;
  }
};

// Boolean (true/false) formatlama
const formatBoolean = (value) => {
  if (value === true) return '✅ Evet';
  if (value === false) return '❌ Hayır';
  return 'Bilinmiyor';
};

// Gizlilik ayarlarını Türkçeye çevirme
const mapPrivacySetting = (value) => {
  const map = {
    0: 'Herkes (Public)',
    1: 'Arkadaşlar (Friends)',
    2: 'Takipçiler / Sadece Ben',
    3: 'Kimse',
    4: 'Kapalı'
  };
  return map[value] || `Bilinmeyen Değer (${value})`;
};

// CANLI Yayın durumunu kontrol etme
const checkLiveStatus = (roomId) => {
  return roomId ? `🔴 Evet, Şu An CANLI Yayında! (Oda ID: ${roomId})` : '⚪ Hayır (Çevrimdışı)';
};

// === ANA FONKSİYON ===

async function fetchTikTokProfileAnalysis(username) {
  // Username'i temizle: trim yap ve boşlukları kaldır
  let cleanUsername = String(username).trim();
  
  if (!cleanUsername) {
    throw new Error('Geçersiz username: boş veya sadece boşluk içeriyor');
  }
  
  // Username'de boşluk varsa kaldır (TikTok username'leri boşluk içermez)
  const originalUsername = cleanUsername;
  cleanUsername = cleanUsername.replace(/\s+/g, '');
  
  if (!cleanUsername) {
    throw new Error('Geçersiz username: boşluklar kaldırıldıktan sonra boş kaldı');
  }
  
  // Orijinal username'de boşluk varsa uyarı ver
  if (originalUsername !== cleanUsername) {
    console.log(`⚠️ UYARI: Username'deki boşluklar kaldırıldı: "${originalUsername}" -> "${cleanUsername}"`);
  }
  
  // TikTok URL formatı
  const url = `https://www.tiktok.com/@${cleanUsername}`;
  console.log(`\n🔍 "${cleanUsername}" için detaylı profil verisi alınıyor...`);
  console.log(`📡 URL: ${url}`);

  // TikTok cookie - Environment variable'dan alınır
  // Kullanım: .env dosyasına TIKTOK_USER_COOKIE="cookie_değeri" ekleyin
  const USER_COOKIE = process.env.TIKTOK_USER_COOKIE || "";
  
  if (!USER_COOKIE) {
    console.warn("⚠️ UYARI: TIKTOK_USER_COOKIE environment variable tanımlı değil. TikTok API istekleri başarısız olabilir.");
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.tiktok.com/',
        'Cookie': USER_COOKIE,
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });

    const htmlContent = response.data;

    // 1. ADIM: Sayfadaki ana JSON verisini bul
    const dataRegex = new RegExp('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\\/json">([\\s\\S]*?)<\\/script>');

    const match = htmlContent.match(dataRegex);
    if (!match || !match[1]) {
      throw new Error("Ana JSON veri bloğu bulunamadı.");
    }

    // 2. ADIM: JSON'ı Ayrıştır ve Gerekli Verilere Ulaş
    const jsonData = JSON.parse(match[1]);
    const scope = jsonData["__DEFAULT_SCOPE__"];

    if (!scope || !scope["webapp.user-detail"]) {
      throw new Error("'webapp.user-detail' yapısı bulunamadı.");
    }

    const userInfo = scope["webapp.user-detail"].userInfo;
    const user = userInfo.user;
    const stats = userInfo.stats;
    const appContext = scope["webapp.app-context"] || {};
    const geoCity = scope["webapp.biz-context"]?.geoCity || {};

    // 3. ADIM: Tüm Verileri Yapılandır
    const profileData = {
      // Kimlik Bilgileri
      username: user.uniqueId,
      nickname: formatText(user.nickname),
      userId: user.id,
      secUid: user.secUid,
      signature: formatText(user.signature),

      // Avatar URLs
      avatarThumb: user.avatarThumb,
      avatarMedium: user.avatarMedium,
      avatarLarger: user.avatarLarger,

      // Doğrulama ve Hesap Türü
      verified: user.verified || false,
      privateAccount: user.privateAccount || false,

      // Tarihçe
      createTime: user.createTime,
      createTimeFormatted: formatDate(user.createTime),
      nickNameModifyTime: user.nickNameModifyTime,
      nickNameModifyTimeFormatted: formatDate(user.nickNameModifyTime),

      // İstatistikler
      stats: {
        followerCount: stats.followerCount || 0,
        followingCount: stats.followingCount || 0,
        heartCount: stats.heartCount || 0,
        videoCount: stats.videoCount || 0,
        friendCount: stats.friendCount || 0,
        diggCount: stats.diggCount || 0
      },

      // Gizlilik Ayarları
      privacy: {
        commentSetting: user.commentSetting,
        commentSettingFormatted: mapPrivacySetting(user.commentSetting),
        duetSetting: user.duetSetting,
        duetSettingFormatted: mapPrivacySetting(user.duetSetting),
        stitchSetting: user.stitchSetting,
        stitchSettingFormatted: mapPrivacySetting(user.stitchSetting),
        downloadSetting: user.downloadSetting,
        downloadSettingFormatted: mapPrivacySetting(user.downloadSetting),
        followingVisibility: user.followingVisibility,
        followingVisibilityFormatted: mapPrivacySetting(user.followingVisibility)
      },

      // CANLI Yayın Durumu
      liveStatus: {
        isLive: !!user.roomId,
        roomId: user.roomId || null,
        formatted: checkLiveStatus(user.roomId)
      },

      // Ticari Bilgiler
      commerce: {
        isCommerceUser: user.commerceUserInfo?.commerceUser || false,
        isTTSeller: user.ttSeller || false
      },

      // Coğrafi ve Teknik Bilgiler
      geo: {
        city: geoCity.City || 'Bilinmiyor',
        subdivisions: geoCity.Subdivisions || 'Bilinmiyor',
        country: geoCity.Country || 'TR'
      },

      technical: {
        language: appContext.language || 'tr-TR',
        region: appContext.region || 'TR'
      },

      // Metadata
      _metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'tiktok_profil_analizi.js'
      }
    };

    // 4. ADIM: Console'a Detaylı Rapor
    console.log("\n" + "=".repeat(60));
    console.log(`    @${profileData.username} - DETAYLI PROFİL RAPORU`);
    console.log("=".repeat(60));

    console.log("\n--- 👤 KİMLİK VE TARİHÇE ---");
    console.log(`  Kullanıcı Adı (@):        ${profileData.username}`);
    console.log(`  Görünen Ad:               ${profileData.nickname}`);
    console.log(`  Biyografi:                ${profileData.signature}`);
    console.log(`  Doğrulanmış Hesap:        ${formatBoolean(profileData.verified)}`);
    console.log(`  Hesap Kurulum Tarihi:     ${profileData.createTimeFormatted}`);
    console.log(`  Son Ad Değişikliği:       ${profileData.nickNameModifyTimeFormatted}`);

    console.log("\n--- 📈 SOSYAL İSTATİSTİKLER ---");
    console.log(`  Takipçi Sayısı:           ${formatNumber(profileData.stats.followerCount)}`);
    console.log(`  Takip Edilen Sayısı:      ${formatNumber(profileData.stats.followingCount)}`);
    console.log(`  Toplam Beğeni (Kalp):     ${formatNumber(profileData.stats.heartCount)}`);
    console.log(`  Video Sayısı:             ${formatNumber(profileData.stats.videoCount)}`);
    console.log(`  Karşılıklı Arkadaş:       ${formatNumber(profileData.stats.friendCount)}`);

    console.log("\n--- 🔒 GİZLİLİK AYARLARI ---");
    console.log(`  Hesap Türü:               ${profileData.privateAccount ? 'Özel Hesap' : 'Herkese Açık'}`);
    console.log(`  CANLI Yayın Durumu:       ${profileData.liveStatus.formatted}`);
    console.log(`  Yorum Ayarı:              ${profileData.privacy.commentSettingFormatted}`);
    console.log(`  Düet / Ekleme Ayarı:      ${profileData.privacy.duetSettingFormatted} / ${profileData.privacy.stitchSettingFormatted}`);
    console.log(`  Video İndirme İzni:       ${profileData.privacy.downloadSettingFormatted}`);
    console.log(`  Takip Listesi Gizliliği:  ${profileData.privacy.followingVisibilityFormatted}`);

    console.log("\n--- 💼 TİCARİ VE TEKNİK BİLGİLER ---");
    console.log(`  İşletme Hesabı mı?:       ${formatBoolean(profileData.commerce.isCommerceUser)}`);
    console.log(`  TikTok Shop Satıcısı mı?: ${formatBoolean(profileData.commerce.isTTSeller)}`);
    console.log(`  Coğrafi Bölge:            ${profileData.geo.city} / ${profileData.geo.subdivisions}`);
    console.log(`  Kullanılan Dil:           ${profileData.technical.language}`);
    console.log(`  Güvenli ID (secUid):      ${profileData.secUid}`);
    console.log(`  Avatar URL (Büyük):       ${profileData.avatarLarger}`);
    console.log("=".repeat(60) + "\n");

    return profileData;

  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`\n❌ Hata: '${username}' adında bir kullanıcı bulunamadı (404).`);
      throw new Error(`Kullanıcı bulunamadı: ${username}`);
    } else {
      console.error("\n❌ GENEL HATA: Profil alınamadı veya ayrıştırılamadı.");
      console.error("Hata Detayı:", error.message);
      console.error("İpucu: TikTok sizi engellemiş olabilir (IP ban/CAPTCHA) veya web yapısı değişmiş olabilir.");
      throw error;
    }
  }
}

// Export
module.exports = {
  fetchTikTokProfileAnalysis,
  formatNumber,
  formatDate,
  formatText,
  formatBoolean,
  mapPrivacySetting,
  checkLiveStatus
};
