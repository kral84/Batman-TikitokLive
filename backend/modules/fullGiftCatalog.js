const { WebcastPushConnection } = require('tiktok-live-connector');
const fs = require('fs');
const path = require('path');

// Global hediye kataloğu
let fullGiftCatalog = [];
let catalogLastFetched = null;
let isFetchingCatalog = false;

// TikTok'tan TÜM hediyeleri çek
async function fetchAllGiftsFromTikTok(username = 'tiktok') {
    if (isFetchingCatalog) {
        console.log('⏳ Katalog zaten çekiliyor...');
        return fullGiftCatalog;
    }

    try {
        isFetchingCatalog = true;
        console.log('🎁 TikTok hediye kataloğu çekiliyor...');
        
        const connection = new WebcastPushConnection(username);
        const allGifts = await connection.fetchAvailableGifts();
        
        console.log(`✅ ${allGifts.length} hediye bulundu!`);
        
        // Hediyeleri işle ve kataloga ekle
        fullGiftCatalog = allGifts
            .filter(gift => gift.diamond_count && gift.diamond_count > 0)
            .map(gift => ({
                id: gift.id,
                name: gift.name,
                diamondCount: gift.diamond_count,
                
                // Görseller
                imageUrl: gift.image?.url_list?.[0] || gift.icon?.url_list?.[0] || '',
                iconUrl: gift.icon?.url_list?.[0] || '',
                
                // Fiyat hesaplamaları
                usdValue: (gift.diamond_count * 0.005).toFixed(2),
                tryValue: (gift.diamond_count * 0.005 * 34).toFixed(2),
                
                // Hediye özellikleri
                type: gift.type || 0,
                isLocked: gift.lock_info?.lock === true,
                requiredLevel: gift.lock_info?.gift_level || 0,
                isForLinkMic: gift.for_linkmic === true,
                canBatchSend: gift.batch_gift_info?.can_batch_send === true,
                batchOptions: gift.batch_gift_info?.available_counts || [],
                
                // Kategori belirleme
                rarity: getRarity(gift.diamond_count),
                
                // İstatistikler (yayından toplanacak)
                timesSent: 0,
                totalValue: 0,
                uniqueUsers: new Set()
            }))
            .sort((a, b) => b.diamondCount - a.diamondCount);
        
        catalogLastFetched = new Date();
        isFetchingCatalog = false;
        
        console.log(`📊 Katalog hazır: ${fullGiftCatalog.length} hediye`);
        
        // Katalog dosyasına kaydet
        saveCatalogToFile();
        
        return fullGiftCatalog;
        
    } catch (error) {
        console.error('❌ Katalog çekilirken hata:', error.message);
        isFetchingCatalog = false;
        return [];
    }
}

// Hediye nadirliğini belirle
function getRarity(diamondCount) {
    if (diamondCount >= 10000) return 'legendary';
    if (diamondCount >= 1000) return 'epic';
    if (diamondCount >= 100) return 'rare';
    if (diamondCount >= 10) return 'uncommon';
    return 'common';
}

// Yayında gönderilen hediye istatistiklerini güncelle
function updateGiftStats(giftId, username, repeatCount = 1) {
    const gift = fullGiftCatalog.find(g => g.id === giftId);
    
    if (gift) {
        const totalDiamonds = gift.diamondCount * repeatCount;
        gift.timesSent += repeatCount;
        gift.totalValue += totalDiamonds;
        gift.uniqueUsers.add(username);
    }
}

