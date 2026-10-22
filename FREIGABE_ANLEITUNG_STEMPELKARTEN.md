# Änderungsnachweis: Stempelkarten-Regeln und Entwicklungsplan

Version 1.2 · 22.10.2026 · Softwarebasis `7dcf63d8fdf0ffe680bdfbd43ad0a05d5523ea2c`. Auftrag: vorgeschlagene Prozessverbesserungen umsetzen, Muss-Anforderungen erhalten. Autor/Prüfer: Codex, Selbstreview; keine unabhängige menschliche Abnahme. Dokumentstand: SHA-256 `1073251260559f23901c743813202b1f7332992029de58319010a3634109c7df` über die sieben übrigen oben genannten Dateien, sortiert nach Pfad, je Pfad + NUL + UTF-8-Inhalt (LF) + NUL; dieser Nachweis selbst ausgenommen.

## Umfang und Entscheidung

Nur Markdown: AGENTS.md, Entwicklungsanleitung, Archiv, Freigabecheckliste, Pflichtenheft, README, PR-Vorlage und dieser Nachweis. Keine Laufzeit-/Rollen-/Schema-/Paketänderung. Q-T-01 nach Nutzerauftrag präzisiert; zur Einführung dennoch alle vier Softwarechecks ausgeführt (siehe unten). Keine Migration/Seeds/Produktionszugänge oder Geräte-/Integrationstests. Dokumentationsabschluss ist keine Software-/Produktfreigabe; zentrale Blocker [QL-002–007](AGENTS.md#qualitätsstatus--22102026) bleiben offen. Alle 28 Softwarepakete offen.

Umgesetzt: technische Paketmatrix mit getrennten externen Gates; Auswahl bearbeitbarer Pakete ohne automatische Folgeaufträge; sichtbares Register plus vollständiges Archiv statt Kommentare; standbezogene zentrale Prüfnachweise; begrenzter Dokumentationsprüfweg; Restore-/Job-/Widerrufsplanung vor erster Migration. Fachregeln/Preise/LF-/T-/AK-Kennungen und Geräte-/Produktionsgates unverändert. Frühere Auskommentier-Vorgabe durch diesen ausdrücklichen Änderungsauftrag ersetzt.

## Review und Prüfungen

Geprüfter Umfang/Stand: oben bezeichnete Markdown-Dateien gegen Ausgangsstand dieses Auftrags. Prüfpunkte: Paketinhalt/Anforderungskennungen erhalten, Matrix ohne Zyklen und mit allen Paketen, Archiv noch leer, keine Abschlüsse erfunden, alte Prozessvorgaben konsistent ersetzt, Links/Anker und Markdown/Diff korrekt. Bestanden: 8 Markdown-Dateien, 19 lokale Links/Anker, vollständige zyklusfreie Paketmatrix; alle 28 Paketüberschriften, paketlokalen LF-/T-/AK-Kennungen sowie Schritt-/Checklistenanzahlen erhalten. Alle 31 Q-/QL-IDs und die vollständige Pflichtenheft-Testmatrix erhalten; Archiv leer, keine Abschlüsse erfunden. git diff --check und direkte Leerzeichenprüfung neuer Dateien bestanden. Reviewbefunde erledigt: Google-Pakettext an unabhängige Vorbereitung angepasst, interne Verweise aktualisiert, veraltete Testbestandsaussage durch zentrale Statusreferenz ersetzt. Fach-/Sicherheitsanforderungen und Freigabegates unverändert; Prozessänderungen ausdrücklich vom Nutzer beauftragt.

## Letzter Softwarelauf

Einführungsprüflauf am 22.10.2026, Windows-Sandbox/Node.js 24.16.0, Softwarestand wie oben (nur Markdown geändert), npm run check:

| Check | Ergebnis |
| --- | --- |
| Lint | bestanden |
| Typecheck | bestanden, Routentypen generiert |
| Tests | fehlgeschlagen: 89/92 bestanden, 3 bekannte Fehler, 0 Skips (QL-002) |
| Isolierter Build | fehlgeschlagen: Turbopack-Unterprozess bei globals.css vor Verbindung beendet (QL-003) |

Gesamt Exit 1. Kein erfolgreicher Gesamtcheck oder Software-/Produktfreigabe. Nach dem Lauf nur Dokumentationsbefunde/Nachweise korrigiert; Dokumentationsprüfung erneuert. Frühere Läufe nur historisch im Git-Verlauf; keine doppelten aktuellen Ergebnislisten.

Historie: 1.0 Anleitung erstellt; 1.1 gekürzt; 1.2 (22.10.2026) Prozessverbesserungen umgesetzt, Nachweise zentralisiert. Frühere Prüfläufe sind im Git-Verlauf historisch, nicht als aktueller Erfolg wiederverwendbar.
