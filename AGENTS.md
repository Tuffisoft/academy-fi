# AcademyFi: Arbeitsregeln, Qualität und Status

Version 1.5 · 23.10.2026. Vor Änderungen diese Datei lesen. Gilt projektweit; bestehende Fehler erlauben keine neuen. Bei Stempelkarten zusätzlich [Lastenheft](src/lib/docs/LASTENHEFT_STEMPELKARTEN.md) (Fachverhalten) und [Pflichtenheft](src/lib/docs/PFLICHTENHEFT_STEMPELKARTEN.md) (Technik) lesen. Deren Muss-Anforderungen bleiben vollständig verbindlich; Widersprüche vor Umsetzung klären und versionieren.

## Verbindliche Regeln

Regelverletzungen sperren die betroffene Übernahme, bis sie behoben oder zulässig ausdrücklich ausgenommen sind. Sicherheitsprobleme, Datenverlust, falsche Buchungen/Abrechnung und unerfüllte Muss-Anforderungen sperren die betroffene Produktfreigabe. Fehlende Nachweise bleiben offen. Reversible Vorbereitung, isolierte Tests und unbetroffene Arbeiten dürfen weitergehen.

### Produkt

- **Q-P-01:** Vor Implementierung Verhalten, erlaubte Rollen, Erfolgs-/Fehlerfälle und überprüfbare Kriterien beschreiben; beim SaaS LF-/T-/AK-Kennungen nennen.
- **Q-P-02:** Schreiberfolg erst nach bestätigter Speicherung anzeigen. Bei unklarem Netzwerkergebnis dieselbe Vorgangskennung wiederverwenden; Verhalten und UI prüfen. Falsche Erfolgsanzeige sperrt Übernahme und Freigabe.
- **Q-P-03:** Neue/wesentlich geänderte Kernoberflächen ab 360 CSS-Pixeln ohne horizontales Scrollen, per Tastatur, mit Fokus, Labels, verständlichen Fehlern und farbunabhängigen Statusangaben bedienen. Breite Tabellen dürfen in beschrifteten Bereichen scrollen. Mobile/Tastatur-Durchläufe sowie Lade-, Leer-, Fehler-/Erfolgszustände dokumentieren. Nicht bedienbare Kernabläufe blockieren.
- **Q-P-04:** SaaS-Kernabläufe und E-Mails vollständig DE/EN einschließlich Fehlern prüfen; Sprache ändert keine Fachregel. Fehlender Nachweis sperrt Freigabe.
- **Q-P-05:** Betroffene Academy-Abläufe durch begründete automatisierte und nötigenfalls manuelle Regression prüfen; neue Regressionen sperren Übernahme.
- **Q-P-06:** Implementiert, automatisiert geprüft, auf Geräten abgenommen und produktiv freigegeben getrennt mit Stand/Belegen in einer ausgefüllten [Freigabecheckliste](src/lib/docs/FREIGABECHECKLISTE.md) ausweisen. Pilot/Teilpaket ist keine vollständige Abnahme.

### Code und Sicherheit

- **Q-C-01:** Gemeinsame serverseitige Fachservices für Seiten, APIs, Actions und Jobs; keine verbindliche Buchungs-, Tarif- oder Berechtigungslogik in der UI. Aufrufwege reviewen.
- **Q-C-02:** Eingaben serverseitig validieren; Aktion und Ressourcenzugehörigkeit autorisieren. Clientrollen/versteckte Buttons gewähren keine Rechte. Fremde IDs, ungültige Eingaben, manipulierte Rollen und entzogene Rechte negativ testen. Unberechtigter Zugriff sperrt Übernahme/Freigabe.
- **Q-C-03:** Strict Mode erhalten; neues any, Typumgehungen oder deaktivierte Regeln nur lokal konkret begründet. Unbekannte externe Daten eingrenzen. Keine Prüfregel zur Fehlerverdeckung abschalten; Typecheck und Review nachweisen.
- **Q-C-04:** Nur aufgabenbezogen ändern, geeignete vorhandene Muster nutzen. Abhängigkeiten nach Nutzen, Kompatibilität, Lizenz und Wartbarkeit prüfen und im npm-Lockfile festhalten; kein beiläufiges Stack-Upgrade.
- **Q-C-05:** Fehler gezielt behandeln/weitergeben; keine unbegründet leeren Catch-Blöcke, Scheinerfolge, Secrets in Repository/Browser oder sensiblen Rohdaten in Logs. Fehlerfälle und Ausgaben prüfen. Geheimnisoffenlegung sperrt auch Freigabe.
- **Q-C-06:** Jede Änderung braucht dokumentiertes Menschen-/Agentenreview mit Prüfer, Stand, Befunden und Erledigung; Tests ersetzen kein Review.
- **Q-C-07:** Rollen, Buchungen, Billing, Löschung und Migrationen konkret reversibel vorbereiten und isoliert testen. Ausdrückliche Auftraggeberfreigabe für Stand/Umfang vor Übernahme/Merge bzw. produktiver Anwendung nachweisen. Nicht erneut vor reversibler Vorbereitung um Erlaubnis bitten.
- **Q-C-08:** Geschäftsregeländerungen zuerst beschreiben und beide Hefte, Testzuordnung und Versionshistorie konsistent pflegen. Technische Änderungen aktualisieren betroffene technische Vorgaben. Kennungen bleiben stabil und werden nicht umgewidmet.

