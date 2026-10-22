# Verbindliche Qualitätsregeln für AcademyFi

Version 1.0 · 22.10.2026 · Gilt für Entwicklung, Review und Freigabe.

Diese Regeln gelten projektweit für neue und wesentlich geänderte Funktionen. Vorhandene Lücken werden in [QUALITAETSSTATUS.md](QUALITAETSSTATUS.md) erfasst und schrittweise geschlossen. Ein vorhandener Fehler erlaubt keinen zusätzlichen Fehler. Sicherheitskritische Bestandslücken müssen vor der Öffnung für externe Kunden geschlossen sein.

Für das Wallet-Stempelkarten-SaaS gelten zusätzlich [Lastenheft](LASTENHEFT_STEMPELKARTEN.md) und [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md). Das Lastenheft bestimmt das fachliche Verhalten, das Pflichtenheft dessen technische Umsetzung. Dieses Regelwerk reduziert keine Muss-Anforderung und erweitert nicht stillschweigend den Produktumfang. Widersprüche werden vor der betroffenen Umsetzung geklärt und versioniert.

## 1. Regeln und Nachweise

**Übernahmesperre** bedeutet: Die Änderung darf erst nach Erfüllung oder einer zulässigen, ausdrücklich dokumentierten Ausnahme übernommen werden. **Freigabesperre** bedeutet: Der betroffene Produktstand darf nicht produktiv freigegeben werden. Vorbereitung und isolierte Tests bleiben möglich. Nicht betroffene Arbeiten dürfen fortgesetzt werden.

### Produktqualität und Funktionalität

| ID | Geltung | Verbindliche Regel | Nachweis | Folge bei Nichterfüllung |
| --- | --- | --- | --- | --- |
| Q-P-01 | Neue/geänderte Funktionen | Vor Implementierung sind Verhalten, berechtigte Rollen, Erfolgsfall und relevante Fehlerfälle beschrieben. SaaS-Änderungen nennen betroffene LF-, T- und AK-Kennungen. | Aufgabenbeschreibung oder PR mit überprüfbaren Kriterien. | Übernahmesperre. |
| Q-P-02 | Schreibende Abläufe | Erfolg setzt bestätigte Speicherung voraus. Bei unklarem Netzwerkergebnis wird kein Erfolg behauptet; Wiederholung verwendet dieselbe Vorgangskennung. | Verhaltenstest und Prüfung der betroffenen Oberfläche. | Übernahme-/Freigabesperre bei falscher Erfolgsanzeige. |
| Q-P-03 | Neue/wesentlich geänderte Web-Oberflächen | Kernabläufe ab 360 CSS-Pixeln ohne horizontales Scrollen, mit Tastatur, sichtbarem Fokus, Labels, verständlichen Fehlern und Statusinformationen unabhängig von Farbe bedienen. Breite Datentabellen dürfen innerhalb eines beschrifteten Bereichs scrollen. | Dokumentierter mobiler und Tastatur-Durchlauf; Lade-, Leer-, Fehler- und Erfolgszustände prüfen. | Fehlende Bedienbarkeit blockiert; kleine optische Mängel nach Abschnitt 2. |
| Q-P-04 | SaaS-Kernabläufe und E-Mails | Deutsch und Englisch vollständig anbieten; Sprache verändert keine Geschäftsregel. | Durchlauf beider Sprachen einschließlich Fehlerzuständen und Mailinhalt. | Freigabesperre. |
| Q-P-05 | Jede Änderung | Betroffene bestehende Academy-Abläufe bleiben nutzbar. Die Regressionsauswahl wird begründet. | Automatisierte Tests und gegebenenfalls gezielter manueller Durchlauf. | Übernahmesperre bei neuer Regression. |
| Q-P-06 | Aufgaben und Releases | Implementiert, automatisiert geprüft, auf Geräten abgenommen und produktiv freigegeben sind getrennte Zustände. Kein Zustand wird ohne Beleg als erledigt markiert. | [Freigabecheckliste](FREIGABECHECKLISTE.md) mit Softwarestand und Ergebnissen. | Fehlender Nachweis gilt als offen. |

### Codequalität und Sicherheit