// Katalog JSON'u
function getCatalogJSON() {
    const catalog = fullGiftCatalog.map(gift => ({
        id: gift.id,
        name: gift.name,
        diamondCount: gift.diamondCount,
        imageUrl: gift.imageUrl,
        iconUrl: gift.iconUrl,
        usdValue: gift.usdValue,
        tryValue: gift.tryValue,
        type: gift.type,
        rarity: gift.rarity,
        
        // Özellikler
        isLocked: gift.isLocked,
        requiredLevel: gift.requiredLevel,
        isForLinkMic: gift.isForLinkMic,
        canBatchSend: gift.canBatchSend,
        batchOptions: gift.batchOptions,
        
        // İstatistikler
        timesSent: gift.timesSent,
        totalValue: gift.totalValue,
        uniqueUsers: gift.uniqueUsers.size
    }));
    
    return {
        lastFetched: catalogLastFetched,
        totalGifts: catalog.length,
        categories: {
            legendary: catalog.filter(g => g.rarity === 'legendary').length,
            epic: catalog.filter(g => g.rarity === 'epic').length,
            rare: catalog.filter(g => g.rarity === 'rare').length,
            uncommon: catalog.filter(g => g.rarity === 'uncommon').length,
            common: catalog.filter(g => g.rarity === 'common').length
        },
        catalog
    };
}