### Tests, SaaS und Betrieb

- **Q-T-01:** Bei Software-/Konfigurationsänderungen vor Abschluss alle vier Checks ausführen; neue Fehler sperren Übernahme. Nur für reine Dokumentation gilt der Prüfweg unten. Fehlende Dateien, Skips oder gestartete Prozesse sind kein Erfolg.
- **Q-T-02:** Verhalten/ Risiko statt pauschaler Coverage prüfen: Verhaltenstests für Fachregeln, Negativtests für Rechte, echte DB-Tests für Transaktionen, Constraints, Limits und Parallelität. Mocks belegen keine DB-Integrität; fehlende notwendige Nachweise sperren Freigabe.
- **Q-T-03:** Keine produktiven Daten/Zugänge für Tests. Ausdrücklich getrennte Testumgebungen verwenden; fehlende/unsichere Konfiguration bricht ab und bleibt fehlgeschlagen/offen, kein Skip-Erfolg. Keine produktiven Migrationen/Seeds zur Verifikation.
- **Q-S-01:** Academy, Unternehmen und Endkunden serverseitig trennen; fremde Mandanten/ Rollenmanipulation abweisen. Nachweis: LF-F-01–04, LF-N-01–02, T-01/T-02 einschließlich direkter API-/Action-Negativtests. Übernahme-/Freigabesperre bei Verletzung.
- **Q-S-02:** DB ist Wahrheit: Stempel, Belohnung, Einlösung, Limits und Outbox atomar/idempotent; gleicher Schlüssel mit anderem Inhalt scheitert. T-10/T-11/T-13 mit mindestens 20 parallelen Wiederholungen und unabhängigen konkurrierenden Vorgängen nachweisen. Übernahme-/Freigabesperre bei Verletzung.
- **Q-S-03:** Kartenidentität, unveränderliche Sammelbedingungen, Mitarbeiterbestätigung, Recovery, Tarifwechsel und Bestandskartenschutz gemäß Heften; Browserredirect ist kein Zahlungsnachweis. T-/AK-03–14 einschließlich Ablauf, Replay, Webhook-Reihenfolge und Grenzen nachweisen.
- **Q-S-04:** Bestätigte Buchungen überstehen Provider-/Prozessausfälle. Wiederanlauf verliert keine Arbeit und überschreibt keinen neueren Stand. Walletstatus beschreibt Bereitstellung, keine garantierte Offline-Anzeige. T-05–07/T-15 mit realem iPhone/Android und Absturz-/Wiederanlauftests; Mocks ersetzen keine Geräteabnahme. Fehlender Nachweis sperrt Freigabe.
- **Q-O-01:** Während der Bauphase Migrationen additiv, kontrolliert und reversibel vorbereiten, auf einer getrennten Testdatenbank prüfen und erhaltenswerte Bestandsdaten schützen; Anwendung nur mit ausdrücklicher Auftraggeberfreigabe für den Umfang. Zentrale Sicherung, Zuständigkeit/Aufbewahrung, Wiederherstellungspunkt, separate Restore-Datenbank sowie erprobte Wiederherstellung einschließlich Jobs und wirksamer Widerrufe werden nach dem Bau und zwingend vor Livegang eingerichtet und nachgewiesen (T-18, Betriebsanleitung, Testprotokoll). Nach echten Buchungen kein pauschaler DB-Reset als Rollback. Fehlende Sicherungs-/Restorenachweise sperren die Betriebs-/Launchfreigabe, nicht die autorisierte additive Entwicklungsmigration in der Bauphase.
- **Q-O-02:** Vor Launch Monitoring/Alarmtests für Job-/Webhook-Rückstände, dauerhafte Fehler, Zahlungen und Zertifikate sowie Anbieter-, Länder- und Betriebsfreigaben gemäß Pflichtenheft nachweisen; keine Secrets in Protokollen.
- **Q-O-03:** Antwortzeit, Walletverzögerung und Kosten mit Umgebung/Methode im Pilot messen. Feste Ziele erst danach ausdrücklich vereinbaren; keine unbelegten SLA-/Zustellzusagen veröffentlichen.

