import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 프론트 코드는 항상 /api/... 로 요청하고, 개발 서버가 아래 주소로 넘겨줍니다.
// (예전 Elastic Beanstalk 주소는 막혀서 502가 났음 → CloudFront 주소로 변경)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://d2561q9uqrldal.cloudfront.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
