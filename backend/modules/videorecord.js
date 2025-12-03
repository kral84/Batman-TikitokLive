// hls_relay_v19_stability.js
// TikTok HLS Relay - STABİLİTE VE HIZ GÜNCELLEMESİ
// VLC/Panel donma sorununu çözmek için FFmpeg parametreleri ayarlandı ve segment bekleme eklendi.

const { TikTokLiveConnection } = require('tiktok-live-connector');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');
const util = require('util');

// --- AYARLAR ---
const KULLANICI_ADI = process.argv[2];
const HLS_KLASORU = path.join(__dirname, 'live'); 
const KAYIT_KLASORU = path.join(__dirname, 'kayitlar');
const PORT = 3002;
const SIL_TS_SONRASI = true;
// --- /AYARLAR ---

if (!KULLANICI_ADI) { /* ... */ process.exit(1); }

let ffmpegHlsProcess = null;    
let ffmpegRecordProcess = null; 
let tikTokLive = null;
let currentRecordFilePath = null; 
let isExiting = false; 

// Yeni: HLS dosyaları oluşana kadar beklemek için Promise
let hlsReadyPromise = null;
let hlsResolve = null;

function setupFolders() { /* ... */ }

async function main() {
    console.log("=============================================");
    console.log("🚀 TikTok HLS Relay & Recorder Başlatılıyor... [v19 Stability]");
    console.log(`👤 Kullanıcı: @${KULLANICI_ADI}`);
    console.log("=============================================");
    setupFolders();

    // HLS Ready Promise'i burada oluştur
    hlsReadyPromise = new Promise(resolve => { hlsResolve = resolve; });

    console.log(`[AŞAMA 1/2] 📡 Yayın durumu kontrol ediliyor...`);
    const checkConnection = new TikTokLiveConnection(KULLANICI_ADI);
    
    try {
        const preliminaryRoomInfo = await checkConnection.webClient.fetchRoomInfoFromHtml({ uniqueId: KULLANICI_ADI });
        if (preliminaryRoomInfo?.liveRoom?.status === 2) {
            console.log(`✅ @${KULLANICI_ADI} CANLI YAYINDA. Tam bağlantı kuruluyor...`);
            startFullConnectionAndFFmpeg();
        } else {
            console.log(`⚫ @${KULLANICI_ADI} YAYINDA DEĞİL.`);
            process.exit(0);
        }
    } catch (error) { 
        console.error(`❌ HATA: Kullanıcı kontrol edilemedi: ${error.message}`); 
        process.exit(1); 
    }
}

function startFullConnectionAndFFmpeg() {
    console.log(`[AŞAMA 2/2] 🔌 Tam bağlantı kuruluyor...`);
    tikTokLive = new TikTokLiveConnection(KULLANICI_ADI, {
        processGifts: false, fetchRoomInfoOnConnect: true, enableReconnect: true 
    });

    tikTokLive.on('connected', (state) => {
        console.log(`✅ Tam bağlantı başarılı. Oda ID: ${state.roomId}`);
        const streamUrl = findBestStreamUrl(state.roomInfo?.data?.stream_url);
        if (!streamUrl) { console.error('❌ HATA: Video akış URL\'si alınamadı.'); return; }
        console.log('📺 Video URL\'si bulundu.');

        if (ffmpegHlsProcess && !ffmpegHlsProcess.killed) { ffmpegHlsProcess.kill('SIGINT'); }
        if (ffmpegRecordProcess && !ffmpegRecordProcess.killed) { ffmpegRecordProcess.kill('SIGINT'); }
        
        // İKİ FFmpeg işlemini de başlat
        startFFmpegHLS(streamUrl);      
        startFFmpegRecord(streamUrl);   
    });

    tikTokLive.on('disconnected', () => { /* ... */ });
    tikTokLive.on('streamEnd', () => { /* ... */ });
    tikTokLive.on('error', (err) => { /* ... */ });

    tikTokLive.connect().catch(err => { console.error(`❌ Tam bağlantı (connect) başarısız oldu: ${err.message}`); });
}


/**
 * FFmpeg'i CANLI HLS modunda başlatan fonksiyon (V19 - STABİL)
 */
