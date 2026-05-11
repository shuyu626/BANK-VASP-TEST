<script setup lang="ts">
import type { KlinePoint } from '~~/shared/types'

type ChartType = 'candle' | 'line' | 'area'

const props = defineProps<{
  data: KlinePoint[]
  height?: number
  chartType?: ChartType
  showVolume?: boolean
  showMa?: boolean   // show MA7 / MA25 / MA99 overlays
}>()

const chartEl = ref<HTMLDivElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)

// lightweight-charts typing is too dynamic — use unknown and cast locally
type AnyFn = (...args: unknown[]) => unknown
type Series = { setData: (points: unknown[]) => void; setMarkers?: AnyFn; applyOptions?: AnyFn }
type Chart = {
  remove: () => void
  addCandlestickSeries?: (opts: unknown) => Series
  addLineSeries?: (opts: unknown) => Series
  addAreaSeries?: (opts: unknown) => Series
  addHistogramSeries?: (opts: unknown) => Series
  addSeries?: (kind: unknown, opts: unknown) => Series
  timeScale: () => { fitContent: () => void }
  priceScale: (id: string) => { applyOptions: (opts: unknown) => void }
  applyOptions: (opts: unknown) => void
  subscribeCrosshairMove?: (cb: (param: unknown) => void) => void
}

let chart: Chart | null = null
let mainSeries: Series | null = null
let volSeries: Series | null = null
let ma7Series: Series | null = null
let ma25Series: Series | null = null
let ma99Series: Series | null = null

const COLOR_UP = '#d93838'
const COLOR_DOWN = '#11866f'

async function initChart() {
  if (!chartEl.value || !import.meta.client) return
  const lw = await import('lightweight-charts') as unknown as {
    createChart: (el: HTMLElement, opts: unknown) => Chart
    CandlestickSeries?: unknown
    LineSeries?: unknown
    AreaSeries?: unknown
    HistogramSeries?: unknown
  }

  chart = lw.createChart(chartEl.value, {
    width: chartEl.value.clientWidth,
    height: props.height ?? 420,
    layout: { background: { color: 'transparent' }, textColor: '#9aaba9', fontSize: 11 },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.04)' },
      horzLines: { color: 'rgba(255,255,255,0.04)' }
    },
    rightPriceScale: {
      borderColor: 'rgba(255,255,255,0.06)',
      scaleMargins: { top: 0.05, bottom: props.showVolume === false ? 0.05 : 0.25 }
    },
    timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false },
    crosshair: {
      mode: 1,
      vertLine: { color: '#2db7b3', width: 1, style: 2, labelBackgroundColor: '#006e6a' },
      horzLine: { color: '#2db7b3', width: 1, style: 2, labelBackgroundColor: '#006e6a' }
    }
  })

  rebuildSeries(lw)
  applyData()
  subscribeCrosshair()
}

function addMainSeries(lw: {
  CandlestickSeries?: unknown; LineSeries?: unknown; AreaSeries?: unknown
}): Series | null {
  if (!chart) return null
  const candleOpts = {
    upColor: COLOR_UP, downColor: COLOR_DOWN,
    borderUpColor: COLOR_UP, borderDownColor: COLOR_DOWN,
    wickUpColor: COLOR_UP, wickDownColor: COLOR_DOWN,
    priceLineColor: '#2db7b3', priceLineStyle: 2
  }
  const lineOpts = { color: '#2db7b3', lineWidth: 2, priceLineColor: '#2db7b3' }
  const areaOpts = {
    topColor: 'rgba(45,183,179,0.28)', bottomColor: 'rgba(45,183,179,0.02)',
    lineColor: '#2db7b3', lineWidth: 2
  }
  const kind = props.chartType ?? 'candle'

  // v4 compatibility
  if (kind === 'candle' && chart.addCandlestickSeries) return chart.addCandlestickSeries(candleOpts)
  if (kind === 'line' && chart.addLineSeries) return chart.addLineSeries(lineOpts)
  if (kind === 'area' && chart.addAreaSeries) return chart.addAreaSeries(areaOpts)

  // v5: addSeries(SeriesType, opts)
  if (chart.addSeries) {
    const seriesDef =
      kind === 'line' ? lw.LineSeries :
      kind === 'area' ? lw.AreaSeries :
      lw.CandlestickSeries
    const opts = kind === 'line' ? lineOpts : kind === 'area' ? areaOpts : candleOpts
    return chart.addSeries(seriesDef, opts)
  }
  return null
}

