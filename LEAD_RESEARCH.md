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
- Firmendaten werden live geladen; erneutes Laden kann Google-Kosten verursachen. Dauerhaft gespeichert werden Place-IDs, interne Suchdaten und Prüfberichte, keine Google-Firmennamen, Adressen oder Telefonnummern.
- Qualität: 0–100, höher ist besser. Ladezeit, SEO, Barrierefreiheit, Technik und KI-Design zählen je 20 %. Fehlende Teilwerte lassen den Gesamtscore offen. Maximal sechs Websites werden parallel geprüft.
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