// HTML sayfası oluştur
function generateCatalogHTML(catalogData) {
    const rarityInfo = {
        legendary: { label: 'Efsanevi', emoji: '🌟', color: '#ffd700', border: 'border-yellow-400' },
        epic: { label: 'Epik', emoji: '💜', color: '#9b59b6', border: 'border-purple-400' },
        rare: { label: 'Nadir', emoji: '💙', color: '#3498db', border: 'border-blue-400' },
        uncommon: { label: 'Sıradışı', emoji: '💚', color: '#2ecc71', border: 'border-green-400' },
        common: { label: 'Normal', emoji: '⚪', color: '#95a5a6', border: 'border-gray-300' }
    };
    
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🦇 TikTok Tam Hediye Kataloğu - Batman Theme</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            padding: 20px;
            min-height: 100vh;
            color: #e0e0e0;
        }

        .container { max-width: 1600px; margin: 0 auto; }

        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border: 2px solid #FFD700;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(255, 215, 0, 0.3);
            margin-bottom: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 3rem;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }

        .header p { color: #999; font-size: 1.1rem; }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            border: 2px solid #FFD700;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(255, 215, 0, 0.1);
            text-align: center;
            transition: all 0.3s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
            border-color: #FFA500;
        }

        .stat-card .value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #FFD700;
            margin-bottom: 8px;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        .stat-card .label {
            color: #999;
            font-size: 1rem;
            font-weight: 500;
        }

        .filters {
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            border: 2px solid #444;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            margin-bottom: 30px;
        }

        .filter-group {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .filter-btn {
            padding: 10px 20px;
            border: 2px solid #444;
            border-radius: 10px;
            background: #1a1a1a;
            color: #999;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }

        .filter-btn:hover {
            border-color: #FFD700;
            color: #FFD700;
        }

        .filter-btn.active {
            background: #FFD700;
            color: #000;
            border-color: #FFD700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        .search-box {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid #444;
            border-radius: 10px;
            font-size: 1.1rem;
            background: #1a1a1a;
            color: #e0e0e0;
            transition: all 0.3s;
        }

        .search-box:focus {
            outline: none;
            border-color: #FFD700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }

        .gift-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }

        .gift-card {
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            transition: all 0.3s;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            border: 2px solid #333;
        }

        .gift-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(255, 215, 0, 0.3);
            border-color: #FFD700;
        }

        .gift-card.legendary { border: 3px solid #FFD700; box-shadow: 0 5px 30px rgba(255, 215, 0, 0.4); }
        .gift-card.epic { border: 3px solid #9b59b6; box-shadow: 0 5px 30px rgba(155, 89, 182, 0.4); }
        .gift-card.rare { border: 3px solid #3498db; box-shadow: 0 5px 30px rgba(52, 152, 219, 0.4); }
        .gift-card.uncommon { border: 3px solid #2ecc71; box-shadow: 0 5px 30px rgba(46, 204, 113, 0.4); }
        
        .gift-image {
            width: 150px;
            height: 150px;
            margin: 0 auto 20px;
            display: block;
            object-fit: contain;
            background: #0a0a0a;
            border: 2px solid #333;
            border-radius: 15px;
            padding: 10px;
        }

        .gift-name {
            font-size: 1.5rem;
            font-weight: bold;
            color: #FFD700;
            margin-bottom: 15px;
            text-align: center;
            text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
        }

        .gift-price {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
            padding: 15px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 10px;
        }

        .price-item {
            text-align: center;
        }

        .price-item .value {
            font-size: 1.3rem;
            font-weight: bold;
            color: #FFD700;
        }

        .price-item .label {
            font-size: 0.85rem;
            color: #999;
            margin-top: 3px;
        }

        .gift-features {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }

        .feature-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
        }

        .badge-locked { background: #e74c3c; color: white; }
        .badge-linkmic { background: #e67e22; color: white; }
        .badge-batch { background: #3498db; color: white; }

        .gift-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding-top: 15px;
            border-top: 2px solid #333;
        }

        .stat { text-align: center; }
        .stat .value { font-weight: bold; color: #FFD700; }
        .stat .label { font-size: 0.75rem; color: #999; margin-top: 2px; }

        .rarity-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-top: 10px;
        }

        .badge-legendary { background: #FFD700; color: #000; box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); }
        .badge-epic { background: #9b59b6; color: white; box-shadow: 0 0 15px rgba(155, 89, 182, 0.5); }
        .badge-rare { background: #3498db; color: white; box-shadow: 0 0 15px rgba(52, 152, 219, 0.5); }
        .badge-uncommon { background: #2ecc71; color: white; box-shadow: 0 0 15px rgba(46, 204, 113, 0.5); }
        .badge-common { background: #666; color: white; }

        .download-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
            border: 2px solid #FFD700;
            font-size: 1rem;
            transition: all 0.3s;
            z-index: 1000;
        }

        .download-btn:hover {
            background: linear-gradient(135deg, #FFA500, #FFD700);
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.6);
        }

        .refresh-btn {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: bold;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(17,153,142,0.4);
        }

        .refresh-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .status-message {
            margin-top: 10px;
            padding: 10px;
            border-radius: 8px;
            font-size: 0.9rem;
            display: none;
        }

        .status-success {
            background: #d4edda;
            color: #155724;
            display: block;
        }

        .status-error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }

        .status-loading {
            background: #d1ecf1;
            color: #0c5460;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎁 TikTok Tam Hediye Kataloğu</h1>
            <p>Son güncelleme: ${new Date(catalogData.lastFetched).toLocaleString('tr-TR')}</p>
            <p style="margin-top: 10px; color: #999; font-size: 0.9rem;">
                TikTok'taki tüm mevcut hediyeler
            </p>
            <button class="refresh-btn" id="refreshBtn" onclick="fetchFreshGifts()">
                🔄 Tüm Hediyeleri Yeniden Çek
            </button>
            <div class="status-message" id="statusMessage"></div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="value">${catalogData.totalGifts}</div>
                <div class="label">Toplam Hediye</div>
            </div>
            <div class="stat-card">
                <div class="value">🌟 ${catalogData.categories.legendary}</div>
                <div class="label">Efsanevi</div>
            </div>
            <div class="stat-card">
                <div class="value">💜 ${catalogData.categories.epic}</div>
                <div class="label">Epik</div>
            </div>
            <div class="stat-card">
                <div class="value">💙 ${catalogData.categories.rare}</div>
                <div class="label">Nadir</div>
            </div>
            <div class="stat-card">
                <div class="value">💚 ${catalogData.categories.uncommon}</div>
                <div class="label">Sıradışı</div>
            </div>
            <div class="stat-card">
                <div class="value">⚪ ${catalogData.categories.common}</div>
                <div class="label">Normal</div>
            </div>
        </div>
        
        <div class="filters">
            <div class="filter-group">
                <button class="filter-btn active" onclick="filterByRarity('all', this)">Tümü</button>
                <button class="filter-btn" onclick="filterByRarity('legendary', this)">🌟 Efsanevi</button>
                <button class="filter-btn" onclick="filterByRarity('epic', this)">💜 Epik</button>
                <button class="filter-btn" onclick="filterByRarity('rare', this)">💙 Nadir</button>
                <button class="filter-btn" onclick="filterByRarity('uncommon', this)">💚 Sıradışı</button>
                <button class="filter-btn" onclick="filterByRarity('common', this)">⚪ Normal</button>
            </div>
            <input type="text" id="searchInput" class="search-box" placeholder="🔍 Hediye ara..." onkeyup="searchGifts()">
        </div>
        
        <div class="gift-grid" id="giftGrid">
            ${catalogData.catalog.map(gift => {
                const rarity = rarityInfo[gift.rarity];
                
                return `
                    <div class="gift-card ${gift.rarity}" data-name="${gift.name.toLowerCase()}" data-rarity="${gift.rarity}">
                        <img src="${gift.imageUrl}" alt="${gift.name}" class="gift-image" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22><rect fill=%22%23ddd%22 width=%22150%22 height=%22150%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2250%22>🎁</text></svg>'">
                        
                        <div class="gift-name">${gift.name}</div>
                        
                        <div class="gift-price">
                            <div class="price-item">
                                <div class="value">💎 ${gift.diamondCount.toLocaleString()}</div>
                                <div class="label">Elmas</div>
                            </div>
                            <div class="price-item">
                                <div class="value">$${gift.usdValue}</div>
                                <div class="label">USD</div>
                            </div>
                            <div class="price-item">
                                <div class="value">₺${gift.tryValue}</div>
                                <div class="label">TL</div>
                            </div>
                        </div>
                        
                        <div class="gift-features">
                            ${gift.isLocked ? `<span class="feature-badge badge-locked">🔒 Lv.${gift.requiredLevel}</span>` : ''}
                            ${gift.isForLinkMic ? `<span class="feature-badge badge-linkmic">⚔️ Battle</span>` : ''}
                            ${gift.canBatchSend ? `<span class="feature-badge badge-batch">📦 Toplu</span>` : ''}
                        </div>
                        
                        ${gift.timesSent > 0 ? `
                        <div class="gift-stats">
                            <div class="stat">
                                <div class="value">${gift.timesSent}</div>
                                <div class="label">Gönderim</div>
                            </div>
                            <div class="stat">
                                <div class="value">${gift.uniqueUsers}</div>
                                <div class="label">Kullanıcı</div>
                            </div>
                            <div class="stat">
                                <div class="value">💎 ${gift.totalValue.toLocaleString()}</div>
                                <div class="label">Toplam</div>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div style="text-align: center;">
                            <span class="rarity-badge badge-${gift.rarity}">${rarity.emoji} ${rarity.label}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    </div>
    
    <button class="download-btn" onclick="downloadJSON()">
        💾 JSON İndir
    </button>
    
    <script>
        let currentFilter = 'all';
        
        function filterByRarity(rarity, btnElement) {
            currentFilter = rarity;

            // Buton aktif durumunu güncelle
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (btnElement) {
                btnElement.classList.add('active');
            }

            // Kartları filtrele
            const cards = document.querySelectorAll('.gift-card');
            cards.forEach(card => {
                if (rarity === 'all' || card.getAttribute('data-rarity') === rarity) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        function searchGifts() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const cards = document.querySelectorAll('.gift-card');
            
            cards.forEach(card => {
                const name = card.getAttribute('data-name');
                const matchesSearch = name.includes(filter);
                const matchesFilter = currentFilter === 'all' || card.getAttribute('data-rarity') === currentFilter;
                
                if (matchesSearch && matchesFilter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        function downloadJSON() {
            const data = ${JSON.stringify(catalogData)};
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tiktok-full-catalog-${Date.now()}.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Hediyeleri yeniden çek
        function fetchFreshGifts() {
            const btn = document.getElementById('refreshBtn');
            const statusMsg = document.getElementById('statusMessage');

            // Butonu devre dışı bırak
            btn.disabled = true;
            btn.innerHTML = '⏳ Çekiliyor...';

            // Loading mesajı göster
            statusMsg.className = 'status-message status-loading';
            statusMsg.textContent = 'TikTok\'tan tüm hediyeler çekiliyor, lütfen bekleyin...';

            // WebSocket bağlantısı aç
            const ws = new WebSocket('ws://localhost:8080');

            ws.onopen = () => {
                console.log('WebSocket bağlantısı açıldı');
                // Hediyeleri çek
                ws.send(JSON.stringify({ action: 'fetchAllGifts' }));
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === 'allGiftsFetched') {
                    statusMsg.className = 'status-message status-success';
                    statusMsg.textContent = \`✅ \${message.count} hediye başarıyla çekildi! Sayfa 3 saniye içinde yenilenecek...\`;

                    // 3 saniye sonra sayfayı yenile
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);

                    ws.close();
                }

                if (message.type === 'fetchError') {
                    statusMsg.className = 'status-message status-error';
                    statusMsg.textContent = '❌ Hediyeler çekilirken hata oluştu: ' + message.message;

                    // Butonu tekrar aktif et
                    btn.disabled = false;
                    btn.innerHTML = '🔄 Tüm Hediyeleri Yeniden Çek';

                    ws.close();
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket hatası:', error);
                statusMsg.className = 'status-message status-error';
                statusMsg.textContent = '❌ Bağlantı hatası! Lütfen ana uygulamanın çalıştığından emin olun.';

                btn.disabled = false;
                btn.innerHTML = '🔄 Tüm Hediyeleri Yeniden Çek';
            };

            ws.onclose = () => {
                console.log('WebSocket bağlantısı kapandı');
            };
        }
    </script>
</body>
</html>
    `;
    
    return html;
}

// Katalog dosyasını kaydet (Global tek dosya)
function saveCatalogToFile() {
    const catalogData = getCatalogJSON();
    const filepath = path.join(__dirname, '..', 'tamkatalog.json');

    try {
        fs.writeFileSync(filepath, JSON.stringify(catalogData, null, 2));
        console.log(`💾 Tam katalog kaydedildi: tamkatalog.json (${catalogData.totalGifts} hediye)`);
    } catch (error) {
        console.error('❌ Katalog kaydetme hatası:', error.message);
    }
}

// Katalog dosyasından yükle (Global tek dosya)
function loadCatalogFromFile() {
    const filepath = path.join(__dirname, '..', 'tamkatalog.json');

    try {
        if (fs.existsSync(filepath)) {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

            // Katalog verilerini restore et
            fullGiftCatalog = data.catalog.map(gift => ({
                ...gift,
                uniqueUsers: new Set() // Set olarak restore et
            }));

            catalogLastFetched = new Date(data.lastFetched);
            console.log(`📂 Katalog yüklendi: ${fullGiftCatalog.length} hediye (${data.lastFetched})`);
            return true;
        }
    } catch (error) {
        console.error('❌ Katalog yükleme hatası:', error.message);
    }

    return false;
}

// Katalog var mı kontrol et
function hasCatalog() {
    return fullGiftCatalog.length > 0;
}

// Katalog bilgilerini döndür
function getCatalogInfo() {
    return {
        hasGifts: fullGiftCatalog.length > 0,
        count: fullGiftCatalog.length,
        lastFetched: catalogLastFetched
    };
}

// Başlangıçta katalog yükle
loadCatalogFromFile();

module.exports = {
    fetchAllGiftsFromTikTok,
    loadCatalogFromFile,
    updateGiftStats,
    getCatalogJSON,
    generateCatalogHTML,
    hasCatalog,
    getCatalogInfo,
    fullGiftCatalog,
    catalogLastFetched
};