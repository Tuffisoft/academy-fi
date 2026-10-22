# Prüf- und Freigabenachweis: Entwicklungsanleitung Stempelkarten

## Stand und Gegenstand

| Feld | Eintrag |
| --- | --- |
| Gegenstand | Ausschließlich neue versionszentrierte Entwicklungsanleitung und dieser Dokumentationsnachweis. Keine SaaS-Implementierung. |
| Dokument | [ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md) |
| Dokumentversion / Datum | 1.0 / 22.10.2026 |
| Basis-Commit | `198ea2d128a198ef5f864f3bba4976af6422ef93` |
| Stand der Anleitung | Neu, uncommittiert; SHA-256 `b1696deac53739af155235ed858acd9951acaf77133cbd6f5cb5e9e0d484ce63`. |
| Umgebung | Windows-PowerShell im Workspace/Sandbox; Node.js 24.16.0. |
| Autor / Prüfer | Codex, umsetzender Agent; dokumentiertes Selbstreview, keine unabhängige menschliche Abnahme. |
| Auftrag | Anleitung für Coding-Agenten, kleine Einzelversionen ab v0.0.1, neue Funktionen als Minor-Versionen, vollständiges Ziel v1.0.0. Abgeschlossene Abschnitte auskommentieren und erhalten. |
| Betroffene Regeln | Q-P-01, Q-P-06, Q-C-04, Q-C-06, Q-T-01; fachliche Zuordnung zu LF-/T-/AK-Kennungen. |
| Verhalten / Rollen | Nur Dokumentation zukünftiger Aufträge. Bestehendes Verhalten und vorhandene Rollen unverändert. Keine produktive Anwendung, Migration, Veröffentlichung oder Änderung an `package.json`. |
| Regressionsauswahl | Vier bestehende allgemeine Checks; keine zusätzliche fachliche Testimplementierung für die reversible Markdown-Änderung. |

## Dokumentationsprüfung

| Prüfung | Ergebnis / Nachweis |
| --- | --- |
| Vollständigkeit | 28 eindeutige aktive Versionsabschnitte: v0.0.1, v0.0.2, v0.1.0 bis v0.25.0 und v1.0.0. Noch kein Paket abgeschlossen. |
| Anforderungsbezug | Alle 28 funktionalen und zehn nichtfunktionalen Kennungen des Lastenhefts kommen vor; keine unbekannte LF-Kennung. Die Prüfung ergänzt die inhaltliche Durchsicht, ersetzt keine spätere Produktabnahme. |
| Struktur | Jeder Versionsabschnitt besitzt Ziel, Anforderungsbezug, nummerierte Umsetzungsschritte und eine offene Abschlusscheckliste. Allgemeine Abhängigkeiten und Prüfgates stehen am Anfang. |
| Fortschrittsregel | Genau eine Version pro Auftrag. Vollständig erledigte Abschnitte werden einschließlich ihrer Historie in einen HTML-Kommentar eingeschlossen; teilweise erledigte Abschnitte bleiben sichtbar. |
| Markup und Verweise | Lokale Markdown-Links geprüft, Codeblöcke geschlossen, keine nachgestellten Leerzeichen; Beispiel-Codeblock bei der Versionszählung ausgeschlossen. |
| Sichtbarkeit erledigter Abschnitte | HTML-Kommentarformat und Vermeidung verschachtelter Kommentare durchgesehen. Es wurde kein geplanter Versionsblock probeweise als abgeschlossen versteckt. |
| Git-Diff-Prüfung | `git diff --check` ohne Befund; neue, noch ungetrackte Dateien zusätzlich direkt auf Leerzeichen und Struktur geprüft. |

## Allgemeine Prüfläufe

Am 22.10.2026 `npm run check` ausgeführt. Das bestehende Skript hat alle vier Checks nacheinander aufgerufen und ist insgesamt mit Exitcode 1 beendet worden. Providerwerte und Datenbankverbindung wurden durch die vorhandene Prüfisolation gesetzt; keine produktive Migration oder Seed-Ausführung.

