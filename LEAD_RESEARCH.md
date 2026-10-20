# Lead-Recherche – Stand nach Schritt 5

## Verhalten

- Neue Recherche: Parameter eingeben, prüfen und als Entwurf speichern.
- Die Speicherung startet weder Unternehmenssuche noch Website-Analyse. Die Unternehmenssuche wird ausdrücklich über den Play-Button „Google-Suche starten“ links neben dem Drei-Punkte-Menü ausgelöst. Daneben öffnet der Augen-Button die Ergebnisse; Bearbeiten und Löschen stehen im Menü.
- Inaktive Kampagnen können bearbeitet und nach Bestätigung gelöscht werden. Owner dürfen alle verwalten, andere Nutzer nur ihre eigenen. Beim Bearbeiten wird die Kampagne zum Entwurf und ihre Place-ID-Liste geleert. Berechtigung und inaktiver Status werden atomar in der Schreibabfrage geprüft; laufende und wartende Aufträge bleiben gesperrt.
- OWNER sehen alle Aufträge, andere Nutzer ausschließlich ihre eigenen. Der Server bestimmt Ersteller und Anfangsstatus; Client-Eingaben können diese nicht überschreiben.
- Kampagnen zeigen Ort, Branche, Radius, Status und Erstellungszeit. Details zeigen die vollständigen Suchparameter; Owner sehen zusätzlich den Ersteller in der Tabelle.
- Die Übersicht zeigt maximal fünf Aufträge, die Kampagnenansicht zehn je Seite. Gespeicherte Entwürfe bleiben nach einem Neuladen erhalten.
- Die Trefferliste zeigt zehn Leads pro Seite; Suchfilter setzen die Seitenauswahl zurück. Alle gefundenen Firmendaten werden weiterhin automatisch geladen. Das Blättern in dieser Liste verursacht keine zusätzlichen Google-Abfragen.
- Ein Treffer wird ausschließlich durch „Behalten“ in die persönliche Auswahl übernommen; Suchtreffer werden nicht automatisch als behalten markiert. Erneutes Speichern derselben Place-ID erzeugt für denselben Nutzer keinen zweiten Eintrag. Die Auswahl kann wieder entfernt werden.
- Der Tab „Gespeicherte Leads“ zeigt die behaltenen Treffer mit zehn Einträgen pro Seite. Praktikanten sehen und verwalten ihre eigenen Einträge; Owner alle, einschließlich Erstellerangabe. Wenn ein Owner einen Suchtreffer behält, wird er der eigenen Auswahl zugeordnet.
- Die Auswahl bleibt nach Neuladen sowie Bearbeiten oder Löschen der ursprünglichen Kampagne erhalten. Gespeichert werden Place-ID, Ersteller, optionale Herkunftskampagne und Zeitpunkt. Namen, Adressen und Kontaktdaten bleiben flüchtig.
- Beim Öffnen einer Seite der gespeicherten Leads werden deren Firmendaten live geladen, mit passenden Tabellen-Skeletons. Innerhalb des geöffneten Views werden bereits abgerufene Daten im Arbeitsspeicher wiederverwendet; ein Neuladen kann erneut Google-Kosten auslösen. Dieser Abruf ist unabhängig vom Arbeitsspeicher der Suchtrefferliste.
- Ein Start speichert QUEUED und eine eigene Run-ID. Next.js `after()` verarbeitet den Auftrag nach der Antwort als RUNNING weiter und speichert danach COMPLETED oder FAILED. Run-ID und Status schützen vor doppelter Verarbeitung und verspäteten Ergebnissen. Ein abgeschlossener Unternehmensabruf bedeutet noch keine abgeschlossene Website-Analyse.
- Ortsauflösung, tatsächlich verarbeitete Ergebnisseiten, Trefferzahl, Fehler und Abschlusszeit werden gespeichert. Ein geschützter Status-Endpunkt aktualisiert die Oberfläche während aktiver Läufe ungefähr alle 2,5 Sekunden; ausgeblendete Tabs pausieren die Abfragen. Der Statusabruf löst keine Google-Anfrage aus.
- Laufende und wartende Aufträge lassen sich abbrechen. Bereits laufende Google-Anfragen können noch beendet und abgerechnet werden. Weitere Seiten werden nach der nächsten Statusprüfung nicht mehr angefordert; verspätete Ergebnisse überschreiben den Abbruch nicht.
- Pro Kampagnen-Ersteller ist ein aktiver Suchlauf erlaubt, insgesamt höchstens drei. Die Zulassung wird durch eine kurze PostgreSQL-Advisory-Lock-Transaktion über Vercel-Instanzen hinweg abgesichert. Während der Google-Anfragen bleibt keine Datenbanktransaktion offen.