| ID | Geltung | Verbindliche Regel | Nachweis | Folge bei Nichterfüllung |
| --- | --- | --- | --- | --- |
| Q-C-01 | Neue/geänderte Fachlogik | Fachregeln in gemeinsamen serverseitigen Services halten; Seiten, APIs, Server Actions und Jobs verwenden dieselben Regeln. UI enthält keine eigene verbindliche Buchungs-, Tarif- oder Berechtigungslogik. | Code-Review der Aufrufwege. | Übernahmesperre. |
| Q-C-02 | Systemgrenzen | Externe Eingaben serverseitig validieren; Aktion und Ressourcenzugehörigkeit autorisieren. Clientrollen, versteckte Buttons und Ressourcenauswahl begründen keine Rechte. | Negativtests für fremde Kennungen, ungültige Eingaben, Rollen und entzogene Rechte. | Übernahme-/Freigabesperre bei unberechtigtem Zugriff. |
| Q-C-03 | TypeScript und Prüfkonfiguration | Strict Mode erhalten. Neues `any`, Typumgehungen und deaktivierte Prüfregeln nur mit konkreter lokaler Begründung; externe unbekannte Daten vor Verwendung eingrenzen. Keine Prüfregel zur Verschleierung eines Fehlers abschalten. | Typecheck und Review; Ausnahmen mit Grund und gegebenenfalls Nachbesserung. | Übernahmesperre. |
| Q-C-04 | Jede Änderung | Änderungen auf die Aufgabe begrenzen; bestehende geeignete Komponenten/Muster verwenden. Neue Abhängigkeiten nach Nutzen, Kompatibilität, Lizenz und Wartbarkeit prüfen und per Lockfile festhalten. Kein allgemeines Stack-Upgrade nebenbei. | Begründeter Diff und Abhängigkeitsprüfung. | Übernahmesperre. |
| Q-C-05 | Fehler und Geheimnisse | Fehler gezielt behandeln oder weitergeben. Keine leeren Catch-Blöcke ohne Begründung, vorgetäuschten Erfolge, Geheimnisse im Repository/Browser oder sensiblen Rohdaten in Logs. | Review, negative Fehlerfälle und Prüfung betroffener Logs/Ausgaben. | Übernahmesperre; bei Geheimnisoffenlegung auch Freigabesperre. |
| Q-C-06 | Jede Änderung | Dokumentiertes Code-Review mit Prüfer, Softwarestand, Befunden und deren Erledigung. Ein Mensch oder Agent kann prüfen; ein Testlauf allein ist kein Review. | PR-Review oder versionierter Revieweintrag. | Übernahmesperre. |
| Q-C-07 | Rollen, Buchungen, Billing, Löschung, Migrationen | Zusätzlich ausdrückliche Freigabe des Auftraggebers vor Übernahme/Merge beziehungsweise produktiver Anwendung einholen. Änderungen vorher konkret vorbereiten und isoliert prüfen. | Freigabe mit Bezug auf den geprüften Stand und Umfang. | Übernahme-/Anwendungssperre ohne diese Freigabe. |
| Q-C-08 | Anforderungsänderungen | Geschäftsregeländerungen zuerst beschreiben und Lastenheft, Pflichtenheft, Testzuordnung und Versionshistorie konsistent aktualisieren. Technische Änderungen pflegen betroffene technische Vorgaben. | Review der verknüpften Anforderungen und Dokumente. | Übernahmesperre. |

### Tests, SaaS-Integrität und Betrieb

