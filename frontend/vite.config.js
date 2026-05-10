import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Production output → /frontend/dist (Nginx bunu serve edecek)
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets',
    // recharts + leaflet bundle'ı şişirebilir, eşiği biraz yükselt
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Vendor chunk'larını ayrı dosyalara böl → daha iyi caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },

  server: {
    port: 5173,
    // Geliştirmede /api/* isteklerini backend'e proxy et
    // (CORS / origin sorunlarını ortadan kaldırır)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
