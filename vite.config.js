import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://refind-backend.ap-southeast-2.elasticbeanstalk.com/', // 팀원의 백엔드 서버 주소 (예: http://localhost:8080 또는 배포된 서버 주소)
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      // 빌드할 때 제외하고 싶은 파일이나 폴더 경로 지정
      external: ['/src/pages/MapPage.jsx'],
      external: ['/src/pages/Home.jsx'] 

    }
  }
})