| ID | Geltung | Verbindliche Regel | Nachweis | Folge bei Nichterfüllung |
| --- | --- | --- | --- | --- |
| Q-T-01 | Jede Änderung | Lint, Typecheck, Unit-/Verhaltenstests und isolierter Produktionsbuild müssen bestehen. Fehlende Dateien, übersprungene Prüfungen und nur gestartete Prozesse sind kein Erfolg. | `npm run check` oder die identischen vier Einzelbefehle; CI-Ergebnisse. | Übernahmesperre für neue Fehler; Bestandsfehler nach Abschnitt 2. |
| Q-T-02 | Tests | Nach Verhalten und Risiko prüfen, ohne pauschale Coverage-Quote. Fachregeln erhalten Verhaltenstests, Berechtigungen Negativtests; Transaktionen, Constraints, Limits und Parallelität echte Datenbanktests. | Tests mit aussagekräftigen Erwartungen. Reine Mocks sind kein Nachweis für DB-Integrität. | Fehlender notwendiger Nachweis blockiert die betroffene Freigabe. |
| Q-T-03 | Prüfungsumgebung | Keine produktiven Daten/Zugänge verwenden. Testdatenbanken und Anbieter-Testzugänge ausdrücklich getrennt konfigurieren; fehlende Voraussetzungen ergeben einen fehlgeschlagenen/offenen Lauf. | Testkonfiguration ohne Geheimnisse, Testumgebung und Ergebnis. | Testlauf abbrechen; kein erfolgreicher Ersatz durch Skip. |
| Q-S-01 | Stempelkarten-SaaS | Academy, Unternehmen und Endkunden serverseitig trennen. Fremde Mandantenkennungen und Rollenmanipulation dürfen keinen Zugriff erlauben. | LF-F-01–04, LF-N-01–02; T-01/T-02 und direkte API-/Action-Negativtests. | Übernahme-/Freigabesperre. |
| Q-S-02 | SaaS-Buchungen und Limits | Datenbank bleibt Wahrheit. Stempel, Belohnung, Einlösung, Limits und Outbox atomar und idempotent verarbeiten. Anfragen mit gleichem Schlüssel und anderem Inhalt ablehnen. | T-10/T-11/T-13: mindestens 20 parallele Wiederholungen sowie unabhängige konkurrierende Vorgänge. | Übernahme-/Freigabesperre. |
| Q-S-03 | SaaS-Lebenszyklus und Abrechnung | Kartenidentität, unveränderliche Sammelbedingungen, Mitarbeiterbestätigung, Recovery, Tarifwechsel und Bestandskartenschutz gemäß Heften umsetzen. Browserredirect ist kein Zahlungsnachweis. | Zugeordnete T-03–14 und AK-03–14 einschließlich Ablauf, Replay, Webhook-Reihenfolge und Grenzwerten. | Unerfüllte Muss-Anforderung blockiert. |
| Q-S-04 | Wallets und Hintergrundaufträge | Bestätigte Buchungen überstehen Provider-/Prozessausfälle. Wiederanlauf verliert keine Arbeit und schreibt keinen alten Endstand zurück. Wallet-Status beschreibt Bereitstellung, nicht garantierte Anzeige auf einem Offline-Gerät. | T-05–07/T-15; reale iPhone-/Android-Abnahme, Absturz- und Wiederanlauftests. | Freigabesperre; Mocks ersetzen keine Geräteabnahme. |
| Q-O-01 | Änderungen an Betrieb/Daten und SaaS-Launch | Getrennte Umgebungen, kontrollierte Migrationen, Datensicherung und erprobte Wiederherstellung inklusive Jobs und wirksamer Widerrufe vorweisen. Nach echten Buchungen kein pauschaler Datenbankreset als Rollback. | T-18, Betriebsanleitung und Wiederherstellungsprotokoll in getrennter Umgebung. | Betroffene Betriebs-/Launch-Freigabe blockiert. |
| Q-O-02 | SaaS-Launch | Monitoring für Job-/Webhook-Rückstände, dauerhafte Fehler, Zahlungsprobleme und Zertifikate sowie erforderliche Anbieter-, Länder- und Betriebsfreigaben nach Pflichtenheft nachweisen. | Getestete Alarmbedingungen und verlinkte Freigaben; keine Geheimnisse im Protokoll. | Launch blockiert. |
| Q-O-03 | Pilot und Leistungszusagen | Antwortzeiten, Wallet-Verzögerung und Kosten mit Umgebung und Messverfahren dokumentieren. Erst danach feste Leistungsziele vereinbaren; keine unbelegten SLA-/Zustellzusagen. | Pilotmessungen und ausdrückliche Vereinbarung zusätzlicher Ziele. | Unbelegte Zusage darf nicht veröffentlicht werden. |

## 2. Mängel, Altlasten und Ausnahmen

