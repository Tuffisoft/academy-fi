# Lead-Recherche – Stand nach Schritt 2

## Verhalten

- Neue Recherche: Parameter eingeben, prüfen und als Entwurf speichern.
- Die Speicherung startet weder Unternehmenssuche noch Website-Analyse.
- Gespeicherte Entwürfe können bearbeitet und nach Bestätigung gelöscht werden. Owner dürfen alle Entwürfe verwalten, andere Nutzer nur ihre eigenen. Berechtigung und Entwurfsstatus werden atomar in der Datenbank-Schreibabfrage geprüft; laufende und abgeschlossene Aufträge sind davon ausgeschlossen.
- OWNER sehen alle Aufträge, andere Nutzer ausschließlich ihre eigenen. Der Server bestimmt Ersteller und Anfangsstatus; Client-Eingaben können diese nicht überschreiben.
- Kampagnen zeigen Ort, Branche, Radius, Status und Erstellungszeit. Details zeigen die vollständigen Suchparameter; Owner sehen zusätzlich den Ersteller in der Tabelle.
- Die Übersicht zeigt maximal fünf Aufträge, die Kampagnenansicht zehn je Seite. Gespeicherte Entwürfe bleiben nach einem Neuladen erhalten.
- Die Statuswerte für die spätere Verarbeitung sind vorbereitet. Es gibt in Schritt 2 noch keine API zum Starten oder Ändern des Status.

## Datenbank

Modell: `LeadSearch`; Migration: `20261020180000_add_lead_searches`.

Am 20. Oktober 2026 wurde die Migration nach Freigabe auf der konfigurierten Datenbank angewendet. Ihre ältere Migrationshistorie weicht von diesem Repository ab. Die neue Migration wurde deshalb gezielt mit `prisma db execute --file prisma/migrations/20261020180000_add_lead_searches/migration.sql` ausgeführt und anschließend mit `prisma migrate resolve --applied 20261020180000_add_lead_searches` registriert. Diese Befehle sind bereits erledigt und nicht erneut auszuführen.

Die ältere Historie wurde weder zurückgesetzt noch als abgeglichen markiert. Vor einem zukünftigen allgemeinen `migrate deploy` ist die Abweichung separat zu prüfen. Auf einer frischen Datenbank gehört die neue Migration zur normalen Migrationsfolge des Projekts.

## Validierung

`npm run db:validate`, `npm run typecheck`, `npm test` und ESLint für die geänderten Quelldateien prüfen Schema, Typen, Eingabevalidierung und Berechtigungsfilter. `tests/lead-searches.test.ts` ist in den Standard-Testlauf eingebunden. Die neue Tabelle wurde zusätzlich über Prisma lesend geprüft.

Nächster Schritt: Datenquelle auswählen und die tatsächliche Unternehmenssuche anbinden.
