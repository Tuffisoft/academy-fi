# Lead-Recherche

## Einrichtung

Serverseitig in `.env` bzw. den Hosting-Secrets konfigurieren und den Server neu starten:

```dotenv
GOOGLE_PLACES_API_KEY=...
# Google-Stadtvorschläge abschalten (deutscher Katalog bleibt verfügbar):
GOOGLE_CITY_AUTOCOMPLETE_ENABLED=false
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

- Das Ortsfeld kombiniert den deutschen Städtekatalog mit Google-Places-Vorschlägen für weitere deutsche und internationale Städte. Freie Eingaben bleiben möglich. Google-Anfragen erfolgen nur bei geöffnetem Auswahlfeld ab drei Zeichen nach 350 ms Tipp-Pause; überholte Anfragen werden abgebrochen und es gibt keine automatischen Wiederholungen. `GOOGLE_CITY_AUTOCOMPLETE_ENABLED=false` schaltet alle Google-Stadtvorschläge serverseitig vollständig ab, ohne Unternehmensrecherche oder Katalog zu verändern. Nicht gesetzt oder `true` aktiviert sie. Nach Änderung den Server neu starten und den Dialog erneut öffnen. Autocomplete-Anfragen werden einzeln abgerechnet, da keine Place-Details-Sitzung für die Textauswahl nötig ist.

- Neue und bearbeitete Recherchen bieten „Speichern“ (Entwurf) und „Speichern & starten“. Nach erfolgreichem Start schließt sich der Dialog und zeigt die Recherche. Ist der Start wegen einer laufenden Recherche, Website-Analyse oder fehlender Konfiguration nicht möglich, bleibt der Entwurf gespeichert und ein Hinweis nennt den Grund. Neue Treffer werden automatisch auf Website-Qualität geprüft.
- Suchläufe und Website-Prüfungen lassen sich pausieren, fortsetzen und abbrechen. Bereits gestartete Anbieteranfragen können weiterhin Kosten verursachen; keine automatischen kostenpflichtigen Wiederholungen.
- „Behalten“ speichert einen Lead in der persönlichen Auswahl. Owner sehen alle Einträge, andere Nutzer ihre eigenen.
- Branche und Suchort werden beim Behalten am Lead gespeichert und bleiben nach Bearbeitung oder Löschung der Kampagne erhalten. Migration `20261029160000_preserve_saved_lead_context` ergänzt die Spalten und übernimmt bestehende Kampagnendaten. Bei bereits gelöschten Kampagnen können fehlende Werte nicht rekonstruiert werden.
- „An Studio Fi übertragen“ sendet alle gespeicherten Leads über Resend als CSV-Anhang an den festen Empfänger aus `LEAD_EXPORT_EMAIL_TO`. „CSV herunterladen“ bietet dieselben Spalten weiterhin als Download an. Empfänger und Versandkonfiguration werden ausschließlich serverseitig bestimmt; die Oberfläche zeigt den Empfänger. Nach Änderungen an `.env` den Server neu starten. Ohne vollständige E-Mail-Konfiguration bleibt der Download verfügbar und ein Einrichtungshinweis erscheint.
- Bereits geladene Firmendaten werden wiederverwendet, fehlende Daten in Paketen von höchstens zehn über Google nachgeladen. Dabei werden keine Website-Prüfungen gestartet. Bei Anbieterfehlern bleiben alle Leads als Zeilen mit Place ID und vorhandenen Kampagnendaten erhalten; ein Hinweis nennt die Anzahl unvollständiger Leads. Bei E-Mails enthält auch der Nachrichtentext diesen Hinweis.
- Der Versand prüft Anmeldung und Zugriffsrechte erneut und erstellt die CSV serverseitig mit den gespeicherten Kampagnendaten. Die Versandkennung bleibt bei Wiederholungen nach unklaren Fehlern gleich und nutzt Resends Idempotenzschutz (24 Stunden). Eine Erfolgsmeldung bestätigt die Annahme durch Resend, nicht die Zustellung im Postfach. Es werden keine automatischen Testmails oder Wiederholungen ausgelöst.
- Der Nachrichtentext begrüßt „Herr Fi“ und setzt Anzahl und Ersteller aus den exportierten Leads ein. Als Ersteller gelten die Personen, die die Leads gespeichert haben; bei mehreren Personen werden ihre Namen einmalig aufgelistet. Der Text wird als schlichtes HTML mit Absätzen und zusätzlich als Klartext versendet.
- CSV-Format: UTF-8 mit BOM, Semikolon als Trennzeichen, CRLF-Zeilenenden und Spalten Firma, Adresse, Website, Telefon, Branche, Suchort, Google Maps, Google Place ID, Betriebsstatus und Google-Sterne. Fehlende Messwerte bleiben leer, fehlender Betriebsstatus erscheint als „Unbekannt“; mögliche Tabellenformeln werden durch ein vorangestelltes Apostroph entschärft. Ein verbindliches Importformat für Studio Fi ist noch nicht vorgegeben.
- Firmendaten werden live geladen; erneutes Laden kann Google-Kosten verursachen. Dauerhaft gespeichert werden Place-IDs, interne Suchdaten und Prüfberichte, keine Google-Firmennamen, Adressen oder Telefonnummern.
- Qualität: 0–100, höher ist besser. Ladezeit zählt 30 %, SEO 10 %, Barrierefreiheit 10 %, Technik 20 % und KI-Design 30 %. Ohne KI-Designnote werden die vier PageSpeed-Gewichte proportional auf 100 % umgerechnet. Fehlende technische Werte lassen den Gesamtscore offen. Maximal sechs Websites werden parallel geprüft.
- Bei Gebietssuchen erscheint in Lead-Details und CSV „Alle Branchen“ statt des internen Suchkennzeichens `__area_search__`.
- Google Places liefert zusätzlich Betriebsstatus, Unternehmenskategorie und Sternebewertung. Die Kategorie wird bevorzugt als Branche in Details und CSV verwendet; bei fehlender Kategorie bleibt die Suchbranche der Ersatz. Betriebsstatus und Sterne werden in beiden Lead-Ansichten angezeigt und als zusätzliche CSV-Spalten exportiert, auch im E-Mail-Anhang.
- Suchergebnisse lassen sich nach Betriebsstatus und Mindeststernen filtern und nach Betriebsstatus oder Sternen sortieren. Fehlende Sterne werden als unbekannt behandelt und beim Sortieren zuletzt angezeigt. Die Bewertung der Website bleibt separat. Geschlossene und noch nicht eröffnete Betriebe erhalten den Prüfstatus `INACTIVE`; für sie starten keine PageSpeed- oder KI-Prüfungen. Unbekannter Betriebsstatus verhindert eine Prüfung nicht. Bei Gebietssuchen werden inaktive Betriebe nicht als bewertete Chancen empfohlen.
- Dauerhaft geschlossene Unternehmen bleiben ungeeignet. Niedrige oder unbekannte Google-Sterne führen zur manuellen Prüfung statt zum Ausschluss. Neue Website-Prüfungen laufen auch bei weniger als 3 Sternen; bestehende LOW_RATING-Prüfungen bleiben offen und werden nicht automatisch wiederholt. CSV- und E-Mail-Export bleiben unverändert.
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

- Bei einem Ort mit erkanntem Land außerhalb Deutschlands werden Katalogbranchen auf Englisch angeboten und ausgewählte Katalogbegriffe übersetzt. Deutsche Katalogorte und Ortsangaben mit Deutschland/Germany verwenden deutsche Branchen. Freie Branchen werden nicht verändert; bei einem Ort ohne erkennbares Land wird die Oberflächensprache verwendet. Zusätzliche Google-Vorschläge für deutsche Städte erscheinen nur, wenn die Stadt nicht im lokalen Katalog vorhanden ist.

## Website-Bedarf und Kontaktpriorität

- Alle Lead-Ansichten, Details, Analytics und Potenzialfilter verwenden dieselbe Einstufung: bestätigte fehlende Website oder gültiger Score unter 60 = hoher Bedarf; 60–79 = mittlerer Bedarf; ab 80 = geringer Bedarf. Fehlgeschlagene, abgebrochene und unvollständige Prüfungen sowie alte LOW_RATING-/INACTIVE-Einträge bleiben offen. Wartende, laufende und pausierte Prüfungen stehen unter Prüfung ausstehend. Der Website-Score und seine Gewichtung bleiben unverändert.
- Gruppierung erfolgt laufend vor der Seiteneinteilung: hoch, offen, mittel, gering, ausstehend. Fehlende Websites stehen innerhalb hoher Chancen zuerst. Bei Gebietssuchen belegen fehlende Websites reguläre Toplistenplätze; offene und laufende Kandidaten sind separat sichtbar.
- Kontaktpriorität ist unabhängig vom Bedarf: dauerhaft geschlossen = zurückstellen; unbekannter oder vorübergehend inaktiver Status, unbekannte/unter 3 Sterne, unklarer Bedarf oder fehlende Telefonnummer = manuell prüfen. Aktive Betriebe mit mindestens 3 Sternen und Telefonnummer werden bei hohem Bedarf zuerst, bei mittlerem danach kontaktiert; geringer Bedarf wird zurückgestellt. Solange Firmendaten nicht geladen sind, bleibt die Kontaktpriorität offen.
- Keine neue Datenhaltung und keine zusätzlichen Website-Scans. CSV, E-Mail-Anhänge und PDFs erhalten keine neuen Spalten. Tests: `node --import tsx --test tests/lead-assessment.test.ts`.
