# Lead-Recherche – Stand nach Schritt 3

## Verhalten

- Neue Recherche: Parameter eingeben, prüfen und als Entwurf speichern.
- Die Speicherung startet weder Unternehmenssuche noch Website-Analyse. Die Unternehmenssuche wird ausdrücklich über „Google-Suche starten“ im Kampagnenmenü ausgelöst.
- Inaktive Kampagnen können bearbeitet und nach Bestätigung gelöscht werden. Owner dürfen alle verwalten, andere Nutzer nur ihre eigenen. Beim Bearbeiten wird die Kampagne zum Entwurf und ihre Place-ID-Liste geleert. Berechtigung und inaktiver Status werden atomar in der Schreibabfrage geprüft; laufende und wartende Aufträge bleiben gesperrt.
- OWNER sehen alle Aufträge, andere Nutzer ausschließlich ihre eigenen. Der Server bestimmt Ersteller und Anfangsstatus; Client-Eingaben können diese nicht überschreiben.
- Kampagnen zeigen Ort, Branche, Radius, Status und Erstellungszeit. Details zeigen die vollständigen Suchparameter; Owner sehen zusätzlich den Ersteller in der Tabelle.
- Die Übersicht zeigt maximal fünf Aufträge, die Kampagnenansicht zehn je Seite. Gespeicherte Entwürfe bleiben nach einem Neuladen erhalten.
- Der Suchlauf setzt RUNNING und danach COMPLETED oder FAILED. Sein Zeitstempel schützt vor überholten Ergebnissen konkurrierender Läufe. Unterbrochene Läufe lassen sich nach zwei Minuten erneut starten. Ein abgeschlossener Unternehmensabruf bedeutet noch keine abgeschlossene Website-Analyse.

## Google Places einrichten

1. Im Google-Cloud-Projekt „Places API (New)“ aktivieren und die erforderliche Abrechnung einrichten.
2. Den Schlüssel ausschließlich serverseitig als `GOOGLE_PLACES_API_KEY` in der lokalen `.env` bzw. den Hosting-Secrets hinterlegen. Keine `NEXT_PUBLIC_`-Variable verwenden und den Schlüssel nicht einchecken.
3. Den Schlüssel auf die Places API und, soweit mit dem Hosting möglich, die Server-IP-Adressen beschränken. Quoten passend zum gewünschten Budget konfigurieren; Budgetbenachrichtigungen allein sind keine Ausgabensperre.
4. Entwicklungsserver nach Änderung der Umgebungsvariable neu starten.
5. Kampagne speichern, Drei-Punkte-Menü öffnen, Google-Suche starten.

Pro Lauf: eine Ortsabfrage und höchstens drei Business-Text-Search-Seiten, jeweils mit 12 Sekunden Request-Timeout. Keine automatischen kostenpflichtigen Wiederholungen. Websites und Telefonnummern erfordern bei Text Search die Enterprise-Feldkategorie. Die erste Anbindung unterstützt bis zu 50 km Radius und höchstens 60 Google-Treffer vor Filterung. Frei eingegebene Branchen gehen als Suchtext an Google; Radiusfilter und Dublettenerkennung behalten die Reihenfolge der gelieferten Treffer bei. Die Ortsauflösung verwendet Googles ersten Ortstreffer; der aufgelöste Mittelpunkt wird angezeigt.

Die Live-Ergebnisse existieren ausschließlich im Arbeitsspeicher des aktuellen Views. Es gibt weder CSV-Export noch Speicherung von Google-Firmennamen, Adressen, Websites oder Telefonnummern. In der Datenbank verbleiben nur die erlaubten Place-IDs, interne Suchparameter und Statuswerte. Nach Neuladen werden Firmendaten nicht automatisch kostenpflichtig abgerufen. Ein erneuter Suchlauf ist erforderlich. Die Kennzahl zählt gespeicherte IDs je Kampagne und kann Überschneidungen zwischen Kampagnen enthalten.

Die Anzeige enthält Google-Maps-Attribution sowie gegebenenfalls mitgelieferte Drittanbieterhinweise. Vor einem produktiven Einsatz sind die zum Abrechnungskonto passenden Bedingungen und die von Google geforderten öffentlich zugänglichen Nutzungs- und Datenschutzhinweise einzurichten. Die technische Integration bestätigt keine pauschale Erlaubnis für Speicherung, Export oder die spätere Website-Analyse aus Google-Inhalten.

Geprüfte Anbieterquellen (20. Oktober 2026):

- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://cloud.google.com/terms/maps-platform/eea/maps-service-terms
- https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses

## Datenbank

Modell: `LeadSearch`; Migration: `20261020180000_add_lead_searches`.

Am 20. Oktober 2026 wurde die Migration nach Freigabe auf der konfigurierten Datenbank angewendet. Ihre ältere Migrationshistorie weicht von diesem Repository ab. Die neue Migration wurde deshalb gezielt mit `prisma db execute --file prisma/migrations/20261020180000_add_lead_searches/migration.sql` ausgeführt und anschließend mit `prisma migrate resolve --applied 20261020180000_add_lead_searches` registriert. Diese Befehle sind bereits erledigt und nicht erneut auszuführen.

Die ältere Historie wurde weder zurückgesetzt noch als abgeglichen markiert. Vor einem zukünftigen allgemeinen `migrate deploy` ist die Abweichung separat zu prüfen. Auf einer frischen Datenbank gehört die neue Migration zur normalen Migrationsfolge des Projekts.

Die additive Migration `20261020200000_add_google_place_references` ergänzt `googlePlaceIds` und wurde am selben Tag ebenfalls gezielt angewendet und als angewendet registriert. Auch sie ist auf dieser Datenbank bereits erledigt.

## Validierung

`npm run db:validate`, `npm run typecheck`, `npm test` und ESLint für die geänderten Quelldateien prüfen Schema, Typen, Eingabevalidierung und Berechtigungsfilter. `tests/lead-searches.test.ts` ist in den Standard-Testlauf eingebunden. Die neue Tabelle wurde zusätzlich über Prisma lesend geprüft.

Die Provider-Tests in `tests/google-places.test.ts` verwenden ausschließlich simulierte Antworten und verursachen keine Google-Gebühren. Ein echter Abruf benötigt den lokal hinterlegten Schlüssel.

Nächster Schritt: Hintergrundverarbeitung, Fortschritt und anschließend Website-Analyse.
