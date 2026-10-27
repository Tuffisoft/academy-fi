# Produktionsbuild und Website-Bewertung

Stand 27.10.2026. Historische Einzelbelege wurden auf Auftrag gelöscht; Prüfergebnisse nur als [Kurzfassung](../nachweise/NACHWEISE.md) erhalten. Keine neue Produktfreigabe.

Gültige Entscheidung vom 22.10.2026: Bewertung mit 30 % Ladezeit, 10 % SEO, 10 % Barrierefreiheit, 20 % Technik und 30 % Design. Fachlogik/DE/EN unverändert; feste Tests für Bereiche, ungültige Werte, Normalisierung, Geräteabgrenzung und PDF daran ausgerichtet. QL-002 behoben.

Produktions-/Deploymentbuild über Webpack; check:build verwendet denselben Build mit isolierten Werten. Turbopack scheiterte auch außerhalb der Sandbox; separater Sandbox-EPERM war kein erfolgreicher Build. Keine Prüfregel ausgeschaltet. Erster Schriftabruf benötigt Netzwerk. QL-003 behoben.

Historischer Abschluss: 22.10.2026, Basis fce7baf, Windows/Node 24.16.0, vier Checks/92 Tests bestanden, Codex-Selbstreview. Keine DB-/Rollen-/Billing-/Migrationsänderung oder Geräte-/Produktfreigabe.