## Google Places einrichten

1. Im Google-Cloud-Projekt „Places API (New)“ aktivieren und die erforderliche Abrechnung einrichten.
2. Den Schlüssel ausschließlich serverseitig als `GOOGLE_PLACES_API_KEY` in der lokalen `.env` bzw. den Hosting-Secrets hinterlegen. Keine `NEXT_PUBLIC_`-Variable verwenden und den Schlüssel nicht einchecken.
3. Den Schlüssel auf die Places API und, soweit mit dem Hosting möglich, die Server-IP-Adressen beschränken. Quoten passend zum gewünschten Budget konfigurieren; Budgetbenachrichtigungen allein sind keine Ausgabensperre.
4. Entwicklungsserver nach Änderung der Umgebungsvariable neu starten.
5. Kampagne speichern und mit dem Play-Button die Google-Suche starten.

Pro Hintergrundlauf: eine Ortsabfrage und höchstens drei Business-Text-Search-Seiten, jeweils mit 12 Sekunden Request-Timeout. Keine automatischen kostenpflichtigen Wiederholungen. Kontaktfelder werden im Hintergrund nicht angefordert. Die Anbindung unterstützt bis zu 50 km Radius und höchstens 60 Google-Treffer vor Filterung. Frei eingegebene Branchen gehen als Suchtext an Google; Radiusfilter und Dublettenerkennung behalten die Reihenfolge der gelieferten Treffer bei. Die Ortsauflösung verwendet Googles ersten Ortstreffer.

Nach dem Hintergrundlauf öffnet der Nutzer den Leads-Tab oder wählt „Ergebnisse anzeigen“. Daraufhin werden automatisch alle gefundenen Unternehmen der ausgewählten Kampagne geladen, ohne Zehner-Button. Intern werden die serverseitigen Pakete mit jeweils bis zu zehn Places-Details-Anfragen nacheinander abgerufen; innerhalb eines Pakets laufen höchstens drei Anfragen parallel. Bereits geladene Zeilen bleiben sichtbar, während Skeletons die restlichen Treffer ankündigen. Die Oberfläche weist auf die Kostenwirkung des Abrufs hin. Bei Kontingent- oder Zugriffsfehlern wird die automatische Folge gestoppt; erfolgreiche Teilergebnisse bleiben sichtbar.

Ein Wechsel aus dem Leads-Tab stoppt weitere Pakete. Bereits gestartete Aufrufe können noch abgeschlossen und abgerechnet werden. Innerhalb desselben geöffneten Views werden fertige Pakete wiederverwendet; ein erneuter Tabwechsel lädt diese nicht nochmals. Änderungen an Kampagne oder Run-ID starten eine neue Ergebnisfolge. Firmendaten werden weiterhin nicht in der Datenbank oder im Browser-Speicher persistiert.

Die Live-Firmendaten existieren ausschließlich im Arbeitsspeicher des aktuellen Views. Es gibt weder CSV-Export noch Speicherung von Google-Firmennamen, Adressen, Websites oder Telefonnummern. In der Datenbank verbleiben nur die erlaubten Place-IDs, interne Suchparameter und Statuswerte. Nach Neuladen werden die gespeicherten IDs beim Öffnen des Leads-Tabs erneut live aufgelöst; eine neue Unternehmenssuche ist dafür nicht erforderlich. Die Kennzahl zählt gespeicherte IDs je Kampagne und kann Überschneidungen zwischen Kampagnen enthalten.

