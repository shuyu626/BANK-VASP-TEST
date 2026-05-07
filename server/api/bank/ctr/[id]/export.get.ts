import { reportStore } from '~~/server/utils/report-store'
import { traderStore } from '~~/server/utils/trader-store'
import { ctrToJson, ctrToXml } from '~~/server/utils/regulator-export'

export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id'))
  const q = getQuery(event)
  const format = String(q.format ?? 'json').toLowerCase()

  const report = reportStore.getCtr(id)
  if (!report) throw createError({ statusCode: 404, statusMessage: 'CTR_NOT_FOUND' })
  const user = traderStore.findUserById(report.userId)?.user ?? null

  const filenameBase = `CTR_${report.reportDate.replace(/-/g, '')}_${report.id}`

  if (format === 'xml') {
    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filenameBase}.xml"`)
    return ctrToXml(report, user)
  }

  // default JSON
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filenameBase}.json"`)
  return ctrToJson(report, user)
})
