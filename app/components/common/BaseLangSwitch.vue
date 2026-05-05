<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
const open = ref(false)

interface Loc {
  code: string
  name: string
}

const localeList = computed<Loc[]>(() =>
  locales.value.map(l => ({
    code: typeof l === 'string' ? l : l.code,
    name: typeof l === 'string' ? l : (l.name ?? l.code)
  }))
)

const currentName = computed(() =>
  localeList.value.find(l => l.code === locale.value)?.name ?? locale.value
)

async function pick(code: string) {
  await setLocale(code as 'zh-TW' | 'en')
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 text-xs px-2 py-1 border border-border rounded hover:bg-surface-alt text-neutral-300 hover:text-text"
      @click="open = !open"
    >
      <Icon name="lucide:globe" size="12" aria-hidden="true" />
      {{ currentName }}
    </button>
    <div
      v-if="open"
      class="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-md shadow-lg py-1 z-30"
    >
      <button
        v-for="loc in localeList"
        :key="loc.code"
        type="button"
        class="block w-full text-left px-3 py-1.5 text-xs hover:bg-surface-alt"
        :class="locale === loc.code ? 'text-primary-500 font-semibold' : 'text-text'"
        @click="pick(loc.code)"
      >
        {{ loc.name }}
      </button>
    </div>
  </div>
</template>
