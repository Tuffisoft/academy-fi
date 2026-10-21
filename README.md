This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Website-Bewertung im Lead-Generator

Neue Website-Prüfungen bewerten Ladezeit, SEO, Barrierefreiheit, Technik und Design & Benutzerführung zu je 20 %. Die ersten vier Themen verwenden die mobilen PageSpeed-Werte; Desktop bleibt separat in den Details. Ein Gesamtscore wird nur bei fünf vorhandenen Teilwerten berechnet. Bestehende Berichte werden beim Lesen entsprechend eingeordnet, ohne kostenpflichtige Prüfungen erneut zu starten.

Die Übersicht zeigt Mobil und Desktop direkt mit einem separaten Technik-Score (gleich gewichteter Mittelwert der vier technischen Themen je Gerät). Dieser Gerätescore enthält keine KI-Designnote und verändert die Gewichtung des Gesamtscores nicht. Die genauen Befunde bleiben darunter aufklappbar.

Für die automatische Designbewertung serverseitig in `.env` konfigurieren:

```dotenv
OPENAI_API_KEY=your-server-side-key
# Optional; Standardmodell:
OPENAI_DESIGN_MODEL=gpt-5.4-mini
```

Danach den Server neu starten. Der Schlüssel wird ausschließlich im Audit-Worker verwendet. Der mobile `final-screenshot` aus Lighthouse wird an die OpenAI Responses API übergeben (`store: false`); er wird nicht im Bericht gespeichert. Pro Prüfung erfolgt höchstens eine KI-Anfrage, ohne automatische Wiederholung. OpenAI-Nutzung wird separat über das konfigurierte API-Konto abgerechnet.

Die KI beurteilt sichtbare Struktur, Lesbarkeit, Konsistenz und mobiles Layout. Unsichere, verdeckte oder fehlerhafte Screenshots erhalten keine Note. Fehlender Schlüssel, fehlender Screenshot und Anbieterfehler lassen die vier technischen Bewertungen bestehen und den Gesamtscore offen. KI-Einschätzungen sind keine Prüfung tatsächlicher Interaktionen oder der gesamten Website. PDF-Vorlagen erhalten zusätzlich `report.visual` und die fünf aktualisierten `report.partsRows`.

API-Dokumentation: [Bildanalyse](https://developers.openai.com/api/docs/guides/images-vision), [strukturierte Ausgaben](https://developers.openai.com/api/docs/guides/structured-outputs).

## PDF-Berichtsdesign

Die Standardvorlage enthält ein anklickbares Inhaltsmenü auf der Titelseite, eigene Abschnitte für Mobil, Desktop, KI-Designbewertung und die Bewertungsmethode sowie Seitenzahlen. Die Links verwenden echte interne PDF-Sprungziele und bleiben bei zusätzlichen Seiten korrekt. Gespeicherte Kopien der ursprünglichen Standardvorlage erhalten die neue Gestaltung automatisch; eigene JSX-Vorlagen bleiben erhalten. Im Editor lässt sich die neue Vorlage über „Standard einsetzen“ übernehmen und speichern.

Eigene Sprunglinks lassen sich mit `href="#mobile"` auf `View`, `Text` oder `Link` anlegen. Das Ziel erhält `bookmark="mobile"` auf `View` oder `Text`. Sprungziele müssen eindeutig sein und tatsächlich existieren. Externe Links sind im Vorlageneditor nicht freigegeben. `Fixed position="footer"` unterstützt `{{pageNumber}}` und `{{totalPages}}`; Fixed-Elemente stehen vor dem Seiteninhalt, damit sie auch auf Fortsetzungsseiten erscheinen.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