### Mängel und Ausnahmen

- Bestandslücken mit stabiler QL-ID, Status, Auswirkung, Verantwortlichkeit, Nachweis und Erledigungskriterium dokumentieren. Fehlgeschlagene Checks bleiben rot; neue Fehler sind keine Altlasten.
- Keine Tests entfernen, unbegründet Erwartungen anpassen oder CI durch continue-on-error, || true bzw. pauschale Ausschlüsse grün machen.
- Kleine Darstellungsfehler nur mit dokumentierter Auftraggeberentscheidung und Nachbesserungsaufgabe belassen; unbedienbare Kernabläufe zählen nicht dazu.
- Befristete Ausnahmen brauchen Regel, Umfang, Grund, Risiko, Verantwortlichen, ausdrückliche Genehmigung und Ablauf/prüfbares Erledigungskriterium. Ein offener Eintrag ist keine Ausnahme; Muss-Anforderungen nur über das reguläre Änderungsverfahren ändern.

## Prüfablauf

**Nur Dokumentation:** Ausschließlich nicht ausgeführte Markdown-Inhalte, keine Änderung an Software, Konfiguration, Abhängigkeiten, Schema, ausführbaren Anweisungen mit Laufzeitwirkung oder generierten Produktinhalten. Gesamten Diff einschließlich ungetrackter Dateien prüfen; bei gemischtem/unklarem Umfang Softwareprüfweg verwenden. Links/Anker, Markdown-Struktur, Kennungen, Abhängigkeiten und inhaltliche Konsistenz prüfen, git diff --check sowie dokumentiertes Review durchführen; neue Dateien direkt mitprüfen. Softwarechecks als „nicht anwendbar – reine Dokumentation“ begründen, niemals als bestanden. Software-/Produktfreigaben und rote Bestandschecks bleiben unberührt. CI wird dadurch nicht automatisch umgestellt.

**Software:** Node.js 24, npm und versioniertes Lockfile nutzen. npm ci braucht DATABASE_URL: in reiner Prüfumgebung die Dummy-URL aus .github/workflows/quality.yml setzen. Installation generiert Prisma, migriert nicht.

`npm run check` führt auch bei Einzelfehlern alle vier Schritte aus: `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:build`. Alternativ alle vier einzeln ausführen. Neue Unit-Testdateien in die explizite npm-Testliste aufnehmen. Typecheck generiert Next.js-Routentypen. check:build ruft npm run build mit Dummy-DB/isolierten Providerwerten auf (Windows-SWC-Cache: .swc/native); Deployment weiter über npm run build. Isolation überschreibt lokale .env*-Werte im Kindprozess, nicht Dateien/Elternumgebung.

Echte Integrationstests separat:

- DB: entbehrliche separate, mit bestehenden Migrationen vorbereitete Neon/PostgreSQL-Testdatenbank; nur im Testprozess ACADEMYFI_DATABASE_TEST=1 und CHAT_TEST_DATABASE_URL setzen, dann `npm run test:integration`. Keine bekannte normale App-DB; keine automatische Migration/Seeds gegen unbekannte DBs.
- Stempelkarten separat: LOYALTY_TEST_DATABASE_URL und ACADEMYFI_DATABASE_TEST=1 nur im Testprozess, dann `npm run test:loyalty:integration -- tests/loyalty/<name>.integration.test.ts`. Gleiche DB-Sicherheitsregeln; kein Fallback auf Chat-/App-DB. Noch keine Loyalty-DB-Fachtests vorhanden.
- Ably: separate Test-App, ACADEMYFI_REALTIME_TEST=1 und ABLY_TEST_API_KEY; `npm run test:realtime`. Keine normalen App-Zugänge. Ausführender bestätigt die Testzuordnung; URL-/Schlüsselvergleiche allein beweisen sie nicht.

CI führt vier unabhängige Jobs für PRs und Pushes auf master ohne Produktionssecrets aus. Im GitHub-Ruleset müssen Quality (lint), Quality (typecheck), Quality (test) und Quality (check:build) verpflichtend sein; Workflow allein sperrt keinen Merge. Integration, Geräte- und Betriebsnachweise bleiben zusätzlich nötig. SaaS Release 1.0 braucht AK-01–18 und sämtliche externen Voraussetzungen. Freigaben mit eindeutiger Standkennung über die Checkliste dokumentieren.

