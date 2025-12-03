# 🚀 HIZLI BAŞLANGIÇ

## 📁 Proje Yapısı

```
tiktok-dashboard/
├── backend/           # Node.js + Socket.IO server
│   ├── server.js      # Ana backend dosyası
│   └── package.json
├── frontend/          # HTML + JavaScript dashboard
│   └── index.html     # Tek sayfa dashboard
├── START.bat          # Windows hızlı başlatma
└── README.md          # Detaylı dokümantasyon
```

---

## ⚡ 3 ADIMDA BAŞLAT

### Windows Kullanıcıları

Sadece `START.bat` dosyasını çift tıklayın!

### Manuel Başlatma

```bash
# 1. Backend'i başlat
cd backend
npm install
npm start

# 2. Frontend'i aç (yeni terminal/tab)
# frontend/index.html dosyasını tarayıcıda açın
```

---

## 🎯 KULLANIM

1. **Backend başladıktan sonra** (http://localhost:3001)
2. **Frontend'i** tarayıcıda açın
3. **Username girin** (örn: neehyiir)
4. **"Bağlan" tıklayın**
5. **Canlı verileri izleyin!** 🎉

---

## 📊 NE GÖRECEKSİNİZ?

### Üstte - İstatistik Kartları
- 👥 Anlık izleyici
- ❤️ Toplam beğeni
- 💬 Toplam yorum
- 🎁 Hediye sayısı
- 💰 Gelir ($)
- 👤 Yeni takipçi

### Solda - Grafikler ve Chat
- 📈 İzleyici trend grafiği
- 💬 Canlı sohbet akışı

### Sağda - Top Fanlar
- 🏆 En çok hediye göndernler
- 💎 Diamond ve $ miktarları

### Pop-up'lar
- 🎁 Hediye bildirimleri (animasyonlu)

---

## 🔧 ÖZELLEŞTİRME

### Port Değiştirme

**Backend** (`backend/server.js`):
```javascript
const PORT = 3002; // İstediğiniz port
```

**Frontend** (`frontend/index.html`):
```javascript
const socket = io('http://localhost:3002'); // Aynı port
```

### Kullanıcı Adını Varsayılan Yap

**Frontend** (`frontend/index.html`):
```html
<input ... value="your_default_username">
```

---

## 🎨 EKRAN GÖRÜNTÜLERİ

Dashboard şöyle görünecek:

```
┌─────────────────────────────────────────────┐
│ 🔴 TikTok Live Dashboard    [neehyiir]      │
├─────────────────────────────────────────────┤
│ [👥 1523] [❤️ 45K] [💬 2.3K] [🎁 156]      │
├───────────────┬─────────────────────────────┤
│ 📈 Grafik     │  🏆 Top Fanlar              │
│               │  1. 🥇 user1    5000💎       │
│ (Line chart)  │  2. 🥈 user2    3500💎       │
│               │  3. 🥉 user3    2800💎       │
├───────────────┤                             │
│ 💬 Chat       │                             │
│ user: gg      │                             │
│ user2: love   │                             │
└───────────────┴─────────────────────────────┘
```

---

## 🐛 SORUN GİDERME

### "Cannot GET /" hatası
➡️ Frontend'i direkt HTML dosyasından açın, server'dan değil

### Socket bağlanamıyor
➡️ Backend'in çalıştığından emin olun (http://localhost:3001)

### TikTok'a bağlanamıyor
➡️ Kullanıcının canlı yayında olduğundan emin olun

### npm install hatası
➡️ Node.js kurulu olduğundan emin olun (node --version)

---

## 📦 GEREKSİNİMLER

- Node.js v14+
- Modern web tarayıcı (Chrome, Firefox, Edge)
- İnternet bağlantısı

---

## 🎓 İLERİ SEVİYE

### Veri Kaydetme

```javascript
// server.js'e ekleyin
const fs = require('fs');

tiktokConnection.on(WebcastEvent.CHAT, (data) => {
    const log = {
        timestamp: new Date(),
        username: data.user.uniqueId,
        comment: data.comment
    };
    fs.appendFileSync('chat-log.json', JSON.stringify(log) + '\n');
});
```

### Discord Bildirimleri

```javascript
// npm install axios
const axios = require('axios');

tiktokConnection.on(WebcastEvent.GIFT, async (data) => {
    const value = data.gift.diamondCount * (data.repeatCount || 1);
    if (value >= 1000) {
        await axios.post('DISCORD_WEBHOOK_URL', {
            content: `🎁 ${data.user.nickname} sent ${data.gift.name} (💎${value})`
        });
    }
});
```

### React'e Dönüştürme

```bash
npx create-react-app tiktok-dashboard-react
cd tiktok-dashboard-react
npm install socket.io-client chart.js react-chartjs-2
```

---

## 📞 YARDIM

Sorun mu yaşıyorsunuz?

1. README.md dosyasını okuyun
2. Console'da hata mesajlarını kontrol edin (F12)
3. Backend terminalindeki logları kontrol edin

---

**Başarılar! 🚀**
