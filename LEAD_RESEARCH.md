# Lead-Recherche

## Einrichtung

Serverseitig in `.env` bzw. den Hosting-Secrets konfigurieren und den Server neu starten:

```dotenv
GOOGLE_PLACES_API_KEY=...
PAGESPEED_API_KEY=...
# Für die KI-Designbewertung:
OPENAI_API_KEY=...
```

Places API (New), PageSpeed Insights API und die erforderliche Google-Abrechnung aktivieren. Auf Vercel die Workflow-Verarbeitung und Function-Laufzeit von 120 Sekunden sicherstellen.

## Nutzung

- Kampagne als Entwurf speichern und Google-Suche ausdrücklich starten. Neue Treffer werden automatisch auf Website-Qualität geprüft.
- Suchläufe und Website-Prüfungen lassen sich pausieren, fortsetzen und abbrechen. Bereits gestartete Anbieteranfragen können weiterhin Kosten verursachen; keine automatischen kostenpflichtigen Wiederholungen.
- „Behalten“ speichert einen Lead in der persönlichen Auswahl. Owner sehen alle Einträge, andere Nutzer ihre eigenen.
- Branche und Suchort werden beim Behalten am Lead gespeichert und bleiben nach Bearbeitung oder Löschung der Kampagne erhalten. Migration `20261029160000_preserve_saved_lead_context` ergänzt die Spalten und übernimmt bestehende Kampagnendaten. Bei bereits gelöschten Kampagnen können fehlende Werte nicht rekonstruiert werden.
- „An Studio Fi übertragen“ lädt alle sichtbaren und auf weiteren Seiten gespeicherten Leads als CSV herunter, ohne vorherige Auswahl. Bereits geladene Firmendaten werden wiederverwendet, fehlende Daten in Paketen von höchstens zehn über Google nachgeladen. Dabei werden keine Website-Prüfungen gestartet. Bei Anbieterfehlern bleiben alle Leads als Zeilen mit Place ID und vorhandenen Kampagnendaten erhalten; ein Hinweis nennt die Anzahl unvollständiger Leads. Die Datei kann anschließend auf studio-fi.com importiert werden.
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