function startFFmpegHLS(streamUrl) {
    console.log('🚀 FFmpeg CANLI HLS işlemi başlatılıyor (Segmentler silinecek, Canlı İzleme için)...');
    
    const args = [
        // Giriş ayarları (Akışı hızlandır)
        '-fflags', 'nobuffer', 
        '-analyzeduration', '1M',
        '-probesize', '1M',
        '-i', streamUrl,            
        
        // Çıktı ayarları
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '4',             // Her parça 4 saniye
        '-hls_list_size', '5',         // Listede SON 5 parçayı tut
        '-hls_flags', 'delete_segments+program_date_time+independent_segments', // Silme aktif, canlı için gerekli
        
        '-hls_segment_filename', path.join(HLS_KLASORU, 'live_segment%05d.ts'), 
        path.join(HLS_KLASORU, 'index.m3u8') 
    ];
    try {
        ffmpegHlsProcess = spawn('ffmpeg', args);
        
        let initialSegmentsChecked = false;
        ffmpegHlsProcess.stderr.on('data', (data) => { 
             // FFmpeg loglarından segment oluşumunu kontrol et
             if (!initialSegmentsChecked && data.toString().includes('Opening')) {
                const liveFiles = fs.readdirSync(HLS_KLASORU).filter(f => f.endsWith('.ts'));
                // 3 segment oluştuysa (yaklaşık 12 saniye sonra) yayının hazır olduğunu varsay
                if (liveFiles.length >= 3) { 
                    initialSegmentsChecked = true;
                    hlsResolve(true); // Promise'i çöz ve yayını başlat
                }
             }
             // console.log(`[FFmpeg HLS]: ${data.toString().trim()}`); // Gerekirse aç
        });

        ffmpegHlsProcess.on('close', (code) => { console.log(`🛑 FFmpeg CANLI HLS işlemi durdu (Kod: ${code}).`); ffmpegHlsProcess = null; checkAndExit(); });
        ffmpegHlsProcess.on('error', (err) => { console.error('❌ FFmpeg CANLI HLS başlatılamadı:', err.message); ffmpegHlsProcess = null; checkAndExit(); });
        
        console.log('✅ FFmpeg CANLI HLS işlemi başarıyla başlatıldı (İlk segmentler bekleniyor)...');
    } catch (spawnError) { console.error('❌ FFmpeg (HLS) ÇALIŞTIRILAMADI.', spawnError.message); checkAndExit(); }
}

/**
 * FFmpeg'i TAM KAYIT modunda başlatan fonksiyon (V19 - BASİT KAYIT)
 */
