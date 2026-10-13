# Chat-Integration in Academy Fi

## Bestehende Umgebung

Das Hauptprojekt verwendet Next.js 16.3.6, React 19.2.8, Prisma 7.10 mit Neon,
Better Auth, next-intl mit de/en und die vorhandenen shadcn-Komponenten.
Die bestehenden Lern-, Aufgaben-, Ideen- und Präsentationsbereiche bleiben erhalten.

## Integration

- Chat liegt unter src/app/[locale]/chat: /de/chat und /en/chat.
- Header, Anmeldung, Rollenprüfung, Theme und Navigation stammen aus Academy.
- Provider liegen unter src/lib/providers, Actions unter src/lib/actions, Typen unter src/lib/types.
- Ably und server-only sind direkte Abhängigkeiten. Prisma wird nach der Installation und vor Builds generiert.
- Die kopierte Demo-Startseite und das separate geschützte Layout entfallen.
- Nicht vorhandene DailyPlan-Relation und alte individuelle Schlüsselmodelle entfallen aus dem kopierten Schema.
- Nachrichten bleiben mit dem gemeinsamen serverseitigen CHAT_MASTER_KEY verschlüsselt.
- Owner-Lesezugriff bleibt ausschließlich als Serverfunktion in src/lib/owner-chat.ts verfügbar; keine Verwaltungsseite.
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