## Nachweise

Prüfläufe einmal im zugehörigen Versions-/Änderungsnachweis führen: geprüfter Softwarestand (Commit plus Patch-/Dateihash bei Codeabweichung), Dokumentstand, Datum/Umgebung, Umfang und Ergebnis. Andere Dokumente verlinken diesen Beleg und zentrale QL-Einträge statt Ergebnislisten zu kopieren. Nach relevanten Folgeänderungen betroffene Nachweise erneuern; alte Läufe bleiben historisch. Ein Quellenlink allein beweist keine Prüfung des neuen Stands.

## Qualitätsstatus – 22.10.2026

Keine Produktfreigabe, keine Ausnahme erteilt. SaaS in diesem Qualitätspaket nicht implementiert; keine Übernahme, kein Merge, Deployment oder produktive Migration durch den Agenten.

Prüfnachweise: [aktuelle Build-/Bewertungskorrektur](src/lib/docs/FREIGABE_BUILD_BEWERTUNG.md); [Stempelkarten-Grundlage](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.0.1.md); [historische Dokumentablage](src/lib/docs/FREIGABE_ANLEITUNG_STEMPELKARTEN.md). Offene Befunde unten bleiben verbindlich; keine echten DB-/Ably- oder entfernten CI-Nachweise.

| ID | Status, Verantwortung und Abschlusskriterium |
| --- | --- |
| QL-001 | Behoben (Umsetzung): 17 Testdateien aus 83552ef^ wiederhergestellt; 14 Unit-Dateien unverändert, 3 Integrationstests abgesichert, 4 Isolationstests ergänzt. |
| QL-002 | Behoben: Auftraggeber bestätigt am 22.10.2026 die bestehenden Gewichte 30/10/10/20/30. README/Tests daran ausgerichtet, Fachlogik und DE/EN unverändert. Alle 92 Tests bestanden; Nachweis siehe Build-/Bewertungskorrektur. |
| QL-003 | Produktionsbuild behoben: gemeinsamer Build-/Deployment-Befehl nutzt Webpack; alle 42 statischen Seiten erfolgreich. Finaler Sammellauf außerhalb Windows-Sandbox bestanden. Turbopack-Abbruch und separater Sandbox-EPERM bleiben als Diagnose dokumentiert; kein erfolgreicher Sandbox-Build behauptet. |
| QL-004 | Offen; betroffene Integrationsabnahme blockiert. Betreiber stellt getrennte vorbereitete DB/Ably-Test-App, Umsetzung protokolliert echte erfolgreiche Läufe. Fehlende Konfiguration wird verweigert; keine normalen Zugänge verwendet. |
| QL-005 | Teilweise behoben in v0.0.2: explizite Academy-/Plattform-Owner-Guards mit aktuellem DB-Rollen-/Sperrstatus für Seiten, Actions, Datenleser, fünf fachliche APIs und Uploads vorbereitet; direkte negative Tests vorhanden. Registrierung bleibt deaktiviert, Standardrolle INTERN bis zum späteren Geschäftskontenpaket. Vollständige Geschäfts-/Mandantenabgrenzung und T-01/T-02 bleiben offen; keine öffentliche Registrierungsfreigabe. Stand, Review und Übernahmegrenzen: [v0.0.2](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.0.2.md). |
| QL-006 | Teilweise vorbereitet: .nvmrc mit Node 24 ergänzt und gegen package.json geprüft; Repository-Admin muss entfernten CI-Lauf und verpflichtende Checks/Reviews/Freigaben belegen. Abschluss erst mit diesen Nachweisen; lokale Datei ist keine Merge-Sperre. |
| QL-007 | Offen (Umsetzung/Betreiber): vollständige SaaS-Freigabe gesperrt bis AK-01–18, Geräte-, Betriebs-, Anbieterfreigaben und ausgefüllte Checkliste vorliegen. |

Reviewhistorie: Umsetzender Agent prüfte Qualitätspaket gegenüber 83552ef (Prüfscripte, CI, npm/Node, Tests, Isolation, Dokumentation); keine unabhängige menschliche Abnahme. Behoben: DB-Import erst nach Testkonfigurationsprüfung, separate Ably-App statt Skip, isolierte Providerwerte, Routentypgenerierung, Fortsetzung aller Checks. Älterer Hashnachweis ist wegen fehlender .nvmrc widersprüchlich und gilt nicht für diesen Stand.

