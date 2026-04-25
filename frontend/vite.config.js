import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const projectRoot = process.cwd()

export default defineConfig({
  root: projectRoot,
  cacheDir: path.resolve(projectRoot, 'node_modules/.vite'),
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^react$/, replacement: path.resolve(projectRoot, 'node_modules/react/index.js') },
      { find: 'react/jsx-runtime', replacement: path.resolve(projectRoot, 'node_modules/react/jsx-runtime.js') },
      { find: 'react/jsx-dev-runtime', replacement: path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: path.resolve(projectRoot, 'node_modules/react-dom/index.js') }
    ]
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    esbuildOptions: {
      preserveSymlinks: true
    }
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 250
    },
    proxy: {
      '/api': { target: 'https://voiceforge-backend-aqey.onrender.com', changeOrigin: true },
      '/generated': { target: 'https://voiceforge-backend-aqey.onrender.com', changeOrigin: true }
        
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
