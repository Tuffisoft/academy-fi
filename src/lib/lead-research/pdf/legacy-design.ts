import type { PdfDesign } from "./design";

// A JSX expression, with PDFCN components and report data supplied by the editor.
export const legacyPdfDesign: PdfDesign = {
  theme: "modern",
  source: `<Document title={report.title} author="Studio Fi">
  <Page size="A4" margin={40}>
    <PdfText variant="sm">STUDIO FI / WEBSITE INSIGHTS</PdfText>
    <PdfHeading level={1}>{report.title}</PdfHeading>
    <PdfText>{report.url}</PdfText>
    <PdfText variant="sm">{report.checkedAtLabel}</PdfText>
    <PdfCard title={report.labels.quality} variant="muted">
      <PdfHeading level={1}>{report.scoreLabel}</PdfHeading>
    </PdfCard>
    <PdfSection>
      <PdfHeading level={2}>{report.labels.breakdown}</PdfHeading>
      {report.partsRows.map(row => (
        <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <PdfText>{row.label}</PdfText>
          <PdfText>{row.value}</PdfText>
        </View>
      ))}
    </PdfSection>
    <PdfText variant="sm">{report.labels.scale}</PdfText>
  </Page>
  {report.devices.map(device => (
    <Page key={device.key} size="A4" margin={40}>
      <PdfHeading level={1}>{device.title}</PdfHeading>
      <PdfText variant="sm">{device.provider}</PdfText>
      <PdfSection style={{ marginBottom: 10 }}>
        <PdfHeading level={3} style={{ marginBottom: 6 }}>{report.labels.breakdown}</PdfHeading>
        {device.scores.map(row => (
          <PdfText key={row.key} style={{ fontSize: 10, marginBottom: 4 }}>{row.label}: {row.value}</PdfText>
        ))}
      </PdfSection>
      <PdfSection style={{ marginBottom: 10 }}>
        <PdfHeading level={3} style={{ marginBottom: 6 }}>{report.labels.metrics}</PdfHeading>
        {device.metrics.map(row => (
          <PdfText key={row.key} style={{ fontSize: 10, marginBottom: 4 }}>{row.label}: {row.value}</PdfText>
        ))}
      </PdfSection>
      <PdfSection style={{ marginBottom: 10 }}>
        <PdfHeading level={3} style={{ marginBottom: 6 }}>{report.labels.checks}</PdfHeading>
        {device.checks.map(row => (
          <PdfText key={row.key} style={{ fontSize: 10, marginBottom: 4 }}>{row.label}: {row.value}</PdfText>
        ))}
      </PdfSection>
      <PdfSection style={{ marginBottom: 10 }}>
        <PdfHeading level={3} style={{ marginBottom: 6 }}>{report.labels.issues}</PdfHeading>
        {device.issues.length === 0 && <PdfText>{report.labels.noIssues}</PdfText>}
        {device.issues.map(issue => (
          <PdfCard key={issue.id} title={issue.title} wrap={true}>
            {issue.value && <PdfText variant="sm">{issue.value}</PdfText>}
            <PdfText>{issue.description}</PdfText>
          </PdfCard>
        ))}
        {device.warnings.map((warning, index) => <PdfText key={index} variant="sm">{warning}</PdfText>)}
      </PdfSection>
    </Page>
  ))}
  <Page size="A4" margin={40}>
    <PdfHeading level={1}>{report.labels.method}</PdfHeading>
    <PdfText>{report.labels.formula}</PdfText>
    <PdfText>{report.labels.limitations}</PdfText>
    <PdfText variant="sm">{report.url}</PdfText>
    <PdfText variant="sm">{report.checkedAtLabel}</PdfText>
  </Page>
</Document>`,
};