| Nachweis | Status | Ergebnis |
| --- | --- | --- |
| Anleitung erstellt und gemäß Auftrag durchgesehen | Bestanden | Versionierung, Einzelaufträge, UI-/Backend-Abfolge und Auskommentieren enthalten. |
| `npm run lint` | Bestanden | Kein gemeldeter Lintfehler. |
| `npm run typecheck` | Bestanden | Routentypen erzeugt; Typprüfung ohne Fehler. |
| `npm test` | Fehlgeschlagen | 92 Tests, 89 bestanden, drei fehlgeschlagen, null übersprungen. Bekannter Bereich QL-002. |
| `npm run check:build` | Fehlgeschlagen | Prisma-Generierung erfolgreich; Turbopack scheitert bei `src/app/globals.css` am gestarteten Node-Unterprozess vor Verbindungsaufbau. Bekannter Bereich QL-003. |
| Echte DB-/Providerintegration | Nicht anwendbar für diese Dokumentationsänderung | Keine Laufzeit-/Datenmodelländerung. Für spätere Softwarepakete weiterhin erforderlich, kein erteilter Integrationsnachweis. |
| UI, DE/EN und echte Wallet-Geräte | Nicht anwendbar für diese Dokumentationsänderung | Keine Oberfläche oder E-Mail implementiert. Spätere Nachweise bleiben offen. |
| SaaS-Produktabnahme AK-01 bis AK-18 | Offen | Dieses Dokument ist keine Abnahme einer Softwareversion. |

Die drei fehlgeschlagenen Tests entsprechen den bereits in `AGENTS.md` beschriebenen Gewichtungsabweichungen:

- `tests/visual-design.test.ts:63`: tatsächlicher Wert 75, erwartet 80.
- `tests/visual-design.test.ts:82`: tatsächlicher Wert 77, erwartet 78.
- `tests/website-quality.test.ts:23`: tatsächlicher Wert 70, erwartet 80.

Diese Fehler und der Buildfehler wurden nicht durch Teständerungen, Ausschlüsse oder eine Scheinerfolgsmeldung verdeckt. Ihre Behebung ist kein Bestandteil der Erstellung der Anleitung; die Anleitung nimmt sie als erneut zu prüfende Ausgangslücken auf.

## Review, Befunde und Entscheidung

Selbstreview durch Codex am 22.10.2026 am oben bezeichneten Dateistand: Produktentscheidungen mit beiden Heften abgeglichen; versionsbezogene Schritte, Abhängigkeiten und Grenzen für Academy-Zugriff, Mandanten, Buchungen, Wallets, Recovery, Billing, Löschung und Launch durchgesehen. Alle Umsetzungspakete sind Zukunftsaufträge und nicht als gelieferte Funktionen gekennzeichnet.

Die spätere Auskommentierung verlangt belegten Abschluss und einen ausgefüllten Versionsnachweis. Offene Teilnachweise bleiben sichtbar, Freigabebedingungen aus `AGENTS.md` bleiben erhalten. Das Dokument führt weder einen automatischen Übergang zur nächsten Version noch eine automatische Produktionsfreigabe ein. Die eigenständige Modulversion verändert die bestehende Academy-Paketversion nicht.

Keine neuen dokumentationsbezogenen Befunde nach den Struktur- und Inhaltskorrekturen offen. Bestehende QL-002/QL-003 und weitere externe Integrations-/Betriebsnachweise bleiben unberührt; keine Ausnahme erteilt. Keine unabhängige menschliche Freigabe und keine Übernahme-/Produktfreigabe durch dieses Selbstreview.

**Entscheidung:** Dokumentation erstellt und geprüft; allgemeiner Software-Gesamtcheck weiterhin **GESPERRT** durch die dokumentierten Test-/Buildfehler. Alle Stempelkarten-Softwareversionen bleiben offen, beginnend mit v0.0.1.
