# v0.0.1 – Qualitätsbasis

Stand 27.10.2026. Historische Einzelbelege wurden auf Auftrag gelöscht; Prüfergebnisse nur als [Kurzfassung](../nachweise/NACHWEISE.md) erhalten. Keine neue Produktfreigabe.

Lokal abgeschlossen am 22.10.2026 auf ausdrücklichen Auftrag; Stand c3c0c4fab62e7b2598220f76db4a2b21fa9c4a66. Node 24, vier isolierte Checks, getrennte Loyalty-Testkonfiguration, Negativtests und Bestandsreview vorbereitet; damals vier Checks/94 Tests bestanden, Codex-Selbstreview. LF-N-08/10, T-18/AK-18 anteilig. Kein Merge, Deployment oder Produktabschluss.

## Auftraggeberentscheidungen zur Vorbereitung – 22.10.2026

Separate entbehrliche Neon-Testdatenbank ausdrücklich bestätigt; Loyalty nur LOYALTY_TEST_DATABASE_URL mit Prozess-Opt-in, Chat behält CHAT_TEST_DATABASE_URL. Keine normalen App-Zugänge für Tests. .env.example war Demonstration und entfällt ausdrücklich (V001-ENV erledigt); echte .env bleibt geheim und Git-ignoriert.

Sicherung wurde zurückgestellt. Folgeentscheidung vom 23.10.2026/Q-O-01: zentrale Sicherung und separate Restore-Datenbank nach Bau zwingend vor Livegang; additive Entwicklungsmigrationen isoliert prüfen, Bestand schützen und konkret autorisieren. Frühere Backup-Pflicht vor erster Entwicklungsmigration überholt. Keine Sicherungs-/Restoreprobe behauptet.

## Voraussetzungen und Zuständigkeiten

| ID | Gültiger Stand / nächste Aufgabe |
| --- | --- |
| V001-DB | Loyalty-Testzuordnung bestätigt, spätere DB-Läufe historisch dokumentiert; vollständige Chat-/SaaS-Nachweise QL-004 offen. Jeder Lauf braucht sichere Isolation. |
| V001-RESTORE | Betreiber benennt Person, Verfahren/Aufbewahrung, Wiederherstellungspunkt und separates Restoreziel; Probe einschließlich Jobs vor Livegang offen. Beim Restore Jobs/Versand anhalten, wirksame Widerrufe/Löschungen erneut anwenden, dann idempotent fortsetzen. Bestätigte Buchungen erhalten; kein pauschaler Reset. |
| V001-BACKUP | Betreiber: separate Sicherung der Git-ignorierten Dokumentation ungeklärt/zurückgestellt. |
| V001-APPLE | Betreiber: Apple-Team/Pass-Type-ID, Testzertifikat/APNs und echtes iPhone mit Modell/iOS für Wallet-Paket bereitstellen. |
| V001-GOOGLE | Betreiber: Testissuer, Dienstkonto, echtes Android mit Modell/OS; Veröffentlichung separat freigeben. |
| V001-STRIPE | Betreiber: separater Testmodus, Zuständigkeit, EUR-/USD-Preise und Verkaufsländer; Live-/Steuerfreigabe separat. |
| V001-MAIL | Resend-Testaccount/Testpostfach in v0.2.0/v0.3.0 bestätigt; reguläre Absenderdomain, Produktionsbetrieb und Zuständigkeit nicht dadurch freigegeben. |
| V001-CI | Repository-Admin: entfernten Erfolg und vier verpflichtende Quality-Checks/Reviews im Ruleset belegen (QL-006). |

Ably-Test-App bleibt eigene offene Academy-Voraussetzung (QL-004). Keine Geheimnisse in Dokumente/Chat. Vollständige AK-01–18 und Geräte-/Anbieterbelege bleiben Produkt-/Betriebsgates.
