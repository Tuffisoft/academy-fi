# Online-Testbetrieb auf Vercel

Auf Vercel speichern Cloud und Chat dauerhaft in der vorhandenen PostgreSQL-Datenbank (`DATABASE_URL`). Die zusätzlichen Tabellen liegen im eigenen Schema `academy_exchange` und werden bei der ersten Nutzung angelegt. Bestehende Website-Konten und Kennwörter werden dabei nicht verändert.

Lokal bleibt der vorhandene Datei-/SQLite-Speicher aktiv. Mit `EXCHANGE_STORAGE=postgres` lässt sich der Online-Speicher auch lokal prüfen. Es gibt keine automatische Übernahme bestehender lokaler Dateien oder Chat-Nachrichten.

Der Testspeicher ist auf insgesamt 250 MiB begrenzt. Cloud-Dateien dürfen bis 100 MiB, Chat-Anhänge bis 25 MiB groß sein. Der Browser überträgt Dateien in Abschnitten von 1 MiB; unvollständige Uploads erscheinen nicht in der Dateiliste und werden nach einer Stunde bei der nächsten Upload-Anfrage bereinigt. Downloads und ZIP-Dateien werden gestreamt. Dateien liegen für diesen begrenzten Testbetrieb ebenfalls in PostgreSQL; für größere Datenmengen sollte ein eigener Objektspeicher eingesetzt werden.

Die Cloud ist wie gewünscht für alle Besucher gemeinsam erreichbar. Der Chat nutzt die bestehende Website-Anmeldung und prüft Mitgliedschaften sowie Anhangsrechte serverseitig. Event-Verbindungen werden auf Vercel nach 25 Sekunden beendet und vom Browser neu aufgebaut.

Für die Anmeldung gelten `BETTER_AUTH_URL` sowie ausschließlich die konkreten, von Vercel bereitgestellten Adressen dieses Projekts (`VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`). Eine pauschale Freigabe anderer Vercel-Webseiten erfolgt nicht.

## Prüfung

Lokale Tests: `npx tsx --test src/lib/chat/storage.test.ts src/lib/chat/http.test.ts src/lib/cloud/storage.test.ts`

Online-Integrationstest (legt ausschließlich eigene Testdaten im zusätzlichen Schema an und entfernt sie anschließend):

```powershell
$env:EXCHANGE_TEST_DATABASE='1'
npx tsx --env-file=.env --test src/lib/exchange/postgres.test.ts src/lib/auth-origin.test.ts
```