function startFFmpegRecord(streamUrl) {
    console.log('🚀 FFmpeg TAM KAYIT işlemi başlatılıyor...');
    currentRecordFilePath = path.join(KAYIT_KLASORU, `KAYIT_${KULLANICI_ADI}_${Date.now()}.ts`);
    const args = [ '-i', streamUrl, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', currentRecordFilePath ];

    try {
        ffmpegRecordProcess = spawn('ffmpeg', args);
        let ffmpegRecErrors = ''; 
        ffmpegRecordProcess.stderr.on('data', (data) => {
            const line = data.toString();
            if (line.includes('rror') || line.includes('ailed') || line.includes('Could not')) { ffmpegRecErrors += line; }
        });

        ffmpegRecordProcess.on('close', async (code) => {
            console.log(`🛑 FFmpeg TAM KAYIT işlemi durdu (Kod: ${code}).`);
            const recordedFile = currentRecordFilePath;
            ffmpegRecordProcess = null;
            currentRecordFilePath = null;

            if (code === 0 && recordedFile && fs.existsSync(recordedFile) && isExiting) {
                await convertToMp4(recordedFile);
            } else if (isExiting) {
                console.error(`❌ Dönüştürme atlandı. Kayıt başarısız oldu veya dosya bulunamadı: ${recordedFile}`);
            }
            checkAndExit(); 
        });

        ffmpegRecordProcess.on('error', (err) => { console.error('❌ FFmpeg TAM KAYIT başlatılamadı:', err.message); ffmpegRecordProcess = null; checkAndExit(); });
        console.log('✅ FFmpeg TAM KAYIT işlemi başarıyla başlatıldı.');
        console.log(`💾 Kayıt dosyası: ${currentRecordFilePath}`);
    } catch (spawnError) { console.error('❌ FFmpeg (REC) ÇALIŞTIRILAMADI.', spawnError.message); checkAndExit(); }
}


async function convertToMp4(tsFilePath) { /* ... (önceki kodla aynı) ... */ }
function stopFFmpegProcesses(shouldCheckAndExit = false) { /* ... (önceki kodla aynı) ... */ }
function checkAndExit() { /* ... (önceki kodla aynı) ... */ }
function findBestStreamUrl(streamUrls) { /* ... (önceki kodla aynı) ... */ }

// =============================================
// WEB SUNUCUSU (Express.js) - YAYIN HAZIR OLANA KADAR BEKLEYEN ROUTE
// =============================================
const app = express();
app.use((req, res, next) => { res.header('Access-Control-Allow-Origin', '*'); next(); });

// HLS Yayın Dosyalarını Sun
app.get('/live/index.m3u8', async (req, res, next) => {
    // Yayın hazır olana kadar beklet
    if (hlsReadyPromise) {
        console.log("⏳ Tarayıcı isteği geldi, HLS hazır olana kadar bekleniyor...");
        await hlsReadyPromise;
        console.log("✅ HLS hazır! Akış sunuluyor.");
        hlsReadyPromise = null; // Sadece bir kez bekle
    }
    // Yayın hazır olduktan sonra statik dosya sunumu yap
    next();
});

// Statik HLS dosyalarını sun (Segmentler dahil)
app.use('/live', express.static(HLS_KLASORU, {
    setHeaders: function (res, filePath) {
        if (filePath.endsWith('.m3u8') || filePath.endsWith('.ts')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        if (filePath.endsWith('.ts')) { res.setHeader('Content-Type', 'video/MP2T'); }
    }
}));

app.get('/status', (req, res) => { /* ... */ });

// Sunucuyu başlat
const server = app.listen(PORT, () => {
    console.log("=============================================");
    console.log(`✅ Web Sunucusu Başlatıldı. [v19 Stabile]`);
    console.log(`📡 Dinlenen Port: ${PORT}`);
    console.log(`📺 HLS Yayın Adresi (Paneliniz için): http://localhost:${PORT}/live/index.m3u8`);
    console.log("=============================================");
    main();
});

// Temiz Kapanış (Ctrl+C)
process.on('SIGINT', () => { /* ... */ });

// --- Gerekli Fonksiyonlar (Önceki koddan kopyala) ---
function setupFolders() {
    if (fs.existsSync(HLS_KLASORU)) {
        console.log(`🧹 Eski HLS klasörü (${HLS_KLASORU}) temizleniyor...`);
        try { fs.rmSync(HLS_KLASORU, { recursive: true, force: true }); }
        catch (e) { console.error(`❌ HLS klasörü silinemedi: ${e.message}`); process.exit(1); }
    }
    console.log(`📁 Yeni HLS klasörü (${HLS_KLASORU}) oluşturuluyor...`);
    fs.mkdirSync(HLS_KLASORU);
    if (!fs.existsSync(KAYIT_KLASORU)) {
        console.log(`📁 Kayıt klasörü (${KAYIT_KLASORU}) oluşturuluyor...`);
        fs.mkdirSync(KAYIT_KLASORU);
    }
}
function stopFFmpegProcesses(shouldCheckAndExit = false) {
    if (ffmpegHlsProcess && !ffmpegHlsProcess.killed) {
        console.log('🔪 FFmpeg CANLI HLS işlemi durduruluyor...');
        ffmpegHlsProcess.kill('SIGINT');
    }
    if (ffmpegRecordProcess && !ffmpegRecordProcess.killed) {
        console.log('🔪 FFmpeg TAM KAYIT işlemi durduruluyor (Dönüştürme başlayacak)...');
        ffmpegRecordProcess.kill('SIGINT'); 
    }
    if (shouldCheckAndExit) {
        checkAndExit();
    }
}
// Diğer küçük fonksiyonlar: findBestStreamUrl, checkAndExit, convertToMp4, vb. aynı kalır.
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
// checkAndExit ve convertToMp4 fonksiyonları için yukarıdaki V18 kodu ile aynı içeriği kullan
// ...
// process.on('SIGINT', ...) için de V18 kodu ile aynı içeriği kullan
// ...
// --- /Gerekli Fonksiyonlar ---