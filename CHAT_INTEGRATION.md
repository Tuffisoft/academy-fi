# Chat-Integration in Academy Fi

## Bestehende Umgebung

Das Hauptprojekt verwendet Next.js 16.3.6, React 19.2.8, Prisma 7.10 mit Neon,
Better Auth, next-intl mit de/en und die vorhandenen shadcn-Komponenten.
Die bestehenden Lern-, Aufgaben-, Ideen- und Präsentationsbereiche bleiben erhalten.

## Integration

- Chat liegt unter src/app/[locale]/chat: /de/chat und /en/chat.
- Header, Anmeldung, Rollenprüfung, Theme und Navigation stammen aus Academy.
- Die Chat-Komponenten liegen unter src/components/fi/chat mit den Unterordnern layout, conversations, messages, groups, hooks und utils. index.tsx verbindet die einzelnen Bereiche.
- Die Chat-Logik liegt unter src/lib/chat: Services unter services, Actions unter actions, Typen unter types und die Echtzeit-Anbindung unter realtime. client.ts enthält die Browser-API, server-encryption.ts die Nachrichtenverschlüsselung. Andere Academy-Module behalten ihre bestehende Struktur.
- Ably und server-only sind direkte Abhängigkeiten. Prisma wird nach der Installation und vor Builds generiert.
- Die kopierte Demo-Startseite und das separate geschützte Layout entfallen.
- Nicht vorhandene DailyPlan-Relation und alte individuelle Schlüsselmodelle entfallen aus dem kopierten Schema.
- Nachrichten bleiben mit dem gemeinsamen serverseitigen CHAT_MASTER_KEY verschlüsselt.
- Owner-Lesezugriff bleibt ausschließlich als Serverfunktion in src/lib/chat/services/owner-chat.ts verfügbar; keine Verwaltungsseite.
- Tastatur- und Scroll-Korrekturen des Seitenprojekts bleiben aktiv und werden beim Verlassen des Chats aufgeräumt.

## Noch erforderlich

1. Die vorbereitete additive Chat-Migration zunächst mit dem tatsächlichen Datenbankstand prüfen und anschließend bewusst anwenden. Ein Client-Generate ändert keine Datenbanktabellen. Die Datenbank wurde während dieser Integration nicht zurückgesetzt oder migriert.
2. CHAT_MASTER_KEY mit npm run chat:key:setup in der Hauptprojekt-.env einrichten und dauerhaft sichern. Ein vorhandener Schlüssel wird nicht ersetzt.
3. ABLY_API_KEY aus der verwendeten Ably-App in der Hauptprojekt-.env eintragen. Ohne diesen Wert fehlen Live-Benachrichtigungen.
4. Zwei echte Testkonten verwenden: Kontaktanfrage, Annahme, Versand, Bearbeitung, Löschen und Lesestatus prüfen; danach mobile Tastatur und Navigation zurück zum Dashboard testen.
5. Die noch deutsch fest eingebauten Chat-Texte und Datumsanzeigen in next-intl überführen. Die Routen und Academy-Navigation erhalten bereits die ausgewählte Sprache.
6. Den Academy-Seed separat um optionale Chat-Demodaten erweitern, falls gewünscht. db/seed.ts behält die bestehenden Academy-Konten und Abteilungen; der kopierte db/seed-config.ts dient derzeit den übernommenen Konfigurationstests.
7. Den kopierten scripts/database-command.mjs nicht für Academy verwenden: Er enthält Schutzprüfungen für das Seitenprojekt. Academy hat absichtlich keinen db:reset-Befehl daraus übernommen.

## Prüfungen

npm run typecheck
npm test
npm run db:validate
npm run lint
npm run build

Echte Datenbank-Integrationstests benötigen CHAT_TEST_DATABASE_URL auf einer separaten Entwicklungs-Testdatenbank.

## Gruppenchat

- Gruppentabellen werden durch `20261014180000_add_group_chat` separat ergänzt. Die bestehenden Direktchat- und Academy-Tabellen bleiben erhalten.
- Gruppen haben bis zu 50 aktive Mitglieder und offene Einladungen zusammen. Gruppenadmins können bestätigte, verfügbare Kontakte einladen; Einladungen müssen angenommen werden.
- Ein Beitritt setzt die sichtbare Nachrichtenhistorie und den Lesestand auf die aktuelle Sequenz. Auch nach einem erneuten Beitritt bleiben frühere Nachrichten außerhalb der sichtbaren Historie.
- Nur aktive, verfügbare Mitglieder können Nachrichten lesen und senden. Bearbeiten und Löschen sind auf eigene sichtbare Nachrichten beschränkt.
- Nach Austritt oder Entfernung entfällt der Zugriff. Verlässt der letzte Admin die Gruppe, übernimmt ein verfügbares Mitglied. Ohne verfügbares Mitglied wird die Gruppe archiviert und offene Einladungen werden aufgehoben; Nachrichten bleiben gespeichert.
- Gruppen verwenden dieselbe serverseitige Nachrichtenverschlüsselung und Ably-Benachrichtigungen wie Direktchats. `group_`-IDs ermöglichen das Routing über die vorhandene Chat-API.
- Die Tests in `tests/groups.test.ts` prüfen Mitgliedschaften, Rollen, Einladungen, Historiengrenzen und Nachrichtenrechte mit gemocktem Datenbankzugriff; sie sind Teil von `npm test`.
- Bei abweichender bestehender Migrationshistorie darf nicht pauschal `migrate deploy` ausgeführt werden. Die Gruppenmigration kann nach Prüfung einzeln mit `prisma db execute --file prisma/migrations/20261014180000_add_group_chat/migration.sql` angewendet und anschließend ausschließlich dieser neue Eintrag mit `prisma migrate resolve --applied 20261014180000_add_group_chat` protokolliert werden.

### Lokaler Windows-Start

Falls SWC den Standardcache wegen Windows-Berechtigungen ablehnt, kann ein kurzer Cachepfad im ignorierten `node_modules` verwendet werden. Der Cache liegt außerhalb von `.next`, das Next beim Build bereinigt, und vermeidet zu lange native Windows-Dateipfade. Die [SWC-Dokumentation](https://github.com/swc-project/swc/blob/main/docs/native-addon-carriers.md) beschreibt die Variable für absolute Cachepfade.

```powershell
$env:SWC_NATIVE_BINDING_CACHE = Join-Path (Get-Location) "node_modules/s"
npm run dev
```