## Vercel-Laufzeit und Fehlergrenzen

Die Lead-Recherche-Seite verwendet Node.js/Next.js `after()` mit `maxDuration = 120`. Auf Vercel muss die konfigurierte Function-Laufzeit diesen Wert unterstützen (Fluid Compute entsprechend prüfen). Ein Seitenwechsel oder das Schließen des Tabs beendet den serverseitigen `after`-Auftrag nicht. Ein Deployment, Prozessabbruch oder das Plattform-Zeitlimit kann ihn weiterhin unterbrechen: Dies ist keine externe, automatisch wiederzustellende Job-Queue.

Beim nächsten Statusabruf oder Seitenaufruf werden aktive Aufträge nach zwei Minuten als fehlgeschlagen markiert. Es erfolgt keine automatische erneute Google-Suche. Ein manueller Neustart erhält eine neue Run-ID. Für spätere, wesentlich längere Website-Analysen sollte die Laufzeit erneut geprüft und gegebenenfalls ein separater dauerhafter Worker vorgesehen werden.

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

Die additive Migration `20261020220000_add_search_job_progress` ergänzt die Run-ID sowie Fortschritts-, Fehler- und Zeitfelder. Sie wurde am 20. Oktober 2026 ebenfalls angewendet und registriert. Der erste Ausführungsversuch war an einem Nutzungslimit der automatischen Freigabeprüfung gescheitert und hatte die Datenbank nicht verändert; der erneute regulär geprüfte Versuch war erfolgreich.

Die additive Migration `20261020230000_add_saved_leads` legt `SavedLead` an. Sie wurde am 20. Oktober 2026 gezielt angewendet und registriert. Ein eindeutiger Index verhindert doppelte Place-IDs pro Nutzer. Das Löschen einer Kampagne setzt nur den Herkunftsverweis auf NULL; die Auswahl bleibt erhalten.

## Validierung

`npm run db:validate`, `npm run typecheck`, `npm test` und ESLint für die geänderten Quelldateien prüfen Schema, Typen, Eingabevalidierung und Berechtigungsfilter. `tests/lead-searches.test.ts` ist in den Standard-Testlauf eingebunden. Die neue Tabelle wurde zusätzlich über Prisma lesend geprüft.

Die Provider-Tests in `tests/google-places.test.ts` verwenden ausschließlich simulierte Antworten und verursachen keine Google-Gebühren. Ein echter Abruf benötigt den lokal hinterlegten Schlüssel.

Die Tests in `tests/search-jobs.test.ts` prüfen unter anderem doppelte Worker-Aufrufe, Abbruch, verspätete Ergebnisse, erlaubte Speicherdaten und Fehler ohne automatische kostenpflichtige Wiederholung. Die neuen Datenbankfelder und die Admission-Lock-Abfrage wurden zusätzlich lesend geprüft.

Für gespeicherte Leads wurde zusätzlich eine vollständig zurückgerollte Datenbanktransaktion ausgeführt: erneutes Speichern ohne Dublette, eigene/Owner-Sichtbarkeit, verweigertes Entfernen fremder Einträge durch Praktikanten, Entfernen eigener Einträge und Erhalt nach Kampagnenlöschung. Es verbleiben keine Testdaten. Schema- und Typprüfung sowie alle 52 bestehenden Tests sind erfolgreich; ESLint meldet nur bestehende Warnungen außerhalb der Lead-Recherche. Eine Browserprüfung der neuen Oberfläche wurde hier nicht durchgeführt.

## Automatische Website-Prüfung

Die aktuelle Nutzerentscheidung ersetzt den früher vorgeschlagenen Verbesserungsscore: **0–100 misst Website-Qualität, niedriger bedeutet schlechter.** Alle neuen Google-Treffer erhalten automatisch einen Prüfauftrag, unabhängig von einer manuellen Lead-Auswahl. Die bisher optionale Checkbox ist entfallen; auch ältere Kampagnen werden beim nächsten Start mit Website-Prüfung ausgeführt.

