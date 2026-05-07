import { reportStore } from '~~/server/utils/report-store'
import { traderStore } from '~~/server/utils/trader-store'
import { sarToJson, sarToXml } from '~~/server/utils/regulator-export'

export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id'))
  const q = getQuery(event)
  const format = String(q.format ?? 'json').toLowerCase()

  const report = reportStore.getSar(id)
  if (!report) throw createError({ statusCode: 404, statusMessage: 'SAR_NOT_FOUND' })
  const user = traderStore.findUserById(report.userId)?.user ?? null

  const filenameBase = `SAR_${report.createdAt.slice(0, 10).replace(/-/g, '')}_${report.id}`

  if (format === 'xml') {
    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filenameBase}.xml"`)
    return sarToXml(report, user)
  }

  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filenameBase}.json"`)
  return sarToJson(report, user)
})
