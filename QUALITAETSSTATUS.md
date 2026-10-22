# Qualitätsstatus und offene Lücken

Stand: 22.10.2026 · Grundlage: Commit `83552ef` plus uncommittierter Qualitätsarbeitsstand. Dieser Bericht ist keine Produktfreigabe. Verantwortlichkeit bezeichnet die Zuständigkeit; ein offener Eintrag erteilt keine Ausnahme.

Prüfcode-/Konfigurationsstand: SHA-256 `33505e40c0eea297f767e08a74e04c8176ad04aba9589052fd1de5b9dd64ac7f`. Erfasst sind 25 Dateien: `package.json`, `package-lock.json`, `.nvmrc`, beide neuen Prüfscripte, Workflow, PR-Vorlage und sämtliche Dateien unter `tests/`. Berechnung über lexikografisch sortierte Dateinamen, jeweils Dateiname + NUL + UTF-8-Inhalt mit LF-Zeilenenden + NUL. Manifest, Abhängigkeiten und Node-Vorgabe stimmen mit dem Lockfile überein. Die neue Workflowdatei wurde zusätzlich mit einem YAML-Parser geprüft.

## 1. Ausgangszustand und aktuelle Ergebnisse

| Prüfung | Vor Beginn | Nach Umsetzung |
| --- | --- | --- |
| Lint | Bestanden, Exit 0. | Bestanden im abschließenden Sammellauf, Exit 0. |
| Typecheck | Bestanden, Exit 0; vorhandene lokal generierte Next.js-Typen verwendet. | Bestanden im abschließenden Sammellauf inklusive automatischer Next.js-Typgenerierung und `tsc`, Exit 0. |
| `npm test` | Exit 1: 14 referenzierte Testdateien fehlten vollständig. | Abschließender Lauf: 92 Tests, 89 bestanden, 3 fehlgeschlagen, 0 übersprungen; Exit 1 ausschließlich wegen QL-002. Alle vier neuen Isolationstests bestehen. |
| Produktionsbuild | Exit 1: native SWC-Bindung scheitert an Windows-Sandbox-Cacheberechtigungen. | `npm run check:build` bestanden: Kompilierung, TypeScript und 34/34 statische Seiten, Exit 0. SWC verwendet den Workspace-Cache. |
| Datenbankintegration | Kein verlässlicher Nachweis vorhanden. | Ohne explizite Testkonfiguration mit Exit 1 verweigert; kein Datenbankzugriff. Echte Tests nicht ausgeführt. |
| Ably-Integration | Kein aktueller Nachweis vorhanden. | Ohne explizite Testkonfiguration mit Exit 1 verweigert; kein Anbieteraufruf. Echter Test nicht ausgeführt. |
| GitHub Actions | Kein Workflow vorhanden. | Vier unabhängige Jobs eingerichtet; noch kein entfernter CI-Lauf nachgewiesen. |

Die 17 ursprünglichen Testdateien wurden aus `83552ef^` wiederhergestellt. Die 14 bisherigen Unit-/Verhaltenstestdateien und ihre Erwartungen blieben unverändert. Die drei Integrationstestdateien wurden ausschließlich hinsichtlich getrennter Testkonfiguration, dynamischem Datenbankimport, Zeitbegrenzung und fehlenden Skip-Erfolgen abgesichert. Vier zusätzliche Verhaltenstests prüfen die Isolation und Verweigerung unsicherer Prüfkonfigurationen.

Der abschließende `npm run check` wurde unter Windows mit Node.js 24.16.0 außerhalb der verlangsamten Sandbox ausgeführt, weiterhin mit isolierten Dummy-/Testwerten und ohne Migration oder Seed. Er führt nach einem fehlgeschlagenen Teilschritt alle weiteren Prüfungen aus und endete korrekt mit Exit 1 und `Nicht bestanden: test`. Die normalen Anwendungszugänge wurden nicht für Datenbank-/Anbietertests verwendet. Lint, Typecheck und Build sind damit nachgewiesen; vollständige Regression und SaaS-Abnahme sind wegen der offenen Punkte nicht behauptet.

## 2. Bestandslücken und Aufgaben

