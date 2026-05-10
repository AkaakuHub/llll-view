import { defineConfig, loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_URL;
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const certDir = resolve(currentDir, "..");

  // chrome prompt apiのため、httpsを強制
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // 外部からのアクセスを許可
      port: 5173,
      https: {
        key: readFileSync(resolve(certDir, "nijigasaki+2-key.pem")),
        cert: readFileSync(resolve(certDir, "nijigasaki+2.pem")),
      },
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
