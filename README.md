# Academy Fi

Interne Plattform für Lernen, Aufgaben, Tagesplanung, Ideen, Chat und Lead-Recherche.

## Lokal starten

Voraussetzungen: Node.js 24, npm und eine konfigurierte PostgreSQL-/Neon-Datenbank. Zugangsdaten stehen lokal in `.env`.

```bash
npm ci
npm run dev
```

Die Anwendung läuft unter http://localhost:3000 mit deutschen und englischen Routen. Prisma Client wird bei der Installation und vor dem Entwicklungsstart automatisch generiert. Datenbankmigrationen werden dabei nicht angewendet.

## Projektstruktur

- `src/app`: Seiten und API-Routen
- `src/components`: Oberfläche, nach Funktionen gegliedert
- `src/lib`: Serverlogik, Datenzugriff und gemeinsame Hilfsfunktionen
- `src/messages` und `src/i18n`: Übersetzungen und Sprachrouting
- `prisma`: Datenbankschema und Migrationen
- `db`: Seed und Seed-Konfiguration
- `tests`: automatisierte Prüfungen
- `assets/pdf`: eingebundene PDF-Schriftarten

## Prüfungen

```bash
npm run lint
npm run typecheck
npm test
npm run check:build
# Oder alle vier Schritte mit gemeinsamem Fehlerstatus:
npm run check
```

Arbeitsregeln, Prüfablauf und offene Blocker: [AGENTS.md](AGENTS.md). Abnahme: [Freigabecheckliste](FREIGABECHECKLISTE.md).

`typecheck` erzeugt Next.js-Routentypen; `check:build` prüft den Produktionsbuild mit isolierten Dummy-Zugängen. Deployment weiterhin über `npm run build`. Integrationstests und GitHub-Merge-Schutz separat nach den Qualitätsregeln einrichten.

Weitere Hinweise: [Chat-Integration](CHAT_INTEGRATION.md) und [Lead-Recherche](LEAD_RESEARCH.md). Lokale PDF-Vorschauen und Design-Backups unter `output/` werden für neue Dateien von Git ignoriert.

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

Im PDF-Designer kann die gespeicherte Vorlage über „Vorlagenname“ benannt werden (1 bis 100 Zeichen). Der Name bleibt beim erneuten Öffnen und beim Einsetzen des Standarddesigns erhalten. Bestehende Vorlagen erhalten zunächst den Namen „Website Insights“.

„Vorlage“ listet die eigenen gespeicherten Designs statt der PDFCN-Themes auf. „Neue Vorlage“ erstellt einen Entwurf aus dem aktuellen Design; nach Eingabe eines Namens legt „Vorlage speichern“ eine weitere Vorlage an. Speichern und Auswählen ändern nur die bearbeitete Vorlage. Erst „Als Live-Design setzen“ übernimmt eine gespeicherte Version für Kunden-PDFs. Auch Änderungen an der bereits aktiven Vorlage müssen ausdrücklich erneut aktiviert werden. Der bisherige Live-Stand bleibt bis dahin erhalten. Vor einem Wechsel müssen Änderungen gespeichert oder über „Änderungen verwerfen“ zurückgenommen werden. Die bisherige Vorlage wird mit ihrem Namen, JSX und Theme unverändert in die Vorlagenbibliothek übernommen; das Theme bleibt intern Bestandteil des Designs.

„Code kopieren“ in der Kopfzeile von `report.jsx` kopiert den gesamten aktuellen Editorinhalt in die Zwischenablage, einschließlich ungespeicherter Änderungen.

Der JSX-Editor verwendet lokal gebündeltes CodeMirror mit Syntaxfarben, Zeilennummern, Code-Faltung, Suche und automatischer Einrückung. Quellcode wird nicht an einen externen Editor-Dienst übertragen. Eine VS-Code-Erweiterung ist für diese Bearbeitung nicht erforderlich.

Die Standardvorlage enthält ein anklickbares Inhaltsmenü auf der Titelseite, eigene Abschnitte für Mobil, Desktop, KI-Designbewertung und die Bewertungsmethode sowie Seitenzahlen. Die Links verwenden echte interne PDF-Sprungziele und bleiben bei zusätzlichen Seiten korrekt. Im Designer werden alte unveränderte Standardvorlagen mit der neuen Gestaltung geöffnet; der Live-Stand ändert sich erst durch ausdrückliches Aktivieren. Eigene JSX-Vorlagen bleiben erhalten. Im Editor lässt sich die neue Vorlage über „Standard einsetzen“ übernehmen und speichern.

Eigene Sprunglinks lassen sich mit `href="#mobile"` auf `View`, `Text` oder `Link` anlegen. Das Ziel erhält `bookmark="mobile"` auf `View` oder `Text`. Sprungziele müssen eindeutig sein und tatsächlich existieren. Externe Links sind im Vorlageneditor nicht freigegeben. `Fixed position="footer"` unterstützt `{{pageNumber}}` und `{{totalPages}}`; Fixed-Elemente stehen vor dem Seiteninhalt, damit sie auch auf Fortsetzungsseiten erscheinen.