Aktuelles Review: [Build-/Bewertungsnachweis](src/lib/docs/FREIGABE_BUILD_BEWERTUNG.md). Frühere Prozessänderungen: [Änderungsnachweis](src/lib/docs/FREIGABE_ANLEITUNG_STEMPELKARTEN.md).

Ergänzung 22.10.2026: v0.0.1 auf ausdrücklichen Auftrag als lokale Qualitätsvorbereitung abgeschlossen, mit bestätigter separater Neon-Testdatenbank, entfallener .env.example und zurückgestellter Backupeinrichtung. Keine Betriebs-/Produktfreigabe; Q-O-01 vor betroffener Migration bleibt verbindlich. v0.0.2 auf ausdrückliche Auftraggeberfreigabe für e904c9b als lokales Entwicklungspaket abgeschlossen und archiviert; keine Merge-/Produktionsfreigabe oder produktive Anwendung durch den Agenten. [Statusregister](src/lib/docs/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md), [Review v0.0.2](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.0.2.md).

Versionen: 1.0 (22.10.2026) Qualitätsregeln eingeführt; 1.1 (22.10.2026) Regeln/Status in AGENTS.md verdichtet. 1.2 (22.10.2026) Dokumentationsprüfweg, zentrale Nachweise und frühe Restore-Planung eingeführt. 1.3 (22.10.2026): Projektunterlagen lokal unter src/lib/docs/ ablegen und von Git ausschließen; AGENTS.md/README.md bleiben im Hauptverzeichnis. Lokale Dokumentversionen/Standhashes weiter pflegen und separat sichern. Fehlende verbindliche Unterlagen vor betroffener Implementierung beschaffen.

Version 1.4 · 22.10.2026: QL-002/003 anhand bestätigter Gewichtung und erfolgreichem Produktionscheck aktualisiert; übrige Freigaben unverändert offen.

Version 1.5 · 23.10.2026: Auf ausdrücklichen Auftrag Q-O-01 präzisiert: zentrale Sicherung und getrennte Restore-Datenbank nach dem Bau, verbindlich vor Livegang. Frühere Hinweise auf Backup-/Restorepflicht vor erster Entwicklungsmigration sind damit für die Bauphase überholt; Testisolation, Bestandsschutz, Migrationsfreigabe und vollständige T-18-/Launchabnahme bleiben verbindlich. Auftraggeber hat additive v0.1.0-Migration auch für die bestehende App-Datenbank autorisiert; Anwendung/Prüfung im Versionsnachweis getrennt belegen.


## Ergänzter Qualitätsstatus – 23.10.2026

v0.1.0 lokal implementiert und automatisiert geprüft; ausdrücklich freigegebene additive Migration auf separater Test- und bestehender App-Datenbank angewendet. Keine Bestandszeilen geändert (29 Tabellen mit gleichen Zeilenzahlen/aggregierten Fingerabdrücken). Kein Merge, Deployment oder Produktabschluss. Status/Stand, Review, Browser-/DB-Belege und noch offene lokale Übernahmeentscheidung: [v0.1.0](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.1.0.md). QL-004 für Chat/Ably und vollständige SaaS-Integration bleibt offen; der neue Loyalty-Teilnachweis ist keine pauschale Integrationsabnahme.

| ID | Status, Auswirkung, Verantwortung und Abschlusskriterium |
| --- | --- |
| QL-008 | Offen, neu entdeckter Bestandsbefund: fehlende historische App-Migrationen und unvollständiger Replay lokaler Altdateien. Tatsächliches App-Schema entspricht dem vorherigen Code; neue Migration separat geprüft/angewendet, alte Historie nicht umgeschrieben. Reguläres `migrate deploy`/Neuinstallation und vollständige AK-18-/Betriebsabnahme bleiben gesperrt. Umsetzung/Betreiber müssen Originalhistorie bzw. gesondert geprüfte Baselinestrategie samt nicht destruktivem Replaynachweis bereitstellen. Beleg/Umfang im v0.1.0-Nachweis. |
| QL-009 | Behoben in der lokalen v0.1.0-Vorbereitung: Stempelkarten hatten keinen Einstieg unter Tools/Calem. DE/EN-Kachel und geschützte interne Startseite ergänzt; direkte negative Berechtigungstests und Browser-Klickweg/360px belegt. Umsetzung/Review: Codex; Nachweis im aktuellen v0.1.0-Prüfbericht. Keine Freigabe zusätzlicher Rollen oder vollständiger Kartenerstellung. |