function addVolumeSeries(lw: { HistogramSeries?: unknown }): Series | null {
  if (!chart) return null
  const opts = {
    color: COLOR_DOWN,
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume'
  }
  const s = chart.addHistogramSeries
    ? chart.addHistogramSeries(opts)
    : chart.addSeries?.(lw.HistogramSeries, opts) ?? null
  if (s && chart.priceScale) {
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    })
  }
  return s
}

function addMaSeries(lw: { LineSeries?: unknown }, color: string): Series | null {
  if (!chart) return null
  const opts = { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }
  return chart.addLineSeries
    ? chart.addLineSeries(opts)
    : chart.addSeries?.(lw.LineSeries, opts) ?? null
}

function rebuildSeries(lw: Parameters<typeof addMainSeries>[0] & Parameters<typeof addVolumeSeries>[0] & Parameters<typeof addMaSeries>[0]) {
  // Dispose existing (chart.remove is too heavy — ignore; lightweight-charts doesn't expose per-series remove cleanly in v5 via our loose types)
  mainSeries = addMainSeries(lw)
  if (props.showVolume !== false) volSeries = addVolumeSeries(lw)
  if (props.showMa !== false) {
    ma7Series = addMaSeries(lw, '#e0b04c')   // gold
    ma25Series = addMaSeries(lw, '#2db7b3')  // primary
    ma99Series = addMaSeries(lw, '#9aaba9')  // neutral
  }
}

function computeMA(points: KlinePoint[], window: number) {
  const out: { time: number; value: number }[] = []
  for (let i = 0; i < points.length; i++) {
    if (i < window - 1) continue
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += points[j]!.close
    out.push({
      time: Math.floor(new Date(points[i]!.time).getTime() / 1000),
      value: sum / window
    })
  }
  return out
}

function applyData() {
  if (!props.data.length) return
  const candles = props.data.map(k => ({
    time: Math.floor(new Date(k.time).getTime() / 1000),
    open: k.open, high: k.high, low: k.low, close: k.close,
    value: k.close   // line/area use value
  }))

  if (mainSeries) {
    const kind = props.chartType ?? 'candle'
    if (kind === 'candle') {
      mainSeries.setData(candles)
    } else {
      mainSeries.setData(candles.map(c => ({ time: c.time, value: c.close })))
    }
  }

  if (volSeries) {
    const vols = props.data.map(k => ({
      time: Math.floor(new Date(k.time).getTime() / 1000),
      value: k.volume,
      color: k.close >= k.open ? 'rgba(217,56,56,0.55)' : 'rgba(17,134,111,0.55)'
    }))
    volSeries.setData(vols)
  }

  if (ma7Series) ma7Series.setData(computeMA(props.data, 7))
  if (ma25Series) ma25Series.setData(computeMA(props.data, 25))
  if (ma99Series) ma99Series.setData(computeMA(props.data, 99))

  chart?.timeScale().fitContent()
}

// Crosshair tooltip
const hoverData = ref<{ time: string; open?: number; high?: number; low?: number; close?: number; volume?: number; ma7?: number; ma25?: number; ma99?: number } | null>(null)

function subscribeCrosshair() {
  if (!chart?.subscribeCrosshairMove) return
  chart.subscribeCrosshairMove((param: unknown) => {
    const p = param as { time?: number; seriesData?: Map<unknown, { open?: number; high?: number; low?: number; close?: number; value?: number }> }
    if (!p?.time || !p.seriesData) { hoverData.value = null; return }
    const main = mainSeries ? p.seriesData.get(mainSeries) : undefined
    const vol = volSeries ? p.seriesData.get(volSeries) : undefined
    const ma7 = ma7Series ? p.seriesData.get(ma7Series) : undefined
    const ma25 = ma25Series ? p.seriesData.get(ma25Series) : undefined
    const ma99 = ma99Series ? p.seriesData.get(ma99Series) : undefined
    const dt = new Date((p.time as number) * 1000)
    hoverData.value = {
      time: dt.toISOString().slice(0, 16).replace('T', ' '),
      open: main?.open, high: main?.high, low: main?.low, close: main?.close,
      volume: vol?.value,
      ma7: ma7?.value, ma25: ma25?.value, ma99: ma99?.value
    }
  })
}

