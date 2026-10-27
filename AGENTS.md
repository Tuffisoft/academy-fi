# AcademyFi: Arbeitsregeln

Version 1.10 · 27.10.2026 · Projektweit. Bestehende Fehler erlauben keine neuen.

## Kontext und Dokumentationspflege

- Einstieg ist diese Datei. Erst mit rg Pfade/Überschriften suchen, dann nur betroffene Abschnitte, direkte Abhängigkeiten und nötige Querverweise lesen; keine pauschalen Volltextlesungen von README, Dokumentation, Archiv, Logs oder Quell-/Testbestand.
- Projekt: Seiten/APIs src/app; UI src/components; Actions/Daten src/lib/actions und src/lib/data; Stempelkarten src/lib/loyalty; Sprachen src/messages und src/i18n; Schema/Migrationen prisma; Checks scripts/check.mjs und package.json; Tests tests. Ausführbare Workflows bleiben in .github/workflows und src/workflows; generierte Workflowdateien/Laufzeitdaten sind kein Dokumentkontext.
- Stempelkarten: [Entwicklungsanleitung](context/dauerhaft/dokumentation/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md) A, betroffene Registerzeile/Paketblock; [Lastenheft](context/dauerhaft/dokumentation/LASTENHEFT_STEMPELKARTEN.md) und [Pflichtenheft](context/dauerhaft/dokumentation/PFLICHTENHEFT_STEMPELKARTEN.md): gemeinsame Produktentscheidungen/Integritätsregeln und betroffene LF-/T-/AK-Abschnitte samt Querverweisen. Bei unklaren Abhängigkeiten gezielt erweitern; Widersprüche vor Umsetzung klären/versionieren. Alle Muss-Anforderungen bleiben verbindlich.
- Nur bei Betroffenheit: [Zugang](context/dauerhaft/dokumentation/ZUGANG_STEMPELFI.md) für Anmeldung/Rollen/Unternehmensanlage, [Design](context/dauerhaft/dokumentation/DESIGN_STEMPELFI_SHADCN.md) für Oberflächen, [Mandantenbasis/Migration](context/dauerhaft/dokumentation/FREIGABE_STEMPELKARTEN_v0.1.0.md). Historie nur bei konkretem Bedarf.
- Dauerhafte Dokumente: context/dauerhaft/dokumentation/. Nur bestehende Dateien zweckgemäß aktualisieren; keine neuen docs-Dateien/Unterordner, Ersatzsammlungen oder zweckfremden Löschungen/Umbenennungen. Paketstand/Freigabe im bestehenden Paketabschnitt, Checkliste aus vorhandener Vorlage ohne neue Datei übernehmen.
- Einziger Ergebnisnachweis: [NACHWEISE.md](context/dauerhaft/nachweise/NACHWEISE.md). Kurz aktualisieren statt Berichte anhängen: Stand, Entscheidung, Ergebnis, Blocker/nächster Schritt. Jede Aussage/ein Prüflauf nur einmal, sonst verlinken; keine kopierten Volltexte/Ergebnislisten. Frühere Einzelbelege wurden auf Auftrag gelöscht und sind keine verfügbaren Detailbeweise. Keine dauerhaften zusätzlichen Logs, Screenshots, Dumps, Manifeste oder Hilfsskripte; keine Geheimnisse/sensiblen Rohdaten.
- Arbeitsdateien ausschließlich context/temporaer/. Am Arbeitsende Inhalt löschen; nach Abbruch beim nächsten Beginn nachholen. Benötigte Ergebnisse vorher knapp dauerhaft übernehmen; unklare Dateien nicht als temporär einstufen. Vor rekursivem Löschen absoluten Workspace-Zielpfad/Nachfahren prüfen, keine Symlinks/Junctions verfolgen; leeren Basisordner erhalten. Keine pauschale Löschung von System-Temp, Build-Caches, Workflowdaten oder dauerhaften Inhalten.

## Verbindliche Regeln

Verletzungen sperren betroffene Übernahme bis Behebung oder ausdrücklich zulässiger Ausnahme. Sicherheit, Datenverlust, falsche Buchung/Abrechnung und unerfüllte Muss-Anforderungen sperren Produktfreigabe. Fehlende Nachweise bleiben offen; reversible Vorbereitung, isolierte Tests und unbetroffene Arbeit dürfen weitergehen.

