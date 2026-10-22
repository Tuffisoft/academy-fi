# Prüf-/Freigabenachweis: Entwicklungsanleitung

Version 1.1 · 22.10.2026 · Basis: 198ea2d128a198ef5f864f3bba4976af6422ef93.
Gegenstand: nur [Entwicklungsanleitung](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md) und dieser Nachweis; keine Software-, Rollen-, Datenmodell- oder Paketversionsänderung. Kürzungsauftrag des Nutzers; keine Produktfreigabe.

Anleitungsstand: uncommittiert, SHA-256 (Dateibytes): `4e934a829b96ba7486fe71d58f760b006b36bf15867cdb08c2bf984c50ca27b2`.
Autor/Prüfer: Codex; dokumentiertes Selbstreview, keine unabhängige menschliche Abnahme.
Regeln: Q-P-01/06, Q-C-04/06, Q-T-01 und unveränderte LF-/T-/AK-Zuordnung.

## Prüfung und Ergebnis

28 offene Versionspakete: v0.0.1, v0.0.2, v0.1.0–v0.25.0, v1.0.0. Kein Paket abgeschlossen. Kürzung: allgemeine Pflichten zentralisiert, Auftrag verkürzt, einzelne Formulierungen gestrafft. Paketüberschriften, LF-/T-/AK-Kennungen, nummerierte Schritte und Checklisten bleiben erhalten. Kommentarhistorie/Einzelauftrag/Modulversionierung und Freigabeschranken gelten unverändert. Struktur-/Linkprüfung bestanden; alle 28 Paketüberschriften, paketlokalen LF-/T-/AK-Kennungen sowie Schritt-/Checklistenanzahlen mit Ausgangsdatei abgeglichen. Veralteten internen A.3-Verweis auf A.1 korrigiert. git diff --check bestanden. Aktueller Sammellauf (Windows-Sandbox, Node.js 24.16.0): Lint/Typecheck bestanden; 89/92 Tests bestanden, drei bekannte Fehler, keine Skips; gleicher Turbopack-Buildabbruch. Gesamt Exit 1. Keine echten Integrations-/Gerätetests für die Dokumentationsänderung ausgeführt.

Historischer Lauf vor Kürzung: Windows-Sandbox, Node.js 24.16.0; npm run check Exit 1. Lint/Typecheck bestanden, Tests 89/92 bestanden (3 Fehler, keine Skips: QL-002), Buildabbruch bei globals.css durch Turbopack-Unterprozess vor Verbindung (QL-003). Kein aktueller Nachweis durch diesen alten Lauf. Keine Migration/Seeds oder normalen Providerzugänge verwendet. DB-/Providerintegration, Geräte/UI/DE-/EN-Abnahme für reine Dokumentation nicht anwendbar; für Softwarepakete weiterhin offen. AK-01–18 nicht abgenommen.

## Bewertung und Verbesserungsbedarf

- Beibehalten: ein Paket pro Auftrag, zusammengehörige UI/Backend-Arbeit, isolierte Tests, eindeutige Freigabegrenzen und stabile Anforderungszuordnung. Das begrenzt Umfang und verhindert unbelegte Erledigtmeldungen.
- Abhängigkeiten: Reihenfolge ist verbindlich, aber keine explizite Paketmatrix. Eine spätere Matrix könnte technische Voraussetzungen von Geräte-/Betreiberfreigaben trennen; dafür Abschlussregeln bewusst anpassen statt still umgehen.
- Kommentararchiv: blendet erledigte Pakete nur in Vorschauen aus; im Quelltext kosten sie weiter Tokens und erschweren automatische Statusermittlung. Bei wachsender Historie ein sichtbares Statusregister und separates Archiv erwägen. Bestehende Vorgabe zum Auskommentieren bleibt bis zu einer Änderung verbindlich.
- Nachweise: Ergebnisse pro Softwarestand führen und nach relevanten Folgeänderungen gezielt erneuern. Wiederholte Ergebnislisten in mehreren Dokumenten veralten; zentrale QL-Einträge nur referenzieren.
- Prüfaufwand: Vollständiger Softwarecheck auch bei reiner Markdown-Änderung ist teuer. Eine ausdrücklich geregelte Dokumentationsprüfung könnte Aufwand senken; Q-T-01 bleibt bis zu einer Regeländerung verbindlich.
- Frühe Betriebsrisiken: Zugänge/Geräte ab v0.0.1 vorbereiten; Buchungen bereits mit atomarer Outbox entwickeln. Restore-/Widerrufsgrenzen vor erster Migration spezifizieren, ausführliche Betriebsabnahme bleibt v0.24.0. Keine neue Produktanforderung oder vorgezogene Implementierung beschlossen.

Entscheidung: Dokumentationsbearbeitung, keine Übernahme-/Produktfreigabe oder Ausnahme. Allgemeiner Softwarecheck bleibt bis zu erfolgreichen Nachweisen gesperrt; QL-002/003 und externe Voraussetzungen bleiben offen. Alle Softwareversionen starten weiterhin bei v0.0.1.

Version 1.0: Anleitung/Nachweis erstellt. Version 1.1: redundante Regeln und Nachweisdetails gekürzt; fachlicher Paketumfang unverändert.
