import type { CtrReport, SarReport, User } from '~~/shared/types'

// Demo 用報送檔產生器：模擬金管會 / 調查局報送格式
// 真實情境會使用 XSD schema 驗證 + 中央銀行 ARMS 加密通道

const VASP_INFO = {
  id: 'vasp_demo',
  name: 'TaiEx',
  registrationNo: 'FSC-VASP-2024-0017'
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function ctrToJson(report: CtrReport, user: User | null) {
  return {
    schema: 'tw-fsc-ctr-v1',
    reportId: report.id,
    reportDate: report.reportDate,
    vasp: VASP_INFO,
    subject: {
      userId: report.userId,
      name: user?.displayName ?? null,
      email: user?.email ?? null,
      kycTier: user?.kycTier ?? null
    },
    aggregate: {
      currency: 'TWD',
      totalAmount: report.totalAmount,
      transactionCount: report.txIds.length,
      transactionIds: report.txIds
    },
    status: report.status,
    submittedAt: report.submittedAt
  }
}

export function ctrToXml(report: CtrReport, user: User | null): string {
  const txIds = report.txIds.map((id) => `      <TransactionId>${escapeXml(id)}</TransactionId>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<CtrReport schema="tw-fsc-ctr-v1">
  <ReportId>${escapeXml(report.id)}</ReportId>
  <ReportDate>${escapeXml(report.reportDate)}</ReportDate>
  <Vasp>
    <Id>${VASP_INFO.id}</Id>
    <Name>${escapeXml(VASP_INFO.name)}</Name>
    <RegistrationNo>${VASP_INFO.registrationNo}</RegistrationNo>
  </Vasp>
  <Subject>
    <UserId>${escapeXml(report.userId)}</UserId>
    <Name>${escapeXml(user?.displayName ?? '')}</Name>
    <Email>${escapeXml(user?.email ?? '')}</Email>
    <KycTier>${escapeXml(user?.kycTier ?? '')}</KycTier>
  </Subject>
  <Aggregate currency="TWD">
    <TotalAmount>${report.totalAmount}</TotalAmount>
    <TransactionCount>${report.txIds.length}</TransactionCount>
    <Transactions>
${txIds}
    </Transactions>
  </Aggregate>
  <Status>${escapeXml(report.status)}</Status>
  <SubmittedAt>${escapeXml(report.submittedAt ?? '')}</SubmittedAt>
</CtrReport>
`
}

export function sarToJson(report: SarReport, user: User | null) {
  return {
    schema: 'tw-fsc-sar-v1',
    reportId: report.id,
    createdAt: report.createdAt,
    vasp: VASP_INFO,
    subject: {
      userId: report.userId,
      name: user?.displayName ?? null,
      email: user?.email ?? null,
      kycTier: user?.kycTier ?? null,
      riskLevel: user?.riskLevel ?? null
    },
    relatedAlertId: report.alertId,
    narrative: report.narrative,
    createdBy: report.createdBy,
    status: report.status,
    submittedAt: report.submittedAt
  }
}

export function sarToXml(report: SarReport, user: User | null): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SarReport schema="tw-fsc-sar-v1">
  <ReportId>${escapeXml(report.id)}</ReportId>
  <CreatedAt>${escapeXml(report.createdAt)}</CreatedAt>
  <Vasp>
    <Id>${VASP_INFO.id}</Id>
    <Name>${escapeXml(VASP_INFO.name)}</Name>
    <RegistrationNo>${VASP_INFO.registrationNo}</RegistrationNo>
  </Vasp>
  <Subject>
    <UserId>${escapeXml(report.userId)}</UserId>
    <Name>${escapeXml(user?.displayName ?? '')}</Name>
    <Email>${escapeXml(user?.email ?? '')}</Email>
    <KycTier>${escapeXml(user?.kycTier ?? '')}</KycTier>
    <RiskLevel>${escapeXml(user?.riskLevel ?? '')}</RiskLevel>
  </Subject>
  <RelatedAlertId>${escapeXml(report.alertId)}</RelatedAlertId>
  <Narrative><![CDATA[${report.narrative}]]></Narrative>
  <CreatedBy>${escapeXml(report.createdBy)}</CreatedBy>
  <Status>${escapeXml(report.status)}</Status>
  <SubmittedAt>${escapeXml(report.submittedAt ?? '')}</SubmittedAt>
</SarReport>
`
}