watch(() => props.data, applyData, { deep: true })

async function recreate() {
  if (!import.meta.client) return
  chart?.remove()
  chart = null
  mainSeries = null; volSeries = null; ma7Series = null; ma25Series = null; ma99Series = null
  await nextTick()
  await initChart()
}
watch(() => props.chartType, recreate)
watch(() => props.showVolume, recreate)
watch(() => props.showMa, recreate)

const chartHeightStyle = computed(() => {
  if (isFullscreen.value && import.meta.client) {
    return `${window.innerHeight - 120}px`
  }
  return `${props.height ?? 420}px`
})

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => {
    if (chart && chartEl.value) {
      chart.applyOptions({
        width: chartEl.value.clientWidth,
        height: isFullscreen.value ? window.innerHeight - 120 : (props.height ?? 420)
      })
    }
  })
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.remove()
  chart = null
  mainSeries = null; volSeries = null; ma7Series = null; ma25Series = null; ma99Series = null
})

function onResize() {
  if (!chart || !chartEl.value) return
  chart.applyOptions({ width: chartEl.value.clientWidth })
}

function fmtNum(n: number | undefined, d = 2) {
  return n === undefined ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d })
}
function fmtVol(n: number | undefined) {
  if (n === undefined) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toFixed(0)
}
</script>

<template>
  <div
    ref="containerEl"
    class="relative w-full"
    :class="isFullscreen ? 'fixed inset-0 z-40 bg-bg p-4' : ''"
  >
    <!-- Overlay: OHLC + MA readout -->
    <div
      v-if="hoverData"
      class="absolute top-2 left-3 z-10 text-[11px] font-mono num text-text-muted bg-surface/70 backdrop-blur px-2 py-1 rounded pointer-events-none"
    >
      <span>{{ hoverData.time }}</span>
      <template v-if="hoverData.open !== undefined">
        <span class="ml-2">O <span class="text-text">{{ fmtNum(hoverData.open) }}</span></span>
        <span class="ml-1">H <span class="text-text">{{ fmtNum(hoverData.high) }}</span></span>
        <span class="ml-1">L <span class="text-text">{{ fmtNum(hoverData.low) }}</span></span>
        <span class="ml-1">C <span :class="hoverData.close && hoverData.open && hoverData.close >= hoverData.open ? 'text-market-up' : 'text-market-down'">{{ fmtNum(hoverData.close) }}</span></span>
      </template>
      <span v-if="hoverData.volume !== undefined" class="ml-2">Vol <span class="text-text">{{ fmtVol(hoverData.volume) }}</span></span>
      <span v-if="hoverData.ma7 !== undefined" class="ml-3" style="color:#e0b04c">MA7 {{ fmtNum(hoverData.ma7) }}</span>
      <span v-if="hoverData.ma25 !== undefined" class="ml-2" style="color:#2db7b3">MA25 {{ fmtNum(hoverData.ma25) }}</span>
      <span v-if="hoverData.ma99 !== undefined" class="ml-2" style="color:#9aaba9">MA99 {{ fmtNum(hoverData.ma99) }}</span>
    </div>

    <!-- Fullscreen toggle -->
    <button
      type="button"
      class="absolute top-2 right-2 z-10 px-2 py-1 text-[11px] bg-surface/70 backdrop-blur border border-border rounded hover:bg-surface text-text-muted hover:text-text"
      @click="toggleFullscreen"
    >
      {{ isFullscreen ? $t('components.kline.shrink') : $t('components.kline.fullscreen') }}
    </button>

    <div ref="chartEl" class="w-full" :style="{ height: chartHeightStyle }" />
  </div>
</template>
