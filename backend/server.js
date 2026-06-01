// ==========================================
// SUNUCU GİRİŞ NOKTASI
// app.js'i (yapılandırılmış Express app) alır, dinlemeye başlar,
// açılış diagnostiğini basar ve graceful shutdown'ı yönetir.
//   npm start   → node server.js
// ==========================================

const path = require('path');
const fsSync = require('fs');

const app = require('./app');
const config = require('./config/env');
const db = require('./db/pool');
const groqKeyManager = require('./groqKeyManager');
const { getKeyManagerStatus } = require('./tools/pollenProviders/google');

const server = app.listen(config.port, () => {
    console.log(`🌿 Alerji Takip Backend çalışıyor: http://localhost:${config.port}  (${config.nodeEnv})`);

    // PostgreSQL bağlantısı (üyelik & kota için zorunlu)
    db.ping()
        .then(() => console.log('   PostgreSQL:     ✅ Bağlantı başarılı'))
        .catch((e) => console.log(`   PostgreSQL:     ❌ Bağlanılamadı (${e.message}). 'npm run migrate' çalıştırıp DATABASE_URL'i kontrol edin.`));

    // Pollen sağlayıcı durumu
    const km = getKeyManagerStatus();
    console.log('   Pollen Sağlayıcıları:');
    if (km.totalKeys > 0) {
        console.log(`     • Google Pollen API: ✅ ${km.totalKeys} anahtar yüklü (aktif: #${km.activeKeyIndex + 1})`);
    } else {
        console.log('     • Google Pollen API: ⚠️  Anahtar yok (Open-Meteo fallback\'e düşülecek)');
    }
    console.log('     • Open-Meteo (CAMS Europe): ✅ Hazır (anahtar gerekmez, son çare fallback)');

    const groqStatus = groqKeyManager.getStatus();
    console.log(`   Groq API Keys:  ${groqStatus.totalKeys > 0 ? `✅ ${groqStatus.totalKeys} key, ${groqStatus.totalModels} model` : '❌ Eksik'}`);
    if (groqStatus.totalKeys > 0) {
        console.log(`   Groq Model Sırası: ${groqKeyManager.models.join(' → ')}`);
    }

    // RAG indeksi hazır mı? (ilk chat isteğinde lazy load olur; burada bilgi amaçlı)
    const indexPath = path.join(__dirname, '..', 'data', 'vector-store.json');
    if (fsSync.existsSync(indexPath)) {
        const sizeMB = (fsSync.statSync(indexPath).size / 1024 / 1024).toFixed(1);
        console.log(`   RAG Indeks:     ✅ ${indexPath} (${sizeMB} MB)`);
    } else {
        console.log('   RAG Indeks:     ❌ Yok. \'node rag/build-index.js\' ile oluştur.');
    }
});

// ── Graceful shutdown (PM2 reload / Ctrl+C / SIGTERM) ──
function shutdown(signal) {
    console.log(`\n${signal} alındı — sunucu düzgünce kapatılıyor...`);
    server.close(async () => {
        try {
            await db.end();
            console.log('   PostgreSQL havuzu kapatıldı.');
        } catch (e) {
            console.error('   Havuz kapatma hatası:', e.message);
        }
        process.exit(0);
    });
    // Açık bağlantılar 10 sn içinde kapanmazsa zorla çık.
    setTimeout(() => {
        console.error('   Zaman aşımı — zorla kapatılıyor.');
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