### Produkt

- **Q-P-01:** Vor Implementierung Verhalten, Rollen, Erfolgs-/Fehlerfälle und prüfbare Kriterien beschreiben; SaaS mit LF-/T-/AK-Kennungen.
- **Q-P-02:** Schreiberfolg erst nach bestätigter Speicherung; bei unklarem Netzwerkergebnis dieselbe Vorgangskennung wiederverwenden und UI/Verhalten prüfen. Scheinerfolg sperrt Übernahme/Freigabe.
- **Q-P-03:** Neue/wesentlich geänderte Kernoberflächen ab 360 CSS-px ohne Horizontalüberlauf, per Tastatur mit Fokus/Labels, verständlichen Fehlern und farbunabhängigen Statusangaben. Breite Tabellen nur in beschrifteten Scrollbereichen. Mobile/Tastatur sowie Lade-/Leer-/Fehler-/Erfolgszustände dokumentieren; unbedienbare Kernabläufe blockieren.
- **Q-P-04:** SaaS-Kernabläufe/E-Mails einschließlich Fehler vollständig DE/EN prüfen; Sprache ändert keine Fachregel. Fehlender Nachweis sperrt Freigabe.
- **Q-P-05:** Betroffene Academy-Abläufe begründet automatisiert und nötigenfalls manuell auf Regression prüfen; neue Regression sperrt Übernahme.
- **Q-P-06:** Implementierung, Automatikprüfung, Geräteabnahme und Produktfreigabe mit Stand/Belegen getrennt in ausgefüllter [Checkliste](context/dauerhaft/dokumentation/FREIGABECHECKLISTE.md) ausweisen. Pilot/Teilpaket ist keine Vollabnahme.

### Code und Sicherheit

- **Q-C-01:** Gemeinsame serverseitige Fachservices für Seiten/APIs/Actions/Jobs; verbindliche Buchungs-/Tarif-/Rechtelogik nicht in der UI. Aufrufwege reviewen.
- **Q-C-02:** Eingaben serverseitig validieren, Aktion/Ressourcenzugehörigkeit autorisieren; Clientrollen/versteckte Buttons gewähren keine Rechte. Fremde IDs, ungültige Eingaben, Rollenmanipulation und Rechteentzug negativ testen. Unberechtigter Zugriff sperrt Übernahme/Freigabe.
- **Q-C-03:** Strict Mode erhalten; neues any, Typumgehungen/deaktivierte Regeln nur lokal konkret begründet. Unbekannte externe Daten eingrenzen; keine Fehlerverdeckung durch Prüfabschaltung. Typecheck/Review nachweisen.
- **Q-C-04:** Aufgabenbezogen mit vorhandenen Mustern ändern; Abhängigkeiten auf Nutzen, Kompatibilität, Lizenz/Wartbarkeit prüfen und im npm-Lockfile erfassen. Kein beiläufiges Stack-Upgrade.
- **Q-C-05:** Fehler gezielt behandeln/weitergeben; keine unbegründet leeren Catches, Scheinerfolge, Secrets in Repository/Browser oder sensiblen Rohdaten in Logs. Fehlerfälle/Ausgaben prüfen; Geheimnisoffenlegung sperrt Freigabe.
- **Q-C-06:** Jede Änderung mit Prüfer, Stand, Befunden/Erledigung menschen-/agentenreviewen und dokumentieren; Tests ersetzen kein Review.
- **Q-C-07:** Rollen, Buchungen, Billing, Löschung/Migration reversibel vorbereiten und isoliert testen. Konkrete Auftraggeberfreigabe für Stand/Umfang vor Übernahme/Merge/produktiver Anwendung; nicht erneut vor reversibler Vorbereitung fragen.
- **Q-C-08:** Geschäftsregeln zuerst beschreiben; beide Hefte, Testzuordnung/Versionshistorie konsistent pflegen. Technische Änderungen in betroffenen Vorgaben nachführen; Kennungen stabil, nicht umwidmen.

### Sicherheitsreviews mit security-audit

