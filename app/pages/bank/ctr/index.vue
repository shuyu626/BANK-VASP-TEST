<script setup lang="ts">
import type { CtrReport } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.ctr') }))

interface Item {
  report: CtrReport
  user: { id: string; displayName: string } | null
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/ctr')
const toast = useToast()
const expanded = ref<Set<string>>(new Set())

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

async function onMark(id: string, status: 'submitted' | 'accepted') {
  try {
    await $fetch(`/api/bank/ctr/${id}/mark`, {
      method: 'POST',
      body: { status }
    })
    toast.success(status === 'accepted' ? t('bank.ctr.acceptSuccess') : t('bank.ctr.submitSuccess'))
    await refresh()
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('bank.ctr.operationFailed'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.ctr.title')" :subtitle="$t('bank.ctr.subtitle')" />

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th class="w-8" />
            <th>{{ $t('bank.ctr.th.reportDate') }}</th>
            <th>{{ $t('common.label.user') }}</th>
            <th class="text-right">{{ $t('bank.ctr.th.totalAmount') }}</th>
            <th class="text-right">{{ $t('bank.ctr.th.txCount') }}</th>
            <th>{{ $t('common.label.status') }}</th>
            <th>{{ $t('bank.ctr.th.submitTime') }}</th>
            <th>{{ $t('common.label.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="8" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="!data || data.items.length === 0">
            <td colspan="8" class="text-center text-text-muted py-10">{{ $t('bank.ctr.empty') }}</td>
          </tr>
          <template v-for="it in data?.items ?? []" :key="it.report.id">
            <tr class="cursor-pointer" @click="toggle(it.report.id)">
              <td class="text-center text-text-muted">{{ expanded.has(it.report.id) ? '▼' : '▶' }}</td>
              <td class="num">{{ it.report.reportDate }}</td>
              <td>
                <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
                <div class="text-xs text-text-muted font-mono">{{ it.report.userId }}</div>
              </td>
              <td class="text-right num font-medium">{{ fmtTwd(it.report.totalAmount) }}</td>
              <td class="text-right num text-text-muted">{{ it.report.txIds.length }}</td>
              <td>
                <BaseBadge :variant="reportStatusVariant(it.report.status)">{{ it.report.status }}</BaseBadge>
              </td>
              <td class="num text-text-muted text-xs">{{ fmtDt(it.report.submittedAt) }}</td>
              <td class="text-right" @click.stop>
                <BaseButton
                  v-if="it.report.status === 'draft'"
                  variant="secondary"
                  size="sm"
                  class="!border-primary-900 !text-primary-900"
                  @click="onMark(it.report.id, 'submitted')"
                >
                  {{ $t('bank.ctr.submitCta') }}
                </BaseButton>
                <BaseButton
                  v-else-if="it.report.status === 'submitted'"
                  variant="secondary"
                  size="sm"
                  class="!border-success !text-success"
                  @click="onMark(it.report.id, 'accepted')"
                >
                  {{ $t('bank.ctr.markAccept') }}
                </BaseButton>
                <span v-else class="text-xs text-text-muted">—</span>
              </td>
            </tr>
            <tr v-if="expanded.has(it.report.id)">
              <td colspan="8" class="px-8 py-3 bg-neutral-50">
                <div class="text-xs space-y-3">
                  <div>
                    <div class="font-semibold mb-1">{{ $t('bank.ctr.txIds') }}</div>
                    <ul class="font-mono space-y-0.5">
                      <li v-for="tx in it.report.txIds" :key="tx">{{ tx }}</li>
                    </ul>
                  </div>
                  <div class="flex gap-2 items-center pt-2 border-t border-border">
                    <span class="text-text-muted">{{ $t('bank.ctr.exportTitle') }}</span>
                    <a
                      :href="`/api/bank/ctr/${it.report.id}/export?format=json`"
                      class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
                      download
                    >{{ $t('bank.common.exportJson') }}</a>
                    <a
                      :href="`/api/bank/ctr/${it.report.id}/export?format=xml`"
                      class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
                      download
                    >{{ $t('bank.common.exportXml') }}</a>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
