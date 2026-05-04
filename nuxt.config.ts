export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/icon'
  ],

  // common/ 下的元件已加 Base 前綴，不再需要路徑 prefix；其他子目錄沿用預設
  components: [
    { path: '~/components/common', pathPrefix: false },
    '~/components'
  ],

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
