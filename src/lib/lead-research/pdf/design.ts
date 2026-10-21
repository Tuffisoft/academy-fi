export type PdfDesign = { name?: string; source: string; theme: "modern" | "corporate" | "professional" };
export const DEFAULT_PDF_DESIGN_NAME = "Website Insights";

// Editable JSX: internal links use the bookmark on the destination's View/Text.
export const defaultPdfDesign: PdfDesign = {
  name: DEFAULT_PDF_DESIGN_NAME,
  theme: "modern",
  source: `<Document title={report.title} author="Studio Fi" style={{ fontFamily: "Helvetica", fontSize: 10, color: "#172033", lineHeight: 1.5 }}>
  <Page size="A4" margin={40}>
    <Fixed position="footer" style={{ marginTop: 16 }}><View style={{ borderTopWidth: 1, borderColor: "#e8ecf2", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 8, color: "#64748b" }}>STUDIO FI / WEBSITE INSIGHTS</Text><Text style={{ fontSize: 8, color: "#64748b" }}>{report.labels.page} {"{{pageNumber}} / {{totalPages}}"}</Text></View></Fixed>
    <View wrap={true} bookmark="overview">
      <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#6366f1", marginBottom: 20 }}>STUDIO FI / WEBSITE INSIGHTS</Text>
      <View style={{ backgroundColor: "#172033", borderRadius: 16, padding: 26, marginBottom: 24 }}>
        <PdfHeading level={1} style={{ color: "#ffffff", fontSize: 30, marginBottom: 12 }}>{report.title}</PdfHeading>
        <Text style={{ color: "#cbd5e1", fontSize: 10, marginBottom: 8 }}>{report.websiteLabel}</Text>
        <Text style={{ color: "#94a3b8", fontSize: 9, marginBottom: 24 }}>{report.checkedAtLabel}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#cbd5e1", fontSize: 11 }}>{report.labels.quality}</Text>
          <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: 700 }}>{report.scoreLabel}</Text>
        </View>
      </View>
      <PdfHeading level={2} style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>{report.labels.contents}</PdfHeading>
      {report.navigation.map(item => (
        <View key={item.id} href={"#" + item.id} wrap={false} style={{ flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 6, borderRadius: 8, backgroundColor: "#f4f5fb" }}>
          <Text style={{ width: 34, fontSize: 10, color: "#6366f1", fontWeight: 700 }}>{item.number}</Text>
          <Text style={{ flexGrow: 1, fontSize: 11, fontWeight: 700 }}>{item.label}</Text>
          <Text style={{ color: "#6366f1", fontSize: 12 }}>&gt;</Text>
        </View>
      ))}
      <PdfHeading level={2} style={{ fontSize: 16, marginTop: 20, marginBottom: 10 }}>{report.labels.breakdown}</PdfHeading>
      {report.partsRows.map(row => (
        <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderColor: "#e8ecf2" }}>
          <Text style={{ fontSize: 10 }}>{row.label}</Text>
          <Text style={{ fontSize: 10, fontWeight: 700, color: row.color }}>{row.value}</Text>
        </View>
      ))}
    </View>
  </Page>
  {report.devices.map(device => (
    <Page key={device.key} size="A4" margin={40}>
    <Fixed position="footer" style={{ marginTop: 16 }}><View style={{ borderTopWidth: 1, borderColor: "#e8ecf2", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 8, color: "#64748b" }}>STUDIO FI / WEBSITE INSIGHTS</Text><Text style={{ fontSize: 8, color: "#64748b" }}>{report.labels.page} {"{{pageNumber}} / {{totalPages}}"}</Text></View></Fixed>
      <View wrap={true} bookmark={device.key}>
        <Text href="#overview" style={{ color: "#6366f1", fontSize: 9, marginBottom: 18 }}>{report.labels.back}</Text>
        <Text style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>{device.number} / WEBSITE INSIGHTS</Text>
        <PdfHeading level={1} style={{ fontSize: 28, marginBottom: 6 }}>{device.title}</PdfHeading>
        <Text style={{ color: "#64748b", fontSize: 9, marginBottom: 20 }}>{device.provider}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderRadius: 12, backgroundColor: "#f4f5fb", marginBottom: 20 }}>
          <Text style={{ fontSize: 12 }}>{report.labels.deviceScore}</Text>
          <Text style={{ fontSize: 26, fontWeight: 700, color: device.scoreColor }}>{device.scoreLabel}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>
          {device.scores.map(row => (
            <View key={row.key} style={{ flexGrow: 1, flexBasis: 0, backgroundColor: "#f8fafc", borderRadius: 8, padding: 10 }}>
              <Text style={{ fontSize: 8, color: "#64748b", marginBottom: 8 }}>{row.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: row.color }}>{row.value}</Text>
            </View>
          ))}
        </View>
        <PdfHeading level={2} style={{ fontSize: 16, marginTop: 0, marginBottom: 10 }}>{report.labels.metrics}</PdfHeading>
        {device.metrics.map(row => (
          <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderColor: "#e8ecf2" }}>
            <Text style={{ fontSize: 10 }}>{row.label}</Text><Text style={{ fontWeight: 700, fontSize: 10 }}>{row.value}</Text>
          </View>
        ))}
        <PdfHeading level={2} style={{ fontSize: 16, marginTop: 22, marginBottom: 10 }}>{report.labels.checks}</PdfHeading>
        {device.checks.map(row => (
          <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderColor: "#e8ecf2" }}>
            <Text style={{ fontSize: 10 }}>{row.label}</Text><Text style={{ fontSize: 10, color: "#475569" }}>{row.value}</Text>
          </View>
        ))}
      </View>
      {device.issues.length > 0 && <PageBreak />}
      {device.issues.length > 0 && <Text style={{ fontSize: 10, color: "#6366f1", marginBottom: 10 }}>{device.title}</Text>}
      <PdfHeading level={2} style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }} keepWithNext={true}>{report.labels.issues}</PdfHeading>
      {device.issues.length === 0 && <Text style={{ fontSize: 10, color: "#64748b" }}>{report.labels.noIssues}</Text>}
      {device.issues.map(issue => (
        <View key={issue.id} wrap={false} style={{ padding: 14, backgroundColor: "#f8fafc", borderLeftWidth: 3, borderColor: "#6366f1", marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{issue.title}</Text>
          {issue.value && <Text style={{ color: "#a16207", fontSize: 9, marginBottom: 6 }}>{issue.value}</Text>}
          <Text style={{ fontSize: 10, color: "#475569" }}>{issue.description}</Text>
        </View>
      ))}
      {device.warnings.map((warning, index) => <Text key={index} style={{ fontSize: 9, color: "#64748b", marginTop: 6 }}>{warning}</Text>)}
      </Page>
  ))}
  <Page size="A4" margin={40}>
    <Fixed position="footer" style={{ marginTop: 16 }}><View style={{ borderTopWidth: 1, borderColor: "#e8ecf2", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 8, color: "#64748b" }}>STUDIO FI / WEBSITE INSIGHTS</Text><Text style={{ fontSize: 8, color: "#64748b" }}>{report.labels.page} {"{{pageNumber}} / {{totalPages}}"}</Text></View></Fixed>
    <View wrap={true} bookmark="design">
      <Text href="#overview" style={{ color: "#6366f1", fontSize: 9, marginBottom: 18 }}>{report.labels.back}</Text>
      <Text style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>03 / WEBSITE INSIGHTS</Text>
      <PdfHeading level={1} style={{ fontSize: 28, marginBottom: 20 }}>{report.labels.design}</PdfHeading>
      <View style={{ padding: 20, borderRadius: 12, backgroundColor: "#f4f5fb", marginBottom: 24 }}><Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>{report.designSourceLabel}</Text><Text style={{ fontSize: 32, fontWeight: 700, color: report.designScoreColor }}>{report.designScoreLabel}</Text></View>
      {!report.designCompleted && <Text style={{ color: "#64748b" }}>{report.designStatusLabel}</Text>}
      {report.designCriteria.map(row => (
        <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#e8ecf2" }}><Text>{row.label}</Text><Text style={{ fontWeight: 700, color: row.color }}>{row.value}</Text></View>
      ))}
      {report.designFindings.map((finding, index) => (
        <View key={index} wrap={false} style={{ padding: 16, backgroundColor: "#f8fafc", borderRadius: 8, marginTop: 16 }}><Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{finding.observation}</Text><Text style={{ color: "#6366f1", fontSize: 8, fontWeight: 700, marginBottom: 4 }}>{report.labels.recommendation}</Text><Text style={{ color: "#475569", fontSize: 10 }}>{finding.recommendation}</Text></View>
      ))}
    </View>
  </Page>
  <Page size="A4" margin={40}>
    <Fixed position="footer" style={{ marginTop: 16 }}><View style={{ borderTopWidth: 1, borderColor: "#e8ecf2", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 8, color: "#64748b" }}>STUDIO FI / WEBSITE INSIGHTS</Text><Text style={{ fontSize: 8, color: "#64748b" }}>{report.labels.page} {"{{pageNumber}} / {{totalPages}}"}</Text></View></Fixed>
    <View wrap={true} bookmark="method">
      <Text href="#overview" style={{ color: "#6366f1", fontSize: 9, marginBottom: 18 }}>{report.labels.back}</Text>
      <Text style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>04 / WEBSITE INSIGHTS</Text>
      <PdfHeading level={1} style={{ fontSize: 28, marginBottom: 24 }}>{report.labels.method}</PdfHeading>
      <PdfHeading level={2} style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>{report.labels.weighting}</PdfHeading>
      {report.partsRows.map(row => (
        <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: "#f4f5fb", borderRadius: 6, marginBottom: 6 }}><Text>{row.label}</Text><Text style={{ color: "#6366f1", fontWeight: 700 }}>20 %</Text></View>
      ))}
      <Text style={{ fontSize: 11, marginTop: 18, color: "#475569" }}>{report.labels.formula}</Text>
      <PdfHeading level={2} style={{ fontSize: 16, marginTop: 28, marginBottom: 12 }}>{report.labels.scope}</PdfHeading>
      <Text style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>{report.labels.limitations}</Text>
      <Text style={{ fontSize: 10, color: "#475569", marginBottom: 24 }}>{report.labels.scale}</Text>
      <View style={{ borderTopWidth: 1, borderColor: "#e8ecf2", paddingTop: 16 }}><Text style={{ fontSize: 9, color: "#64748b", marginBottom: 8 }}>{report.url}</Text><Text style={{ fontSize: 9, color: "#64748b" }}>{report.checkedAtLabel}</Text></View>
    </View>
  </Page>
</Document>`,
};

export function parsePdfDesign(input: unknown): PdfDesign | null {
  if (!input || typeof input !== "object") return null;
  const { source, theme, name = DEFAULT_PDF_DESIGN_NAME } = input as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  if (typeof source !== "string" || !source.trim() || source.length > 60_000) return null;
  if (theme !== "modern" && theme !== "corporate" && theme !== "professional") return null;
  return { name: name.trim(), source, theme };
}