| ID | Status / Auswirkung | Verantwortlichkeit | Nachweis und Erledigungskriterium |
| --- | --- | --- | --- |
| QL-001 | Behoben: Testdateien fehlten; `npm test` war nicht ausführbar. | Umsetzung | Wiederherstellung aus Git-Verlauf; alle ursprünglich referenzierten Dateien werden wieder ausgeführt. Weiterhin fehlgeschlagene Erwartungen separat QL-002. |
| QL-002 | Offen; Testcheck und Freigabe der betroffenen Website-Bewertung blockiert. | Produktverantwortlicher entscheidet fachliche Gewichtung; Umsetzung stellt Konsistenz her. | README und Tests beschreiben fünfmal 20 %. `src/lib/lead-research/website-rating.ts` verwendet 30/10/10/20/30. Testfälle unten. Erledigt, wenn fachlich festgelegte Gewichtung, Code, Beschreibung und alle Tests konsistent sind. Keine Erwartungsanpassung nur für einen grünen Lauf. |
| QL-003 | Behoben für die Prüfumgebung: lokaler Build zunächst durch SWC-Cache blockiert. | Umsetzung / Entwicklungsumgebung | Der isolierte Check verwendet unter Windows `.swc/native`; vollständiger Produktionsbuild im abschließenden Lauf bestanden. Verzögerte Sandbox-Läufe wurden abgebrochen und nicht als Erfolg gezählt. |
| QL-004 | Offen: keine ausgeführten echten Datenbank-/Realtime-Integrationstests. Blockiert die Abnahme entsprechend betroffener Funktionen. | Betreiber stellt getrennte Testumgebungen bereit; Umsetzung führt Tests aus. | `test:integration` und `test:realtime` sind ausführbar und verweigern fehlende Konfiguration. Erledigt mit protokolliertem echtem Lauf gegen separate vorbereitete Neon/PostgreSQL-Testdatenbank beziehungsweise Ably-Test-App. Kein Produktionszugang wurde dafür verwendet. |
| QL-005 | Offen vor externer Registrierung: Academy-Abgrenzung noch nicht vollständig nachgewiesen. | Umsetzung | Registrierung derzeit deaktiviert; Standardrolle weiterhin `INTERN`, zahlreiche Zugänge nur mit `requireUser`. Keine Behauptung eines aktuell öffentlich ausnutzbaren Zugangs. Erledigt durch explizite Academy-/Geschäftskonten-Guards und T-01/T-02 vor Öffnung. |
| QL-006 | Offen: entfernte CI-Ausführung und technische Merge-Sperre nicht nachgewiesen. | Repository-Administrator | Nach Übernahme Workflow auf GitHub ausführen. Im Ruleset für `master` die Checks `Quality (lint)`, `Quality (typecheck)`, `Quality (test)` und `Quality (check:build)` verpflichtend setzen. Reviewnachweise nach Q-C-06 und ausdrückliche Freigaben nach Q-C-07 über den PR-Prozess sicherstellen. Erledigt mit dokumentierter Konfiguration und CI-Lauf; rote Bestandsfehler bleiben vorher zu beheben. Der lokale Workflow ändert keine GitHub-Einstellungen. |
| QL-007 | Offen für SaaS Release 1.0: AK-01–AK-18 sowie Geräte-/Betriebs-/Anbieterfreigaben nicht nachgewiesen. | Umsetzung und Betreiber gemäß Heften | Kein SaaS-Feature in diesem Arbeitsschritt implementiert. Erledigt durch vollständige ausgefüllte Freigabecheckliste und die geforderten Belege. |

### QL-002: unveränderte fehlgeschlagene Erwartungen

| Testdatei / Fall | Erwartet | Aktuell |
| --- | --- | --- |
| `website-quality.test.ts`: ein von fünf perfekten Teilwerten auf null | 80 | 70 bei Performance null |
| `visual-design.test.ts`: normalisierter Beispielbericht | 80 | 75 |
| `visual-design.test.ts`: vier technische Werte 80, Design 70 | 78 | 77 |

Die übrigen Tests in diesen Dateien laufen weiter. Keine Testdatei wurde wegen dieser Abweichung ausgeschlossen und kein Fehler als bestandene Prüfung umgedeutet.

## 3. Review und Freigabestand dieses Arbeitsschritts

Code-Review durch den umsetzenden Agenten; geprüfter Gegenstand: neue Prüfscripte, CI-Workflow, npm-/Node-Konfiguration, wiederhergestellte Testliste, Integrationstest-Schutz und Qualitätsdokumentation gegenüber `83552ef`. Das ist ein dokumentiertes Agentenreview, keine unabhängige menschliche Abnahme.

| Befund | Erledigung |
| --- | --- |
| Früherer Friendship-Test importierte die normale App-Datenbank und prüfte nur `DATABASE_ENV`. | Normaler DB-Import entfernt; erst explizite separate Testkonfiguration prüfen, dann dynamisch importieren. Runner verweigert bekannte App-Datenbanken auch bei anderen Zugangsdaten. |
| Früherer Ably-Test übernahm normale Zugangsdaten und übersprang bei fehlendem Schlüssel. | Separate Test-App und Opt-in erforderlich; auch andere oder rotierte Schlüssel einer bekannten normalen App werden abgelehnt. Fehlende Konfiguration ergibt Exit 1. |
| Normale Build-/Testprozesse könnten lokale Providerwerte erben. | Lokale `.env*`-Namen überschreiben, bekannte Providerwerte leeren, Dummy-Datenbank verwenden; mit Verhaltenstests geprüft. Dateien und Elternprozess bleiben unverändert. |
| Typecheck auf frischem Checkout hätte keine generierten Next.js-Typen. | Typecheck erzeugt Routentypen vor `tsc` in isolierter Umgebung. |
| Ein fehlgeschlagener Check könnte weitere Ergebnisse verdecken. | Vier unabhängige CI-Jobs mit `fail-fast: false`; lokaler Sammelbefehl führt alle vier Prüfungen aus und liefert bei jedem Fehler Exit 1. |

Keine Ausnahme ist erteilt. Keine Übernahme, kein Merge, kein Deployment und keine Produktionsmigration wurden durchgeführt. Rollen, Buchungs-, Billing- und Löschlogik sowie Datenbankschema sind unverändert. Vollständige Produktfreigabe: **GESPERRT**, bis die jeweils erforderlichen Nachweise vorliegen.