- Sicherheitsprobleme, Datenverlust, falsche Buchungen/Abrechnung und unerfüllte Muss-Anforderungen sind Freigabeblocker. Ein Termin oder grüner Teiltest hebt sie nicht auf. Eine Änderung der Muss-Anforderungen erfordert das reguläre Änderungsverfahren.
- Kleine Darstellungsfehler dürfen nur mit dokumentierter Entscheidung des Auftraggebers und Nachbesserungsaufgabe verbleiben. Nicht bedienbare Kernabläufe zählen nicht als kleine Darstellungsfehler.
- Bestandslücken erhalten eine stabile `QL-`-Kennung, Auswirkung, Verantwortlichkeit, Nachweis, Status und Erledigungskriterium. Unbetroffene Arbeit darf weitergehen; die betreffende fehlgeschlagene Prüfung bleibt sichtbar rot.
- Eine befristete Ausnahme benennt Regel, konkreten Umfang, Grund, Risiko, verantwortliche Person, genehmigende Person und Ablaufdatum oder eindeutig überprüfbares Erledigungskriterium. Ohne ausgefüllte Genehmigung ist sie nicht erteilt. Ein offener Eintrag allein ist keine Ausnahme.
- Tests nicht entfernen, Erwartungen nicht an einen unbegründeten Istzustand anpassen und CI nicht mit `continue-on-error`, `|| true` oder pauschalen Ausschlüssen grün machen. Neue Fehler dürfen nicht als Altlast eingestuft werden.

## 3. Prüfablauf und Freigabe

Node.js 24, npm und das versionierte Lockfile verwenden. `npm ci` benötigt für die Prisma-Konfiguration eine `DATABASE_URL`; in einer reinen Prüfumgebung die Dummy-URL aus dem CI-Workflow setzen. Installation generiert den Prisma-Client, wendet aber keine Migration an.

```sh
npm run lint
npm run typecheck
npm test
npm run check:build
# Alle vier Schritte, auch bei einem fehlgeschlagenen Teilschritt:
npm run check
```

`npm test` enthält die wiederhergestellte explizite Testliste und die Tests der Prüfumgebungs-Isolation. Neue Unit-Testdateien werden in diesen Befehl aufgenommen. `check:build` ruft den unveränderten Produktionsbuild `npm run build` mit Dummy-Datenbank und isolierten Anbieterzugängen auf. Normales `npm run build` bleibt der Deployment-Befehl. Lokale `.env*`-Werte werden für Unit-/Build-Prüfungen überschrieben; die Elternumgebung und Dateien bleiben unverändert.

Datenbanktests verwenden die bestehenden Neon/PostgreSQL-Dienste und benötigen eine separate entbehrliche, mit den bestehenden Migrationen vorbereitete Testdatenbank. `ACADEMYFI_DATABASE_TEST=1` und `CHAT_TEST_DATABASE_URL` ausschließlich für den Testprozess setzen, dann `npm run test:integration` aufrufen. Die URL darf keiner bekannten normalen Anwendungsdatenbank entsprechen. Keine automatische Migration oder Seed-Ausführung gegen eine unbekannte Datenbank.

Der echte Ably-Test benötigt `ACADEMYFI_REALTIME_TEST=1` und `ABLY_TEST_API_KEY` aus einer separaten Test-App; Aufruf `npm run test:realtime`. Er verwendet keine normalen App-Zugänge. URL-/Schlüsselvergleiche sind zusätzliche Schutzprüfungen, kein Beweis, dass ein unbekannter Zugang wirklich zur Testumgebung gehört. Diese Zuordnung bestätigt der Ausführende.

GitHub Actions führt die vier Prüfungen unabhängig bei Pull Requests und Pushes auf `master` aus. Keine produktiven Secrets sind erforderlich. Die Checks müssen im Repository-Ruleset als erforderlich eingerichtet werden, damit GitHub einen Merge technisch sperrt; das Workflowfile allein aktiviert diesen Schutz nicht. Relevante Integrationstests, Geräte- und Betriebsnachweise bleiben zusätzliche Freigabekriterien und werden nicht durch diese vier Checks ersetzt.

Jede Freigabe nutzt eine ausgefüllte Kopie der [Freigabecheckliste](FREIGABECHECKLISTE.md) mit eindeutiger Standkennung. SaaS Release 1.0 verlangt sämtliche AK-01 bis AK-18 und die externen Voraussetzungen. Pilot, Teilpaket und vollständige Produktabnahme werden ausdrücklich unterschieden.

## 4. Pflege

Anforderungskennungen bleiben stabil. Geänderte Regeln erhalten eine neue Dokumentversion, Datum und nachvollziehbare Begründung; alte Kennungen werden nicht für andere Inhalte wiederverwendet. Dokumente liegen im Repository-Hauptverzeichnis, weil `docs/` derzeit ignoriert wird.

| Version | Datum | Änderung |
| --- | --- | --- |
| 1.0 | 22.10.2026 | Gemeinsam vereinbarte projektweite Regeln, SaaS-Nachweise, Prüfschranken und Freigabeverfahren eingeführt. |
