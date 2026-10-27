# v0.0.2 – Academy-Zugriffsschutz

Stand 27.10.2026. Historische Einzelbelege wurden auf Auftrag gelöscht; Prüfergebnisse nur als [Kurzfassung](../nachweise/NACHWEISE.md) erhalten. Keine neue Produktfreigabe.

LF-F-01, LF-N-01/02, T-/AK-01/02/18 anteilig. Gemeinsamer aktueller DB-Guard erlaubt intern nur vorhandene, nicht gesperrte OWNER/INTERN; Plattform-Owner-Aktionen zusätzlich getrennt. Sessionrollen gewähren keine Rechte. Seiten, Datenleser, 68 Actions in 15 Modulen, fünf fachliche HTTP-Handler und Uploads geschützt; Profilcallback prüft Rechte erneut. Ressourcen-/Ownergrenzen erhalten. Auth/Reset öffentlich, Registrierung deaktiviert. Keine Schema-/Bestandsänderung; Rücknahme über Code, kein Reset. Technik: [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md#technische-ergänzung-16--academy-guards-22102026).

## Ausdrückliche Abschlussfreigabe und Archivierung – 22.10.2026

Auftraggeber: „Ich gebe den Stand e904c9b für den Abschluss von v0.0.2 frei.“ Stand e904c9b0a26c019cbaa010c7aa9148939f3c7f81; lokal übernommen/abgeschlossen. Damals vier Checks/101 Tests bestanden; 544 direkte Ablehnungen über Actions, Rollenmanipulation, Sperren/Entzug, Uploadcallback, interne Listen und zulässige OWNER/INTERN-Aufrufe geprüft. Codex-Selbstreview, Windows/Node 24.16.0. Frühe fehlerhafte Entwürfe korrigiert, nicht als bestanden umgedeutet.

Auth-/DB-I/O gemockt: kein echter DB-/Ably-/Geräte-/Browserloginbeleg. Keine neue Kernoberfläche; DE/EN-Chatablehnungen geprüft. Vollständige Geschäfts-/Mandantenabnahme, QL-004/005/006/007 und Betrieb bleiben offen. Keine Freigabe für Merge/Push/Deployment, Migration, öffentliche Registrierung oder SaaS-Produktabnahme.
