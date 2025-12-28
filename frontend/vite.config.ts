import { defineConfig, loadEnv } from 'vite'

import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_URL;

  // chrome prompt apiのため、httpsを強制
  return {
    plugins: [react(), basicSsl()],
    server: {
      host: '0.0.0.0', // 外部からのアクセスを許可
      port: 5173,
      https: {},
      fs: {
        allow: ['..', '../..'] // プロジェクトルート外のアクセスを許可
      },
      allowedHosts: ["nijigasaki"],
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
