// ============================================================
// PM2 ECOSYSTEM CONFIG
//
// Kullanım:
//   pm2 start ecosystem.config.cjs                      → başlat
//   pm2 start ecosystem.config.cjs --env production     → prod modda
//   pm2 reload alerji-takvim-backend                    → kesintisiz restart
//   pm2 logs alerji-takvim-backend                      → canlı log
//   pm2 save                                            → restart sonrası
//                                                          otomatik başlamak için
//   pm2 startup                                         → boot'ta çalışsın
//                                                          (verdiği komutu çalıştır)
//
// Not: Bu dosya .cjs uzantılı çünkü package.json'da
// "type": "module" olabilir; PM2 config CommonJS olmak zorunda.
// ============================================================

module.exports = {
  apps: [
    {
      name: 'alerji-takvim-backend',
      cwd: './backend',
      script: 'server.js',

      // Tek instance — singleton in-memory state (groqKeyManager,
      // googleKeyManager) cluster'da tutarsız olur. Yatay ölçek
      // gerekirse Redis'e taşımak lazım.
      instances: 1,
      exec_mode: 'fork',

      // Restart davranışı
      autorestart: true,
      watch: false,             // dev'de --watch ile çalıştır, prod'da KAPALI
      max_memory_restart: '512M',
      min_uptime: '10s',         // 10 sn'den önce çökerse "kararsız" sayılır
      max_restarts: 10,          // 10 başarısız restart sonra dur

      // Loglar
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // .env dotenv ile yüklenir; burada sadece NODE_ENV/PORT override
      },
    },
  ],
};
