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

Verbindliche Vorgaben: [Qualitätsregeln](QUALITAETSREGELN.md), [aktueller Prüfungsstand und offene Lücken](QUALITAETSSTATUS.md), [Freigabecheckliste](FREIGABECHECKLISTE.md). Ein fehlgeschlagener Check bleibt sichtbar fehlgeschlagen; der Prüfungsstand dokumentiert bekannte Bestandsfehler.

`npm test` führt Unit-/Verhaltenstests aus, einschließlich der aus dem Git-Verlauf wiederhergestellten Prüfungen. `typecheck` erzeugt zuerst die Next.js-Routentypen, damit auch ein frischer Checkout geprüft werden kann. `check:build` ruft `npm run build` mit Dummy-Datenbank und isolierten Anbieterzugängen auf; auf Windows verwendet die Prüfung den ignorierten SWC-Cache unter `.swc/native`. `.env*`-Dateien werden nicht verändert. Der normale Deployment-Befehl bleibt `npm run build`.

Echte Integrationstests gehören nicht zu `npm test`. Für `npm run test:integration` müssen `ACADEMYFI_DATABASE_TEST=1` und `CHAT_TEST_DATABASE_URL` im Prozess gesetzt sein; die separate Testdatenbank muss mit den vorhandenen Migrationen vorbereitet sein und darf keiner normalen Anwendungsdatenbank entsprechen. Für `npm run test:realtime` sind `ACADEMYFI_REALTIME_TEST=1` und `ABLY_TEST_API_KEY` aus einer separaten Test-App erforderlich. Fehlende Voraussetzungen führen zum Abbruch, nicht zu einem bestandenen oder still übersprungenen Test.

GitHub Actions verwendet dieselben vier Einzelbefehle mit Node.js 24 und `npm ci` für Pull Requests und Pushes auf `master`. Der Workflow benötigt keine produktiven Secrets. Erforderliche Merge-Checks müssen zusätzlich im GitHub-Ruleset eingerichtet werden. Lokale und CI-Prüfungen ersetzen keine Geräte-, Datenbank- oder Betriebsabnahme des SaaS.

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
