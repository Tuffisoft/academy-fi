<!-- Nachweiskürzung 27.10.2026: frühere Einzelbelege auf Auftrag gelöscht; historische Ergebnisangaben sind keine weiterhin verfügbaren Detailbeweise. Siehe ../nachweise/NACHWEISE.md. -->
# Entwicklungsanleitung: Stempelkarten-SaaS

Version 1.17 · 27.10.2026 · Planungsbasis: e88b052. Ziel: vollständig abgenommenes Modul v1.0.0.
28 Pakete; nächste offene Version: **v0.5.0**; abgeschlossen: **v0.0.1, v0.0.2, v0.1.0, v0.2.0, v0.3.0 und v0.4.0** (zuletzt [v0.4.0 einschließlich v0.4.8](#v048--vorbereitete-lokale-ubernahmeentscheidung), lokale Entwicklungsübernahme mit befristeter manueller Prüfausnahme). Seitenbasis: /tools/calem/stempelkarten; öffentliche, Unternehmens- und interne Seiten bleiben getrennt autorisiert.

## A. Arbeitsablauf und Abschluss

Vor jedem Auftrag [AGENTS.md](../../../AGENTS.md) lesen; anschließend nur Abschnitt A, betroffene Registerzeile/Paketblock und zugehörige Anforderungen einschließlich gemeinsamer Regeln/Querverweise aus Lasten-/Pflichtenheft laden. Nachweise nur im betroffenen Umfang lesen. Die Kontextregeln aus AGENTS.md gelten; Muss-Anforderungen/Freigaberegeln bleiben unverändert.

1. Genau eine beauftragte Version bearbeiten; technische Abhängigkeiten nach Register und tatsächlichen Git-/Test-/Änderungsstand prüfen, vorhandene Arbeit erhalten. Ohne Auswahl die kleinste technisch bearbeitbare offene Version wählen; Blocker der übersprungenen Versionen benennen. Eine Überschrift ersetzt keinen Nachweis.
2. Verhalten, Rollen, Erfolgs-/Fehlerfälle und LF-/T-/AK-Bezug vor Implementierung im Versionsnachweis festhalten. Nur dieses Paket mit zusammengehöriger UI, DE/EN, Autorisierung, Fachservice und Datenhaltung liefern. Notwendige Vorarbeit begrenzen/begründen; spätere Pakete nicht vorziehen.
3. Prüfweg nach AGENTS.md wählen: Softwarepakete mit Fach-/Integrationstests und vier Checks; reine Dokumentation mit begründeter Dokumentationsprüfung. Neue Unit-Dateien in die npm-Testliste, Loyalty-DB-Tests in einen getrennten Einstieg aufnehmen; Chat-Integration führt sie nicht automatisch aus. Keine produktiven Daten, Migrationen, Seeds, Testzahlungen oder Providerdaten zur Verifikation.
4. Betroffene Academy-Regression, DE/EN, mobile Bedienung ab 360 CSS-Pixeln, Tastatur und Zustandsanzeigen belegen oder Nichtanwendbarkeit begründen. Code/Ergebnis reviewen; Prüfer, Stand, Befunde/Erledigung dokumentieren. Selbstreview kennzeichnen.
5. Keine neuen Dateien in docs anlegen. Bestehende Versionsnachweise am bisherigen Ort fortschreiben; für Versionen ohne eigene bestehende Datei einen eindeutig benannten Nachweisabschnitt in dieser Entwicklungsanleitung führen und im Register direkt verlinken. Je Version die ausgefüllten Inhalte der [Freigabecheckliste](FREIGABECHECKLISTE.md) dort führen: Verhalten, Stand (Commit bzw. Datei-/Patchhash), Umsetzung, Prüfungen, Review, Ausnahmen und Freigabeumfang. Implementierung, Automatik-, Geräte- und Produktionsabnahme getrennt halten. Erforderliche Q-C-07-Freigabe am konkreten Stand erst nach reversibler Vorbereitung/isolierten Tests vor Übernahme bzw. produktiver Anwendung einholen oder passende Autorisierung belegen.
6. Abschluss nur bei implementiertem Umfang, geprüften Erfolgs-/Fehler-/Berechtigungsfällen, erfüllten lokalen Checklisten und allgemeinen Regeln. Keine neuen ungelösten Mängel, verdeckten Regelumgehungen oder für diesen Umfang fehlenden Freigaben. Altfehler bleiben als QL sichtbar; rote Checks werden durch Dokumentation nicht grün. Nötige zulässige Ausnahmen brauchen konkrete Genehmigung. Bei Blockern nur belegte Teilschritte abhaken, Version offen halten. Unbetroffene Vorbereitung nur im beauftragten Paket fortsetzen.
7. Vollständig abgeschlossenen Versionsblock gemäß A.1 archivieren und Register/Kopf aktualisieren; Ergebnis/Restriktionen berichten. Keine nächste Version oder Veröffentlichung automatisch starten.

Modulversionen sind unabhängig von package.json und Academy-/Dokumentversionen: v0.0.1/v0.0.2 bereinigen die Basis, Funktionen erhöhen Minor, konkrete Korrekturen Patch (z. B. v0.7.1). Keine Nummern wiederverwenden/umnummerieren, globale Paketversion automatisch ändern oder Arbeit für eine Versionsnummer erfinden.

### A.0 Kontextablage – 27.10.2026

Ablage-/Leseregeln: [AGENTS.md](../../../AGENTS.md#kontext-und-dokumentationspflege). Einzige Ergebnisablage: [NACHWEISE.md](../nachweise/NACHWEISE.md); Detailbelege auf ausdrücklichen Auftrag gelöscht. Historische Ergebnisse sind keine verfügbaren Detailbeweise. Temporäre Dateien am Arbeitsende löschen. Keine neuen Sitzungsberichte.

### A.1 Status und Archiv

Register unten ist die einzige Paketstatusliste; Versionsnachweise enthalten die vier getrennten Abnahmestände. Status: offen, in Arbeit, blockiert, abgeschlossen. Blockierte Pakete nennen im Nachweis Grund, Verantwortlichen und Auflösungskriterium. Fehlende Geräte-/Providerbelege sperren den betreffenden Abschluss, nicht unabhängige Vorbereitung. Eine technische Voraussetzung muss im benötigten Umfang implementiert und automatisiert belegt sein, einschließlich nötiger echter DB-/Providertests. Offene Geräte-/Produktionsfreigaben bleiben offen; benötigt das Folgepaket diesen Beleg, bleibt es blockiert. Übernahmefreigaben nach Q-C-07 bleiben erforderlich.

Bei vollständigem Abschluss: eindeutigen Stand, Entscheidung/Freigabegrenze und Verweis im [Archiv](ARCHIV_STEMPELKARTEN.md) pflegen; Anforderungen nicht erneut kopieren. Einmalige technische Festlegungen und offene Aufgaben vor Kürzung am maßgeblichen Ort erhalten. Register mit stabilem Anker aktualisieren. Offene Paketblöcke bleiben vollständig hier, nur belegte Teilschritte abhaken; Historie nur bei Bedarf lesen.

Register/Kopf gemeinsam aktualisieren: letzte abgeschlossene/nächste offene Version mit Nachweis; nach v1.0.0 „Keine; vereinbarter Umfang abgeschlossen“. Eine Entwicklungsversion oder Reihenfolge außerhalb der Nummern ist keine vollständige Produktfreigabe. Nummern bleiben unverändert.

### A.2 Ausgangslücken und externe Voraussetzungen

Aktuelle offene QL-Einträge aus AGENTS.md prüfen; historische Läufe nicht als neuen Standnachweis übernehmen. Apple-Zertifikate, Google-Issuer/Freigabe, separate Test-DB, Stripe-Testzugang, E-Mail-Absender, Geräte und Betreiberzuständigkeiten ab v0.0.1 vorbereiten. Fehlende Live-Freigaben sind kein Entwicklungsabschluss und sperren nicht automatisch unbetroffene Vorbereitung. Keine vorgezogene Wallet-/Billing-Implementierung.

## B. Auftrag an den Coding-Agenten

```text
Bearbeite nur <VERSION> aus context/dauerhaft/dokumentation/ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md nach Abschnitt A.
Prüfe Bestand/Abhängigkeiten, dokumentiere Verhalten und Anforderungen, liefere
zusammengehörige UI/Backend/Tests und einen ausgefüllten Versionsnachweis.
Archiviere den vollständigen Block nur bei belegtem Abschluss nach A.1;
sonst dokumentiere Teilschritte/Blocker. Aktualisiere den Kopf entsprechend.
Starte keine Folgeversion und veröffentliche nichts automatisch.
```

## C. Statusregister und Abhängigkeiten

Direkte technische Voraussetzungen; weitere folgen transitiv. Reihenfolge ist Standardplanung, keine zusätzliche Abhängigkeit. Getrennte Test-DB ist für jede Daten-/Transaktionsprüfung nötig; Provider/Geräte nur für betroffene Tests. Externe Gates siehe Tabelle; fachliche Abschlussbelege bleiben in lokalen Checklisten verbindlich. Live-/Länder-/Betriebsfreigaben insgesamt spätestens v1.0.0. v0.0.1 bis v0.4.0 sind lokal abgeschlossen; offene Pakete und externe Gates stehen in der Tabelle.

| Version | Technisch vorausgesetzt | Externe Abschlussvoraussetzung | Status |
| --- | --- | --- | --- |
| v0.0.1 | – | Voraussetzungen erfasst, Entscheidungen dokumentiert | abgeschlossen; [Archiv](ARCHIV_STEMPELKARTEN.md#v001--ausgangsstand-und-belastbare-qualitätsbasis), [Nachweis](FREIGABE_STEMPELKARTEN_v0.0.1.md) |
| v0.0.2 | v0.0.1 | – | abgeschlossen; [Archiv](ARCHIV_STEMPELKARTEN.md#v002--interne-academy-zugriffe-ausdrücklich-absichern), [Nachweis](FREIGABE_STEMPELKARTEN_v0.0.2.md) |
| v0.1.0 | v0.0.2 | – | abgeschlossen, lokal übernommen; [Archiv](ARCHIV_STEMPELKARTEN.md#v010--mandantenbasis-und-gemeinsamer-berechtigungskontext), [Nachweis](FREIGABE_STEMPELKARTEN_v0.1.0.md#abschlussabgleich-und-vorlage-zur-lokalen-übernahme--23102026) |
| v0.2.0 | v0.1.0 | E-Mail-Testzugang | abgeschlossen, lokal übernommen; [Archiv](ARCHIV_STEMPELKARTEN.md#v020--geschäftskonto-registrieren-und-unternehmen-einrichten), [Nachweis](#nachweis-v020) |
| v0.3.0 | v0.2.0 | E-Mail-Testzugang | abgeschlossen, lokal als Entwicklungspaket übernommen; [Archiv](ARCHIV_STEMPELKARTEN.md#v030--mitarbeiter-einladungen-und-eigentümerschaft), [Freigabe/Ausnahme](#unterschritt-037--lokal-übernommen) |
| v0.4.0 | v0.3.0 | [Befristete Ausnahme und Übernahme](#v048--vorbereitete-lokale-ubernahmeentscheidung) | abgeschlossen, lokal übernommen; [Archiv](ARCHIV_STEMPELKARTEN.md#v040--kundenportal-und-interne-unternehmensubersicht); manuelle Restprüfungen offen |
| v0.5.0 | v0.4.0 | – | Implementierung vorbereitet; DB-Nachweis v0.5.2 separat, Anbieter-/Bedienabnahme und Übernahme offen; [Stand](../nachweise/NACHWEISE.md#v052--testmigration-und-db-nachweis-27102026) |
| v0.6.0 | v0.5.0 | – | offen |
| v0.7.0 | v0.6.0 | – | offen |
| v0.8.0 | v0.7.0 | – | offen |
| v0.9.0 | v0.8.0 | – | offen |
| v0.10.0 | v0.9.0 | – | offen |
| v0.11.0 | v0.7.0, v0.10.0 | Apple-Testzugang, echtes iPhone | offen |
| v0.12.0 | v0.11.0 | Apple-Testzugang, echtes iPhone | offen |
| v0.13.0 | v0.7.0, v0.10.0 | Google-Testzugang, echtes Android | offen |
| v0.14.0 | v0.12.0, v0.13.0 | Beide Wallet-Testzugänge/Geräte | offen |
| v0.15.0 | v0.9.0, v0.10.0 | – | offen |
| v0.16.0 | v0.15.0 | – | offen |
| v0.17.0 | v0.7.0 | Recovery-Schlüssel, E-Mail-Testzugang | offen |
| v0.18.0 | v0.17.0, v0.14.0 | Beide Geräte, E-Mail-Testzugang | offen |
| v0.19.0 | v0.3.0, v0.10.0 | Stripe-Testmodus, freigegebene Länder | offen |
| v0.20.0 | v0.19.0 | Stripe-Testmodus | offen |
| v0.21.0 | v0.9.0, v0.20.0 | – | offen |
| v0.22.0 | v0.4.0, v0.14.0, v0.20.0 | – | offen |
| v0.23.0 | v0.18.0, v0.20.0, v0.22.0 | – | offen |
| v0.24.0 | v0.14.0, v0.16.0, v0.23.0 | Getrenntes Restoreziel, Alarmkanal/Betreiber | offen |
| v0.25.0 | Alle v0.0.1–v0.24.0 abgeschlossen | Pilotunternehmen, beide Geräte | offen |
| v1.0.0 | v0.25.0 abgeschlossen | Alle Live-Freigaben, Auftraggeber | offen |

## v0.4.0 – Kundenportal und interne Unternehmensübersicht

**Ergebnis:** Die getrennten Arbeitsbereiche sind im Alltag navigierbar. **Zuordnung:** LF-F-01, LF-F-03, LF-F-26, LF-F-28, LF-N-05; T-01, T-02, T-16, T-17 / AK-01, AK-02, AK-16, AK-17 anteilig; Pflichtenheft 5, 11.

1. Kundenportal unter dem vereinbarten Produktpräfix mit Unternehmensauswahl, Navigation und echten Unternehmensdaten aufbauen.
2. Interne Unternehmenssuche und Detailansicht auf Plattform-Owner begrenzen; interne Supportauswahl ausdrücklich anzeigen und protokollieren.
3. Fehlende Funktionen als nicht verfügbar ausweisen; keine Scheinerfolge/KPIs.
4. Lade-, Leer-, Fehler- und Erfolgszustände, 360-Pixel-Ansicht, Tastatur und DE/EN prüfen.

- [ ] Geschäftskunden sehen nur eigene Bereiche und echte Daten.
- [ ] Rollenbezogene Navigation und direkte serverseitige Prüfungen stimmen überein.

### v0.4.0 – Verhalten, Rollen und Abnahmekriterien

Stand 27.10.2026, vor Implementierung; Auftraggeberauftrag: v0.4.0 starten und zuerst Abläufe, Rollen und Kriterien beschreiben. „Kundenportal“ bezeichnet hier den Geschäftskundenbereich, nicht die anonyme Endkundenkarte. Grundlage: [Lastenheft](LASTENHEFT_STEMPELKARTEN.md) 4–5, LF-F-01/03/26/28 und LF-N-01/02/05, [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md) 3, 5, 11 und T-01/02/16/17, [Zugang](ZUGANG_STEMPELFI.md) und [Design](DESIGN_STEMPELFI_SHADCN.md). Bestehende Fachregeln werden konkretisiert, nicht geändert; AK-01/02/16/17 nur anteilig.

#### Rollen und sichtbare Bereiche

| Identität / Unternehmensrolle | Zugriff und Navigation in diesem Paket |
| --- | --- |
| Ohne gültige Sitzung | Öffentliche Produktseite/Vorschau bleiben zugänglich; geschützte Portaleinstiege führen sprachgerecht zur Anmeldung mit fest erlaubtem Produktrücksprung. Keine Unternehmensdaten vor Anmeldung. |
| CUSTOMER oder INTERN mit aktiver Mitgliedschaft | Auswahl ausschließlich eigener aktiver Unternehmen. INTERN erhält durch die globale Rolle keine fremden Unternehmensdaten. |
| Unternehmens-OWNER | Übersicht und bereits verfügbare Mitarbeiterverwaltung; spätere Programm-/Einstellungsfunktionen sowie Abrechnung als noch nicht verfügbar kenntlich. Keine globalen Academy-Rechte durch Unternehmensrolle. |
| Unternehmens-ADMIN | Übersicht und bereits verfügbare Mitarbeiterverwaltung gemäß bestehenden Rollenregeln; keine Eigentümer-/Abrechnungsrechte. |
| Unternehmens-STAFF | Übersicht und Unternehmenswechsel; keine Verwaltungsaktionen für Programme, Mitglieder, Statistik oder Abrechnung. Künftige Scan-/Einlösefunktionen werden nicht als nutzbar angeboten. |
| Globaler Plattform-OWNER | Paginierte interne Unternehmenssuche und explizite Supportdetailauswahl, auch für gesperrte Unternehmen; sichtbarer interner Kontext mit Audit. Keine stillschweigende Mitgliedschaft oder Umgehung fachlicher Schreibregeln. |
| Gesperrtes/gelöschtes Konto, entfernte/inaktive Mitgliedschaft | Kein Zugriff über alte Sitzung, direkte URL, Action/API oder bereits geöffneten Unternehmenskontext. Gesperrte Unternehmen sind für Mitgliedszugriffe nicht verfügbar. |

Vorhandene Feature-Schalter bleiben wirksam: Mitarbeiterverwaltung nur bei aktivierter Funktion und zulässiger Rolle. Öffentliche Registrierung bleibt deaktiviert; bestehende INTERN-Gründung und vorbereitete CUSTOMER-Ersteinrichtung werden nicht erweitert.

#### Konkrete Abläufe und Zustände

1. **Einstieg und Unternehmenswahl:** `/[locale]/tools/calem/stempelkarten/app` prüft die aktuelle DB-Identität und zeigt die berechtigte, paginierte Auswahl. Die bewusste Auswahl öffnet `/app/[organizationSlug]` unter demselben Produktpräfix. Bei null Mitgliedschaften erscheint ein verständlicher Leerzustand; nur ein bereits zulässiger Einrichtungsweg wird angeboten. Ein Fehler beim Laden ist kein leerer Bestand.
2. **Unternehmensübersicht:** Nach erneuter Autorisierung zeigt die Seite Unternehmensname, Status, eigene Unternehmensrolle, hinterlegten Tarif und tatsächlich ermittelte aktive Mitgliedschaften. Fehlende Tarifdaten erscheinen als „nicht eingerichtet“, nicht als behaupteter Free-Tarif. Keine synthetischen Programm-, Umsatz-, Karten- oder Aktivitätswerte im echten Portal. Null nur bei erfolgreich ermitteltem Nullbestand. Die öffentliche Designvorschau bleibt ausdrücklich als Beispiel getrennt.
3. **Navigation und Wechsel:** Der aktuelle Unternehmenskontext und aktive Bereich sind erkennbar. Übersicht und zulässige bestehende Mitarbeiterverwaltung sind erreichbar; spätere Funktionsbereiche erhalten verständliche Nicht-verfügbar-Hinweise ohne wirksame Scheinaktionen. Ein Wechsel lädt Zielunternehmen und Rechte neu; Zurücknavigation, Sprachwechsel und offene Tabs dürfen keine Daten eines zuvor berechtigten Unternehmens freigeben. Kundenportal ohne internen Academy-Chat oder interne Aufgabenansichten.
4. **Interne Suche:** `/admin` prüft den globalen Plattform-OWNER vor der Datenabfrage. Suche nach Unternehmensname oder exakter Unternehmens-ID; Eingaben serverseitig begrenzen/validieren, Ergebnisse stabil paginieren, Suchkontext beim Blättern erhalten. Treffer zeigen nur erforderliche Basisdaten (Name, ID, Status, hinterlegter Tarif; Business erkennbar); kein Treffer, ungültige Suche und Datenfehler sind unterscheidbar. Keine Trefferzahl oder Daten für unberechtigte Nutzer.
5. **Interne Supportauswahl:** Bewusster Trefferaufruf oder direkter berechtigter Detailaufruf prüft den aktuellen globalen OWNER und das Zielunternehmen erneut. Details zeigen sichtbar „interner Support“, ausgewähltes Unternehmen sowie echte Basisdaten; vorhandener Auditservice protokolliert Akteur, Ziel und Zugriff ohne Geheimnisse. Auditfehler führt zu verständlichem Fehler, nicht zu einer unprotokollierten Detailanzeige. Interner Kontext wird serverseitig erzeugt, niemals aus Clientrollen übernommen. Rückweg zur Suche bleibt erreichbar. Sperren, Tarifänderungen, Jobwiederholungen und andere Supportmutationen werden hier nicht neu umgesetzt.
6. **Fehler und Wiederholung:** Während des Ladens bleibt der Zustand erkennbar; fehlende/fremde Ressourcen werden ohne Existenzoffenlegung abgewiesen. Sessionablauf führt zum erlaubten Loginweg, Entzug/Sperre zur Zugriffsverweigerung. Technischer Fehler bietet eine erneute Leseabfrage ohne Erfolgsmeldung oder erfundene Daten. Bestehende Schreibabläufe behalten Commit-Bestätigung und bei unklarem Netzausgang dieselbe Vorgangskennung. Vertrauliche Antworten bleiben `private, no-store`; kein mandantenübergreifender Cache.

#### Prüfbare Abnahmekriterien vor Umsetzung

Die folgenden lokalen Fallbezeichnungen ergänzen die stabilen T-/AK-Kennungen; sie ersetzen keine vollständige AK-Abnahme. Alle Fälle sind zunächst **offen**.

| Fall / Zuordnung | Prüfschritt und erwartetes Ergebnis | Vorgesehener Nachweis |
| --- | --- | --- |
| V040-01 · T-01/02, AK-01/02 | Ohne Sitzung, CUSTOMER, INTERN, globalen OWNER und Unternehmens-OWNER/ADMIN/STAFF getrennt prüfen: Navigation entspricht obiger Matrix; keine internen Daten für Geschäftskonten. | Verhaltens- und direkte Seiten-/Action-/API-Negativtests der betroffenen Wege, Browserprüfung. |
| V040-02 · T-02, AK-02 | Zwei Unternehmen mit unterschiedlichen Mitgliedschaften/Rollen; Liste, Pagination und Wechsel liefern nur zulässige Ziele. Fremde IDs/Slugs, manipulierte Rollen und zugehörige Ressourcen werden abgewiesen. | Echte getrennte Loyalty-Test-DB plus direkte Service-/Aufrufwegtests. |
| V040-03 · T-01/02, AK-01/02 | Nach geöffnetem Portal Konto sperren, Mitgliedschaft entziehen/Rolle ändern oder Unternehmen sperren; erneuter Aufruf, Wechsel, Zurücknavigation und betroffene Action/API berücksichtigen aktuellen DB-Stand. | Isolierte DB- und Browserfälle; kein Nachweis allein durch ausgeblendete Buttons. |
| V040-04 · T-02/16, AK-02/16 | Kein Unternehmen, fehlender Tarif, echte Null und Datenfehler gezielt auslösen: unterscheidbare Zustände; echte Daten statt Beispieldaten, keine Scheinerfolge. | Service-/UI-Verhaltenstests und Browserzustände. |
| V040-05 · T-01/16, AK-01/16 | Interne Suche: Name/ID, kein Treffer, ungültige/lange Eingabe, mehrere Seiten, gesperrtes Unternehmen; Nicht-OWNER auch direkt abweisen. | DB-Suchtests, Eingabegrenzen und direkte Autorisierungstests. |
| V040-06 · T-01/16, AK-01/16 | Interne Detailauswahl per Treffer und Direktlink: sichtbarer Supportkontext, richtiger Akteur/Ziel im Audit; Auditfehler zeigt keine Details. Kein übertragbarer Supportkontext beim Unternehmenswechsel oder Rollenentzug. | DB-Auditprüfung und negative Service-/Seitenfälle einschließlich Fehlerpfad. |
| V040-07 · T-17, AK-17 | Einstieg, Auswahl, Übersicht, Suche und Detail in DE/EN; Lade-, Leer-, Fehler-, Verweigerungs- und Erfolgszustände sowie Nicht-verfügbar-Hinweise vollständig übersetzt. Sprache ändert keine Berechtigung. | Automatisierte Text-/Verhaltensprüfung und manuelle Abläufe in beiden Sprachen. Keine neuen E-Mails geplant; bestehende Einladungsmails nur bei betroffenem Versand regressionsprüfen. |
| V040-08 · T-17, AK-17 | Ab 360 CSS-px kein Horizontalüberlauf; lange Namen/IDs umbrechen, Tabellen nur in beschriftetem Scrollbereich. Alle erlaubten Wege per Tastatur, sichtbarer Fokus, Labels, textliche Statusanzeigen und verständliche Fehler. | Browserprüfung mobil/Desktop, Light/Dark und Tastatur; Geräteabnahme gesondert ausweisen. |
| V040-09 · T-01/02/17, AK-01/02/17 anteilig | Academy-Einstieg/Calem, öffentliche Landingpage und synthetische Vorschau, Produktrücksprung, vorhandene Unternehmensanlage und v0.3.0-Mitgliederwege bleiben im betroffenen Umfang funktionsfähig und getrennt geschützt. | Begründete Regression mit bestehenden Tests, vier Checks nach Softwareänderung, gezielte Browserfälle. |

Echte DB-Prüfung nur nach bestätigter Zuordnung einer getrennten entbehrlichen Testumgebung gemäß AGENTS.md; konkrete Integrationsdateien vor jedem Lauf angeben. Fehlende Konfiguration ist ein offener Blocker. Keine Migration, Seed- oder App-DB-Anwendung aus dieser Spezifikation ableiten. Rollen-/Auditänderungen reversibel vorbereiten und isoliert testen; Q-C-07-Freigabe für konkreten Stand vor Übernahme einholen, soweit betroffen.

#### Teilcheckliste gemäß Freigabevorlage

| Feld | Stand / Verweis |
| --- | --- |
| Gegenstand / Verantwortliche | v0.4.0 mit Unterschritten bis v0.4.8; Umsetzung/Prüfung Codex, konkrete Übernahmeentscheidung Auftraggeber. |
| Commit, Dokumentstand, Datum/Umgebung | Aktueller Commit-/Prüfstand im [Abschlussnachweis v0.4.8](../nachweise/NACHWEISE.md#v048--abschlussvorbereitung-27102026); frühere Software- und Bediennachweise separat erhalten. |
| Prüfweg / Anforderungen / Verhalten | Softwareweg für Umsetzung; ursprüngliche reine Dokumentationsprüfung gilt ausschließlich für den vorherigen Spezifikationsstand. Anforderungen, Rollen und Fehlerfälle oben. |
| Abhängigkeiten / Blocker | v0.3.0 lokal mit befristeter manueller Prüfausnahme übernommen; betroffene geänderte Abläufe vor ihrer Abnahme erneut prüfen. Offene QL-004/005/006/007/008 und Gerätefälle bleiben bestehen; befristete manuelle Prüfausnahme für v0.4.0 gemäß konkreter Übernahmeentscheidung unten genehmigt. |
| Implementierung | Services, Portalnavigation, Suche, Supportdetails und DE/EN-Zustände zur Prüfung umgesetzt; keine vollständige Abnahme behauptet. |
| Dokumentationsprüfung / Review | Ergebnis nur im verlinkten Nachweis; Selbstreview getrennt von Tests ausweisen. |
| Lint / Typecheck / Unit-Test / check:build | Aktueller Stand und Ergebnisse ausschließlich im Abschlussnachweis v0.4.8; keine Ableitung einer Geräte-/Produktfreigabe. |
| Echte Integration / Academy-Regression | Bestätigte getrennte Loyalty-Test-DB; konkrete Dateien und Ergebnisse im Umsetzungsnachweis. Academy-Automatikregression enthalten, manuelle Regression offen. |
| Mobil / Tastatur / DE/EN / Geräte | Automatik und ausgewählte authentifizierte 360px-/DE/EN-/Theme-/Tastaturfälle im [Bediennachweis](../nachweise/NACHWEISE.md#v047--bedienprufung-27102026); reale Geräte und vollständige Zustandsmatrix weiterhin offen, V040-07/08/09. |
| Migration / Bestandsschutz / Rücknahme | Keine Schemaänderung/Migration erforderlich oder angewendet. Nur synthetische Testfixtures; Rücknahme durch Rückbau der neuen UI-/Leseservice-Ergänzungen bei erhaltenen Unternehmens-/Mitgliedschafts-/Auditdaten. |
| Wallet / Kamera / Anbieter / Monitoring / Restore | Durch dieses Paket nicht neu umgesetzt; vollständige Nachweise und Betriebsvoraussetzungen bleiben offen in ihren Paketen. |
| Befunde / Ausnahmen / Entscheidung | Lokale Übernahme am Commit cc9f372 und befristete manuelle Prüfausnahme ausdrücklich genehmigt; konkreter Umfang unten, Ergebnis ausschließlich im Abschlussnachweis. Geräteabnahme und Produkt-/Betriebsfreigabe offen. Kein Merge/Deployment. |

#### Unterschritte v0.4.0 bis v0.4.8

v0.4.7, Korrekturkriterium vor Umsetzung · 27.10.2026: Für ein aktives Unternehmen ohne eingerichteten Tarif bleibt die Basisübersicht lesbar. OWNER/ADMIN sehen den Mitarbeiterverwaltungslink nur, wenn der bereits vorhandene tarifabhängige Fachservice den Tarif unterstützt (derzeit FREE); sonst erscheint Mitarbeiterverwaltung ausdrücklich als noch nicht verfügbar. Unternehmensrollen und Schreibvoraussetzungen bleiben unverändert. Prüfen: OWNER/ADMIN mit/ohne Tarif, STAFF und Feature-Schalter in DE/EN; echter Browserfall ohne Tarif. V040-01/04/07/08, T-02/17, AK-02/17 anteilig; Befund/Ergebnis ausschließlich im zentralen Nachweis.

Auftraggeberauftrag 27.10.2026: Diese Kennungen sind Unterschritte des Pakets v0.4.0; keine zusätzlichen eigenständigen Pakete, keine Umnummerierung von v0.5.0. Alle Ergebnisse ausschließlich im [Umsetzungsnachweis](../nachweise/NACHWEISE.md#v040--umsetzung-27102026).

| Unterschritt | Inhalt / Stand |
| --- | --- |
| v0.4.0 | Abläufe, Rollen, V040-01–09 und Teilcheckliste vor Umsetzung beschrieben. |
| v0.4.1 | Aufrufwege und Lücken zugeordnet: `organizations.ts` für V040-01–06, Portal-/Adminseiten für V040-01/04–09, Mitgliederseite mit bestehendem Fachservice für V040-01/03/09. DB-Zuordnung durch Auftraggeber ausdrücklich bestätigt. |
| v0.4.2 | Tarifunabhängige autorisierte Basisleseansicht und globalem OWNER vorbehaltene Suche; bestehender tarifabhängiger Schreibkontext bleibt unverändert. |
| v0.4.3 | Portal mit echter Rolle/Status/Tarif/Mitgliederzahl und gemeinsamer rollengefilterter Navigation; nicht verfügbare Funktionen ausdrücklich gekennzeichnet. |
| v0.4.4 | Interne Namens-/ID-Suche, 50er-Pagination, sichtbarer Supportkontext, Suchrückweg und bestehendes transaktionales Audit; kein automatisches Detail-Prefetch bei Such-/Auswahllinks. |
| v0.4.5 | DE/EN, Fehler-/Leer-/Ladezustände und Wiederholungswege umgesetzt; mobile Umbrüche und Tastaturziele vorbereitet. Sicht-/Bedienabnahme offen. |
| v0.4.6 | Automatisierte Service-/Serverelement-/Rollen-/Fehlerfälle ergänzt; Ergebnisse im Nachweis. |
| v0.4.7 | Authentifizierte In-App-Browserfälle durchgeführt, Navigationsbefund korrigiert und nachgeprüft; aktueller Stand im [Bediennachweis](../nachweise/NACHWEISE.md#v047--bedienprufung-27102026). Verbleibende manuelle Bedien-/Geräte-/Störungs- und Academy-Regressionsfälle auf Auftraggeberentscheidung vom 27.10.2026 ans Ende der Bauphase verschoben; Nachholung vor Pilot-/Produktfreigabe, keine Vollabnahme. |
| v0.4.8 | Abgeschlossen: Commit cc9f372 als lokales Entwicklungspaket mit konkret genehmigter befristeter manueller Prüfausnahme übernommen. Manuelle Restprüfungen bleiben offen; keine automatische Folgeversion. |

<a id="v048--vorbereitete-lokale-ubernahmeentscheidung"></a>

#### v0.4.8 – Lokal übernommen

Am 27.10.2026 ausdrücklich genehmigt: Gegenstand ist ausschließlich das lokale Entwicklungspaket v0.4.0 mit Unterschritten bis v0.4.8, Softwarecommit `cc9f372822f240e79b06a1aa2fe96b80ab23da19`. Keine neue Implementierung in v0.4.8; vorhandenen Stand, Prüfungen und Review im [Abschlussnachweis](../nachweise/NACHWEISE.md#v048--abschlussvorbereitung-27102026) zuordnen. Lokale Übernahmeentscheidung erteilt; Register/Kopf aktualisiert, v0.5.0 wird nicht automatisch begonnen.

| Entscheidungsfeld | Konkrete Genehmigung vom 27.10.2026 |
| --- | --- |
| Lokale Übernahme | Obigen Commit als lokales Entwicklungspaket übernehmen; kein Merge/Push/Deployment und keine Pilot-/Produkt-/Betriebsfreigabe. |
| Betroffene Regeln / Ausnahmeumfang | Q-P-03/04/05/06 und Abschnitt A.6 ausschließlich hinsichtlich der noch fehlenden vollständigen manuellen Abschlussnachweise für v0.4.0. Keine Ausnahme für Rechte, Mandantentrennung, Buchungsintegrität, Muss-Verhalten oder automatisierte Pflichtchecks. |
| Konkrete Restfälle | Reale iPhone-/Android-Prüfung; vollständige manuelle Tastatur-/Zustands-/Theme-/Sprachmatrix, technische Fehler-/Auditfehler-/Netzwerkausfall- und Zurück-/Mehrtabfälle, manuelle Academy-/Calem-/Landing-/Preview-Regression gemäß v0.4.7-Nachweis. Offene Fälle bleiben offen. |
| Grund | Auftraggeber verschiebt die manuellen Resttests ans Ende der Bauphase; lokale Entwicklung soll auf dem geprüften Implementierungsstand fortgesetzt werden können. |
| Risiko | Geräte-/Zustands-/Bedienungsfehler können trotz Automatik und ausgewählter Browserfälle unentdeckt bleiben. |
| Verantwortung | Codex/Umsetzung: Nachprüfung und Korrektur; Auftraggeber: reale Geräte und konkrete lokale Entscheidung. |
| Ablauf / Erledigungskriterium | Am Ende der Bauphase sämtliche Restfälle mit Gerät/OS/Browserversion bzw. Prüfumgebung nachweisen, zwingend vor geschlossenem Pilot oder Produktfreigabe. Bei zwischenzeitlicher Änderung betroffener Abläufe vor deren Abnahme neu prüfen. |
| Rücknahme | Lokale UI-/Leseservice-Ergänzungen reversibel zurückbauen bzw. deren Zugänge deaktivieren; Unternehmens-, Mitgliedschafts- und Auditdaten erhalten. Keine Migration, kein Reset. |
| Ausdrückliche Auftraggeberentscheidung | **ERTEILT** für Commit cc9f372 und den beschriebenen lokalen Entwicklungs-/Ausnahmeumfang; Originalentscheidung und Ergebnis ausschließlich im [Abschlussnachweis](../nachweise/NACHWEISE.md#v048--abschlussvorbereitung-27102026). Keine vollständige manuelle Abnahme. |

Implementierung und Automatikprüfung bleiben von Geräteabnahme und Produktfreigabe getrennt. QL-017 ist gemäß Nachweis behoben; bestehende übrige QL-/Betriebs-/Geräteblocker bleiben unverändert. Statusregister/Kopf und Archiv gemäß A.1 aktualisiert; Prüfergebnisse ausschließlich im zentralen Nachweis.

## v0.5.0 – Programm anlegen und Karte gestalten

### Verhalten und Kriterien vor Implementierung · 27.10.2026

Auftrag: v0.5.0 in Unterschritten v0.5.1 Datenbasis, v0.5.2 Fachservice, v0.5.3 Upload, v0.5.4 Editor und v0.5.5 Prüfung vorbereiten. OWNER/ADMIN aktiver Unternehmen mit gültigem Schreibkontext verwalten ausschließlich eigene Entwürfe/Assets; STAFF und rein interne Betreuer nicht. Globale Academy-Rechte ersetzen keine Mitgliedschaft. Veröffentlichung/Archivierung/Kartenausgabe bleiben v0.6.0 und später vorbehalten.

Explizites Speichern, unmittelbare lokale Vorschau, Warnung bei ungespeicherten Änderungen. Erfolg erst nach Commit; unklare Antwort wiederholt dieselbe Vorgangskennung samt Inhalt. Abweichender Inhalt ergibt Konflikt; erwartete Revision schützt vor Überschreiben, lokale Eingaben bleiben erhalten. Lade-, Leer-, Fehler-, Konflikt- und Erfolgszustände DE/EN, Light/Dark, Tastatur und ab 360px prüfen. Drei Vorschauen teilen normalisierte Daten, kennzeichnen Anbieterabweichungen und behaupten keine Wallet-Ausgabe. Öffentliche Vorschau bleibt synthetisch.

V050-01: Anlage/Speichern/Wiederöffnen identisch. V050-02: Validierung Name 1–40, Beschreibung 0–70, Gratisbelohnung 1–40 Zeichen, Ziel 1–2147483647, keine Steuerzeichen/HTML; Symbole Stempel/Stern/Herz/Geschenk/Kaffee. V050-03: HEX-Farben, Kontrast mindestens 4,5:1. V050-04: optionale Logos PNG/JPEG/WebP bis 4 MiB/16 MP; keine Animation/SVG; normalisierte PNG bis 1024px ohne Metadaten, keine externen Eingabe-URLs. V050-05: fremde IDs, STAFF, Widerruf/Sperre und Rechteentzug während Upload scheitern. V050-06: 20 parallele Wiederholungen genau einmal, unabhängige Vorgänge getrennt und Revisionenkonflikte ohne Datenverlust. V050-07: API/Actions teilen Fachservice; Uploadfehler kein verwendbares Asset. V050-08: Academy-/Upload-/Vorschauregression und vier Checks. LF-F-05/06/28, LF-N-05; T-/AK-03/17 anteilig.

Migration ausschließlich für die bestätigte getrennte Loyalty-Testdatenbank konkret freigegeben; App-DB-Anwendung weiterhin nicht freigegeben. [Anwendung und DB-Nachweis v0.5.2](../nachweise/NACHWEISE.md#v052--testmigration-und-db-nachweis-27102026). Ergebnisse und Selbstreview ausschließlich in NACHWEISE.md; manuelle Ausnahmen früherer Pakete gelten nicht für v0.5.0.

### v0.5.2 – Fachservice und Speicherung

Fortsetzungsauftrag 27.10.2026: vorhandene Services gezielt vervollständigen, keine zweite Implementierung. OWNER/ADMIN mit aktuellem aktivem Schreibkontext dürfen eigene Entwürfe lesen/anlegen/bearbeiten; STAFF, Fremdmandanten, gesperrte Identitäten/Unternehmen und entzogene Mitgliedschaften scheitern auch bei Wiederholungen. Einheitliche Zod-Leseparameter einschließlich explizit leerer Kennungen, gemeinsamer Schreibservice für Action/API; gleiche Vorgangskennung und gleicher Inhalt wirken einmal, anderer Akteur/Inhalt ergibt Konflikt. Erwartete Revision schützt bestehende Änderungen. Programm, Vorgang und Audit committen gemeinsam; Audit-/Speicherfehler ergeben keinen Erfolg. Technische Transaktionskonflikte P2034 höchstens zweimal zusätzlich mit identischer Eingabe wiederholen, Fach-/Providerfehler nicht automatisch wiederholen. Hot-Reload-Prisma muss neue Loyalty-Modelle unterstützen.

V052-01: paginierte Liste (50/ID-Cursor), einzelne eigene Entwürfe, ungültige/leer angegebene Parameter scheitern vor DB-Zugriff. V052-02: Speichern/Replay/anderer Akteur/Inhalt/Revision ohne Doppelanlage oder Überschreiben. V052-03: Audit-/Commitfehler ohne Scheinerfolg und begrenzte technische Wiederholung. V052-04: echte DB-Constraints, Rücknahme und je 20 konkurrierende Vorgänge gemäß V050-06; bestätigte getrennte Loyalty-Testumgebung wiederverwenden, ausschließlich neue additive Migration nach konkreter Freigabe anwenden. Vier Checks, Selbstreview und Ergebnisse zentral; keine Abnahme aus Mocks ableiten. LF-F-05/06/28, LF-N-01/02/09, T-/AK-02/03/10/17 anteilig. Implementierung und Automatik-/DB-Prüfung dieses Unterschritts sind im [DB-Nachweis](../nachweise/NACHWEISE.md#v052--testmigration-und-db-nachweis-27102026) getrennt ausgewiesen; keine Paketübernahme oder Produktfreigabe daraus ableiten.

### v0.5.3 – Logo-Upload und geschützte Bildannahme

Fortsetzungsauftrag 27.10.2026, konkretisiert: ausschließlich neue StempelFi-Logos auf den bestätigten privaten Cloudflare-R2-Testbucket umstellen; STEMPELFI_R2_ENDPOINT, STEMPELFI_R2_BUCKET_NAME, STEMPELFI_R2_ACCESS_KEY_ID und STEMPELFI_R2_SECRET_ACCESS_KEY verwenden. Ersetzt die vorherige UploadThing-Logoablage; Academy-Uploads bleiben unverändert. Kein allgemeiner App-DB-Zugriff und keine neue Migration. OWNER/ADMIN aktiver eigener Unternehmen verwalten Logos, STAFF/Fremdmandanten/entzogene Mitgliedschaften nicht. V053-01: PNG/JPEG/WebP bis 4 MiB/16 MP, keine Animation/SVG; dekodiert/gedreht/metadatenbereinigt zu PNG bis 1024px. V053-02: begrenzte Eingaben/Antworten, Zod-geprüfte R2-Accountendpoints und Objektschlüssel, S3-Signaturheader, keine Redirects oder frei eingegebenen Bild-URLs, Zeit-/Größenlimits. V053-03: Objektschlüssel deterministisch nach Mandant/Vorgang/normalisiertem Inhalt; Asset/Vorgang/Audit erst nach bestätigtem Upload und erneuter Rechteprüfung atomar speichern. Replay bleibt beim selben Objekt, fremder Akteur/anderer Inhalt scheitert. V053-04: direkte HTTP-/Service-Negativfälle, Provider-/DB-Fehler und Rechteentzug während I/O ohne Scheinerfolg. V053-05: echter R2-Upload, autorisierter Abruf, anonymer S3-Abruf abgewiesen, Entwurfszuordnung/Wiederöffnen und gezielte Bereinigung eigener synthetischer Objekte/DB-Zeilen. HTTP auf localhost bleibt zulässig; nur Server-R2-Verbindung benötigt HTTPS. Kein automatischer Import/Löschen alter UploadThing-Dateien, keine öffentliche Bucketfreigabe. Bei unklarem Commit keine Datei automatisch löschen. LF-F-06/28, LF-N-01/02/05, T-/AK-03/17 anteilig. [Aktueller R2-Nachweis](../nachweise/NACHWEISE.md#v053--r2-umstellung-und-echter-anbindungsnachweis-27102026); historische UploadThing-Fehlläufe bleiben dort getrennt erhalten. Öffentliche Vorschau ohne echten Upload, Geräte-/Paketfreigabe getrennt.

### v0.5.4 – Übersicht und Editor

Fortsetzungsauftrag 27.10.2026: vorhandenen gemeinsamen Editor vervollständigen, keine zweite Vorschau implementieren. OWNER/ADMIN öffnen eigene Entwürfe aus der Übersicht; bestehende serverseitige Rollen- und Mandantenprüfung bleibt verbindlich. V054-01: Übersicht mit realer Kartengestaltung, Entwurfsstatus und Revision; explizite Anlage/Bearbeitung. V054-02: bestätigte Revision und ungespeicherte Änderungen sichtbar unterscheiden; nur Commitbestätigung zeigt Erfolg. V054-03: ungültiges Ziel und unzureichender Farbkontrast erhalten konkrete DE/EN-Hinweise; Speichern ungültiger Daten sperren. V054-04: Logo ersetzen/entfernen ändert erst beim Speichern die Programmreferenz; unklarer Upload blockiert Speichern bis Wiederholung oder bewusstem Verwerfen des Uploadversuchs, ohne physische Löschung. V054-05: Konflikte erhalten lokale Eingaben, unklare Speicherung behält Vorgang/Inhalt; Navigationswarnung, mobiler Vorschau-Sprunglink, Tastatur/Fokus, 360px, Light/Dark und DE/EN prüfen. Öffentliche Vorschau bleibt synthetisch. LF-F-05/06/28, LF-N-05; T-/AK-03/17 anteilig. Ergebnisse und Selbstreview ausschließlich im zentralen Nachweis; keine neue Migration, Paketübernahme oder Produktfreigabe.

### v0.5.5 – Prüfung und Abschluss

Fortsetzungsprüfung 27.10.2026: V055-05 „Commit erfolgt, Antwort verloren“ für Anlage und Bearbeitung mit isoliertem lokalem Antwortabbruch nach vollständiger Serverantwort prüfen; echter DB-Commit vor Wiederholung lesend bestätigen, gleiche Vorgangskennung/Inhalt wiederholen, Programm/Vorgang/Audit genau einmal. Browserprüfung über echte Server Action: kein Erfolg bei verlorener Antwort, lokale Daten/Vorgang bleiben erhalten, erneutes Speichern bestätigt bereits gespeicherten Stand ohne zusätzliche Revision. V055-06 verbleibende DE/EN-/Light/Dark-/360px-/Desktop-Zustände und Upload-/Providerfehler gezielt ergänzen; bekannte Geräte-/Betriebsgrenzen nicht durch Browser-/Mockprüfungen ersetzen. Keine Testhaken im Produktivcode, keine neue Migration; vorhandene bestätigte getrennte Testumgebung wiederverwenden. Ergebnisse nur im zentralen Nachweis.

QL-018-Korrekturauftrag 27.10.2026, Kriterien vor Umsetzung: History-Einträge unter Erhalt der Routerdaten mit Positionen verfolgen. Bei ungespeichertem Editor sowohl Zurück als auch Vorwärts vor Routerübernahme zum Ausgangseintrag zurückstellen und einen fokussierten DE/EN-Verwerfungsdialog anbieten. Abbrechen/Escape erhält URL, Eingaben, Revision und offene Speichervorgänge; bestätigtes Verwerfen führt genau zum ursprünglich gewählten Eintrag. Saubere Entwürfe navigieren ohne Nachfrage; kein zweiter Dialog bei bestätigter Historynavigation, keine doppelten Historyeinträge beim Abbruch. Action-Konflikt und identische Speicherwiederholung regressionsprüfen; Academy-Navigation ohne aktiven Dirty-Editor unverändert. QL-018 erst nach Verhaltenstests und tatsächlichem Browsernachtest beider Richtungen als behoben ausweisen. Keine neue DB-/Rollen-/Migrationsfreigabe.

Prüfauftrag 27.10.2026: V055-01 aktuelle vier Checks sowie direkte Action-/HTTP-Negativfälle und Fachfehler prüfen; V055-02 ausdrücklich getrennte Loyalty-Test-DB und R2-Testbucket erneut ohne Migration prüfen, eigene synthetische Daten bereinigen; V055-03 Editor-/Übersichtsabläufe einschließlich Navigationsabbruch, Tastatur, DE/EN, Light/Dark und 360px soweit mit verfügbarer Umgebung prüfbar nachweisen; V055-04 Selbstreview und Teilcheckliste anhand tatsächlicher Belege ausfüllen, offene Geräte-/Betriebs-/Freigabepunkte getrennt lassen. Korrekturen innerhalb v0.5.0 mit erneuten betroffenen Prüfungen; keine automatische Übernahme/Folgeversion/Veröffentlichung. Ergebnisse ausschließlich NACHWEISE.md. LF-F-05/06/28, LF-N-05; T-/AK-03/17 anteilig, keine vollständige AK-Abnahme aus Teilprüfungen.

### Manuelle Restabnahme v0.5.5 – Fortsetzung auf anderem Rechner

Noch nicht ausgeführt; Ergebnisse ausschließlich NACHWEISE.md. Auftraggeber committet Kontext und ausstehende Codeänderungen gemeinsam und stellt den Commit über GitHub bereit. Auf dem anderen Rechner denselben Branch/Commit verwenden und lokale Testzugänge separat einrichten; keine .env-Dateien in Git. Die vorigen temporären Testserver/Konten sind beendet/bereinigt. Geräte benötigen eine erreichbare Testadresse statt localhost des Handys, getrennte Test-DB, privaten R2-Testbucket sowie bereitgestellte OWNER-/ADMIN-/STAFF- und Academy-OWNER-/INTERN-Testkonten. StempelFi-Logos bleiben R2; Academy-Uploads bleiben ausdrücklich UploadThing. Keine App-DB-Migration oder weitere Freigabe daraus ableiten.

Folgende Geräteliste einmal auf echtem iPhone/Safari und einmal auf echtem Android/Chrome durchführen; Gerät/OS-/Browserversion, Commit, Prüffall, bestanden/fehlgeschlagen und konkrete Abweichung erfassen:

- [ ] Unternehmensanmeldung als OWNER/ADMIN, richtiger Kontext, Entwurfsliste/Leerzustand und Anlage erreichbar.
- [ ] Name/Beschreibung/Gratisbelohnung eingeben; Web-/Apple-/Google-Vorschau aktualisieren sich unmittelbar mit gleichen Inhalten.
- [ ] Grenzen 40/70/40 Zeichen: richtige Zähler, gelbe Grenzwarnung; normale Eingabe überschreitet die Grenze nicht.
- [ ] Pflichtfeld leeren, HTML eingeben, Ziel 0 und unzureichenden Farbkontrast wählen: verständlicher Fehler und Speichersperre.
- [ ] Ziel 2147483647: kompakter Textstand, keine riesige Symbolreihe oder blockierte Oberfläche.
- [ ] Farbwähler, Symbolliste und Bildschirmtastatur bedienen; kein Horizontalüberlauf, verdeckte Aktionen oder abgeschnittene Texte.
- [ ] Explizit speichern, Übersicht öffnen und Entwurf wieder öffnen: bestätigter Erfolg, richtige Inhalte und Revision.
- [ ] Kleines PNG/JPEG/WebP-Logo hinzufügen, speichern/wiederöffnen, ersetzen und entfernen: richtiger dauerhaft gespeicherter Stand in allen Vorschauen.
- [ ] SVG, beschädigtes Bild und Logo über 4 MiB: kein verwendbares Asset, verständlicher Fehler, Wiederholung/Verwerfen erreichbar.
- [ ] Dirty-Editor mit Zurück/Vorwärts und verfügbaren Gesten verlassen: Abbruch erhält URL/Eingaben, Bestätigung erreicht das gewählte Ziel; ebenso Übersicht/Sprachwechsel prüfen.
- [ ] Parallel auf zweitem Gerät speichern, dann veralteten Stand speichern: Konflikt statt Überschreiben, lokale Inhalte erhalten, bewusstes Neuladen bedienbar.
- [ ] Verbindung vor Speichern unterbrechen und danach wiederholen: kein Scheinerfolg, Eingaben erhalten, genau ein bestätigter Schreibvorgang. Antwortverlust nach Commit nur mit vorbereitetem Abbruchproxy als solchen belegen; Flugmodus allein genügt dafür nicht. Lokaler Nachweis bereits vorhanden.
- [ ] STAFF: keine Entwurfs-/Assetverwaltung, direkte gespeicherte Editoradresse verweigert ohne fremde Inhalte.
- [ ] Wesentliche Abläufe DE/EN und Light/Dark kontrollieren; mit verfügbarer Hardwaretastatur Tab-Reihenfolge, Fokus, Escape und Enter prüfen. Keine Wallet-Ausgabe in diesem Paket erwarten.

Bestehende Academy-Uploads mit eigenen löschbaren Daten und bestätigter UploadThing-Test-App prüfen; keine Migration nach R2:

- [ ] OWNER und INTERN: kleines PNG/JPEG als Profilbild hochladen, Erfolg abwarten, neu laden und erneut anmelden; Bild bleibt erhalten.
- [ ] Profilbild ersetzen: neues Bild bleibt gespeichert, Probleme bei Bereinigung werden nicht als vollständiger Erfolg verschwiegen.
- [ ] PDF und Bild über 4 MB als Profilbild abweisen; bisheriges Bild bleibt erhalten.
- [ ] Je kleine PDF-, TXT-, Bild-, DOCX-, XLSX- und PPTX-Datei als Lerndokument hochladen; Titel/Notiz/Datei nach Neuladen erhalten und Datei öffnbar.
- [ ] Nicht erlaubte Dokumentdatei und Datei über 16 MB abweisen; kein erfolgreicher Dokumenteintrag.
- [ ] Auswahl abbrechen und Upload unterbrechen: verständlicher Fehler, kein falscher Erfolg oder dauerhaft gesperrter Dialog.
- [ ] Abgemeldete/CUSTOMER-Konten erhalten keinen Academy-Uploadzugriff.
- [ ] Dialoge und Meldungen DE/EN auf beiden Geräten kontrollieren; nur eigene Testdaten anschließend gezielt bereinigen.

Nach diesen Belegen: Selbstreview/Teilcheckliste aktualisieren, lokale Übernahme separat konkret entscheiden. Keine automatische Produkt-/Betriebsfreigabe, Folgeversion, Migration, Merge oder Veröffentlichung. Kontext soll gemäß Auftraggeber nach Projektabschluss aus dem aktuellen Repositorystand entfernt werden; eine Bereinigung der Git-Historie wäre ein eigener, ausdrücklich zu entscheidender Schritt.

### Teilcheckliste gemäß Freigabevorlage

| Feld / Nachweisebene | Stand / Beleg |
| --- | --- |
| Gegenstand / Verantwortliche | v0.5.0, Unterschritte v0.5.1–v0.5.5; Umsetzung/Prüfung Codex, konkrete Freigaben Auftraggeber. |
| Commit / Patch / Dokumentstand / Umgebung | Basis und frühere Teilprüfungen im [v0.5.0-Nachweis](../nachweise/NACHWEISE.md#v050--implementierung-27102026), v0.5.5-Basis im [Abschlussprüfstand](../nachweise/NACHWEISE.md#v055--fortsetzung-und-abschlussprüfstand-27102026), QL-018 im [History-Nachweis](../nachweise/NACHWEISE.md#ql-018--historyschutz-27102026), aktueller Stand im [Restprüfungsnachweis](../nachweise/NACHWEISE.md#v055--restprüfungen-27102026); Entwicklungsanleitung 1.17, Lastenheft 1.7, Pflichtenheft 2.5. |
| Prüfweg / Anforderungen / Verhalten | Software; V050-01–08 oben, LF-F-05/06/28, LF-N-05, T-/AK-03/17 anteilig. |
| Abhängigkeiten / externe Voraussetzungen | v0.4.0 lokal übernommen; getrennte vorbereitete Test-DB und privater R2-Testbucket für neue Logos. Bestehende QL-/Betriebsblocker unverändert. |
| Implementierung | Entwurfsverwaltung, gemeinsamer Editor und private R2-Logos implementiert; Abschlusskorrekturen im v0.5.5-Nachweis. Vollständige Abnahme getrennt offen. Veröffentlichung und Kartenausgabe nicht Teil dieses Pakets. |
| Lint / Typecheck / Unit-Tests / check:build | Prüfläufe und endgültiges Ergebnis ausschließlich im Nachweis. |
| Bauphase: Migration / Bestandsschutz / Rücknahme | Konkrete Freigabe und Anwendung ausschließlich auf bestätigter getrennter Loyalty-Test-DB samt isoliertem DB-Nachweis siehe [v0.5.2](../nachweise/NACHWEISE.md#v052--testmigration-und-db-nachweis-27102026). App-DB nicht freigegeben; keine historische Migration umgeschrieben. |
| Academy-Regression | Automatisierte bestehende Academy-/Uploadtests, positiver Academy-OWNER-Zugang/Dashboard/Werkzeugeinstieg und öffentliche synthetische Vorschau im Restprüfungsnachweis. Vollständige manuelle Academy-/Live-Bestandsuploadabnahme weiterhin offen. Academy-Uploads bleiben auf ausdrückliche Auftraggeberbestätigung unverändert bei UploadThing; StempelFi-Logos ausschließlich R2. |
| Mobile / Tastatur / Fokus / Labels / Zustände / DE/EN | Repräsentative DE/EN × Light/Dark × 360/1280px-Matrix und echte Action-Anlage/-Bearbeitung mit verlorener Antwort nach bestätigtem Commit im Restprüfungsnachweis. QL-018 behoben gemäß History-Nachweis. Andere Browser/echte Geräte und vollständige zustandsübergreifende Geräteabnahme weiter offen; keine neue transaktionale E-Mail. |
| Echte Anbieterintegration | Basis im [v0.5.3-Stand](../nachweise/NACHWEISE.md#v053--r2-umstellung-und-echter-anbindungsnachweis-27102026), erneute echte DB-/R2- und Portalprüfungen im aktuellen v0.5.5-Nachweis; Mocks separat. Keine vollständige Geräteabnahme daraus ableiten. |
| Wallet / Kamera / Ausgabe und Update | Keine Wallet-Ausgabe/Scanneränderung in v0.5.0; Vorschauen ersetzen weder spätere Geräteprüfungen noch AK-05–09. |
| Restore / Job-Wiederanlauf / Monitoring / Betriebsfreigaben | Im Paket nicht umgesetzt; bestehende Freigabesperren bleiben offen. |
| Review / Mängel / Ausnahmen | Codex-Selbstreview und Erledigung von QL-018 im aktuellen History-Nachweis; übrige offene Nachweise unverändert. Keine Übertragung früherer Ausnahmen. |
| Lokale Übernahme / Produktfreigabe | Nicht erteilt; v0.5.0 bleibt offen. Kein Merge/Push/Deployment, keine Folgeversion automatisch. |

**Ergebnis:** Inhaber und Admin können einen echten Programmentwurf gestalten und speichern. **Zuordnung:** LF-F-05, LF-F-06, LF-F-28, LF-N-05; T-03, T-17 / AK-03, AK-17 anteilig; Pflichtenheft 4, 6.1.

1. Programmmodell, Editorservice und Entwurfsübersicht implementieren; Logo, Farben, Symbol, Texte, positives ganzzahliges Ziel und Gratisbelohnung validieren.
2. Mandantengeprüften Bild-Upload mit kontrollierter Rasterverarbeitung anbinden; keine beliebigen URL-Abrufe oder ungeprüfte aktive Bildinhalte.
3. Apple-/Google-/Web-Vorschau aus gemeinsamen normalisierten Daten; keine Wallet-Ausgabe behaupten.
4. Speichern, erneutes Öffnen, unzulässige Werte, Uploadfehler und fremde Assetkennungen prüfen.

- [ ] Gespeicherte Entwürfe und Vorschauen stimmen überein; Erfolg erscheint erst nach bestätigter Speicherung.
- [ ] STAFF kann weder Entwürfe noch Assets verwalten.

## v0.6.0 – Veröffentlichen, Archivieren und Bedingungen schützen

**Ergebnis:** Programme erhalten ihren fachlich gültigen Lebenszyklus. **Zuordnung:** LF-F-05, LF-F-07, LF-F-21, LF-F-22; T-03, T-10, T-13 / AK-03, AK-10, AK-13 anteilig; Pflichtenheft 4, 6.1, 10.1.

1. Veröffentlichung, Archivierung, Reaktivierung und ausdrückliche Sperrung als unterschiedliche Aktionen bereitstellen; Programmlimit unter Unternehmenssperre prüfen.
2. Unveränderlichkeit von Stempelziel und Belohnung nach erster Ausgabe dauerhaft sichern; Brandingrevisionen davon trennen.
3. Öffentliche Programmseite und Aufnahme-URL aus echten veröffentlichten Programmen erstellen; die tatsächliche Kartenausgabe folgt in v0.7.0.
4. Parallelität am letzten Programmplatz und zwischen Bedingungsänderung und simulierter erster Ausgabe mit realen DB-Transaktionen prüfen.

- [ ] Archivierte Programme geben keine neuen Karten aus; bestehende Karten bleiben fachlich bedienbar.
- [ ] Eine Sperre ist kein Downgrade und wird nicht durch Reaktivierung ohne Prüfung umgangen.

## v0.7.0 – Anonyme Kundenkarte und Web-Ansicht

**Ergebnis:** Ein Endkunde erhält ohne Konto genau eine verwendbare Karte für sein Programm im selben Browser. **Zuordnung:** LF-F-08, LF-F-09, LF-F-22, LF-N-02, LF-N-03; T-04, T-07, T-10, T-13, T-17 / AK-04, AK-07, AK-10, AK-13, AK-17 anteilig; Pflichtenheft 4, 6.2.

1. Kundensitzung mit HttpOnly-/Secure-/SameSite-Cookie und gehashtem Token vor der Ausgabe etablieren; Kartenzuordnung, Zufallskennung und Bedingungssnapshot speichern.
2. Bewussten Ausgabe-POST mit Vorgangskennung, Kartenlimit und vorhandener Sitzungszuordnung verbinden; Ausgabeereignis und dauerhafte Outbox-Struktur für spätere Änderungen vorbereiten.
3. Mobile Web-Karte mit QR, Stand, Ziel und Belohnungsinformation anbieten. Öffentliche Kennung und geheime Verwaltungsberechtigung trennen.
4. Parallelklicks, wiederholten Request, Cookieverlust, fremde Kartenkennung und letzten freien Kartenplatz mit echten DB-Tests prüfen.

- [ ] Dieselbe berechtigte Sitzung erhält für dasselbe Programm keine zusätzliche Karte.
- [ ] Nach erster Ausgabe bleiben Sammelbedingungen auch bei späterer Archivierung/Löschung unveränderbar.

## v0.8.0 – Mitarbeiter scannt und bestätigt einen Stempel

**Ergebnis:** Der erste Sammelablauf funktioniert mit echten Karten. **Zuordnung:** LF-F-13, LF-F-17, LF-N-02, LF-N-03, LF-N-09; T-08, T-10, T-11, T-17 / AK-08, AK-10, AK-11, AK-17 anteilig; Pflichtenheft 4, 6.3, 7.1.

1. Gemeinsamen Stempelservice mit Kartensperre, erwarteter Zykluskennung, Payload-Fingerabdruck und stabiler Vorgangskennung implementieren.
2. Stempelereignis, Kartenstand, Zielerreichung und dauerhaften Outbox-Eintrag atomar speichern. Wallet-Verarbeitung folgt später; Aufträge erhalten.
3. Kamera-/manuellen Scanner mit Kartenauflösung, ausdrücklicher Bestätigung, blockierter Doppelbedienung und bestätigtem Ergebnis anbinden.
4. Fremde Karten, gesperrte Rollen, gleiche Kennung mit anderem Payload, Netzwerkwiederholung und mindestens 20 parallele Vorgänge prüfen.

- [ ] Genau eine erfolgreiche Bestätigung erzeugt genau einen Stempel; Kameraereignisse allein buchen nicht.
- [ ] Zielerreichung erzeugt bereits genau eine offene Belohnung und verhindert weitere Stempel, auch bevor die Einlöseoberfläche vorliegt.

## v0.9.0 – Belohnung einlösen und Stempel korrigieren

**Ergebnis:** Ein kompletter Web-Sammelzyklus ist nutzbar. **Zuordnung:** LF-F-17, LF-F-18, LF-F-19, LF-N-03; T-10, T-11 / AK-10, AK-11; Pflichtenheft 6.4.

1. Verfügbare Belohnung auf Web-Karte und Mitarbeiteransicht zeigen; Einlösung an konkrete Belohnungs- und Zykluskennung binden.
2. Einlösung, Zurücksetzen auf null, neuen Zyklus, Ereignis und Outbox gemeinsam transaktional speichern.
3. Begründete Korrekturen für OWNER/ADMIN als nachvollziehbare Ereignisse ergänzen; verfügbare Belohnung beim Unterschreiten des Ziels entwerten und im gleichen Zyklus kontrolliert reaktivieren.
4. Doppelte Einlösung, alte Requests nach Zykluswechsel, negative/zu hohe Korrektur, bereits abgeschlossene Zyklen und Parallelität prüfen.

- [ ] Eine Belohnung wird genau einmal eingelöst; danach beginnt der neue Zyklus bei null.
- [ ] Keine Korrektur überschreibt Historie oder hebt eine abgeschlossene Einlösung rückwirkend auf.

## v0.10.0 – Outbox zuverlässig verarbeiten und reparieren

**Ergebnis:** Gespeicherte Hintergrundaufträge überstehen Abbrüche und Anbieterfehler. **Zuordnung:** LF-F-12, LF-N-06, LF-N-07, LF-N-09; T-15, T-18 / AK-15, AK-18 anteilig; Pflichtenheft 8.4, 12.

1. Vorhandene Outbox-Einträge mit Workflow, transaktionalem Claim, Verarbeitungssperre und idempotenten Auftragskennungen verbinden.
2. Wiederholungsplan des Pflichtenhefts, Provider-Timeouts, dauerhafte Fehler und authentifizierten minütlichen Reparaturlauf implementieren.
3. Pro Zielressource Versand serialisieren, aktuellen Sollstand laden und veraltete Snapshots verhindern. Echte Provideradapter folgen in den Wallet-Paketen.
4. Absturz nach Buchungscommit vor Workflowstart, parallele Worker, abgelaufenen Claim, Timeout und Reparaturstart prüfen; interne Fehlerliste mit echten Zuständen anbieten.

- [ ] Wiederanlauf verliert keine fällige Arbeit und erzeugt keine zusätzliche fachliche Buchung.
- [ ] Simulierter Providererfolg wird als technischer Test, nicht als Apple-/Google-Geräteabnahme geführt.

## v0.11.0 – Karte in Apple Wallet ausgeben

**Ergebnis:** Eine bestehende Kundenkarte lässt sich auf einem echten iPhone speichern. **Zuordnung:** LF-F-10, LF-F-12, LF-N-02; T-05, T-07, T-17 / AK-05, AK-07, AK-17 anteilig; Pflichtenheft 8.1–8.2.

1. Zentralen Apple-Testzugang, Pass Type ID und Zertifikatskette prüfen; Secrets sicher anbinden und Bibliothekskompatibilität dokumentieren.
2. Apple-Adapter mit stabiler Seriennummer, passbezogenem Token, normalisiertem Snapshot und signierter `.pkpass`-Antwort implementieren.
3. Offiziellen Wallet-Button nur für berechtigte Kundensitzungen aktivieren; die bestehende Karte wiederverwenden und keine zusätzliche Karte zählen.
4. Erstausgabe, erneute Ausgabe, fehlendes/ungültiges Zertifikat und fremde Kartensitzung testen; Speicherung auf echtem iPhone dokumentieren.

- [ ] QR, Stempelstand, Ziel und Belohnung werden korrekt angezeigt; private Schlüssel bleiben serverseitig.
- [ ] Fehlenden Update-Webservice nicht als funktionsfähig ausweisen; vollständiges AK-05 bis v0.12.0 offen.

## v0.12.0 – Apple-Pässe aktualisieren

**Ergebnis:** Gespeicherte Apple-Karten erhalten spätere Stempel- und Brandingänderungen. **Zuordnung:** LF-F-10, LF-F-12, LF-N-06; T-05, T-07, T-15 / AK-05, AK-07, AK-15 anteilig; Pflichtenheft 8.2, 8.4.

1. Apple-Geräte-/Passregistrierungen und sämtliche vorgeschriebenen Webservice-Endpunkte mit Protokollauthentifizierung, Update-Cursor und Cache-Verhalten implementieren.
2. Aktualisierte signierte Passversion vor dem APNs-Hinweis bereitstellen; Outbox und ungültige Push-Token behandeln.
3. Stempel, Zielerreichung, Einlösung und Brandingänderung an bestehende Geräte verteilen; Seriennummer und Apple-Token unverändert lassen.
4. Registrierung, Abmeldung, fehlerhafte Tokens, mehrere Änderungen im gleichen Zeitfenster und Provider-/Prozessausfall prüfen; echten Geräteablauf dokumentieren.

- [ ] Auf dem iPhone wird nach Update der aktuelle Stand derselben Karte sichtbar.
- [ ] Bereitstellung und tatsächliche Geräteanzeige sind im Status und Nachweis getrennt; Offline-Zustellung wird nicht garantiert.

## v0.13.0 – Karte in Google Wallet ausgeben

**Ergebnis:** Eine bestehende Kundenkarte lässt sich auf einem echten Android-Gerät speichern. **Zuordnung:** LF-F-11, LF-N-02; T-06, T-07, T-17 / AK-06, AK-07, AK-17 anteilig; Pflichtenheft 8.1, 8.3.

1. Google-Testissuer, Dienstkonto, API-Zugriff und Modell für Kundenbranding prüfen; Produktionsfreigabe gesondert festhalten.
2. Loyalty Class je Programm und Object je Karte mit stabilen Kennungen anlegen; Wiederholung nach unklarem Anbieterergebnis sicher behandeln.
3. Offiziellen Google-Button und signierten Ausgabelink über die berechtigte Kundensitzung bereitstellen; dieselbe Kartenidentität wie Web und Apple vorsehen; gemeinsame Geräteabnahme in v0.14.0.
4. Reale Speicherung, erneute Ausgabe, fremde Sitzung, fehlende Zugänge und wiederholten Anbieterrequest prüfen.

- [ ] Google-Ausgabe belegt keinen zweiten Kartenplatz und zeigt den bestätigten Datenbankstand.
- [ ] Testissuer ist keine öffentliche Freigabe; vollständiges AK-06 bis v0.14.0 offen.

## v0.14.0 – Google-Updates und gemeinsame Wallet-Identität

**Ergebnis:** Web, Apple und Google bilden dieselbe Karte mit zuverlässigen Updates ab. **Zuordnung:** LF-F-10, LF-F-11, LF-F-12, LF-F-22, LF-N-06, LF-N-09; T-05, T-06, T-07, T-15 / AK-05, AK-06, AK-07, AK-15 anteilig; Pflichtenheft 8.

1. Google-Updates für Stempel, Belohnung, Einlösung und Branding mit dem vorhandenen Outbox-System verbinden.
2. Gewünschte und verarbeitete Version, Rate Limits, Timeout, Wiederholung und manuellen Reparaturauftrag implementieren; Providerantwort allein nicht als Geräteanzeige bezeichnen.
3. Mehrere aufeinanderfolgende Änderungen, alte Jobs und unklare Providerergebnisse serialisiert abgleichen.
4. Dieselbe Karte in beiden Wallets und im Web verwenden; Einlösung, erneute Ausgabe, gemeinsames Kontingent und Wiederanlauf auf echten Geräten nachweisen.

- [ ] Es gibt einen fachlichen Kartenstand und stabile Anbieterzuordnungen statt drei Sammelkonten.
- [ ] Alte Jobs hinterlassen keinen veralteten Endstand; Geräte-/Fehlernachweise liegen vor.

## v0.15.0 – Selbstscan mit statischem Geschäfts-Code

**Ergebnis:** Ein Kunde kann einen Stempel anfragen und ein Mitarbeiter ihn sicher freigeben. **Zuordnung:** LF-F-14, LF-F-16, LF-N-01, LF-N-02, LF-N-03; T-09, T-10, T-17 / AK-09, AK-10, AK-17 anteilig; Pflichtenheft 7.2–7.3.

1. Mandantengebundene Station, widerrufbaren statischen Code und zugehörige Konfigurationsoberfläche erstellen.
2. Kundensitzung, Karte und Station auf dasselbe Programm/Unternehmen prüfen; höchstens eine offene Anfrage pro Karte/Station und fünf Minuten Ablauf sichern.
3. Vergleichscode auf Kunden- und Mitarbeiterseite zeigen; Bestätigung oder Ablehnung nur für die konkrete autorisierte Anfrage zulassen.
4. Freigabe und Stempel atomar buchen; Ablauf, wiederholte Freigabe, Zykluswechsel, verlorene Sitzung, Stationssperrung und fremde Karte testen.

- [ ] Ohne Mitarbeiterbestätigung entsteht kein Stempel; der Vergleichscode ersetzt keine Autorisierung.
- [ ] Ohne Kundensitzung werden Mitarbeiter-Scan und, sobald vorhanden, Recovery angeboten; keine Wallet-Auslesung behaupten.

## v0.16.0 – Dynamischer Geschäfts-Code

**Ergebnis:** Der bestätigte Selbstscan funktioniert auch mit wechselndem Stationscode. **Zuordnung:** LF-F-15, LF-F-16, LF-N-02, LF-N-03; T-09, T-10 / AK-09, AK-10; Pflichtenheft 7.2–7.3.

1. Angemeldete Stationsanzeige mit neuer kryptografischer Challenge je 60-Sekunden-Fenster bereitstellen; Ablauf serverseitig bestimmen.
2. Gültige Challenge mit individuellen Anfragen verknüpfen. Die Stationschallenge nicht global beim ersten Kunden verbrauchen.
3. Anfragestatus und fünfminütigen Ablauf beibehalten; eine gültig erstellte Anfrage darf nach Codewechsel bearbeitbar bleiben, jedoch nicht nach Stationssperrung.
4. Mehrere gleichzeitige Kunden, abgelaufene Challenges, doppelte Bestätigung, Netzwerkwiederholung und Stationsrevision prüfen.

- [ ] Mehrere Kunden können denselben gültigen Code nutzen, aber jede Anfrage kann nur einmal buchen.
- [ ] Auch der dynamische Modus bleibt mitarbeiterbestätigt; es entsteht keine unbeaufsichtigte Vergabe.

## v0.17.0 – Freiwillige Recovery-Adresse verifizieren

**Ergebnis:** Endkunden können ihre Karte freiwillig mit einer bestätigten Adresse verknüpfen. **Zuordnung:** LF-F-20, LF-F-27, LF-F-28, LF-N-02, LF-N-04; T-12, T-17 / AK-12, AK-17 anteilig; Pflichtenheft 9.

1. Verschlüsselte Recovery-Identität, separaten HMAC-Suchwert und zweckgebundene gehashte Verifikationstokens mit 24 Stunden Gültigkeit implementieren.
2. Hinzufügen, Ersetzen und Entfernen nur aus berechtigter Kundensitzung erlauben; Adresse erst nach Verifikation aktivieren.
3. DE-/EN-Mails, Anfragelimits, neutrale Antworten und widerrufene/abgelaufene Tokens behandeln; Mailvorschau darf Tokens nicht unbeabsichtigt verbrauchen.
4. Fremde Adresse, fremde Karte, Wiederverwendung und Entfernung inklusive Widerruf offener Tokens testen; keine Klartextadressen in Logs oder Statistiken.

- [ ] Ohne bestätigte Adresse besteht kein Recovery-Zugriff; Nutzung bleibt freiwillig und konto-frei.
- [ ] Geheime Schlüssel und Token sind von Chat- und Wallet-Geheimnissen getrennt.

## v0.18.0 – Dieselbe Karte auf einem neuen Gerät wiederherstellen

**Ergebnis:** Ein verifizierter Kunde erhält Zugriff auf seine bestehenden Karten zurück. **Zuordnung:** LF-F-20, LF-N-02, LF-N-04; T-07, T-12, T-17 / AK-07, AK-12, AK-17 anteilig; Pflichtenheft 9.1.

1. Wiederherstellungsanforderung mit neutraler Antwort und Token von 15 Minuten Gültigkeit bereitstellen; getrennt vom Erstverifikationstoken behandeln.
2. Token bewusst per POST austauschen, aus URL/Referrer/Logs heraushalten und atomar verbrauchen; neue Kundensitzung auf ausgewählte bestehende Karte berechtigen.
3. Mehrere Karten einer verifizierten Adresse getrennt anbieten; keine automatische Zusammenführung, Neuausgabe oder unternehmensweite Freigabe.
4. Web- und Wallet-Zugriff nach Gerätewechsel, Replay, E-Mail-Vorschau, Ablauf, Adresswiderruf und neue Sitzung auf echten Geräten prüfen.

- [ ] Wiederherstellung verwendet die ursprüngliche Karte und ihr Kontingent; Stempel und Belohnung bleiben erhalten.
- [ ] Verlorene Wallet-Kopien werden nicht durch heimliche Änderung unveränderlicher Apple-Passtokens behandelt; Sperr-/Ersatzgrenzen sind verständlich.

## v0.19.0 – Bezahltes Abo in EUR und USD abschließen

**Ergebnis:** Ein Unternehmensinhaber kann Free kontrolliert auf Pro oder Business erweitern. **Zuordnung:** LF-F-21, LF-F-22, LF-F-23, LF-F-24, LF-N-03; T-13, T-14 / AK-13, AK-14 anteilig; Pflichtenheft 10.

1. Stripe-Testkunde und Abonnement an das Unternehmen binden; vier serverseitige Monats-Price-IDs für Pro/Business in EUR/USD konfigurieren.
2. Tarifauswahl und Checkout für Inhaber mit Firmen-/Rechnungsdaten, gewählter Währung, Stripe Tax und erlaubten Ländern implementieren. Preise bleiben 9,90 beziehungsweise 24,90 vor Steuern in der jeweiligen Währung.
3. Signierten Webhook am unveränderten Body prüfen, Ereignis dauerhaft dedupliziert speichern und Provider-Abgleich serialisiert verarbeiten.
4. Bezahlrechte erst nach bestätigter Zahlung und passendem Abozustand anwenden; Rückleitung zeigt echten Status, keine eigenständige Freischaltung.
5. Erfolgreiche, fehlgeschlagene und bestätigungspflichtige Testzahlung, falsche Preis-ID, fremdes Unternehmen, doppelte Events und unterbrochene Verarbeitung prüfen.

- [ ] Free benötigt keine Zahlungsmethode; unbestätigte Zahlung gewährt keinen höheren Tarif.
- [ ] Länderliste nur mit dokumentierten Freigaben; keine pauschale weltweite Steuerfreigabe.

## v0.20.0 – Abo verwalten und Bestandskarten schützen

**Ergebnis:** Abonnementänderungen halten Tarifgrenzen und zugesagte Bestandsregeln ein. **Zuordnung:** LF-F-21, LF-F-22, LF-F-23, LF-F-24; T-13, T-14 / AK-13, AK-14; Pflichtenheft 10.2–10.3.

1. Kundenportal für Rechnungen, Zahlungsdaten und Kündigung anbinden; Portaloptionen dürfen die Anwendungsregeln nicht umgehen.
2. Upgrade nach erfolgreicher anteiliger Zahlung sowie Downgrade/Kündigung zum Periodenende implementieren; Währung während laufendem Abo unveränderbar halten.
3. Siebentägige Zahlungsfrist für fehlgeschlagene Verlängerung einmalig beginnen, nicht durch wiederholte Events verlängern; danach Free und bei nachgeholter Zahlung erneuten Provider-Abgleich anwenden.
4. Periodischen Billing-Abgleich und Bestandsregel integrieren: vorhandene Karten und Mitarbeiter bleiben nutzbar; nur die jeweilige überzählige Neuanlage wird blockiert.
5. Eventreihenfolge, alte Events nach Upgrade, parallele Tarifwechsel, Zahlung nach Fristende und Überbestände testen.

- [ ] Kündigung löscht oder sperrt keine Bestandskarte und vernichtet keine verdiente Belohnung.
- [ ] Alle drei Tarifzustände mit echten Testmodus-Abos und DB-Prüfungen belegen.

## v0.21.0 – Tarifgerechte Statistiken und Business-Export

**Ergebnis:** Unternehmen erkennen ihre echte Nutzung innerhalb der gekauften Auswertungsrechte. **Zuordnung:** LF-F-25, LF-F-28, LF-N-01, LF-N-04; T-16, T-17 / AK-16, AK-17 anteilig; Pflichtenheft 11.1.

1. Gemeinsame Unternehmensaggregate für Karten, reguläre Stempel und tatsächliche Einlösungen bereitstellen; Korrekturen getrennt nachvollziehbar halten.
2. Free-Gesamtzahlen sowie Pro-/Business-Tageszeitreihen mit Zeitraum-, Programm-, Quellen- und Mitarbeiterfiltern anbieten. UTC-Auswertung sichtbar kennzeichnen.
3. Business-CSV aus den ausgewählten aggregierten Berichtsdaten erzeugen; Provider-/Recovery-Geheimnisse und Adressen ausschließen, Formelinjektion verhindern.
4. Fremde Filterkennungen, direkte Exportaufrufe mit kleinerem Tarif, Archivierung, Korrektur, Rollenrechte und DE-/EN-Darstellung prüfen.

- [ ] Nur echte KPIs; Zielerreichung zählt nicht als Einlösung.
- [ ] STAFF erhält über direkte API-Aufrufe keinen vollständigen Unternehmensbericht.

## v0.22.0 – Interne Betreuung und auditierbare Reparatur

**Ergebnis:** Der Betreiber kann Kundenunternehmen und fehlgeschlagene Aufträge kontrolliert betreuen. **Zuordnung:** LF-F-26, LF-N-01, LF-N-04, LF-N-07; T-02, T-15, T-16 / AK-02, AK-15, AK-16 anteilig; Pflichtenheft 3.3, 8.4, 11.3.

1. Vorhandene interne Unternehmensansicht um Tarif, Kontingente, Mitgliedschaften, offenen Billing-Abgleich und Wallet-Fehler erweitern.
2. Ausdrücklichen Supportkontext und Begründung für Sperren, Korrekturen und kontrollierte Reparaturaktionen verlangen; alle Aktionen auditieren.
3. Fehlgeschlagene Wallet-/Billing-Aufträge über dieselben Fachservices erneut anstoßen, ohne neue Stempel oder willkürliche Zählerwerte anzulegen.
4. Business-Priorität markieren; kein zusätzliches Ticketsystem bauen. Interne INTERN- und externe Konten negativ testen.

- [ ] Jede Änderung hat echten Akteur, Zielunternehmen und Grund; das Audit enthält keine sensiblen Rohdaten.
- [ ] Reparatur und Sicherheits-/Unternehmenssperre bleiben von Tarif-Downgrade und Programmarchivierung unterscheidbar.

## v0.23.0 – Kontrollierte Karten- und Unternehmenslöschung

**Ergebnis:** Berechtigte Löschungen und Widerrufe werden systemübergreifend nachvollziehbar ausgeführt. **Zuordnung:** LF-F-27, LF-N-02, LF-N-04, LF-N-06; T-12, T-15, T-18 / AK-12, AK-15, AK-18 anteilig; Pflichtenheft 9.3.

1. Kartenlöschung aus berechtigter Kundensitzung und Unternehmenslöschung nach erneuter Inhaberbestätigung als wiederanlaufbare Vorgänge anbieten.
2. Zuerst Zugriffe und Tokens widerrufen, offene Jobs neutralisieren und Pässe soweit unterstützt deaktivieren; lokale Wallet-Fernlöschung nicht garantieren.
3. Nicht mehr benötigte E-Mails, Zuordnungen und Assets entfernen; verbleibende fachliche Daten aggregieren/entkoppeln und freigegebene Aufbewahrungsprofile beachten.
4. Bereinigung für Tokens, Anfragen und Diagnoselogs gemäß Pflichtenheft terminieren; Lösch-/Widerrufsinformationen für Restore-Wiederanwendung sichern.
5. Parallele Buchung/Löschung, Teilabbruch, Providerfehler, erneuter Job und unzulässiger Löschaufruf gegen getrennte Testdaten prüfen.

- [ ] Entzogene Zugriffe funktionieren nach Löschen und Wiederanlauf nicht weiter.
- [ ] Rechtliche Aufbewahrung ist fachlich dokumentiert; weder pauschal alles löschen noch unbegrenzt alles behalten.

## v0.24.0 – Betriebsüberwachung und geprüfter Wiederanlauf

**Ergebnis:** Betrieb, Datenwiederherstellung und kontrollierte Migration sind nachgewiesen. **Zuordnung:** LF-N-06, LF-N-07, LF-N-08, LF-N-10; T-15, T-18 / AK-15, AK-18 anteilig; Pflichtenheft 11.3, 12.

1. Betriebsanleitung mit Secrets-Konfiguration, Zertifikatsrotation, Providerfreigaben, Alarmkanal, Job-/Webhook-Reparatur und Löschung erstellen.
2. Alarmbedingungen für Rückstände, dauerhafte Fehler, Zahlungsfristen, fehlenden Reparaturlauf und Zertifikatsablauf implementieren und auslösen.
3. Additive Migration und Deployment an repräsentativem getrenntem Testbestand erproben; Rücknahmeplan erhält angenommene Buchungen statt pauschalem Datenbankreset.
4. Sicherung in separater Umgebung wiederherstellen, Jobs kontrolliert starten und bereits wirksame Widerrufe/Löschungen erneut anwenden. Getrennte Providerzugänge sicherstellen.
5. CI-/Ruleset-Nachweise und erforderliche Betreiberhandlungen mit tatsächlichen Belegen erfassen; nicht aus vorhandener Workflowdatei auf verpflichtende Merge-Sperren schließen.

- [ ] Wiederherstellungsprobe und Alarmtests sind ausgeführt, nicht nur beschrieben.
- [ ] Es entsteht weder durch Restore noch durch erneute Jobs eine zusätzliche Buchung oder ein wieder gültiger widerrufener Zugriff.

## v0.25.0 – Gesamtabnahme und geschlossener Gerätepilot

**Ergebnis:** Das vollständige Produkt ist im kontrollierten Pilot gegen alle vereinbarten Anforderungen geprüft. **Zuordnung:** LF-F-01 bis LF-F-28, LF-N-01 bis LF-N-10; T-01 bis T-18 / AK-01 bis AK-18; Pflichtenheft 12–13.

1. Alle Anforderungen, bisherigen Versionsnachweise und Abnahmefälle vollständig abgleichen; frühere Teilnachweise nach relevanten Folgeänderungen gezielt wiederholen.
2. Geschäftskunden-Onboarding, Free und beide Bezahltarife, beide Wallets, beide Scanverfahren, Einlösung, Recovery, Auswertung und Löschung mit Pilotunternehmen durchlaufen.
3. iPhone/iOS/Safari sowie Android/Chrome inklusive Kamera verweigert, manueller Eingabe, Netzwerkausfall, mehreren Mitarbeitern und Kundensitzungsverlust dokumentieren.
4. Antwortzeit, Walletverzögerung und Betriebskosten mit Umgebung und Methode messen; keine unbelegten Grenzwerte/SLA veröffentlichen.
5. Mängel im jeweiligen Paket beziehungsweise als konkrete Patchversion bearbeiten; anschließend betroffene Prüfungen erneut ausführen. Keine unbeauftragten Zusatzfunktionen aufnehmen.

- [ ] Vollständige Testmatrix und Pilotprotokoll besitzen konkrete Ergebnisse statt pauschaler Erfolgsbehauptung.
- [ ] Sämtliche notwendigen technischen und Geräteprüfungen sind bestanden; noch ausstehende Produktionsfreigabe wird ausdrücklich getrennt geführt.

## v1.0.0 – Vollständiges Release freigeben

**Ergebnis:** Der gesamte vereinbarte SaaS-Umfang wird an einem eindeutig bezeichneten Stand für Produktion abgenommen. **Zuordnung:** LF-F-01 bis LF-F-28, LF-N-01 bis LF-N-10; T-01 bis T-18 / AK-01 bis AK-18; Pflichtenheft 12–14.

1. Geprüften Release-Stand festhalten und vollständige Freigabecheckliste mit allen AK-01 bis AK-18 und Nachweisen zusammenstellen. Kein Funktionspaket unter dieser Version nachträglich improvisieren.
2. Live-Zertifikate, Google-Veröffentlichungsfreigabe, zentrales Kundenbranding-Modell, Stripe-Livepreise in beiden Währungen, Steuer-/Länderfreigabe, E-Mail-Absender und Betriebsverantwortlichkeiten nachweisen.
3. Betreiber-/Rechtsgrundlagen, Aufbewahrung, Datenschutz, Rücknahmeplan und priorisierten Supportweg mit tatsächlichen Zuständigkeiten bestätigen.
4. Die vorgeschriebene ausdrückliche Auftraggeberfreigabe für diesen Stand und den Produktionsumfang einholen. Ohne sie Registrierung und Livezahlungen nicht öffentlich aktivieren.
5. Nur im genehmigten Umfang ausrollen, kontrollierten Produktions-Smoke-Test ohne künstliche Kundenbuchungen durchführen und Monitoring sowie Supportübergabe protokollieren.
6. Bei erfolgreicher vollständiger Abnahme den Versionsnachweis finalisieren, diesen Abschnitt nach A.1 archivieren und den Dokumentkopf auf „Keine offenen Versionen im vereinbarten Umfang“ setzen.

- [ ] Alle Muss-Anforderungen und externen Voraussetzungen sind belegt; keine offene Sicherheits-, Buchungs-, Abrechnungs- oder Datenverlustlücke.
- [ ] Ausdrückliche Freigabe und tatsächlicher Betriebszustand stimmen überein; Pilotfreigabe wird nicht als Produktionsfreigabe verwendet.
- [ ] Erledigte Versionsblöcke bleiben vollständig im verlinkten Archiv.

## Nachweis v030

26.10.2026 · Basis d26fd848f36207e52ba917ce40528024c295a820; Codex. Lokal einschließlich 0.3.4–0.3.7 übernommen, mit begrenzter manueller Prüfausnahme unten. Einzelbelege inzwischen gelöscht; technische Regeln bleiben verbindlich. Zuordnung: LF-F-03/04/22, LF-N-01/05; T-/AK-02/10/13/17 anteilig; Pflichtenheft 3, 4, 10.1. v0.2.0 ist lokal übernommen, siehe [Nachweis](#nachweis-v020).

### Verhalten und überprüfbare Kriterien vor Implementierung

- OWNER und ADMIN sehen und verwalten die Mitarbeiter ihres Unternehmens; STAFF erhält keine Mitarbeiterverwaltung. Unternehmenswechsel zeigt nur berechtigte Unternehmen und ersetzt keine erneute serverseitige Prüfung. Globale Academy-Rollen verleihen keine Unternehmens-Schreibrechte.
- OWNER darf STAFF und ADMIN einladen sowie ADMIN vergeben/entziehen. ADMIN darf nur STAFF einladen/verwalten; keine Änderung an OWNER-/ADMIN-Mitgliedschaften, Eigentümerschaft oder Abrechnung. Entfernte oder gesperrte Nutzer dürfen auch aus bereits geöffneten Fenstern keine weiteren Änderungen ausführen.
- Einladungen verwenden kryptografisch zufällige Tokens, ausschließlich gehasht gespeichert, mit sieben Tagen Gültigkeit. Annahme setzt eine aktuelle Sitzung und die bestätigte passende Zieladresse voraus. Fremde, unbestätigte, abgelaufene oder widerrufene Zugänge scheitern ohne Mitgliedschaftsanlage.
- Aktive Mitglieder einschließlich Inhaber plus offene, nicht abgelaufene Einladungen belegen Nutzerplätze (Free 1, Pro 5, Business 20). Vorhandene aktive Mitglieder zählen nicht doppelt. Anlage, Annahme, Ablauf und Widerruf berücksichtigen Reservierungen transaktional unter Unternehmenssperre. Free hat mit seinem Inhaber keinen freien Einladungsplatz. Bezahlprofile werden ausschließlich in der getrennten Testumgebung simuliert; keine Zahlungsfreischaltung.
- Genau ein aktiver Inhaber bleibt erhalten. Nur dieser überträgt atomar an ein aktives Mitglied; bisheriger Inhaber wird ADMIN. Direkte Entfernung des Inhabers und unberechtigte Übertragungen scheitern.
- Erfolg wird erst nach bestätigter Speicherung angezeigt. Ein unklarer Netzwerkausgang wird mit derselben Vorgangskennung wiederholt; gleicher Schlüssel mit abweichendem Inhalt scheitert ohne Seiteneffekt. Einladungsanlage und bestätigter Mailversand müssen als getrennte Zustände erkennbar sein; fehlgeschlagener Versand darf keinen Zustellerfolg vortäuschen.
- Nachzuweisen: direkte Service-/Action-/API-Negativfälle für fremde IDs, manipulierte Rollen, Rechteentzug und Kontosperren; echte DB-Prüfungen für doppelte Annahme, Widerruf/Ablauf, atomaren Eigentümerwechsel und mindestens 20 parallele Wiederholungen sowie unabhängige Einladungen am letzten Platz. DE/EN einschließlich E-Mails, 360px, Tastatur/Fokus und Lade-/Leer-/Fehler-/Erfolgszustände gehören zum Paket.

### Daten- und Transaktionskonzept (Schritt 2)

**Bestandsabgleich:** `OrganizationMembership` ist je Unternehmen/Benutzer eindeutig. Die Migration `20261023090000_add_organization_foundation` enthält den partiellen Unique-Index für höchstens einen aktiven OWNER und verzögerte Constraint-Trigger für genau einen Inhaber am Transaktionsende. Beides bleibt erhalten. `getOrganizationContext` liest aktuelle Identität, Mitgliedschaft, Unternehmensstatus und Tarif. Alle Mitgliedschaftswege einschließlich `addStaffMembership` müssen denselben Kapazitätsservice einschließlich Einladungsreservierungen verwenden. `freeEntitlement` bleibt außerhalb isolierter Testsimulationen auf FREE begrenzt.

**Additive Datenhaltung, in Schritt 3 vorbereitet und auf separater Test-DB migriert; App-DB unverändert:**

| Modell | Felder und Sicherungen |
| --- | --- |
| `OrganizationInvitation` | ID, Unternehmens-FK, normalisierte Zieladresse, Zielrolle ausschließlich ADMIN/STAFF, eindeutiger SHA-256-Tokenhash, Status PENDING/ACCEPTED/REVOKED/EXPIRED, `expiresAt`, Erstellerkennung, Zeitstempel und bei Annahme Benutzerkennung. Konsistenzchecks für Rolle, Ablauf und Annahmezustand; Index für Unternehmen/Status/Ablauf. Partiell eindeutig je Unternehmen/Zieladresse bei PENDING. Abgelaufene PENDING-Zeilen werden unter Unternehmenssperre vor erneuter Einladung geschlossen. Empfängeradresse ist notwendiges personenbezogenes Fachdatenfeld, kein Audit-/Loginhalt. |
| `OrganizationOperation` | Unternehmens-FK, serverseitig ermittelte Akteurkennung, UUID-Vorgangskennung, Aktion, SHA-256-Fingerabdruck des normalisierten Inhalts, minimale Ergebnisreferenz und Abschlusszeit. Eindeutiger Schlüssel aus Unternehmen/Akteur/Vorgangskennung; Aktion ist Teil des Fingerabdrucks. Gemeinsamer Commit mit Mutation und Audit; keine erfolgreichen Belege für zurückgerollte Versuche. |
| Versandangaben an der Einladung | Versandversuch-ID, Status NOT_SENT/PROVIDER_ACCEPTED/FAILED/UNKNOWN, gegebenenfalls Providerreferenz und Zeitpunkt. Kein Klartexttoken, Mailbody oder ungefilterter Providerfehler. PROVIDER_ACCEPTED bezeichnet Anbieterannahme, keinen bestätigten Posteingang. Tokenwechsel ersetzt die Versandversuch-ID; verspätete Rückmeldungen dürfen nur ihren eigenen Versuch aktualisieren. |

Normalisierung nutzt dieselbe Trim-/Kleinschreibung wie Geschäftskonten, ohne anbieterabhängige Punkt-/Plusadress-Umschreibung. Ablauf wird mit einer aktuellen DB-Zeit **nach** Erwerb der Sperren geprüft (kein veralteter Transaktionsstartzeitpunkt). Abgelaufene Einladungen zählen sofort nicht mehr; ein Hintergrundjob ist dafür keine Voraussetzung. Ein entzogenes Mitglied kann nur über eine neue berechtigte Einladung reaktiviert werden. Aktive Mitglieder werden bei Einladung abgewiesen statt doppelt reserviert; durch andere zulässige Wege inzwischen aktive Empfänger werden bei Annahme nicht nochmals angelegt oder automatisch hochgestuft.

**Gemeinsamer Schreibablauf:** Neue serverseitige Mitgliedschaftsservices bedienen Actions und den betroffenen HTTP-Einladungsweg. Akteur ausschließlich aus der Sitzung; Eingaben und Ressourcenbezug serverseitig validieren. Innerhalb der DB-Transaktion sperren: Unternehmen, betroffene Benutzerzeilen in sortierter ID-Reihenfolge, betroffene Mitgliedschaften und Einladung. Danach aktuelle Identität/Sperre, Unternehmensstatus, Mitgliedschaft und Berechtigungen erneut lesen. Fremde IDs liefern keine Fremddaten. Änderungen an Entitlement/anderen Mitgliedschaftswegen müssen dieselbe Unternehmenssperre beachten. Benutzerrollen-/Kontosperränderungen konkurrieren über die gesperrten Benutzerzeilen.

Nach aktueller Grundautorisierung kann ein zum Akteur gehörender abgeschlossener Vorgang mit gleichem Fingerabdruck sein minimales Ergebnis erneut liefern, ohne die Mutation zu wiederholen; abweichender Inhalt liefert CONFLICT. Ein entfernter/gesperrter Akteur erhält auch beim Replay keinen Zugriff. Bei einem bereits vollzogenen Eigentümerwechsel darf der nun aktive ADMIN seinen eigenen Vorgangsbeleg lesen, ohne erneut OWNER-Rechte auszuüben. Neue Vorgänge benötigen sämtliche aktuellen Aktionsrechte. Technische Konflikte werden nur begrenzt mit derselben Kennung wiederholt; andere Fehler bleiben Fehler. Der Browser behält Kennung und Eingabe bei unbekanntem Ergebnis bei; bewusste neue Absichten verwenden neue Kennungen.

**Zustandsübergänge:**

1. **Einladen:** Rolle gemäß Matrix prüfen, abgelaufene Reservierungen schließen, aktive Mitgliedschaft und doppelte offene Einladung ausschließen. Aktive Mitglieder plus gültige Reservierungen unter Unternehmenssperre zählen; bei erreichtem Limit abbrechen. 32 zufällige Bytes erzeugen, nur deren Hash speichern; Ablauf sieben Tage ab Anlage. Einladung, Reservierung, Audit und Vorgangsbeleg gemeinsam committen. Kein Token im Ergebnis des Verwaltungsformulars.
2. **Annehmen:** Öffnen des Links verändert nichts. Bestätigungs-POST mit Sitzung, passender bestätigter aktueller E-Mail und gültigem Token prüft die Einladung unter Sperre erneut. PENDING wird ACCEPTED und die Mitgliedschaft aktiv; dieselbe Reservierung wird durch die Mitgliedschaft ersetzt, keine zweite Platzbelegung. Nach einem Downgrade ist eine noch gültige Reservierung kein zusätzlicher Platz; bestehende Limits sperren neue Einladungen, nicht diese Umwandlung. Ein inzwischen aktives Mitglied behält seine Rolle; die Reservierung wird freigegeben. Wiederholte Annahme kann nur demselben akzeptierenden Benutzer das bestätigte Ergebnis liefern und darf eine später entzogene Mitgliedschaft niemals reaktivieren. Token-/Zustandsfehler bleiben neutral. Konten werden nicht allein anhand der eingegebenen Zieladresse übernommen oder umgerollt.
3. **Widerrufen/ablaufen lassen:** Nur eine gültige offene Einladung kann widerrufen werden; ADMIN nur STAFF-Einladungen. Statuswechsel, Freigabe und Audit gemeinsam committen; abgelaufene Einladungen sind unabhängig vom noch gespeicherten Status unwirksam. Annahme gegen Widerruf/Ablauf wird durch dieselbe Unternehmenssperre entschieden.
4. **Rolle ändern/entfernen:** OWNER verwaltet ADMIN/STAFF, ADMIN ausschließlich STAFF. OWNER wird über diese Wege weder herabgestuft noch entfernt. Rechteentzug und Audit committen gemeinsam; weitere Schreibvorgänge lösen aktuelle Rechte neu auf. Bestehende Sessionrollen sind kein Berechtigungsnachweis.
5. **Eigentum übertragen:** Aktueller OWNER und aktives, nicht gesperrtes Zielmitglied desselben Unternehmens; kein Selbstwechsel. Unter Sperre alten OWNER zuerst auf ADMIN setzen, danach Ziel auf OWNER. Dadurch verletzt kein Zwischenstatement den sofortigen Unique-Index; der verzögerte Trigger prüft genau einen Inhaber beim Commit. Audit und Vorgangsbeleg gehören zur selben Transaktion; Fehler rollt alles zurück. Mitgliedschaften und Daten bleiben erhalten.

**Mailgrenze und Wiederaufnahme:** Erst nach Commit sendet der Server den nur im Speicher gehaltenen zufälligen Token über einen eigenen DE/EN-Einladungsadapter. Eigener fester Produktpfad, sieben Tage Gültigkeit, keine Wiederverwendung der einstündigen Accountmail. Prozessabbruch nach Commit oder Timeout bleibt NOT_SENT/UNKNOWN; ein Replay der ursprünglichen Anlage erzeugt weder eine neue Einladung noch einen neuen Token und behauptet keinen Versand. Bewusstes „Erneut senden“ mit neuer Vorgangskennung rotiert unter derselben Unternehmenssperre den Token einer noch gültigen PENDING-Einladung, ohne zusätzlichen Platz und ohne Verlängerung der ursprünglichen Frist. Der alte Link wird ungültig; darauf weist die UI hin. Abgelaufene/widerrufene Einladungen benötigen eine neue Anlage samt Limitprüfung. Der alte Klartexttoken ist nicht rekonstruierbar; daher kein automatischer Versand-Retry aus einem dauerhaften Klartext-Outboxeintrag. Versandlimits je Akteur/Unternehmen/Ziel werden serverseitig dauerhaft geprüft; Anbieteraufrufe halten keine DB-Sperre. Links/Token bleiben aus Logs, Analytics und Referrern; Linköffnung ist keine Annahme.

**Migration, Tests und Rücknahme:** Prisma-Modelle und additive SQL-Migration mit Indizes/Checks sind vorbereitet; bestehende Migrationen bleiben unverändert. Separater Testdatenbestand muss Bestandsschutz, Constraints, 20 konkurrierende Wiederholungen/unabhängige letzte-Platz-Anfragen, Annahme gegen Widerruf, Rechteentzug, Eigentümerwechsel und Versandabbruch belegen. Alle Mitgliedschaftswege einschließlich `addStaffMembership` auf Reservierungsumgehung prüfen. Keine automatische Migration aus App oder Tests, keine neue Migration auf App-/Test-DB ohne ausdrückliche Umfangsfreigabe. Rücknahme vor lokaler Übernahme: neuen Zugang/Handler deaktivieren und getesteten Softwarestand wiederherstellen; additive Tabellen, bestätigte Mitgliedschaften und Widerrufe erhalten. Kein Down/Reset am belegten Bestand. Wegen QL-008 keine vollständige Neuinstallations-/Restorefähigkeit behaupten.

### Freigabe und Anwendung der separaten Testmigration – 26.10.2026

Auftraggeber hat die konkrete separate Testanwendung mit „Ja“ freigegeben: Commit 6a76b1519911d359d84be9a8482eee75236e59e3, ausschließlich prisma/migrations/20261026120000_add_organization_invitations/migration.sql; SHA256 90017b2d5426fb070d70855161be1aec6264a0b4bb232bc6fb9202751e52a4df. Nur bestätigte entbehrliche LOYALTY_TEST_DATABASE_URL, public-Schemakontext, Transaktion; keine App-DB oder pauschale migrate-deploy-/Seed-/Resetfreigabe.

Vor Anwendung SQL/Ziel/Bestand erneut verglichen, OrganizationInvitation/OrganizationOperation samt Constraints angelegt, danach genau zugehörigen Migrationseintrag registriert. Alle 34 bisherigen Tabellen vor Tests laut aggregiertem Vergleich unverändert; nach Fixturebereinigung 36 Tabellen im erwarteten Zustand, neue Tabellen leer. Damals vier Loyalty-Dateien und vier Checks/129 Tests bestanden. Doppelte Test-URL-Übergabe und unzulässige Paid-Fixture zuvor fehlgeschlagen, durch isolierte Übergabe bzw. FREE plus Testmodul-Kapazitätssimulation korrigiert; keine Schutzlockerung.

Codex-Selbstreview am 26.10.2026. Rücknahme: vor Commit Rollback, danach Zugang deaktivieren und additive Tabellen, Bestand und Widerrufe erhalten; kein destruktives Down. QL-008/Restore-/Produktfreigabe weiter offen. Erneute/andere DB-Anwendung braucht konkrete Freigabe.

### Unterschritt 0.3.4 – Oberfläche, Actions/API und Einladungsmails

26.10.2026, vor Implementierung: Bezeichnungen 0.3.4–0.3.7 sind vom Auftraggeber benannte Unterschritte von v0.3.0, keine neuen Paketversionen. 0.3.4 verbindet die vorhandenen Services mit Mitarbeiterliste, Einladungen/Versandstatus, Rollenänderung, Entfernung und ausdrücklich bestätigter Eigentumsübertragung. OWNER/ADMIN sehen die Verwaltung, ADMIN nur STAFF-Aktionen; STAFF und globale Supportansichten erhalten keine Verwaltung. Bestehende Unternehmensauswahl bleibt der Wechselweg. Direkte Actions/API prüfen aktuelle Sitzung, Rolle und Ressourcenzugehörigkeit unabhängig von Buttons.

Da nur die separate Test-DB migriert ist, bleibt der neue Zugang ohne explizites `STEMPELFI_MEMBERS_ENABLED=1` und `DATABASE_ENV=development/test` geschlossen. Keine Änderung lokaler .env-Dateien, App-Migration oder öffentliche Freischaltung. Erfolgreiche Speicherung und Mailanbieterannahme werden getrennt angezeigt; unklarer Provider-/Prozessausgang bleibt unbekannt. Replay derselben Absicht sendet keine zweite Mail. Bewusstes erneutes Senden rotiert den Link ohne Fristverlängerung/zusätzlichen Platz. Providerstatus aktualisiert nur den zugehörigen Versandversuch; Klartexttoken gelangen nie in Action-/API-Ergebnisse oder Logs.

Annahmeseite ist ein fester Produktpfad, GET verändert nichts. Angemeldete Nutzer bestätigen ausdrücklich per POST; Zieladresse/Verifikation/Token werden serverseitig geprüft. Ohne Sitzung führt ein Link zum bestehenden Login mit festem Einladungskontext; nach bestätigter Anmeldung vollständige Dokumentnavigation zum festen sprachgerechten Einladungspfad mit genau einmal aufgebautem validiertem Fragment, kein freier Return-URL-Mechanismus (Korrektur QL-015). DE/EN und bestehende shadcn-/Themeelemente, Labels/Fokus, 360px-Umbruch sowie Lade-/Leer-/Fehler-/Erfolgszustände. Prüfkriterien: direkte Action-/Handler-Negativtests, Versandfehler/Replay/stale Providerstatus, Übersetzungsparität, vier Softwarechecks; Mailzustellung und verbliebene Bedienungs-/Gerätefälle sind unter 0.3.6 getrennt ausgewiesen. LF-F-03/04/22, LF-N-01/05; T-/AK-02/10/13/17 anteilig. Lokale Übernahme/Ausnahme siehe 0.3.7.

**Umsetzung/Review 0.3.4 – 26.10.2026:** Mitgliederansicht und Annahmeseite, `membershipAction`, POST-Verträge `/api/loyalty/organizations/[organizationId]/invitations` und `/memberships`, gemeinsame Eingabe-/Sitzungsprüfung sowie DE/EN-Resend-Adapter implementiert. Listen enthalten sämtliche gültigen Reservierungen plus die letzte abgeschlossene/abgelaufene Historie; keine Tokenhashes oder Klartexttoken in Browserdaten/HTTP-Antworten. Annahmelink nutzt URL-Fragment, Sprachwechsel erhält es; keine GET-Annahme. Aktuelle Fachservices bleiben Autorität. Absichten behalten bei unklarem Actionergebnis Eingabe/UUID im Formular; gespeicherte Vorgänge und Mailanbieterannahme sind getrennt. Dauerhafter UNKNOWN-Status vor Provideraufruf und Update anhand Versandversuch-ID schützen gegen falsche Versanderfolge/veraltete Antworten. Keine neue Migration/Dependency oder Änderung lokaler .env-Dateien.

Auf ausdrücklichen Folgeauftrag bleibt `quality-environment.mjs` versioniert; die zentrale Liste von Anbieter-/Zugangsnamen ist entfernt. Stattdessen werden sämtliche geerbten und lokal definierten Werte geleert; nur Betriebssystem-/Prüfruntime-Positivliste und isolierte Prüfplatzhalter werden übernommen. Neue unbekannte Konfigurationsnamen benötigen keinen Katalogeintrag. Test-/DB-Guards bleiben aktiv; keine Git-Historienänderung oder Veröffentlichung. Ein zusätzlicher Verhaltenstest prüft unbekannte geerbte Werte und unveränderte Elternumgebung.

Historische Teilprüfung: vier Checks/138 Tests, vier echte DB-Dateien und anteilige DE/EN-/360px-Browserfälle; Codex-Selbstreview. Abschließender Prüf-/Gerätestand unter 0.3.6; keine vollständige Abnahme aus diesem Zwischenlauf.

### Unterschritt 0.3.5 – ergänzende Fach- und Versandprüfungen

26.10.2026, vor Ergänzung: Bestehende Regeln und Schema bleiben maßgeblich. Neue Nachweise für Free/Pro/Business-Nutzergrenzen einschließlich 20 paralleler Wiederholungen und unabhängiger letzter-Platz-Vorgänge; Annahme gegen Widerruf und Rechteentzug/Herabstufung, konkurrierende Eigentumswechsel, direkte Actions/API mit aktuellen DB-Rechten trotz gefälschter Sessionrolle, alte Token nach Rotation und verspätete Mailanbieterantworten. Pro/Business nur durch lokale Testmodul-Kapazität simulieren; echte Entitlements und DB-Constraints bleiben FREE. Keine Migration, App-DB, echte E-Mail oder öffentliche Freischaltung. Erforderliche Korrekturen bei gefundenen Fehlern gezielt umsetzen und erneut prüfen. LF-F-03/04/22, LF-N-01/03; T-/AK-02/10/13 anteilig. UI-/Geräte-/Posteingangsstand unter 0.3.6, erteilte lokale Übernahme unter 0.3.7.

26.10.2026 · Historisches Ergebnis (Manifest inzwischen gelöscht): ergänzende Prüfungen abgeschlossen; keine Änderung an Produktlogik, Schema oder Fachregeln erforderlich. Paid-Grenzen bleiben ausschließlich im Testmodul simuliert, die FREE-only-DB-Sicherung unverändert.

Historische Teilprüfung: vier Checks/139 Tests, fünf DB-Dateien mit acht Fällen bestanden; 20-fache Wiederholung/Konkurrenz je isoliert simuliertem Profil, reale Constraints und Adapter. Versandantworten hier injiziert, keine echte Mail. Nach Bereinigung 36 Tabellen laut Vergleich unverändert; Codex-Selbstreview. Abschließender Stand nachfolgend.

### Unterschritt 0.3.6 – Bedienungs-, Zustands- und Zustellungsprüfung

LF-F-03/04/22, LF-N-01/02/03/05/08; T-/AK-02/10/13/17 anteilig. Nur bestätigte separate Loyalty-Test-DB und synthetische Fixtures, keine App-DB/Migration/öffentliche Aktivierung. OWNER/ADMIN/STAFF, Fremdzugriff, Rechteentzug, explizite Annahme, DE/EN-Zustände, 360px/Tastatur und echte Geräte getrennt prüfen. Speichern und Providerannahme bleiben getrennt, unbekannter Netzwerkausgang ohne Erfolg. 0.3.4–0.3.7 sind Unterschritte, keine eigenen Paketversionen.

**Implementierte Korrekturen:** kryptografische UUID-v4 über native randomUUID oder getRandomValues, Erzeugungsfehler sichtbar und ohne Serveraktion; Retry behält Kennung/Inhalt, kein Math.random-/Zeit-Fallback. Portal-/Einladungsheader mit Kontoadresse, vorhandener Better-Auth-Abmeldung, bestätigter Navigation, DE/EN-Pending-/Fehlerzustand, Fokus und mindestens 44px Touchziel; öffentliche Landingpage ohne Sitzungsabruf. Responsive Produktnavigation von Sprache/Theme getrennt, Rollen/Kapazität/Bestätigungen erhalten. Einladungslogin nach bestätigter Auth-Antwort als vollständige Dokumentnavigation zu festem sprachgerechtem Ziel mit genau einmal aufgebautem Fragment; keine freie Return-URL/Tokenquery/-ablage/automatische Annahme, strenger Duplikatparser bleibt. Technische Details zusätzlich im Pflichtenheft.

**Historischer Abschlussstand:** vier Checks/148 Tests und fünf echte Loyalty-Dateien/neun Fälle bestanden; darunter 20-facher Replay je Mitgliedsaktion, aktuelle DB-Rechte trotz gefälschter Session, Rollen-/Mandanten-/Limit-/Inhaberschutz, Tokenrotation und veraltete Versandantworten. Pro/Business nur im Testmodul, FREE-Constraint unverändert. Codex-Selbstreview; Fehlversuche (SWC-Sandboxzugriff, unzulässige Fixtures, falsch zugeordneter Mail-Testempfänger) nicht als Erfolg gewertet. Keine neuen offenen Codebefunde aus diesem Review; vollständige manuelle Abnahme fehlt.

**Mail/Geräte:** korrigierter echter Resend-Test: DE-Einladung und EN-Rotation eingegangen und vom Auftraggeber als lesbar bestätigt; Replay ohne Zusatzmail, unveränderte Frist. Send-only-Schlüssel belegt keine Provider-Ereignisse. iPhone 15/Safari am Hotspot: Rollenwechsel STAFF↔ADMIN, Entfernung nur mit Checkbox, Free-Limitfehler DE/EN, lesbares Light/Dark, deutsche Abmeldung und spätere frische Erstannahme bestätigt; letzter DB-Abgleich ACCEPTED/ACTIVE-STAFF. Frühere PC-/Replayannahmen waren kein Erstannahmebeleg. Kein Android-/Walletnachweis. Alle Fixtures gezielt bereinigt, Bestand aller 36 Tabellen wiederhergestellt, Testserver gestoppt; alte Zugänge/QR ungültig.

| ID / Aufgabe | Status, Auswirkung und Erledigungskriterium; verantwortlich Codex/Umsetzung |
| --- | --- |
| QL-012 | Headerumbruch korrigiert, DE/EN bei 360px im Browser geprüft; echter iPhone-Nachtest und abschließende Design-/Präsentationsabnahme offen. |
| QL-013 | Fehlende randomUUID auf HTTP-Gerätetest für Mitgliedermutationen behoben und Rollenwechsel auf iPhone bestätigt. Registrierung-/Gründungsformulare auf weitere Aufrufstellen/HTTP-Kompatibilität separat prüfen, nicht mitabgenommen. |
| QL-014 | Abmeldung/Kontowechsel implementiert, deutscher Erfolgsfall auf iPhone bestätigt; englischer Gerätefall und echte Netzfehler-/Pendingprüfung offen, kein separater UI-Verhaltenstest behauptet. |
| QL-015 | Doppeltes Tokenfragment beim Login-Rückweg reproduziert/korrigiert; DE-PC-Rundlauf und EN-Ziel automatisiert geprüft. Kontrollierter iPhone-Rundlauf nach letzter Korrektur sowie EN-Browserdurchlauf offen; frühere Erstannahme ersetzt diesen Nachtest nicht. |
| Weitere manuelle Fälle | ADMIN-/STAFF-/fremde Browserwege (direkter STAFF-Aufruf zuvor nur bis Laden beobachtet), Unternehmenswechsel/Leerzustände, DE/EN-Mutations-/Fehlerzustände, Eigentumsübertragung am Gerät, bereits offenes Fenster nach Rechteentzug, echte Netzunterbrechung/Retry ohne Scheinerfolg. Vollständige Desktop-/360px-/Theme-/Tastaturabnahme des letzten Gesamtstands nicht ableiten. |

Auftraggeber beendete die gemeinsamen manuellen Tests am 26.10.2026. Vor Fortsetzung neue getrennte Fixtures vorbereiten; alte Zugänge nicht wiederverwenden, weitere Mail nur bei konkretem Testbedarf. Fehlende Fälle bleiben offen gemäß nachfolgender befristeter Ausnahme.

### Teilpaket-Checkliste und nächster Schritt

| Zustand | Ergebnis / Grenze |
| --- | --- |
| Implementiert | Services, additive Testmigration, Adapter/UI und Versandstatus; Zugänge nur explizit im Entwicklungs-/Testmodus, keine App-Anwendung. |
| Automatisiert geprüft | Historischer Umfang unter 0.3.6; keine erhaltenen Rohbelege/Manifeste. |
| Geräteabgenommen | Nur dort genannte Einzelfälle; QL-012/014/015 und weitere manuelle Fälle offen. |
| Produktiv freigegeben | Nein; vollständige AK-01–18, Geräte-/Betriebs-/Providerbelege fehlen. |

Nächstes Entwicklungspaket v0.4.0 nach Register; fehlende Gerätefälle spätestens gemäß Ausnahme nachholen. Keine automatische Folgeversion/Veröffentlichung.

### Unterschritt 0.3.7 – Lokal übernommen

26.10.2026 · Auftraggeber verlangt Abbruch der manuellen Tests und Entwicklungsabschluss v0.3.0 für anschließende Arbeit an v0.4.0. Konkreter Stand: Basis `d26fd848f36207e52ba917ce40528024c295a820` plus Software-SHA256 `232e70e55f3c9a536f8a3966a96388e886966d76bd133c0377b643a48f93ed94` und Patch-SHA256 `ad0a113e173d5459744deae187e73038368ee73c81fba7b3fa3303b127492ec2` (historische Kennungen, Manifest gelöscht). Implementierung, vier Checks (148 Tests), separate DB-Fachtests und Review wie oben belegt; keine Folgeänderung am Produktcode. Fixture 2 vollständig bereinigt, 36 Tabellen auf Ausgangsbestand abgeglichen, Testserver gestoppt. Codex-Selbstreview: bestehender Gesamtdiff/ungetrackter Stand und Bereinigungshelfer geprüft; feste synthetische IDs/E-Mails/Rolle/Slug, explizite Test-DB-Identität, Transaktion und vollständiger Bestandsvergleich vor Commit, keine Rohdaten-/Tokenausgabe. Keine neuen offenen Codebefunde; Dokumentationsprüfung mit konsistenten Links/Kennungen und git diff --check.

**Am 26.10.2026 vom Auftraggeber ausdrücklich genehmigt („Ich gebe frei.“):** Lokale Übernahme als Entwicklungspaket und befristete Ausnahme ausschließlich von der vollständigen manuellen Abschlussprüfung nach Q-P-03/04/05/06 sowie Abschnitt A.6 für v0.3.0. Grund: Auftraggeber beendet gemeinsame Gerätetests, Entwicklung soll mit v0.4.0 fortgesetzt werden. Umfang: QL-012 iPhone-Nachtest, QL-015 kontrollierter iPhone-Rücksprung nach letzter Korrektur, restliche manuelle Rollen-/Unternehmenswechsel-/Zustands-/Eigentums-/Rechteentzugs-/Netzwerkfälle. Automatisierte Nachweise bleiben gültig im belegten Umfang; ungeprüfte Fälle werden nicht bestanden markiert. Risiko: geräte-/bedienungsabhängige Fehler können trotz Software-/DB-Prüfung unentdeckt bleiben. Verantwortlich: Umsetzung/Nachprüfung Codex, lokale Entscheidung Auftraggeber. Ablauf: Nachholung vor Pilot-/Produktfreigabe, bei Änderungen am betroffenen Ablauf bereits vor dessen Abnahme. Muss-Anforderungen, Sicherheits-/Fachregeln und Produktfreigabesperren bleiben unverändert; keine Ausnahme von serverseitigen Rechten/Integrität. Genehmigung für konkreten Stand und diese Entwicklungsgrenze: **erteilt**. v0.3.0 einschließlich 0.3.6/0.3.7 als lokales Entwicklungspaket abgeschlossen und übernommen; vollständige Geräteabnahme bleibt ausstehend. Abschluss im Archiv referenziert; ursprünglicher Paketblock bei der Dokumentationskürzung vom 27.10.2026 verdichtet. Kein Merge/Push/Deployment, keine App-DB-Anwendung. v0.4.0 heute nicht implementiert.

## Nachweis v020

**Stand:** Basis fcf7e23f939bba662dfda16b2d0aaf04334cdf01 plus Software-SHA256 f3744911b62cbe452517e732ddf40831b268833dec5535975ba13c2e23dffeb4; damaliges Manifest gelöscht. 23.10.2026, Windows, Node 24.21.0/npm 12.2.0. Voraussetzungen: v0.1.0 übernommen; getrennte Loyalty-Test-DB sowie Resend-Testaccount und eigenes Testpostfach ausdrücklich bestätigt. LF-F-02/03/28, LF-N-02; T-/AK-01/02/17 anteilig.

Verhalten: Nur der explizit aktivierte Entwicklungs-/Pilotzugang registriert neue CUSTOMER-Konten im bestehenden Better-Auth-Bestand. Verifikation/Reset nutzen gehashte, einstündige Einmaltokens und dauerhafte DB-Limits; Links werden erst nach Bestätigung verbraucht. Nach Verifikation und Anmeldung entstehen Unternehmen/Inhaber/Free/Audit gemeinsam und idempotent. Bestandskonten werden nicht umgewandelt; Rollen und feste Loginziele werden serverseitig geprüft. Keine Migration. Rücknahme: Pilotzugang schließen, Bestandsdaten erhalten.

| Checklistenbereich | Stand / maßgeblicher Beleg |
| --- | --- |
| Implementiert / Academy-Regression | Vier Checks bestanden, 115 Tests ohne Fehler/Skips, Build: Prüflauf. Keine neue Dependency, Lockfile unverändert. |
| Echte DB-Integrität | Drei Loyalty-Fachtests bestanden: neue Konto-/Token-/Reset-/Limitfälle sowie bisherige Mandanten-/Portalregression; 20-fache Wiederholungen und unabhängige Anfragen: DB-Lauf. |
| DE/EN / Browser | 13 aktuelle Prüfungen bestanden: 360px, sichtbarer Tastaturfokus, neutrale Fehler, Verifikation, Einrichtung, Wiederaufnahme, Replay, Academy-Abweisung, tatsächlicher Sitzungswiderruf und erneute Anmeldung nach Reset; Sprachwechsel erhält Modus/Token: Ergebnisse, Unternehmen. |
| Echte E-Mails | Alle vier DE/EN-Verifikations-/Resetmails vom Auftraggeber als angekommen bestätigt: Nachweis. Erster Versand mit nicht verifiziertem Absender scheiterte; mit onboarding@resend.dev erfolgreich. Versandbeschränkter Schlüssel erlaubt keine Provider-Ereignisabfrage; kein solcher Zustellbeleg behauptet. |
| Daten / Bereinigung | Ausschließlich separate Test-DB; synthetisches Konto/Unternehmen und zugehörige Tokens entfernt, temporäre Geheimnisdatei gelöscht, Testserver/Browser beendet: Kontrolle. Normale App-Konfiguration bleibt ohne Pilotfreischaltung. |
| Review | Codex-Selbstreview: Transaktionen/Locks, aktuelle Rechte, fremde IDs/Rollen, neutrale Antworten, feste Rücksprungziele und Versandfehler geprüft. DB-Lock-Rückgabetyp, sichtbarer Fokus und Sprachwechsel korrigiert; neue Belege/Diff/Verweise geprüft, keine neuen offenen Befunde. Frühere Fehlläufe bleiben historisch. |
| Geräte / Betrieb / Freigabe | Lokaler Browsernachweis ersetzt keine echte Geräte- oder vollständige AK-Abnahme. Geräte-/Provider-/Betriebsfreigaben und bestehende QL-004–008 bleiben offen. Implementiert, automatisch/lokal geprüft und nach Q-C-07 ausdrücklich lokal übernommen; Paket abgeschlossen. Kein Merge, Deployment oder öffentliche Freischaltung. |

**Übernahmeentscheidung:** Lokale Übernahme vom Auftraggeber am 23.10.2026 nach Erläuterung der Academy-Auswirkungen ausdrücklich im Chat freigegeben: Basis fcf7e23 plus Software-SHA256 f3744911b62cbe452517e732ddf40831b268833dec5535975ba13c2e23dffeb4. v0.2.0 lokal übernommen und abgeschlossen. Keine Pilotfreischaltung, kein Merge oder Deployment.

Abschlussreview: Codex-Selbstreview, 23.10.2026; Software-/Beleghashes unverändert bestätigt, Paketblock vollständig archiviert, Nachweis am bisherigen Dokumentort erhalten. Status, Verweise und gesamter Dokumentdiff geprüft; Softwarechecks nicht anwendbar – reine Abschlussdokumentation.

## Änderungshistorie

27.10.2026 · 1.10: beauftragten v0.5.0-Plan mit Verhalten V050-01–08, Unterschritten und getrennter Teilcheckliste konkretisiert; Status in Vorbereitung, keine Migrations-/Übernahmefreigabe. Technische Spezifikation und Lastenheft konsistent ergänzt; Ergebnisse ausschließlich NACHWEISE.md.

27.10.2026: Dokumentation auf gültige Entscheidungen, technische Regeln und offene Aufgaben verdichtet; frühere Ergebnislisten/Versuchsverläufe entfernt. LF-/T-/AK-Kriterien, offene Paketblöcke und konkrete Freigabegrenzen erhalten. Codex-Selbstreview; reine Dokumentation, vier Softwarechecks nicht anwendbar. Aktuelles Dokumentationsprüfergebnis ausschließlich in [NACHWEISE.md](../nachweise/NACHWEISE.md).

27.10.2026 · 1.11: ausdrückliche Textgrenzenänderung auf 40/250/160 samt Zeichenzähler/Grenzwarnung in Paketkriterien und beiden Heften übernommen; keine Migration oder neue Freigabe.

Auftraggeberänderung 27.10.2026: aktuelle Textgrenzen Name 40, Beschreibung 70, Gratisbelohnung 40 Zeichen; ersetzt vorherige 40/250/160-Grenzen. Zentrale Zod-/Formulargrenzen, Zähler und Grenzwarnung gelten unverändert gemeinsam; keine Migration oder Datenkürzung. LF-F-06/28, LF-N-05, T-/AK-03/17 anteilig. Ergebnisse ausschließlich NACHWEISE.md.

Auftraggeberänderung 27.10.2026, v0.5.3: ausschließlich StempelFi-Logoablage auf privaten Cloudflare-R2-Testbucket umstellen, gespeicherte STEMPELFI_R2-Konfiguration verwenden und live testen. Ersetzt die UploadThing-Ablage für neue StempelFi-Logos; Academy-Uploads bleiben unverändert. Zod-/Sharp-/Rollen-/Mandanten-/Revisionsregeln bleiben erhalten. Getrennte serverseitige Speicheranbindung mit aws4fetch (MIT), S3-Signaturheader und Region auto, nur HTTPS-R2-Accountendpoints, keine öffentlich ausgegebenen Credentials oder signierten Browserlinks. Objektschlüssel deterministisch nach Unternehmen/Vorgang/normalisiertem Inhalt; DB speichert weiterhin Schlüssel, keine neue Migration. Kein Import/Löschen alter UploadThing-Objekte; alte Schlüssel werden nicht an R2 fehlgeleitet. V053-01–05 gelten weiter; bestehende historische UploadThing-Nachweise belegen R2 nicht. Live-Test nur bestätigter R2-Testbucket und getrennte Loyalty-Test-DB mit Kindprozess-Opt-in; eigene synthetische Dateien/Zeilen bereinigen, Fremdbestand erhalten. Ergebnisse nur NACHWEISE.md.

27.10.2026 · 1.12: ausdrückliche R2-Umstellung ausschließlich für StempelFi-Logos, Testkonfiguration und Unterschritt v0.5.3 konkretisiert; lokale HTTP-Nutzung unverändert. Prüf-/Anbieterstand nur im zentralen Nachweis.

27.10.2026 · 1.13: v0.5.4-Verhalten und Kriterien V054-01–05 vor Umsetzung konkretisiert; Teilcheckliste auf R2 und aktuellen Editornachweis aktualisiert. Keine Fachregel-/Schema-/Freigabeänderung.

27.10.2026 · 1.14: Prüfauftrag V055-01–04, HTTP-/Portal-Integration und ausgefüllte Teilcheckliste mit offenen Restnachweisen; Navigationskorrekturen innerhalb v0.5.0, keine neue Fachregel, Migration oder Übernahmeentscheidung. Ergebnisse ausschließlich NACHWEISE.md.

27.10.2026 · 1.15: ausdrücklicher QL-018-Korrekturauftrag mit Kriterien für beide Historyrichtungen, positionsbasierte Wiederherstellung und DE/EN-Verwerfungsdialog; zugehöriger Prüf-/Erledigungsstand ausschließlich im Nachweis. Keine automatische Paketübernahme oder Folgeversion.

27.10.2026 · 1.16: V055-05/06 für Antwortverlust nach Commit und verbleibende repräsentative Bedien-/Regressionsfälle konkretisiert; bestehende Teilcheckliste auf tatsächliche Restprüfung und separate Geräte-/Bestandsuploadgrenzen aktualisiert. Speicheranbieter unverändert gemäß Auftraggeberbestätigung; keine Migration, Paketübernahme oder Folgeversion.

27.10.2026 · 1.17: manuelle Restcheckliste für iPhone/Safari, Android/Chrome und unveränderte Academy-UploadThing-Uploads im bestehenden Paketabschnitt für Rechnerwechsel ergänzt; Kontextbereitstellung auf ausdrücklichen Auftraggeberwunsch, gemeinsamer Commit mit Code durch Auftraggeber. Keine neue Test-/Übernahmefreigabe.