Für ältere Treffer werden beim ersten Laden der Firmendaten fehlende Prüfaufträge ergänzt, ohne eine erneute Unternehmenssuche. Dabei werden vorhandene Berichte und fehlgeschlagene Prüfungen nicht automatisch erneut ausgeführt. Eine neue explizite Google-Suche prüft ihre Treffer erneut. Bereits wartende oder laufende Prüfungen desselben Nutzers und derselben Place-ID werden geteilt.

Der Google-Suchlauf und seine Prüfaufträge werden atomar in der Datenbank sichtbar. Anschließend übernimmt Vercel Workflow SDK 5.2.2 die dauerhafte Verarbeitung in einzelnen Schritten. Maximal drei Website-Prüfungen laufen gleichzeitig, auch über mehrere Serverinstanzen hinweg; eine PostgreSQL-Advisory-Lock-Transaktion sichert die Zulassung. Je Prüfung: ein zusätzlicher Places-Details-Aufruf zur aktuellen Website-Auflösung und zwei PageSpeed-Insights-Aufrufe (Mobile und Desktop), beide mit 75 Sekunden Timeout. Websites ohne angegebene URL erhalten `NO_WEBSITE` ohne PageSpeed-Abruf. Der App-Server ruft keine beliebigen Unternehmens-URLs selbst ab.

Alle vier Lighthouse-Kategorien werden angefordert. Der Qualitätsscore ist die gerundete gewichtete Summe:

| Teilwert | Gewicht |
| --- | ---: |
| Mobile Ladeleistung | 40 % |
| Desktop-Ladeleistung | 20 % |
| SEO-Grundlagen, Mittelwert beider Geräte | 20 % |
| Barrierefreiheit, Mittelwert beider Geräte | 10 % |
| Technische Best Practices, Mittelwert beider Geräte | 10 % |

Die Teilwerte sind gerundete Lighthouse-Kategorie-Scores von 0 bis 100. Fehlt ein Teilwert, bleibt der Gesamtscore NULL; verfügbare Messwerte bleiben im Teilbericht sichtbar. Ein Anbieterfehler, ein blockierter oder nicht erreichbarer Aufruf wird nicht als 0 Punkte ausgegeben. Mobile Messung bedeutet eine Lighthouse-Labormessung, keine vollständige manuelle Prüfung der Mobilfreundlichkeit. Die Automatik prüft die angegebene Einstiegsseite; sie ist kein vollständiger Crawl, kein KI-Designurteil und keine umfassende Sicherheits-, Rechts- oder Kontaktqualitätsprüfung.

Die Tabellen zeigen Status und Qualitätsscore. „Lead-Details“ öffnet alle aktuell verfügbaren Firmendaten, Herkunftshinweise, Suchkontext (soweit noch vorhanden), Website-/Maps-Links sowie den gespeicherten Bericht mit Teilwerten, Formel, LCP/FCP/TBT/CLS, HTTPS, ausgewählten SEO-/Viewport-Prüfungen, bis zu 30 bewerteten Auffälligkeiten je Gerät, Anbieterwarnungen und Messzeitpunkt. Nicht mitgelieferte Messungen erscheinen als solche. Das Öffnen eines bestehenden Berichts löst keine erneute Website-Prüfung aus. Firmeninformationen werden weiterhin ausschließlich live angezeigt; der technische Bericht enthält die von PageSpeed gemeldete geprüfte Zielseite, aber keine Google-Firmennamen, Adressen oder Telefonnummern.

Die Übersicht nutzt echte Durchschnitts- und Verteilungswerte: Qualität unter 40 = hohes, 40–69 = mittleres, ab 70 = geringes technisches Verbesserungspotenzial. Das ist keine Aussage über Kaufbereitschaft. Owner sehen alle Berichte, Praktikanten nur ihre eigenen. Gespeicherte Leads behalten ihren Bericht auch bei späterer Kampagnenlöschung.

