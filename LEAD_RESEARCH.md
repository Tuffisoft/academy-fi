# Lead-Recherche

## Einrichtung

Serverseitig in `.env` bzw. den Hosting-Secrets konfigurieren und den Server neu starten:

```dotenv
GOOGLE_PLACES_API_KEY=...
PAGESPEED_API_KEY=...
# Für die KI-Designbewertung:
OPENAI_API_KEY=...
# Fester Empfänger für „An Studio Fi übertragen“:
LEAD_EXPORT_EMAIL_TO=chef@example.com
# Bestehende Resend-Konfiguration (RESEND_API_KEY alternativ zu RESEND_KEY):
RESEND_KEY=...
RESEND_FROM_EMAIL=Academy Fi <leads@your-verified-domain.com>
```

Places API (New), PageSpeed Insights API und die erforderliche Google-Abrechnung aktivieren. Auf Vercel die Workflow-Verarbeitung und Function-Laufzeit von 120 Sekunden sicherstellen.

## Nutzung

- Kampagne als Entwurf speichern und Google-Suche ausdrücklich starten. Neue Treffer werden automatisch auf Website-Qualität geprüft.
- Suchläufe und Website-Prüfungen lassen sich pausieren, fortsetzen und abbrechen. Bereits gestartete Anbieteranfragen können weiterhin Kosten verursachen; keine automatischen kostenpflichtigen Wiederholungen.
- „Behalten“ speichert einen Lead in der persönlichen Auswahl. Owner sehen alle Einträge, andere Nutzer ihre eigenen.
- Branche und Suchort werden beim Behalten am Lead gespeichert und bleiben nach Bearbeitung oder Löschung der Kampagne erhalten. Migration `20261029160000_preserve_saved_lead_context` ergänzt die Spalten und übernimmt bestehende Kampagnendaten. Bei bereits gelöschten Kampagnen können fehlende Werte nicht rekonstruiert werden.
- „An Studio Fi übertragen“ sendet alle gespeicherten Leads über Resend als CSV-Anhang an den festen Empfänger aus `LEAD_EXPORT_EMAIL_TO`. „CSV herunterladen“ bietet dieselben Spalten weiterhin als Download an. Empfänger und Versandkonfiguration werden ausschließlich serverseitig bestimmt; die Oberfläche zeigt den Empfänger. Nach Änderungen an `.env` den Server neu starten. Ohne vollständige E-Mail-Konfiguration bleibt der Download verfügbar und ein Einrichtungshinweis erscheint.
- Bereits geladene Firmendaten werden wiederverwendet, fehlende Daten in Paketen von höchstens zehn über Google nachgeladen. Dabei werden keine Website-Prüfungen gestartet. Bei Anbieterfehlern bleiben alle Leads als Zeilen mit Place ID und vorhandenen Kampagnendaten erhalten; ein Hinweis nennt die Anzahl unvollständiger Leads. Bei E-Mails enthält auch der Nachrichtentext diesen Hinweis.
- Der Versand prüft Anmeldung und Zugriffsrechte erneut und erstellt die CSV serverseitig mit den gespeicherten Kampagnendaten. Die Versandkennung bleibt bei Wiederholungen nach unklaren Fehlern gleich und nutzt Resends Idempotenzschutz (24 Stunden). Eine Erfolgsmeldung bestätigt die Annahme durch Resend, nicht die Zustellung im Postfach. Es werden keine automatischen Testmails oder Wiederholungen ausgelöst.
- Der Nachrichtentext begrüßt „Herr Fi“ und setzt Anzahl und Ersteller aus den exportierten Leads ein. Als Ersteller gelten die Personen, die die Leads gespeichert haben; bei mehreren Personen werden ihre Namen einmalig aufgelistet. Der Text wird als schlichtes HTML mit Absätzen und zusätzlich als Klartext versendet.
- CSV-Format: UTF-8 mit BOM, Semikolon als Trennzeichen, CRLF-Zeilenenden und Spalten Firma, Adresse, Website, Telefon, Branche, Suchort, Google Maps und Google Place ID. Fehlende Werte bleiben leer; mögliche Tabellenformeln werden durch ein vorangestelltes Apostroph entschärft. Ein verbindliches Importformat für Studio Fi ist noch nicht vorgegeben.
- Firmendaten werden live geladen; erneutes Laden kann Google-Kosten verursachen. Dauerhaft gespeichert werden Place-IDs, interne Suchdaten und Prüfberichte, keine Google-Firmennamen, Adressen oder Telefonnummern.
- Qualität: 0–100, höher ist besser. Ladezeit zählt 30 %, SEO 10 %, Barrierefreiheit 10 %, Technik 20 % und KI-Design 30 %. Ohne KI-Designnote werden die vier PageSpeed-Gewichte proportional auf 100 % umgerechnet. Fehlende technische Werte lassen den Gesamtscore offen. Maximal sechs Websites werden parallel geprüft.
- Bei Gebietssuchen erscheint in Lead-Details und CSV „Alle Branchen“ statt des internen Suchkennzeichens `__area_search__`.
- PDF-Vorlagen unter „PDF-Design“ bearbeiten, speichern und ausdrücklich als Live-Design aktivieren. PDF-Downloads verwenden vorhandene Berichte ohne neue Anbieterprüfung.

## Datenbank und Prüfungen

Die ältere Migrationshistorie der bestehenden Datenbank weicht vom Repository ab. Vor `prisma migrate deploy` zuerst abgleichen; bereits gezielt angewendete Migrationen nicht erneut ausführen.

```bash
npm run db:validate
npm run lint
npm run typecheck
npm test
```

Weitere Details zu Bewertung und PDF-Design: [README](README.md).