- Für Sicherheitsfragen und gezielte Reviews den globalen Cloudflare-Skill `security-audit` verwenden: [Quelle](https://github.com/cloudflare/security-audit-skill), lokaler Einstieg `~/.codex/skills/security-audit/SKILL.md`. Nur auftragsrelevante Module laden; Installation ist kein Auditauftrag. Vollständiger Sechsphasenlauf nur bei ausdrücklich beauftragtem Codebase-Audit/Pentest oder vollständigem Review bzw. angeforderten Auditberichten; unabhängige Hunter/Verifier gemäß Skill einsetzen.
- Projektregeln und Freigabegrenzen bleiben verbindlich. Vor einem vollständigen Lauf den Ablagekonflikt mit dem Skill auflösen: Auftraggeber muss einen eigenen, vollständig Git-ignorierten Laufordner unter `context/temporaer/` ausdrücklich wählen. Keine automatische externe Berichtsammlung. Strukturierte Berichte/Ledger bleiben Arbeitsdateien; vor der vorgeschriebenen Bereinigung nur knappe Ergebnisse, geprüften Stand, Review und offene QL-Befunde in NACHWEISE.md übernehmen. Ohne vereinbaren Ablageweg gezielte lesende Vorbereitung fortsetzen, keinen vollständigen Lauf behaupten.
- Zielcode nur unter den vollständigen OS-Sandboxbedingungen des Skills ausführen: kein externes Netz, leere Umgebung mit sicherer Allowlist, isolierte Schreibpfade und Ressourcenlimits. Fehlende Isolation bedeutet keine Ausführung und einen ausdrücklich offenen Validierungsblocker. Keine produktiven Daten/Zugänge, Live-Probes oder automatischen Fixes/Migrationen/Deployments aus einem Audit ableiten.
- Befunde mit konkreter Vertrauensgrenze, Quellstand, Auswirkung und unabhängiger Prüfung belegen; `confirmed`, `needs_validation` und `rejected` auseinanderhalten. Ungeprüfte Kandidaten sind keine bestätigten Schwachstellen. Bestätigte projektbezogene Mängel mit stabiler QL-ID, Verantwortung und Erledigungskriterium führen; keine sensiblen Rohdaten speichern. Ein Audit ersetzt weder die vier Checks noch DB-, Geräte-, Betriebsnachweise oder Freigaben.

### Tests, SaaS und Betrieb

- **Q-T-01:** Software-/Konfigurationsänderungen vor Abschluss mit allen vier Checks prüfen; neue Fehler sperren Übernahme. Reine Dokumentation nach Prüfweg unten. Fehlende Dateien, Skips/gestartete Prozesse sind kein Erfolg.
- **Q-T-02:** Fachverhalten/Risiko statt pauschaler Coverage: Fachregeln mit Verhaltenstests, Rechte negativ, Transaktionen/Constraints/Limits/Parallelität mit echter DB prüfen. Mocks belegen keine DB-Integrität; fehlende notwendige Nachweise sperren Freigabe.
- **Q-T-03:** Nur ausdrücklich getrennte Testumgebungen, keine produktiven Daten/Zugänge/Migrationen/Seeds zur Prüfung. Unsichere/fehlende Konfiguration bricht fehlgeschlagen/offen ab, kein Skip-Erfolg.
- **Q-S-01:** Academy/Unternehmen/Endkunden serverseitig trennen, Fremdmandanten/Rollenmanipulation abweisen: LF-F-01–04, LF-N-01–02, T-01/T-02 samt direkter API-/Action-Negativtests. Verletzung sperrt Übernahme/Freigabe.
- **Q-S-02:** DB ist Wahrheit; Stempel/Belohnung/Einlösung/Limits/Outbox atomar/idempotent, gleicher Schlüssel mit anderem Inhalt scheitert. T-10/T-11/T-13 mit mindestens 20 parallelen Wiederholungen und unabhängigen konkurrierenden Vorgängen; Verletzung sperrt Übernahme/Freigabe.
- **Q-S-03:** Kartenidentität, feste Sammelbedingungen, Mitarbeiterbestätigung, Recovery, Tarifwechsel/Bestandskartenschutz gemäß Heften; Redirect ist kein Zahlungsbeleg. T-/AK-03–14 samt Ablauf, Replay, Webhook-Reihenfolge/Grenzen nachweisen.
- **Q-S-04:** Bestätigte Buchungen überstehen Provider-/Prozessausfall; Wiederanlauf verliert nichts und überschreibt keinen neueren Stand. Walletstatus bedeutet Bereitstellung, keine Offline-Garantie. T-05–07/T-15 mit echtem iPhone/Android und Absturz-/Wiederanlauftests; Mocks ersetzen keine Geräteabnahme. Fehlender Nachweis sperrt Freigabe.
- **Q-O-01:** Migrationen in der Bauphase additiv/kontrolliert/reversibel vorbereiten, auf getrennter Test-DB prüfen, Bestand schützen; Anwendung nur konkret autorisiert. Nach Bau zwingend vor Livegang zentrale Sicherung mit Zuständigkeit/Aufbewahrung/Wiederherstellungspunkt, separate Restore-DB und erprobte Wiederherstellung samt Jobs/wirksamen Widerrufen nachweisen (T-18, Betriebsanleitung/Testprotokoll). Nach echten Buchungen kein pauschaler DB-Reset. Fehlender Restorebeleg sperrt Betrieb/Launch, nicht die ausdrücklich autorisierte additive Entwicklungsmigration.
- **Q-O-02:** Vor Launch Monitoring-/Alarmtests für Job-/Webhook-Rückstände, Dauerfehler, Zahlungen/Zertifikate und Anbieter-/Länder-/Betriebsfreigaben gemäß Pflichtenheft; keine Secrets protokollieren.
- **Q-O-03:** Antwortzeit, Walletverzögerung/Kosten mit Umgebung/Methode im Pilot messen; feste Ziele erst danach ausdrücklich vereinbaren, keine unbelegten SLA-/Zustellzusagen.

### Mängel und Ausnahmen

- Bestandslücken mit stabiler QL-ID, Status/Auswirkung, Verantwortung, Nachweis/Erledigungskriterium; rote Checks bleiben rot, neue Fehler sind keine Altlasten.
- Keine Tests entfernen, Erwartungen unbegründet ändern oder CI mit continue-on-error, || true/pauschalen Ausschlüssen grün machen.
- Kleine Darstellungsfehler nur mit dokumentierter Auftraggeberentscheidung/Nachbesserungsaufgabe belassen; unbedienbare Kernabläufe zählen nicht dazu.
- Befristete Ausnahme: Regel, Umfang, Grund, Risiko, Verantwortlicher, ausdrückliche Genehmigung und Ablauf/prüfbares Erledigungskriterium. Offen ist keine Ausnahme; Muss-Anforderungen nur regulär ändern.

## Prüfablauf

**Reine Dokumentation:** Nur nicht ausgeführtes Markdown, ohne Software-/Konfigurations-/Abhängigkeits-/Schemaänderung, Laufzeitwirkung ausführbarer Anweisungen oder generierte Produktinhalte; bei gemischtem/unklarem Umfang Softwareweg. Gesamtdiff einschließlich ungetrackter/ignorierter Änderungen prüfen: Links/Anker, Markdown, Kennungen, Abhängigkeiten/Konsistenz, git diff --check und dokumentiertes Review. Vier Checks als „nicht anwendbar – reine Dokumentation“ begründen, nie bestanden nennen. Keine Änderung bestehender roter Checks, Software-/Produktfreigaben oder CI.

**Software:** Node 24, npm/Lockfile. npm ci braucht DATABASE_URL, in reiner Prüfumgebung Dummy-URL aus .github/workflows/quality.yml; generiert Prisma, migriert nicht. npm run check führt trotz Einzelfehlern npm run lint, npm run typecheck, npm test und npm run check:build aus; alternativ alle vier einzeln. Neue Unit-Dateien in explizite npm-Testliste aufnehmen. Typecheck generiert Next-Routentypen. check:build nutzt npm run build mit Dummy-DB/isolierten Providerwerten, Windows-SWC-Cache .swc/native; Deployment ebenfalls npm run build. Isolation überschreibt .env*-Werte nur im Kindprozess, keine Dateien/Elternumgebung.

Echte Integration separat; Zuordnung muss der Ausführende bestätigen, URL-/Schlüsselvergleich allein genügt nicht:

| Test | Getrennte Umgebung und Befehl; Opt-in nur im Testprozess |
| --- | --- |
| Chat/DB | Entbehrliche, mit bestehenden Migrationen vorbereitete Neon/PostgreSQL-Test-DB; ACADEMYFI_DATABASE_TEST=1, CHAT_TEST_DATABASE_URL; npm run test:integration. Keine normale App-DB; keine automatische Migration/Seeds gegen unbekannte DBs. |
| Loyalty | Gleiche DB-Sicherheit; ausschließlich LOYALTY_TEST_DATABASE_URL und ACADEMYFI_DATABASE_TEST=1, kein Chat-/App-Fallback. npm run test:loyalty:integration -- `tests/loyalty/<name>.integration.test.ts`; Dateien jedes Laufs ausdrücklich angeben. |
| Ably | Separate Test-App; ACADEMYFI_REALTIME_TEST=1, ABLY_TEST_API_KEY; npm run test:realtime. Keine normalen App-Zugänge. |

CI: vier unabhängige Jobs für PR/Push auf master ohne Produktionssecrets. Ruleset muss Quality (lint), Quality (typecheck), Quality (test), Quality (check:build) verlangen; Workflow allein sperrt keinen Merge. Integration/Geräte/Betrieb zusätzlich; Release 1.0 braucht AK-01–18, externe Voraussetzungen und konkrete Checklistenfreigabe.

## Nachweise

Nur NACHWEISE.md: geprüfter Commit plus Patch-/Dateihash bei Codeabweichung, Dokumentstand, Datum/Umgebung, Umfang/Ergebnis. Andere Stellen verlinken. Relevante Folgeänderungen erfordern erneute Prüfung; alte Läufe/Quellenlinks belegen keinen neuen Stand.

## Aktueller Status und Blocker

Stand 27.10.2026: v0.0.1–v0.3.0 lokal als Entwicklungspakete abgeschlossen; nächstes Paket v0.4.0. [Register und konkrete Genehmigungen](context/dauerhaft/dokumentation/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#c-statusregister-und-abhängigkeiten). v0.3.0 nur mit [befristeter manueller Prüfausnahme](context/dauerhaft/dokumentation/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#unterschritt-037--lokal-übernommen); Gerätefälle bleiben Freigabesperre. Additive v0.1.0-Test-/App-Migration autorisiert/angewendet, keine pauschale weitere Migrationsfreigabe. Keine Produkt-/Betriebsfreigabe, kein Merge/Deployment durch den Agenten.

| ID | Offener Umfang / Verantwortung und Abschlusskriterium |
| --- | --- |
| QL-004 | Umsetzung/Betreiber: echte getrennte Chat-/Ably- und vollständige SaaS-Integration nachweisen; Loyalty-Teilprüfung genügt nicht. |
| QL-005 | Umsetzung: aktuelle DB-Guards vorbereitet, vollständige Mandanten-/Geschäftsrollentrennung und T-01/T-02 offen; Registrierung bleibt deaktiviert, keine öffentliche Freigabe. |
| QL-006 | Repository-Admin: entfernte erfolgreiche CI und verpflichtende Checks/Reviews/Freigaben belegen; lokales Node 24 genügt nicht. |
| QL-007 | Umsetzung/Betreiber: vollständige AK-01–18, Geräte-/Betriebs-/Anbieterbelege und ausgefüllte Checkliste vor SaaS-Freigabe. |
| QL-008 | Umsetzung/Betreiber: historische App-Migrationen fehlen; migrate deploy/Neuinstallation und volle AK-18-/Betriebsabnahme gesperrt. Originalhistorie oder separat geprüfte Baseline samt nicht destruktivem Replay belegen; Altgeschichte nicht umschreiben. |

Geräte-/Bedienungsaufgaben QL-012, QL-014, QL-015 und verbleibende UUID-Prüfung aus QL-013: [offene Fälle v0.3.0](context/dauerhaft/dokumentation/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#unterschritt-036--bedienungs--zustands--und-zustellungsprüfung). Externe Zugänge/Sicherung/Restore/CI/Dokumentbackup: [V001-Aufgaben](context/dauerhaft/dokumentation/FREIGABE_STEMPELKARTEN_v0.0.1.md#voraussetzungen-und-zuständigkeiten). Historisch erledigt: QL-001, QL-002, QL-003, QL-009, QL-010, QL-011; Details nur bei Bedarf im [Archiv](context/dauerhaft/dokumentation/ARCHIV_STEMPELKARTEN.md). Gelöschte Einzelbelege nicht als vorhanden behandeln.