Prüfschritte werden nicht automatisch wiederholt (`maxRetries = 0`). Ein doppelter Zustellversuch kann dieselbe Prüfung nur einmal beanspruchen. Run-Tokens schützen gegen verspätete Ergebnisse. Unterbrochene laufende Prüfungen werden beim nächsten Statusabruf nach zwei Minuten als fehlgeschlagen sichtbar; länger als 90 Minuten wartende Aufträge ebenfalls. Fehler einzelner Websites stoppen nicht die übrigen Prüfungen. Solange für einen Kampagnen-Ersteller Prüfungen warten oder laufen, ist eine weitere Unternehmenssuche für diesen Ersteller gesperrt. Nach Abschluss des Google-Suchlaufs betrifft dessen bisheriger Abbruch-Button nicht die separaten Website-Prüfungen.

### Einrichtung und Betrieb

1. Im Google-Cloud-Projekt die **PageSpeed Insights API** aktivieren. Für regelmäßige automatische Aufrufe einen passenden serverseitigen Schlüssel als `PAGESPEED_API_KEY` hinterlegen; nicht als `NEXT_PUBLIC_` und nicht im Chat. Ohne Schlüssel versucht die Integration den von Google unterstützten anonymen Abruf, dessen Kontingent nicht garantiert ist. Der vorhandene Places-Schlüssel wird dafür nicht automatisch wiederverwendet.
2. Entwicklungsserver nach der Änderung neu starten. Auf Vercel beide Schlüssel als Umgebungsvariablen hinterlegen und neu deployen. Fluid Compute aktivieren; Workflow übernimmt dort seine dauerhaften Fortsetzungen. Ein Deployment wurde durch diese Implementierung nicht ausgelöst.
3. Lokal aktiviert `withWorkflow` die Workflow-Routen und den lokalen Ausführungszustand. Der bestehende Proxy-Matcher schließt Pfade mit Punkt bereits aus und erfasst `/.well-known/workflow/` nicht. Generierte Routen und lokale Workflow-Daten sind ignoriert.
4. Nach Start einer Google-Suche läuft die Prüfung auch nach einem Browserwechsel weiter. Die Oberfläche fragt nur internen Status und Scores ab. Ein Bericht entsteht erst nach den tatsächlichen Anbieterantworten.

Die zusätzliche Migration `20261021000000_add_website_audits` wurde gezielt angewendet und registriert, ohne bestehende Daten zu ändern. `WebsiteAudit` speichert pro Nutzer/Place-ID Status, Run-Token, Score, normalisierten technischen Bericht und Zeitpunkte. Datenbank-Constraints begrenzen Statuswerte und Scores. Die Registrierung wurde nach einer vorübergehend belegten Prisma-Migrationssperre erfolgreich wiederholt.

### Prüfungen dieses Schritts

Alle 60 Tests, Typprüfung, Prisma-Schema-Prüfung und ESLint für die geänderten Komponenten sind erfolgreich. Die acht neuen Tests prüfen Score-Richtung/Gewichte, fehlende Werte, URL-Begrenzung, beide Geräte und Kategorien, normalisierte Speicherdaten, Anbieterfehler ohne automatische Wiederholung, doppelte Worker und Websites ohne URL. Zusätzlich wurde eine vollständig zurückgerollte Datenbanktransaktion für Berichtsspeicherung, Nutzer-/Owner-Sichtbarkeit, doppelte Claims, alte Run-Tokens und die Kapazitätssperre ausgeführt.

Der Produktionsbuild einschließlich der Workflow-Bündel ist erfolgreich. Der vorhandene Windows-SWC-Standardcache hatte ungeeignete Zugriffsrechte; für den Build wurde temporär der dokumentierte Cache-Override `SWC_NATIVE_BINDING_CACHE=C:\Users\Betz\.cache\academy-fi-swc` verwendet. Bestehende Berechtigungen wurden nicht geändert. Die neu hinzugekommene verwundbare Nanoid-Abhängigkeit von Workflow wurde innerhalb derselben Hauptversion auf eine gepatchte Version eingeschränkt; übrige bestehende Paketwarnungen wurden nicht durch pauschale Updates verändert.

