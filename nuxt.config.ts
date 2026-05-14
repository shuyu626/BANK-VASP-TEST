export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/icon',
    'nuxt-security'
  ],

  routeRules: {
    // 公開 landing — SSG（CSP 走 hash + strict-dynamic，由 nuxt-security build 時計算）
    '/':                       { prerender: true },
    '/trader':                 { prerender: true },

    // 公開入口 — SSR + nonce；HTML 含 per-request nonce，禁快取避免共用
    '/trader/login':           {
      ssr: true,
      headers: { 'Cache-Control': 'no-store' }
    },
    '/trader/register':        {
      ssr: true,
      headers: { 'Cache-Control': 'no-store' }
    },
    '/admin/login':            {
      ssr: true,
      headers: { 'Cache-Control': 'no-store' }
    },

    // KYC 流程 — SSR + nonce + KYC SDK 白名單（以 Sumsub 為實作藍本，
    // 換 Onfido / Jumio 時改下方對應網域即可）。
    //
    // 由於全域 CSP 已是 nonce + strict-dynamic，KYC SDK 主腳本只要載入時
    // 帶 nonce，strict-dynamic 就會信任它動態載入的所有子資源，
    // 因此 SDK 域名不需要進 script-src/style-src。只補 strict-dynamic
    // 不涵蓋的指令：
    //   - frame-src   (iframe 嵌入 KYC SDK)
    //   - connect-src (SDK API + WebSocket)
    //   - img-src     (SDK 上傳/截圖預覽)
    //   - media-src   (視訊錄製產生的 blob)
    '/trader/kyc':             {
      ssr: true,
      headers: { 'Cache-Control': 'no-store' },
      security: {
        headers: {
          contentSecurityPolicy: {
            'connect-src': [
              "'self'",
              'https://api.sumsub.com',
              'wss://api.sumsub.com'
            ],
            'frame-src': ['https://*.sumsub.com'],
            'img-src': ["'self'", 'data:', 'blob:', 'https://*.sumsub.com'],
            'media-src': ["'self'", 'blob:']
          }
        }
      }
    },

    // Trader 登入後 — CSR（純客戶端互動，由 nuxt-security 對 SPA shell 注 nonce）
    '/trader/markets':         { ssr: false },
    '/trader/trade/**':        { ssr: false },
    '/trader/wallet/**':       { ssr: false },
    '/trader/orders/**':       { ssr: false },
    '/trader/settings/**':     { ssr: false },

    // Admin 端 — CSR
    '/admin':                  { ssr: false },
    '/admin/**':               { ssr: false },

    // Bank 端 — CSR
    '/bank':                   { ssr: false },
    '/bank/**':                { ssr: false }
  },

  security: {
    enabled: process.env.NODE_ENV === 'production',
    nonce: true,
    ssg: {
      // 預設只 hash <script>，inline <style>（toast scoped、icon CSS 等）會被 CSP 擋。
      // 開啟後 nuxt-security 會在 build 時計算每個 prerendered 頁面內 <style> 的 sha256，
      // 自動補進該頁的 style-src directive。
      hashStyles: true
    },
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'nonce-{{nonce}}'",
          "'strict-dynamic'"
        ],
        'style-src': [
          "'self'",
          "'nonce-{{nonce}}'",
          'https://fonts.googleapis.com'
        ],
        // 僅放寬 attribute / runtime DOM style（element.style.x = y）。
        // 不影響 <style> 區塊與 stylesheet 載入（仍受 style-src 嚴格控制）。
        // 用途：OrderBook 深度圖 bar 寬度、KlineChart 動態高度、virtual list transform、
        // BaseTable 動態 column 寬度、skeleton 動畫寬度等無法用 class 表達的 runtime 值。
        // 已先把所有靜態色彩與寫死的尺寸重構為 Tailwind class，符合 PCI-DSS 4.0 與 ISO 27001 規範。
        'style-src-attr': ["'self'", "'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': true
      },
      crossOriginEmbedderPolicy: 'unsafe-none',
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: []
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true
      }
    }
  },

  // common/ 下的元件已加 Base 前綴，不再需要路徑 prefix；其他子目錄沿用預設
  components: [
    { path: '~/components/common', pathPrefix: false },
    '~/components'
  ],

  // 強制 icon 走 inline <svg>，避免 css mode 在 runtime createElement("style") 注入無 nonce 樣式（撞 CSP style-src）
  icon: {
    mode: 'svg'
  },

  i18n: {
    locales: [
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en',    language: 'en-US',  name: 'English',  file: 'en.json'    }
    ],
    defaultLocale: 'zh-TW',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root'
    }
  },

  css: [
    '~/assets/scss/main.scss'
  ],

  typescript: {
    strict: true,
    typeCheck: false
  },

  app: {
    head: {
      title: 'Bank × VASP Demo',
      htmlAttrs: { lang: 'zh-Hant' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap'
        }
      ]
    }
  }
})
