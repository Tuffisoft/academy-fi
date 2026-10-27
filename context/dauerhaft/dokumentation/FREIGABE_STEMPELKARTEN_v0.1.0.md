# v0.1.0 – Mandantenbasis

Stand 27.10.2026. Historische Einzelbelege wurden auf Auftrag gelöscht; Prüfergebnisse nur als [Kurzfassung](../nachweise/NACHWEISE.md) erhalten. Keine neue Produktfreigabe.

LF-F-03/21, LF-N-01/03, T-/AK-02/13/17/18 anteilig. Unternehmen, Mitgliedschaften, Audit, lokale FREE-Berechtigung und globale CUSTOMER-Rolle vorbereitet. Unternehmensrollen getrennt; aktuelle Identität/Sperren, aktive Mitgliedschaft und Unternehmensstatus serverseitig prüfen. Globaler OWNER hat getrennten auditierten internen Lesekontext; INTERN keine globalen Mandantenrechte. Kein Paid-Zugang. Tarifprofile/DB-Integrität: [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md#technische-ergänzung-17--bauphase-und-mandantenbasis-23102026). Spätere Portalregeln: [Zugang](ZUGANG_STEMPELFI.md).

## Auftraggeberentscheidung 23.10.2026 – Migrationsumfang und Q-O-01

Migration 20261023090000_add_organization_foundation ausdrücklich für separate Loyalty-Test- und bestehende App-DB autorisiert/angewendet, Test zuerst. SQL-SHA256: 67bc2c12f915198b47a8381e906318d9036bba0b74658752df3cb76f2f988e34. Alle 29 App-Bestandstabellen laut damaligem aggregiertem Vergleich unverändert; Migrationseintrag erst nach Erfolg. Kein generisches migrate deploy/Reset/Seed. Testbaseline war kein Replay der unvollständigen Althistorie. Keine weitere Migrationsfreigabe daraus ableiten.

Zentrale Sicherung/Restoreziel und Wiederherstellung einschließlich Jobs/Widerrufen nach Bau zwingend vor Livegang (Q-O-01); frühere Vor-Migrationspflicht überholt. Rücknahme: Zugänge deaktivieren, bisherigen Code bei erhaltenen additiven Tabellen/Enumwerten nutzen; keine Bestandslöschung. V001-RESTORE/QL-008 offen.

## Abschlussabgleich und Vorlage zur lokalen Übernahme – 23.10.2026

Auftraggeber hat Commit 4e3df2d3f14fab194d902c831dce9829fcaa4d63 plus Patch c4be0966b3af0b5b559cb502e627edf96a77aa3e6f207e05ecdff5211ac8d0af ausdrücklich lokal übernommen. Damals vier Checks/110 Tests, zwei echte Loyalty-DB-Tests und 18 Browserfälle bestanden. Constraints, Mandanten-/Rollenabwehr, Entzug, 20-fache Wiederholungen/Parallelität, additive Testmigration/Bestandsschutz und DE/EN/360px/Tastatur/Lade-/Leer-/Fehlerfälle erfasst. Codex-Selbstreview, Windows/Node 24.21.0. QL-009 Einstieg und QL-011 Wortumbruch behoben; QL-010 damals durch Ersatznachweise geschlossen, die inzwischen ebenfalls gelöscht sind.

QL-008 offen: fünf lokal fehlende 20261009-App-Migrationen, sechs lokal nicht angewendete Altdateien; u. a. fehlende Anlage von AssignmentChecklistItem sowie locale/secureLoginVersion/ChatEncryptionKey im Replay. Originalhistorie oder separat geprüfte Baselinestrategie mit Bestandsschutz und echtem Replay nachführen; Altmigrationen nicht umschreiben. Neuinstallation/migrate deploy und vollständige AK-18-/Betriebsabnahme gesperrt.

Implementiert, automatisiert/lokal geprüft und als Entwicklungspaket übernommen; keine reale Geräte-/Produktionsabnahme oder vollständige AK-01–18-Freigabe. QL-004–008 bleiben im jeweils offenen Umfang. Kein Merge/Deployment.