Ein lokaler Workflow wurde zusätzlich vollständig über den laufenden Entwicklungsserver gestartet und beendet. Er verwendete eine nicht existierende Prüf-ID und endete vor den Google-Providern; damit wurden Workflow-Start, Fortsetzung, Schritt-Aufruf und Abschluss ohne Google-Gebühren geprüft. Die temporäre Testroute wurde anschließend entfernt.

Zum Prüfzeitpunkt war `PAGESPEED_API_KEY` noch nicht konfiguriert; der Nutzer hinterlegt ihn lokal. Daher wurden weder eine echte Massenprüfung noch ein Vercel-Live-Lauf durchgeführt. Die Provider-Tests verwenden simulierte Antworten und verursachen keine Google-Gebühren.

Anbieterreferenzen: [PageSpeed API](https://developers.google.com/speed/docs/insights/v5/get-started), [PageSpeed-Parameter](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed), [Workflow mit Next.js](https://workflow-sdk.dev/docs/getting-started/next).

### Echter Live-Test am 20. Oktober 2026

Nach Hinterlegen des PageSpeed-Schlüssels und Serverneustart wurde die vorhandene einzelne Prüfung mit dem vorherigen Fehler `auditQuota` gezielt wiederholt. Der echte Worker erzeugte einen gespeicherten Bericht mit 85/100; der Bericht und die Firmendaten wurden anschließend im angemeldeten Browser verifiziert.

Zusätzlich wurde über die Oberfläche eine temporäre Kampagne mit Geroda / Würzburger Karl-Straub-Haus / 20 km / einem Treffer angelegt und per Play-Button gestartet. Google fand den bestehenden gespeicherten Lead. Ohne manuellen Analysestart wurde der Bericht neu erstellt und gespeichert: 83/100, Mobile 63, Desktop 90, SEO 100, Barrierefreiheit 96 und Best Practices 98. Im bereits geöffneten Detailfenster wechselte „Wird geprüft“ automatisch zum vollständigen Bericht. Die Abweichung zwischen den zwei realen Messungen ist eine normale Eigenschaft der Labormessung.

Die temporäre Kampagne und lokalen Diagnoseskripte wurden danach entfernt. Der zuvor gespeicherte Lead und sein neuester echter Bericht bleiben erhalten. Dies bestätigt den lokalen Ablauf mit echten Places-/PageSpeed-Antworten und Workflow-Fortsetzung, nicht eine Bereitstellung oder Prüfung auf Vercel.

### Farbige Bewertungen und gegliederte Lead-Details

Qualitätsbewertungen sind einheitlich eingefärbt: ab 70 grün („Gut“), 40–69 gelb („Mittel“), unter 40 rot („Schlecht“). Unbekannte oder fehlende Scores bleiben neutral. Diese Darstellung gilt für Tabellen-Badges, die Durchschnittsbewertung und alle Teilwerte im Bericht; Zahlen und Beschriftungen ergänzen die Farbe.

Die Lead-Details zeigen zuerst eine hervorgehobene Gesamtbewertung, anschließend Firmendaten, farbige Teilwert-Karten und den Bericht. Mobile und Desktop sind über zwei Buttons umschaltbar. Technische Prüfungen markieren Bestanden/Auffällig/Nicht gemessen in Grün/Rot/Neutral, einzelne Auffälligkeiten stehen in gelb akzentuierten Karten. Bewertungsmethode und Grenzen stehen zusammen am Ende. Der Dialog hat einen festen Kopf und einen separat scrollenden Inhalt; die schmale Ansicht wurde ohne horizontalen Überlauf sowie mit funktionierender Geräteumschaltung geprüft. Typprüfung und ESLint für die geänderten Komponenten sind erfolgreich. Die Umgestaltung ändert weder Messwerte noch Gewichte und startet keine neue Website-Analyse.
