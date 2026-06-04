import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 啟用 .vue 單檔元件編譯（plugin-vue 已隨 Nuxt 安裝為相依，非新增套件），
  // 讓 Base 元件可用 @vue/test-utils 掛載測試。
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '@@': fileURLToPath(new URL('.', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'shared/utils/**/*.ts',
        'shared/types/**/*.ts',
        'app/utils/mock/seed.ts',
        'app/composables/**/*.ts'
      ]
    }
  }
})
