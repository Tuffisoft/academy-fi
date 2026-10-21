import { renderPdf } from "@formepdf/core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Page, serialize } from "@formepdf/react";
import type { ComponentType, ReactElement } from "react";
import { View, Text } from "../../pdf-primitives";
import { PdfCard } from "../../../components/pdf/card/card";
import { Text as PdfText } from "../../../components/pdf/text/text";
import { Heading as PdfHeading } from "../../../components/pdf/heading/heading";
import { Section as PdfSection } from "../../../components/pdf/section/section";
import { Badge as PdfBadge } from "../../../components/pdf/badge/badge";
import { PdfcnThemeProvider } from "../../../components/pdf/theme-provider";
import { modernTheme } from "../../../components/pdf/theme-modern";
import { corporateTheme } from "../../../components/pdf/theme-corporate";
import { professionalTheme } from "../../pdf-themes/professional";
import { evaluatePdfJsx, PdfTemplateError } from "./evaluate-jsx";
import { pdfReportData, sampleWebsiteReport } from "./report-data";
import type { PdfDesign } from "./design";
import type { WebsiteReport } from "../website-quality";

const components = { Document, Page, View, Text, PdfCard, PdfText, PdfHeading, PdfSection, PdfBadge } as unknown as Record<string, ComponentType<never>>;
const themes = { modern: modernTheme, corporate: corporateTheme, professional: professionalTheme };
const latoFonts = [
  { family: "Lato", weight: 400, italic: false, src: readFileSync(path.join(process.cwd(), "assets/pdf/fonts/Lato-Regular.ttf")).toString("base64") },
  { family: "Lato", weight: 700, italic: false, src: readFileSync(path.join(process.cwd(), "assets/pdf/fonts/Lato-Bold.ttf")).toString("base64") },
];

export function validatePdfTemplate(design: PdfDesign) {
  evaluatePdfJsx(design.source, components, pdfReportData(sampleWebsiteReport, "de"));
}

export async function createWebsiteReportPdf(report: WebsiteReport, design: PdfDesign, locale: "de" | "en" = "de") {
  const element = evaluatePdfJsx(design.source, components, pdfReportData(report, locale)) as ReactElement;
  // PDFCN's Forme provider uses module state. Set the theme and serialize together,
  // synchronously, before any await so concurrent requests cannot mix themes.
  PdfcnThemeProvider({ theme: themes[design.theme], children: element });
  const document = serialize(element);
  if (design.theme === "corporate") document.fonts = latoFonts;
  // No user-supplied fonts/images or file/network resolution: render the validated tree.
  // PDFCN uses the react-pdf family name; Forme names the built-in serif "Times".
  const json = JSON.stringify(document, (key, value) => key === "fontFamily" && value === "Times-Roman" ? "Times" : value);
  if (json.length > 2_000_000) throw new PdfTemplateError("The generated document is too large.");
  return renderPdf(json);
}
