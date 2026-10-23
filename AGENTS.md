# AcademyFi: Arbeitsregeln

Version 1.6 · 23.10.2026. Gilt projektweit. Bestehende Fehler erlauben keine neuen.

## Kontext und Dokumentationspflege

- Diese Datei ist der verpflichtende Einstieg. Danach nur den für den Auftrag nötigen Kontext laden: erst Dateipfade/Überschriften mit rg suchen, dann betroffene Abschnitte und direkte Abhängigkeiten lesen. Keine pauschalen Volltextlesungen von README, Dokumentationsordner, Archiv, Logs oder sämtlichen Quell-/Testdateien.
- Projektwegweiser: Seiten/APIs in src/app, UI in src/components, Actions/Daten in src/lib/actions und src/lib/data, Stempelkartenservices in src/lib/loyalty, Sprachen in src/messages und src/i18n, Schema/Migrationen in prisma, Prüfprogramme in scripts/check.mjs und package.json, Tests in tests.
- Bei Stempelkarten: aus [Entwicklungsanleitung](src/lib/docs/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md) Abschnitt A, betroffene Registerzeile und Paketblock lesen. In [Lastenheft](src/lib/docs/LASTENHEFT_STEMPELKARTEN.md) und [Pflichtenheft](src/lib/docs/PFLICHTENHEFT_STEMPELKARTEN.md) gemeinsame Produktentscheidungen/Integritätsregeln sowie betroffene LF-/T-/AK-Abschnitte einschließlich Querverweisen lesen. Muss-Anforderungen bleiben vollständig verbindlich; bei unklaren Abhängigkeiten gezielt erweitern. Widersprüche vor Umsetzung klären und versionieren.
- Zusatzkontext nur bei Betroffenheit: [Zugang](src/lib/docs/ZUGANG_STEMPELFI.md) für Anmeldung/Rollen/Unternehmensanlage; [Design](src/lib/docs/DESIGN_STEMPELFI_SHADCN.md) für StempelFi-Oberflächen; [aktueller Basisnachweis](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.1.0.md) für Mandantenbasis/Migration. Historische Nachweise/Archiv nur bei konkreter historischer Frage oder benötigtem Beleg.
- **Keine neuen Dateien in docs-Verzeichnissen anlegen**, insbesondere nicht in src/lib/docs/ oder docs/: keine neuen Versionsnachweise, Pläne, Logs, Screenshots, Dumps, Skripte oder Unterordner als Umgehung. Vorhandene Dokumente gezielt aktualisieren; bestehende Dateien weder löschen noch umbenennen, um sie zweckfremd wiederzuverwenden.
- Versionsnachweise künftig als eindeutig benannte Abschnitte im bestehenden Entwicklungsdokument führen; bestehende paketbezogene Nachweise dort weiterpflegen, wo sie bereits liegen. Checklisteninhalt aus der vorhandenen Vorlage übernehmen, ohne eine neue Datei zu erstellen. Technische Belege bei Bedarf außerhalb von docs in output/ ablegen und verlinken; keine Geheimnisse oder sensiblen Rohdaten. Keine Ersatz-Dokumentationssammlung außerhalb von docs anlegen.
- Eine Aussage/ein Prüflauf hat einen maßgeblichen Ablageort; andere Stellen verlinken ihn. Übergaben knapp halten: Auftrag/Paket, Stand, betroffene Pfade/Kennungen, Ergebnis, offene Blocker und nächster Schritt. Keine kopierten Dokumentvolltexte oder wiederholten Ergebnislisten.

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

## Aktueller Status und Blocker

Stand 23.10.2026: v0.0.1/v0.0.2 lokal abgeschlossen; v0.1.0 lokal implementiert und automatisiert geprüft, lokale Übernahmeentscheidung offen. Additive v0.1.0-Migration auf separater Test- und bestehender App-DB ausdrücklich autorisiert und angewendet; 29 Bestandstabellen unverändert. Keine pauschale Freigabe weiterer Migrationen. Keine Produkt-/Betriebsfreigabe, kein Merge oder Deployment durch den Agenten. Maßgeblich: [Statusregister](src/lib/docs/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md), [v0.1.0-Nachweis](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.1.0.md).

| ID | Status / Abschlusskriterium |
| --- | --- |
| QL-001 | Behoben: Testdateien wiederhergestellt und Isolation ergänzt. |
| QL-002 | Behoben: bestätigte Gewichte 30/10/10/20/30; Fachlogik/DE/EN unverändert. |
| QL-003 | Behoben: Webpack-Produktionscheck erfolgreich; historische Sandbox-/Turbopackfehler nicht als erfolgreich ausweisen. |
| QL-004 | Offen (Umsetzung/Betreiber): echte getrennte Chat-/Ably- und vollständige SaaS-Integrationsnachweise fehlen; Loyalty-Teilnachweise ersetzen sie nicht. |
| QL-005 | Teilweise behoben (Umsetzung): aktuelle DB-Guards vorbereitet; vollständige Mandanten-/Geschäftsrollenabgrenzung und T-01/T-02 offen. Registrierung deaktiviert; keine öffentliche Registrierungsfreigabe. |
| QL-006 | Teilweise vorbereitet (Repository-Admin): Node 24 lokal vorgegeben; entfernte CI-Läufe und verpflichtende Checks/Reviews/Freigaben nachweisen. |
| QL-007 | Offen (Umsetzung/Betreiber): vollständige SaaS-Freigabe erst mit AK-01–18, Geräte-/Betriebs-/Anbieterbelegen und ausgefüllter Checkliste. |
| QL-008 | Offen (Umsetzung/Betreiber): historische App-Migrationen fehlen; migrate deploy/Neuinstallation und vollständige AK-18-/Betriebsabnahme gesperrt. Originalhistorie oder separat geprüfte Baselinestrategie samt nicht destruktivem Replay belegen; Altgeschichte nicht umschreiben. |
| QL-009 | Behoben: DE/EN-Einstieg Tools/Calem, geschützte interne Startseite und negative Tests/360px-Klickweg belegt; keine zusätzliche Rollen-/Kartenerstellungsfreigabe. |

Belege/Verantwortung im jeweiligen [Statusregister](src/lib/docs/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md), [Build-/Bewertungsnachweis](src/lib/docs/FREIGABE_BUILD_BEWERTUNG.md) und [v0.1.0-Nachweis](src/lib/docs/FREIGABE_STEMPELKARTEN_v0.1.0.md). Frühere Status-/Versionsangaben stehen unverändert im [Archiv](src/lib/docs/ARCHIV_STEMPELKARTEN.md#historischer-agents-stand-15--23102026); sie sind keine zusätzlichen Startlektüren.

Version 1.6 · 23.10.2026: Auf Auftrag kontextabhängige Leseregeln, Verbot neuer docs-Dateien und Pflege vorhandener Nachweise eingeführt; historische Angaben ins vorhandene Archiv verschoben. Qualitätsregeln, Kennungen und Freigabegrenzen erhalten.
