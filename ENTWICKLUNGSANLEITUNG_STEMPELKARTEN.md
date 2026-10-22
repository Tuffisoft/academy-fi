# Entwicklungsanleitung: Stempelkarten-SaaS

| Merkmal | Festlegung |
| --- | --- |
| Dokumentversion / Datum | 1.0 / 22.10.2026 |
| Zielgruppe | Codex und andere Coding-Agenten |
| Arbeitsweise | Genau eine Version pro Auftrag; UI und Backend je Ablauf gemeinsam entwickeln. |
| Versionsfolge | Start v0.0.1; neue Funktionen erhöhen die Minor-Version, Korrekturen die Patch-Version. |
| Ziel | Vollständiges, abgenommenes Release v1.0.0 gemäß den beiden Heften. |
| Nächste offene Version | v0.0.1 |
| Zuletzt abgeschlossene Version | Noch keine; die Erstellung dieser Anleitung implementiert kein Softwarepaket. |
| Geplante Pakete | 28 einschließlich Qualitätsbasis und vollständiger Produktfreigabe. |

## A. Verbindliche Grundlage und Versionsregeln

Vor jedem Auftrag [AGENTS.md](AGENTS.md), [Lastenheft](LASTENHEFT_STEMPELKARTEN.md), [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md) und die vorhandenen versionsbezogenen Freigaben lesen. Diese Anleitung zerlegt den Umfang in ausführbare Aufträge; sie ersetzt keine Muss-Anforderung und erteilt keine pauschale Produktionsfreigabe.

Die Nummern beziehen sich auf das Stempelkarten-Modul, unabhängig von `package.json`, Dokumentversionen und der Academy als Ganzem. Deshalb für einen Modulfortschritt nicht automatisch die globale Paketversion ändern. Keine Versionsnummer wiederverwenden oder nachträglich umnummerieren. Die geplanten Minor-Versionen sind neue Funktionen; v0.0.1/v0.0.2 behandeln die bestehende Ausgangsbasis. Kleine spätere Korrekturen können als zusätzliche Patch-Aufträge eingefügt werden, beispielsweise `v0.7.1 – Mobile Kartenansicht verbessern`. Solche Zusatzaufträge brauchen einen konkreten Befund; keine Fehler oder UI-Arbeit zur Erfüllung einer Versionsnummer erfinden.

Jede Version baut auf den vorherigen auf. Eine Abhängigkeit zählt nur dann als erfüllt, wenn ihr Nachweis existiert; eine Versionsüberschrift oder ein Kommentar ersetzt ihn nicht. Begonnene, blockierte und teilweise geprüfte Versionen bleiben offen. Änderungen späterer Versionen dürfen nicht unbemerkt in den aktuellen Auftrag gezogen werden. Notwendige Vorarbeiten sind auf den aktuellen Ablauf zu begrenzen und im Versionsnachweis zu erklären.

### A.1 Ein Auftrag, eine Version

1. Den gewünschten Versionsabschnitt und seine Abhängigkeiten identifizieren. Ohne andere Auswahl ist die nächste offene Version maßgeblich.
2. Den tatsächlichen Repository-Zustand prüfen; vorhandene Arbeit nicht neu implementieren oder überschreiben. Git-Stand, aktuelle Regeln, Testskripte und geänderte Dateien erfassen.
3. Verhalten, erlaubte Rollen, Erfolgs-/Fehlerfälle und betroffene LF-/T-/AK-Kennungen vor Änderungen im Versionsnachweis beschreiben.
4. Nur dieses Paket umsetzen. Oberfläche, serverseitige Autorisierung, Fachservice, Datenhaltung und relevante DE-/EN-Texte zusammen liefern, soweit im Paket vorgesehen.
5. Fachtests, notwendige echte Integrationstests und die vier allgemeinen Checks ausführen. Mobile Bedienung, Tastatur und Zustandsanzeigen bei betroffenen Oberflächen prüfen.
6. Ergebnis und Quelltext reviewen; Prüfer, Stand, Befunde und Erledigung dokumentieren. Ein Selbstreview als solches kennzeichnen; keinen unabhängigen Review behaupten.
7. Freigaben für sensible Übernahme/Merge oder produktive Anwendung gemäß `Q-C-07` an einem konkreten geprüften Stand einholen beziehungsweise vorhandene passende Autorisierung belegen. Reversible Vorbereitung und isolierte Tests davor vollständig erledigen.
8. Bei erfüllten Abschlussbedingungen den Abschnitt nach A.3 auskommentieren und den Kopf der Anleitung aktualisieren. Anschließend Ergebnis und verbleibende Einschränkungen berichten; nicht selbstständig die nächste Version starten.

### A.2 Versionsnachweis und allgemeine Abschlussbedingungen

Für jede bearbeitete Version die vorhandene [Freigabevorlage](FREIGABECHECKLISTE.md) als eigene Datei im Repository-Hauptverzeichnis verwenden, zum Beispiel `FREIGABE_STEMPELKARTEN_v0.7.0.md`. Dort Verhalten, Umsetzungsstand, Commit beziehungsweise Datei-/Patchhashes, Prüfungen, Review, Ausnahmen und die genaue Freigabegrenze dokumentieren. Dateien nicht bloß als leere Vorlage anlegen.

Für alle Versionsabschnitte gelten zusätzlich zu ihrer lokalen Checkliste:

- [ ] Der angekündigte Umfang ist implementiert, die relevanten Erfolgs-, Fehler- und Berechtigungsfälle sind geprüft.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` und `npm run check:build` wurden ausgeführt; `npm run check` führt alle vier auch nach einem Einzelfehler aus.
- [ ] Notwendige echte Datenbank-/Providerprüfungen sind mit sicher zugeordneter Testumgebung nachgewiesen. Mocks und Skips ersetzen sie nicht.
- [ ] Betroffene Academy-Regression, DE/EN sowie Bedienung ab 360 CSS-Pixeln und mit Tastatur sind belegt oder begründet nicht anwendbar.
- [ ] Review ist dokumentiert; keine neuen ungelösten Mängel, keine verdeckte Regelumgehung und keine erforderliche offene Freigabe für den beanspruchten Abschlussumfang.
- [ ] Die Freigabedatei trennt implementiert, automatisch geprüft, auf Geräten abgenommen und produktiv freigegeben. Eine Entwicklungsversion ist keine öffentliche Produktfreigabe.

Bekannte Altfehler bleiben als `QL-`-Einträge mit Auswirkung sichtbar. Ein fehlgeschlagener Check wird nicht durch Dokumentation grün. Wenn eine Regel für den beanspruchten Abschluss eine zulässige ausdrückliche Ausnahme verlangt, muss deren konkrete Genehmigung vorhanden sein. Ohne ausreichende Nachweise den Abschnitt nicht auskommentieren; vorbereitete Arbeit und offene Punkte darin dokumentieren. Nicht betroffene Vorbereitung kann nach den geltenden Regeln weitergehen, aber nur im Rahmen des erteilten Versionsauftrags.

Neue Unit-Tests in die explizite npm-Testliste aufnehmen. Neue Datenbanktests in einen ausdrücklich getrennten Integrationseinstieg einbinden; die vorhandenen Chat-Integrationstests führen neue Loyalty-Dateien nicht automatisch mit aus. Keine produktiven Migrationen, Seeds, Testzahlungen oder Providerdaten zum Prüfen verwenden.

### A.3 Abgeschlossene Abschnitte auskommentieren, nicht löschen

**Nach Abschluss den vollständigen Versionsblock inklusive Überschrift, Schritte, Zuordnung und Checkliste in einen HTML-Kommentar einschließen.** Dabei die Checkliste im Quelltext als erledigt belassen. Es wird nichts aus der Historie gelöscht und kein abgeschlossener Abschnitt auf eine andere Versionsnummer umgeschrieben.

Beispiel des Quelltextformats, ausdrücklich kein bereits erledigtes Paket:

```markdown
<!-- ABGESCHLOSSEN: v0.7.0
Datum: <tatsächliches Abschlussdatum>
Nachweis: FREIGABE_STEMPELKARTEN_v0.7.0.md
Stand: <geprüfter Commit bzw. Datei-/Patchhash>
Freigabeumfang: <z. B. Entwicklung, nicht Produktion>

## v0.7.0 – Anonyme Kundenkarte und Web-Ansicht

<Den vorhandenen vollständigen Versionsabschnitt unverändert hier belassen.>
-->
```

Keine verschachtelten HTML-Kommentare erzeugen. Kommentaröffner und -schließer gehören auf eigene Zeilen; der nächste offene Versionsabschnitt steht außerhalb des Kommentars. Markdown-Vorschauen blenden den erledigten Abschnitt aus, der Quelltext bewahrt ihn. Anweisungen oder Prüfungen, die offene Pakete ermitteln, müssen Kommentare und das obige Codebeispiel berücksichtigen; eine Suche allein nach `## v` genügt nicht.

Anschließend im Dokumentkopf „Zuletzt abgeschlossene Version“ und „Nächste offene Version“ samt vorhandenem Nachweis aktualisieren. Nach v1.0.0 lautet der nächste offene Auftrag „Keine; vereinbarter Umfang abgeschlossen“. Die Grundlagen A und der Übergabeauftrag B bleiben sichtbar. Teilweise erledigte Arbeit erhält lediglich `[x]` für nachgewiesene Einzelschritte; der gesamte Versionsblock bleibt sichtbar.

### A.4 Ausgangsstand und externe Vorbereitungen

Bei Erstellung basiert die Anleitung auf dem Repository-Stand `198ea2d`. Die beiden Hefte beschreiben das Ziel; der vollständige SaaS-Umfang ist noch nicht implementiert. `AGENTS.md` nennt offene Qualitätslücken, insbesondere Bewertungsgewichtung (`QL-002`), Build (`QL-003`), echte Integrationsnachweise (`QL-004`), Academy-Abgrenzung (`QL-005`), CI-/Node-Nachweise (`QL-006`) und Produktfreigabe (`QL-007`). Diese Angaben vor v0.0.1 neu prüfen, nicht ungeprüft als aktuellen Lauf übernehmen. Die frühere Aussage im Pflichtenheft zu fehlenden Tests ist mit dem inzwischen wiederhergestellten Testbestand abzugleichen.

Apple-Zertifikate, Google-Issuer/Veröffentlichungsfreigabe, getrennte Testdatenbank, Stripe-Testzugang, E-Mail-Absender, reale Geräte und Betreiberzuständigkeiten werden schon ab v0.0.1 vorbereitet. Das ist Abhängigkeitsmanagement, keine vorgezogene Implementierung aller Wallet-/Billing-Versionen. Fehlende Live-Freigaben dürfen isolierte Entwicklung nicht als abgeschlossen vortäuschen, müssen aber nicht jeden unbetroffenen Vorbereitungsschritt verhindern.

## B. Wiederverwendbarer Auftrag an den Coding-Agenten

```text
Bearbeite ausschließlich die Version <VERSION> aus
ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md.

Lies zuerst AGENTS.md, Lastenheft, Pflichtenheft und die zugehörigen
Versionsnachweise. Prüfe die Abhängigkeiten und den tatsächlichen Bestand.
Beschreibe Verhalten, Rollen, Fehlerfälle und LF-/T-/AK-Bezug vor Änderungen.
Implementiere das Paket einschließlich relevanter UI, DE/EN, serverseitiger
Prüfungen und notwendiger Tests. Beachte die allgemeinen Abschlussbedingungen.
Dokumentiere Ergebnis, Prüfläufe, Review und Freigabeumfang in einer ausgefüllten
FREIGABE_STEMPELKARTEN_<VERSION>.md.

Nur wenn die Abschlussbedingungen wirklich erfüllt sind: Kommentiere den
vollständigen Versionsabschnitt gemäß A.3 aus, bewahre seinen Inhalt und
aktualisiere den Dokumentkopf. Bei offenen Nachweisen bleibt der Abschnitt
sichtbar; markiere nur belegte Teilschritte und nenne den konkreten Blocker.
Starte anschließend keine weitere Version und veröffentliche nichts automatisch.
```

## v0.0.1 – Ausgangsstand und belastbare Qualitätsbasis

**Ziel:** Der Agent kann künftige Versionen auf einem nachvollziehbaren Stand bearbeiten. **Bezug:** LF-N-08, LF-N-10; T-18 / AK-18 anteilig; Pflichtenheft 12–13. **Voraussetzung:** Keine abgeschlossene Modulversion erforderlich.

1. Repository, Regeln, vorhandene Tests und aktuelle `QL-`-Einträge erfassen; alle vier Checks ausführen und neue von bestehenden Fehlern unterscheiden.
2. Bestätigte Konfigurations-/Prüfprobleme im vereinbarten Umfang beheben, insbesondere Node-24-Vorgabe und tatsächlich vorhandene CI-Verweise. Keine Fachregel nur für grüne Tests ändern.
3. Für `QL-002` die benötigte Produktentscheidung zur Bewertungsgewichtung konkret vorbereiten und bei weiterhin offenem Widerspruch einholen; keine der konkurrierenden Gewichtungen eigenmächtig auswählen.
4. Getrennte Loyalty-Testumgebung und automatisierte Testeinstiege vorbereiten, ohne unbekannte Datenbanken zu migrieren. Fehlende Betreiberzugänge und Anbieterfreigaben mit Verantwortlichkeit festhalten.
5. Veraltete Bestandsaussagen in technischen Dokumenten gezielt und versioniert berichtigen; globale Produktanforderungen bleiben bestehen. Prüfergebnis, Review und verbleibende `QL-`-Punkte dokumentieren.

- [ ] Bestandsprüfungen und Zuständigkeiten sind aktuell; offene Entscheidungen werden nicht als erledigt geführt.
- [ ] Die Qualitätsbasis erfüllt den dokumentierten Abschlussumfang; keine unzulässige Ausnahme oder pauschale Testausblendung.
- [ ] Zugangsvoraussetzungen für DB-, Geräte-, Wallet- und Billing-Pakete sind sichtbar.

## v0.0.2 – Interne Academy-Zugriffe ausdrücklich absichern

**Ziel:** Ein zukünftiges Geschäftskonto erhält durch Anmeldung keine internen Academy-Rechte. **Bezug:** LF-F-01, LF-N-01, LF-N-02; T-01, T-02, T-18 / AK-01, AK-02, AK-18 anteilig; Pflichtenheft 3. **Voraussetzung:** v0.0.1.

1. Alle bisherigen Sitzungsprüfungen und internen Einstiegspunkte erfassen, einschließlich Actions, Chat/Realtime, Datenlisten, PDF-APIs und Upload-Middleware.
2. Ausdrückliche interne Guards für `OWNER`/`INTERN` und einen gesonderten Plattform-Owner-Guard einführen. Allgemeine Anmeldung darf keine Academy-Zulassung mehr bedeuten.
3. Direkte negative API-/Action-Tests mit einer nicht internen Identität ergänzen; entfernte/gesperrte Rechte und manipulierte Rollen prüfen. Die öffentliche Registrierung bleibt deaktiviert.
4. Bestehende Academy-Anmeldung und relevante Kernabläufe gegen Regression prüfen.

- [ ] Geschützte Seiten und direkte Endpunkte weisen externe Identitäten zurück.
- [ ] Bisherige berechtigte Academy-Nutzer bleiben arbeitsfähig; `QL-005` nur im tatsächlich nachgewiesenen Teil aktualisieren.

## v0.1.0 – Mandantenbasis und gemeinsamer Berechtigungskontext

**Ziel:** Unternehmen und Mitgliedschaften sind sicher voneinander getrennt. **Bezug:** LF-F-03, LF-F-21, LF-N-01, LF-N-03; T-02, T-13, T-18 / AK-02, AK-13, AK-18 anteilig; Pflichtenheft 3–4, 10.1.

1. Additive Modelle für Unternehmen, Mitgliedschaft, Audit und lokalen Free-Berechtigungsstand samt globaler Rolle `CUSTOMER` vorbereiten; vorhandene Rollen nicht umdeuten.
2. Migration reversibel vorbereiten und ausschließlich auf freigegebenem separatem Testbestand anwenden; zusammengesetzte Ressourcen-/Mandantenzuordnungen prüfen.
3. Unternehmens-Guards und getrennten internen Administrationskontext als gemeinsame Services bereitstellen. Die drei Tarifprofile zentral definieren, ohne Bezahltarife unbezahlt öffentlich freizuschalten.
4. Eine minimale interne Unternehmensdetailansicht anbinden; fremde Kennungen, entzogene Mitgliedschaft und atomare Platzprüfung mit echten DB-Tests prüfen.

- [ ] Globale und Unternehmensrollen sind getrennt; Zugriffe können keine Mandantengrenze überspringen.
- [ ] Tarifdefinitionen entsprechen 1/5/unbegrenzt Programmen, 1/5/20 Nutzern und 100/1.000/10.000 Karten.

## v0.2.0 – Geschäftskonto registrieren und Unternehmen einrichten

**Ziel:** Ein verifizierter Inhaber erreicht sein eigenes Free-Unternehmen. **Bezug:** LF-F-02, LF-F-03, LF-F-28, LF-N-02; T-01, T-02, T-17 / AK-01, AK-02, AK-17 anteilig; Pflichtenheft 3.4, 5.

1. Produktbezogene Registrierung, Anmeldung, Verifikation und Passwortreset mit DE-/EN-Texten anlegen; neue Konten serverseitig ausschließlich als `CUSTOMER` erzeugen.
2. Nach E-Mail-Verifikation Unternehmen, Inhabermitgliedschaft und Free-Zuordnung idempotent erstellen; unterbrochenes Onboarding fortsetzbar gestalten.
3. Loginziele für interne und externe Konten trennen, zulässige Rücksprungziele prüfen und Bestandskonten ohne automatische Übernahme behandeln.
4. Fehler-, Wiederholungs-, Token- und Manipulationsfälle testen; Registrierung vorerst nur für die kontrollierte Entwicklungs-/Pilotumgebung öffnen.

- [ ] Ein Geschäftskonto gelangt nach Verifikation in sein Unternehmen und nie allein durch Registrierung in die Academy.
- [ ] Ratenlimits, tatsächliche E-Mail-Zustellung in der Testumgebung und neutrale Kontofehlermeldungen sind geprüft.

## v0.3.0 – Mitarbeiter, Einladungen und Eigentümerschaft

**Ziel:** Ein Unternehmen kann seine berechtigten Mitarbeiter verwalten. **Bezug:** LF-F-03, LF-F-04, LF-F-22, LF-N-01; T-02, T-10, T-13 / AK-02, AK-10, AK-13 anteilig; Pflichtenheft 3, 4, 10.1.

1. Mitgliederliste, Einladungsformular, Rollenänderung, Entfernung und Unternehmenswechsel mit den erlaubten OWNER-/ADMIN-/STAFF-Aktionen verbinden.
2. Einladungen mit gehashtem Token, sieben Tagen Gültigkeit und reserviertem Platz implementieren; Annahme an bestätigte Zieladresse binden.
3. Genau einen Unternehmensinhaber und atomare Eigentümerübertragung sichern; ADMIN darf weder Eigentümerschaft noch Abrechnung übernehmen.
4. Parallele Einladungen am letzten Platz, Ablauf, Widerruf, doppelte Annahme und sofortigen Rechteentzug prüfen. Bezahltarifprofile nur in der getrennten Testumgebung simulieren.

- [ ] Nutzerplätze einschließlich Inhaber und offenen Reservierungen werden korrekt angewendet.
- [ ] Kein entfernter Mitarbeiter kann aus einem offenen Fenster weiter schreiben.

## v0.4.0 – Kundenportal und interne Unternehmensübersicht

**Ziel:** Die getrennten Arbeitsbereiche sind im Alltag navigierbar. **Bezug:** LF-F-01, LF-F-03, LF-F-26, LF-F-28, LF-N-05; T-01, T-02, T-16, T-17 / AK-01, AK-02, AK-16, AK-17 anteilig; Pflichtenheft 5, 11.

1. Kundenportal unter dem vereinbarten Produktpräfix mit Unternehmensauswahl, Navigation und echten Unternehmensdaten aufbauen.
2. Interne Unternehmenssuche und Detailansicht auf Plattform-Owner begrenzen; interne Supportauswahl ausdrücklich anzeigen und protokollieren.
3. Noch nicht gelieferte Funktionen klar als noch nicht verfügbar darstellen, ohne funktionslose Erfolgsbuttons oder erfundene KPIs.
4. Lade-, Leer-, Fehler- und Erfolgszustände, 360-Pixel-Ansicht, Tastatur und DE/EN prüfen.

- [ ] Geschäftskunden sehen ausschließlich ihre Bereiche und tatsächlichen Daten.
- [ ] Rollenbezogene Navigation und direkte serverseitige Prüfungen stimmen überein.

## v0.5.0 – Programm anlegen und Karte gestalten

**Ziel:** Inhaber und Admin können einen echten Programmentwurf gestalten und speichern. **Bezug:** LF-F-05, LF-F-06, LF-F-28, LF-N-05; T-03, T-17 / AK-03, AK-17 anteilig; Pflichtenheft 4, 6.1.

1. Programmmodell, Editorservice und Entwurfsübersicht implementieren; Logo, Farben, Symbol, Texte, positives ganzzahliges Ziel und Gratisbelohnung validieren.
2. Mandantengeprüften Bild-Upload mit kontrollierter Rasterverarbeitung anbinden; keine beliebigen URL-Abrufe oder ungeprüfte aktive Bildinhalte.
3. Apple-, Google- und Web-Vorschau aus gemeinsamen normalisierten Darstellungsdaten erzeugen, ohne bereits funktionierende Wallet-Ausgabe zu behaupten.
4. Speichern, erneutes Öffnen, unzulässige Werte, Uploadfehler und fremde Assetkennungen prüfen.

- [ ] Gespeicherte Entwürfe und Vorschauen stimmen überein; Erfolg erscheint erst nach bestätigter Speicherung.
- [ ] STAFF kann weder Entwürfe noch Assets verwalten.

## v0.6.0 – Veröffentlichen, Archivieren und Bedingungen schützen

**Ziel:** Programme erhalten ihren fachlich gültigen Lebenszyklus. **Bezug:** LF-F-05, LF-F-07, LF-F-21, LF-F-22; T-03, T-10, T-13 / AK-03, AK-10, AK-13 anteilig; Pflichtenheft 4, 6.1, 10.1.

1. Veröffentlichung, Archivierung, Reaktivierung und ausdrückliche Sperrung als unterschiedliche Aktionen bereitstellen; Programmlimit unter Unternehmenssperre prüfen.
2. Unveränderlichkeit von Stempelziel und Belohnung nach erster Ausgabe dauerhaft sichern; Brandingrevisionen davon trennen.
3. Öffentliche Programmseite und Aufnahme-URL aus echten veröffentlichten Programmen erstellen; die tatsächliche Kartenausgabe folgt in v0.7.0.
4. Parallelität am letzten Programmplatz und zwischen Bedingungsänderung und simulierter erster Ausgabe mit realen DB-Transaktionen prüfen.

- [ ] Archivierte Programme geben keine neuen Karten aus; bestehende Karten bleiben fachlich bedienbar.
- [ ] Eine Sperre ist kein Downgrade und wird nicht durch Reaktivierung ohne Prüfung umgangen.

## v0.7.0 – Anonyme Kundenkarte und Web-Ansicht

**Ziel:** Ein Endkunde erhält ohne Konto genau eine verwendbare Karte für sein Programm im selben Browser. **Bezug:** LF-F-08, LF-F-09, LF-F-22, LF-N-02, LF-N-03; T-04, T-07, T-10, T-13, T-17 / AK-04, AK-07, AK-10, AK-13, AK-17 anteilig; Pflichtenheft 4, 6.2.

1. Kundensitzung mit HttpOnly-/Secure-/SameSite-Cookie und gehashtem Token vor der Ausgabe etablieren; Kartenzuordnung, Zufallskennung und Bedingungssnapshot speichern.
2. Bewussten Ausgabe-POST mit Vorgangskennung, Kartenlimit und vorhandener Sitzungszuordnung verbinden; Ausgabeereignis und dauerhafte Outbox-Struktur für spätere Änderungen vorbereiten.
3. Mobile Web-Karte mit QR, Stand, Ziel und Belohnungsinformation anbieten. Öffentliche Kennung und geheime Verwaltungsberechtigung trennen.
4. Parallelklicks, wiederholten Request, Cookieverlust, fremde Kartenkennung und letzten freien Kartenplatz mit echten DB-Tests prüfen.

- [ ] Dieselbe berechtigte Sitzung erhält für dasselbe Programm keine zusätzliche Karte.
- [ ] Nach erster Ausgabe bleiben Sammelbedingungen auch bei späterer Archivierung/Löschung unveränderbar.

## v0.8.0 – Mitarbeiter scannt und bestätigt einen Stempel

**Ziel:** Der erste Sammelablauf funktioniert mit echten Karten. **Bezug:** LF-F-13, LF-F-17, LF-N-02, LF-N-03, LF-N-09; T-08, T-10, T-11, T-17 / AK-08, AK-10, AK-11, AK-17 anteilig; Pflichtenheft 4, 6.3, 7.1.

1. Gemeinsamen Stempelservice mit Kartensperre, erwarteter Zykluskennung, Payload-Fingerabdruck und stabiler Vorgangskennung implementieren.
2. Stempelereignis, Kartenstand, Zielerreichung und dauerhaften Outbox-Eintrag atomar speichern. Die Verarbeitung externer Wallet-Aufträge folgt später; Aufträge dürfen nicht verloren gehen.
3. Kamera-/manuellen Scanner mit Kartenauflösung, ausdrücklicher Bestätigung, blockierter Doppelbedienung und bestätigtem Ergebnis anbinden.
4. Fremde Karten, gesperrte Rollen, gleiche Kennung mit anderem Payload, Netzwerkwiederholung und mindestens 20 parallele Vorgänge prüfen.

- [ ] Genau eine erfolgreiche Bestätigung erzeugt genau einen Stempel; Kameraereignisse allein buchen nicht.
- [ ] Zielerreichung erzeugt bereits genau eine offene Belohnung und verhindert weitere Stempel, auch bevor die Einlöseoberfläche vorliegt.

## v0.9.0 – Belohnung einlösen und Stempel korrigieren

**Ziel:** Ein kompletter Web-Sammelzyklus ist nutzbar. **Bezug:** LF-F-17, LF-F-18, LF-F-19, LF-N-03; T-10, T-11 / AK-10, AK-11; Pflichtenheft 6.4.

1. Verfügbare Belohnung auf Web-Karte und Mitarbeiteransicht zeigen; Einlösung an konkrete Belohnungs- und Zykluskennung binden.
2. Einlösung, Zurücksetzen auf null, neuen Zyklus, Ereignis und Outbox gemeinsam transaktional speichern.
3. Begründete Korrekturen für OWNER/ADMIN als nachvollziehbare Ereignisse ergänzen; verfügbare Belohnung beim Unterschreiten des Ziels entwerten und im gleichen Zyklus kontrolliert reaktivieren.
4. Doppelte Einlösung, alte Requests nach Zykluswechsel, negative/zu hohe Korrektur, bereits abgeschlossene Zyklen und Parallelität prüfen.

- [ ] Eine Belohnung wird genau einmal eingelöst; danach beginnt der neue Zyklus bei null.
- [ ] Keine Korrektur überschreibt Historie oder hebt eine abgeschlossene Einlösung rückwirkend auf.

## v0.10.0 – Outbox zuverlässig verarbeiten und reparieren

**Ziel:** Gespeicherte Hintergrundaufträge überstehen Abbrüche und Anbieterfehler. **Bezug:** LF-F-12, LF-N-06, LF-N-07, LF-N-09; T-15, T-18 / AK-15, AK-18 anteilig; Pflichtenheft 8.4, 12.

1. Vorhandene Outbox-Einträge mit Workflow, transaktionalem Claim, Verarbeitungssperre und idempotenten Auftragskennungen verbinden.
2. Wiederholungsplan des Pflichtenhefts, Provider-Timeouts, dauerhafte Fehler und authentifizierten minütlichen Reparaturlauf implementieren.
3. Pro Zielressource Versand serialisieren, aktuellen Sollstand laden und veraltete Snapshots verhindern. Echte Provideradapter folgen in den Wallet-Paketen.
4. Absturz nach Buchungscommit vor Workflowstart, parallele Worker, abgelaufenen Claim, Timeout und Reparaturstart prüfen; interne Fehlerliste mit echten Zuständen anbieten.

- [ ] Wiederanlauf verliert keine fällige Arbeit und erzeugt keine zusätzliche fachliche Buchung.
- [ ] Simulierter Providererfolg wird als technischer Test, nicht als Apple-/Google-Geräteabnahme geführt.

## v0.11.0 – Karte in Apple Wallet ausgeben

**Ziel:** Eine bestehende Kundenkarte lässt sich auf einem echten iPhone speichern. **Bezug:** LF-F-10, LF-F-12, LF-N-02; T-05, T-07, T-17 / AK-05, AK-07, AK-17 anteilig; Pflichtenheft 8.1–8.2.

1. Zentralen Apple-Testzugang, Pass Type ID und Zertifikatskette prüfen; Secrets sicher anbinden und Bibliothekskompatibilität dokumentieren.
2. Apple-Adapter mit stabiler Seriennummer, passbezogenem Token, normalisiertem Snapshot und signierter `.pkpass`-Antwort implementieren.
3. Offiziellen Wallet-Button nur für berechtigte Kundensitzungen aktivieren; die bestehende Karte wiederverwenden und keine zusätzliche Karte zählen.
4. Erstausgabe, erneute Ausgabe, fehlendes/ungültiges Zertifikat und fremde Kartensitzung testen; Speicherung auf echtem iPhone dokumentieren.

- [ ] QR, Stempelstand, Ziel und Belohnung werden korrekt angezeigt; private Schlüssel bleiben serverseitig.
- [ ] Ein noch nicht gelieferter Update-Webservice wird weder als funktionierend eingebaut noch als abgeschlossen ausgewiesen; vollständiges AK-05 bleibt bis v0.12.0 offen.

## v0.12.0 – Apple-Pässe aktualisieren

**Ziel:** Gespeicherte Apple-Karten erhalten spätere Stempel- und Brandingänderungen. **Bezug:** LF-F-10, LF-F-12, LF-N-06; T-05, T-07, T-15 / AK-05, AK-07, AK-15 anteilig; Pflichtenheft 8.2, 8.4.

1. Apple-Geräte-/Passregistrierungen und sämtliche vorgeschriebenen Webservice-Endpunkte mit Protokollauthentifizierung, Update-Cursor und Cache-Verhalten implementieren.
2. Aktualisierte signierte Passversion vor dem APNs-Hinweis bereitstellen; Outbox und ungültige Push-Token behandeln.
3. Stempel, Zielerreichung, Einlösung und Brandingänderung an bestehende Geräte verteilen; Seriennummer und Apple-Token unverändert lassen.
4. Registrierung, Abmeldung, fehlerhafte Tokens, mehrere Änderungen im gleichen Zeitfenster und Provider-/Prozessausfall prüfen; echten Geräteablauf dokumentieren.

- [ ] Auf dem iPhone wird nach Update der aktuelle Stand derselben Karte sichtbar.
- [ ] Bereitstellung und tatsächliche Geräteanzeige sind im Status und Nachweis getrennt; Offline-Zustellung wird nicht garantiert.

## v0.13.0 – Karte in Google Wallet ausgeben

**Ziel:** Eine bestehende Kundenkarte lässt sich auf einem echten Android-Gerät speichern. **Bezug:** LF-F-11, LF-N-02; T-06, T-07, T-17 / AK-06, AK-07, AK-17 anteilig; Pflichtenheft 8.1, 8.3.

1. Google-Testissuer, Dienstkonto, API-Zugriff und Modell für Kundenbranding prüfen; Produktionsfreigabe gesondert festhalten.
2. Loyalty Class je Programm und Object je Karte mit stabilen Kennungen anlegen; Wiederholung nach unklarem Anbieterergebnis sicher behandeln.
3. Offiziellen Google-Button und signierten Ausgabelink über die berechtigte Kundensitzung bereitstellen; dieselbe Karte parallel zu Apple verwenden.
4. Reale Speicherung, erneute Ausgabe, fremde Sitzung, fehlende Zugänge und wiederholten Anbieterrequest prüfen.

- [ ] Google-Ausgabe belegt keinen zweiten Kartenplatz und zeigt den bestätigten Datenbankstand.
- [ ] Ein Testissuer wird nicht als öffentliche Freigabe ausgegeben; vollständiges AK-06 bleibt bis v0.14.0 offen.

## v0.14.0 – Google-Updates und gemeinsame Wallet-Identität

**Ziel:** Web, Apple und Google bilden dieselbe Karte mit zuverlässigen Updates ab. **Bezug:** LF-F-10, LF-F-11, LF-F-12, LF-F-22, LF-N-06, LF-N-09; T-05, T-06, T-07, T-15 / AK-05, AK-06, AK-07, AK-15 anteilig; Pflichtenheft 8.

1. Google-Updates für Stempel, Belohnung, Einlösung und Branding mit dem vorhandenen Outbox-System verbinden.
2. Gewünschte und verarbeitete Version, Rate Limits, Timeout, Wiederholung und manuellen Reparaturauftrag implementieren; Providerantwort allein nicht als Geräteanzeige bezeichnen.
3. Mehrere aufeinanderfolgende Änderungen, alte Jobs und unklare Providerergebnisse serialisiert abgleichen.
4. Dieselbe Karte in beiden Wallets und im Web verwenden; Einlösung, erneute Ausgabe, gemeinsames Kontingent und Wiederanlauf auf echten Geräten nachweisen.

- [ ] Es gibt einen fachlichen Kartenstand und stabile Anbieterzuordnungen statt drei Sammelkonten.
- [ ] Ein alter Auftrag hinterlässt keinen dauerhaft veralteten Endstand; Geräte- und Fehlernachweise sind vorhanden.

## v0.15.0 – Selbstscan mit statischem Geschäfts-Code

**Ziel:** Ein Kunde kann einen Stempel anfragen und ein Mitarbeiter ihn sicher freigeben. **Bezug:** LF-F-14, LF-F-16, LF-N-01, LF-N-02, LF-N-03; T-09, T-10, T-17 / AK-09, AK-10, AK-17 anteilig; Pflichtenheft 7.2–7.3.

1. Mandantengebundene Station, widerrufbaren statischen Code und zugehörige Konfigurationsoberfläche erstellen.
2. Kundensitzung, Karte und Station auf dasselbe Programm/Unternehmen prüfen; höchstens eine offene Anfrage pro Karte/Station und fünf Minuten Ablauf sichern.
3. Vergleichscode auf Kunden- und Mitarbeiterseite zeigen; Bestätigung oder Ablehnung nur für die konkrete autorisierte Anfrage zulassen.
4. Freigabe und Stempel atomar buchen; Ablauf, wiederholte Freigabe, Zykluswechsel, verlorene Sitzung, Stationssperrung und fremde Karte testen.

- [ ] Ohne Mitarbeiterbestätigung entsteht kein Stempel; der Vergleichscode ersetzt keine Autorisierung.
- [ ] Ohne Kundensitzung werden Mitarbeiter-Scan und, sobald vorhanden, Recovery angeboten; keine Wallet-Auslesung behaupten.

## v0.16.0 – Dynamischer Geschäfts-Code

**Ziel:** Der bestätigte Selbstscan funktioniert auch mit wechselndem Stationscode. **Bezug:** LF-F-15, LF-F-16, LF-N-02, LF-N-03; T-09, T-10 / AK-09, AK-10; Pflichtenheft 7.2–7.3.

1. Angemeldete Stationsanzeige mit neuer kryptografischer Challenge je 60-Sekunden-Fenster bereitstellen; Ablauf serverseitig bestimmen.
2. Gültige Challenge mit individuellen Anfragen verknüpfen. Die Stationschallenge nicht global beim ersten Kunden verbrauchen.
3. Anfragestatus und fünfminütigen Ablauf beibehalten; eine gültig erstellte Anfrage darf nach Codewechsel bearbeitbar bleiben, jedoch nicht nach Stationssperrung.
4. Mehrere gleichzeitige Kunden, abgelaufene Challenges, doppelte Bestätigung, Netzwerkwiederholung und Stationsrevision prüfen.

- [ ] Mehrere Kunden können denselben gültigen Code nutzen, aber jede Anfrage kann nur einmal buchen.
- [ ] Auch der dynamische Modus bleibt mitarbeiterbestätigt; es entsteht keine unbeaufsichtigte Vergabe.

## v0.17.0 – Freiwillige Recovery-Adresse verifizieren

**Ziel:** Endkunden können ihre Karte freiwillig mit einer bestätigten Adresse verknüpfen. **Bezug:** LF-F-20, LF-F-27, LF-F-28, LF-N-02, LF-N-04; T-12, T-17 / AK-12, AK-17 anteilig; Pflichtenheft 9.

1. Verschlüsselte Recovery-Identität, separaten HMAC-Suchwert und zweckgebundene gehashte Verifikationstokens mit 24 Stunden Gültigkeit implementieren.
2. Hinzufügen, Ersetzen und Entfernen nur aus berechtigter Kundensitzung erlauben; Adresse erst nach Verifikation aktivieren.
3. DE-/EN-Mails, Anfragelimits, neutrale Antworten und widerrufene/abgelaufene Tokens behandeln; Mailvorschau darf Tokens nicht unbeabsichtigt verbrauchen.
4. Fremde Adresse, fremde Karte, Wiederverwendung und Entfernung inklusive Widerruf offener Tokens testen; keine Klartextadressen in Logs oder Statistiken.

- [ ] Ohne bestätigte Adresse besteht kein Recovery-Zugriff; Nutzung bleibt freiwillig und konto-frei.
- [ ] Geheime Schlüssel und Token sind von Chat- und Wallet-Geheimnissen getrennt.

## v0.18.0 – Dieselbe Karte auf einem neuen Gerät wiederherstellen

**Ziel:** Ein verifizierter Kunde erhält Zugriff auf seine bestehenden Karten zurück. **Bezug:** LF-F-20, LF-N-02, LF-N-04; T-07, T-12, T-17 / AK-07, AK-12, AK-17 anteilig; Pflichtenheft 9.1.

1. Wiederherstellungsanforderung mit neutraler Antwort und Token von 15 Minuten Gültigkeit bereitstellen; getrennt vom Erstverifikationstoken behandeln.
2. Token bewusst per POST austauschen, aus URL/Referrer/Logs heraushalten und atomar verbrauchen; neue Kundensitzung auf ausgewählte bestehende Karte berechtigen.
3. Mehrere Karten einer verifizierten Adresse getrennt anbieten; keine automatische Zusammenführung, Neuausgabe oder unternehmensweite Freigabe.
4. Web- und Wallet-Zugriff nach Gerätewechsel, Replay, E-Mail-Vorschau, Ablauf, Adresswiderruf und neue Sitzung auf echten Geräten prüfen.

- [ ] Wiederherstellung verwendet die ursprüngliche Karte und ihr Kontingent; Stempel und Belohnung bleiben erhalten.
- [ ] Verlorene Wallet-Kopien werden nicht durch heimliche Änderung unveränderlicher Apple-Passtokens behandelt; Sperr-/Ersatzgrenzen sind verständlich.

## v0.19.0 – Bezahltes Abo in EUR und USD abschließen

**Ziel:** Ein Unternehmensinhaber kann Free kontrolliert auf Pro oder Business erweitern. **Bezug:** LF-F-21, LF-F-22, LF-F-23, LF-F-24, LF-N-03; T-13, T-14 / AK-13, AK-14 anteilig; Pflichtenheft 10.

1. Stripe-Testkunde und Abonnement an das Unternehmen binden; vier serverseitige Monats-Price-IDs für Pro/Business in EUR/USD konfigurieren.
2. Tarifauswahl und Checkout für Inhaber mit Firmen-/Rechnungsdaten, gewählter Währung, Stripe Tax und erlaubten Ländern implementieren. Preise bleiben 9,90 beziehungsweise 24,90 vor Steuern in der jeweiligen Währung.
3. Signierten Webhook am unveränderten Body prüfen, Ereignis dauerhaft dedupliziert speichern und Provider-Abgleich serialisiert verarbeiten.
4. Bezahlrechte erst nach bestätigter Zahlung und passendem Abozustand anwenden; Rückleitung zeigt echten Status, keine eigenständige Freischaltung.
5. Erfolgreiche, fehlgeschlagene und bestätigungspflichtige Testzahlung, falsche Preis-ID, fremdes Unternehmen, doppelte Events und unterbrochene Verarbeitung prüfen.

- [ ] Free benötigt keine Zahlungsmethode; unbestätigte Zahlung gewährt keinen höheren Tarif.
- [ ] Die Länderliste beruht auf dokumentierter Freigabe, nicht auf der Behauptung weltweiter Steuerfreigabe.

## v0.20.0 – Abo verwalten und Bestandskarten schützen

**Ziel:** Abonnementänderungen halten Tarifgrenzen und zugesagte Bestandsregeln ein. **Bezug:** LF-F-21, LF-F-22, LF-F-23, LF-F-24; T-13, T-14 / AK-13, AK-14; Pflichtenheft 10.2–10.3.

1. Kundenportal für Rechnungen, Zahlungsdaten und Kündigung anbinden; Portaloptionen dürfen die Anwendungsregeln nicht umgehen.
2. Upgrade nach erfolgreicher anteiliger Zahlung sowie Downgrade/Kündigung zum Periodenende implementieren; Währung während laufendem Abo unveränderbar halten.
3. Siebentägige Zahlungsfrist für fehlgeschlagene Verlängerung einmalig beginnen, nicht durch wiederholte Events verlängern; danach Free und bei nachgeholter Zahlung erneuten Provider-Abgleich anwenden.
4. Periodischen Billing-Abgleich und Bestandsregel integrieren: vorhandene Karten und Mitarbeiter bleiben nutzbar; nur die jeweilige überzählige Neuanlage wird blockiert.
5. Eventreihenfolge, alte Events nach Upgrade, parallele Tarifwechsel, Zahlung nach Fristende und Überbestände testen.

- [ ] Kündigung löscht oder sperrt keine Bestandskarte und vernichtet keine verdiente Belohnung.
- [ ] Alle drei tatsächlichen Tarifzustände sind mit echten Testmodus-Abos und DB-Prüfungen nachgewiesen.

## v0.21.0 – Tarifgerechte Statistiken und Business-Export

**Ziel:** Unternehmen erkennen ihre echte Nutzung innerhalb der gekauften Auswertungsrechte. **Bezug:** LF-F-25, LF-F-28, LF-N-01, LF-N-04; T-16, T-17 / AK-16, AK-17 anteilig; Pflichtenheft 11.1.

1. Gemeinsame Unternehmensaggregate für Karten, reguläre Stempel und tatsächliche Einlösungen bereitstellen; Korrekturen getrennt nachvollziehbar halten.
2. Free-Gesamtzahlen sowie Pro-/Business-Tageszeitreihen mit Zeitraum-, Programm-, Quellen- und Mitarbeiterfiltern anbieten. UTC-Auswertung sichtbar kennzeichnen.
3. Business-CSV aus den ausgewählten aggregierten Berichtsdaten erzeugen; Provider-/Recovery-Geheimnisse und Adressen ausschließen, Formelinjektion verhindern.
4. Fremde Filterkennungen, direkte Exportaufrufe mit kleinerem Tarif, Archivierung, Korrektur, Rollenrechte und DE-/EN-Darstellung prüfen.

- [ ] Keine erfundenen KPIs und keine Einlösung durch bloßes Erreichen des Stempelziels zählen.
- [ ] STAFF erhält über direkte API-Aufrufe keinen vollständigen Unternehmensbericht.

## v0.22.0 – Interne Betreuung und auditierbare Reparatur

**Ziel:** Der Betreiber kann Kundenunternehmen und fehlgeschlagene Aufträge kontrolliert betreuen. **Bezug:** LF-F-26, LF-N-01, LF-N-04, LF-N-07; T-02, T-15, T-16 / AK-02, AK-15, AK-16 anteilig; Pflichtenheft 3.3, 8.4, 11.3.

1. Vorhandene interne Unternehmensansicht um Tarif, Kontingente, Mitgliedschaften, offenen Billing-Abgleich und Wallet-Fehler erweitern.
2. Ausdrücklichen Supportkontext und Begründung für Sperren, Korrekturen und kontrollierte Reparaturaktionen verlangen; alle Aktionen auditieren.
3. Fehlgeschlagene Wallet-/Billing-Aufträge über dieselben Fachservices erneut anstoßen, ohne neue Stempel oder willkürliche Zählerwerte anzulegen.
4. Business-Priorität markieren; kein zusätzliches Ticketsystem bauen. Interne INTERN- und externe Konten negativ testen.

- [ ] Jede Änderung hat echten Akteur, Zielunternehmen und Grund; das Audit enthält keine sensiblen Rohdaten.
- [ ] Reparatur und Sicherheits-/Unternehmenssperre bleiben von Tarif-Downgrade und Programmarchivierung unterscheidbar.

## v0.23.0 – Kontrollierte Karten- und Unternehmenslöschung

**Ziel:** Berechtigte Löschungen und Widerrufe werden systemübergreifend nachvollziehbar ausgeführt. **Bezug:** LF-F-27, LF-N-02, LF-N-04, LF-N-06; T-12, T-15, T-18 / AK-12, AK-15, AK-18 anteilig; Pflichtenheft 9.3.

1. Kartenlöschung aus berechtigter Kundensitzung und Unternehmenslöschung nach erneuter Inhaberbestätigung als wiederanlaufbare Vorgänge anbieten.
2. Zuerst Zugriffe und Tokens widerrufen, offene Jobs neutralisieren und Pässe soweit unterstützt deaktivieren; lokale Wallet-Fernlöschung nicht garantieren.
3. Nicht mehr benötigte E-Mails, Zuordnungen und Assets entfernen; verbleibende fachliche Daten aggregieren/entkoppeln und freigegebene Aufbewahrungsprofile beachten.
4. Bereinigung für Tokens, Anfragen und Diagnoselogs gemäß Pflichtenheft terminieren; Lösch-/Widerrufsinformationen für Restore-Wiederanwendung sichern.
5. Parallele Buchung/Löschung, Teilabbruch, Providerfehler, erneuter Job und unzulässiger Löschaufruf gegen getrennte Testdaten prüfen.

- [ ] Entzogene Zugriffe funktionieren nach Löschen und Wiederanlauf nicht weiter.
- [ ] Rechtliche Aufbewahrung ist fachlich dokumentiert; weder pauschal alles löschen noch unbegrenzt alles behalten.

## v0.24.0 – Betriebsüberwachung und geprüfter Wiederanlauf

**Ziel:** Betrieb, Datenwiederherstellung und kontrollierte Migration sind nachgewiesen. **Bezug:** LF-N-06, LF-N-07, LF-N-08, LF-N-10; T-15, T-18 / AK-15, AK-18 anteilig; Pflichtenheft 11.3, 12.

1. Betriebsanleitung mit Secrets-Konfiguration, Zertifikatsrotation, Providerfreigaben, Alarmkanal, Job-/Webhook-Reparatur und Löschung erstellen.
2. Alarmbedingungen für Rückstände, dauerhafte Fehler, Zahlungsfristen, fehlenden Reparaturlauf und Zertifikatsablauf implementieren und auslösen.
3. Additive Migration und Deployment an repräsentativem getrenntem Testbestand erproben; Rücknahmeplan erhält angenommene Buchungen statt pauschalem Datenbankreset.
4. Sicherung in separater Umgebung wiederherstellen, Jobs kontrolliert starten und bereits wirksame Widerrufe/Löschungen erneut anwenden. Getrennte Providerzugänge sicherstellen.
5. CI-/Ruleset-Nachweise und erforderliche Betreiberhandlungen mit tatsächlichen Belegen erfassen; nicht aus vorhandener Workflowdatei auf verpflichtende Merge-Sperren schließen.

- [ ] Wiederherstellungsprobe und Alarmtests sind ausgeführt, nicht nur beschrieben.
- [ ] Es entsteht weder durch Restore noch durch erneute Jobs eine zusätzliche Buchung oder ein wieder gültiger widerrufener Zugriff.

## v0.25.0 – Gesamtabnahme und geschlossener Gerätepilot

**Ziel:** Das vollständige Produkt ist im kontrollierten Pilot gegen alle vereinbarten Anforderungen geprüft. **Bezug:** LF-F-01 bis LF-F-28, LF-N-01 bis LF-N-10; T-01 bis T-18 / AK-01 bis AK-18; Pflichtenheft 12–13.

1. Alle Anforderungen, bisherigen Versionsnachweise und Abnahmefälle vollständig abgleichen; frühere Teilnachweise nach relevanten Folgeänderungen gezielt wiederholen.
2. Geschäftskunden-Onboarding, Free und beide Bezahltarife, beide Wallets, beide Scanverfahren, Einlösung, Recovery, Auswertung und Löschung mit Pilotunternehmen durchlaufen.
3. iPhone/iOS/Safari sowie Android/Chrome inklusive Kamera verweigert, manueller Eingabe, Netzwerkausfall, mehreren Mitarbeitern und Kundensitzungsverlust dokumentieren.
4. Antwortzeit, Walletverzögerung und Betriebskosten mit Umgebung und Methode messen; keine unbelegten Grenzwerte/SLA veröffentlichen.
5. Mängel im jeweiligen Paket beziehungsweise als konkrete Patchversion bearbeiten; anschließend betroffene Prüfungen erneut ausführen. Keine unbeauftragten Zusatzfunktionen aufnehmen.

- [ ] Vollständige Testmatrix und Pilotprotokoll besitzen konkrete Ergebnisse statt pauschaler Erfolgsbehauptung.
- [ ] Sämtliche notwendigen technischen und Geräteprüfungen sind bestanden; noch ausstehende Produktionsfreigabe wird ausdrücklich getrennt geführt.

## v1.0.0 – Vollständiges Release freigeben

**Ziel:** Der gesamte vereinbarte SaaS-Umfang wird an einem eindeutig bezeichneten Stand für Produktion abgenommen. **Bezug:** LF-F-01 bis LF-F-28, LF-N-01 bis LF-N-10; T-01 bis T-18 / AK-01 bis AK-18; Pflichtenheft 12–14.

1. Geprüften Release-Stand festhalten und vollständige Freigabecheckliste mit allen AK-01 bis AK-18 und Nachweisen zusammenstellen. Kein Funktionspaket unter dieser Version nachträglich improvisieren.
2. Live-Zertifikate, Google-Veröffentlichungsfreigabe, zentrales Kundenbranding-Modell, Stripe-Livepreise in beiden Währungen, Steuer-/Länderfreigabe, E-Mail-Absender und Betriebsverantwortlichkeiten nachweisen.
3. Betreiber-/Rechtsgrundlagen, Aufbewahrung, Datenschutz, Rücknahmeplan und priorisierten Supportweg mit tatsächlichen Zuständigkeiten bestätigen.
4. Die vorgeschriebene ausdrückliche Auftraggeberfreigabe für diesen Stand und den Produktionsumfang einholen. Ohne sie Registrierung und Livezahlungen nicht öffentlich aktivieren.
5. Nur im genehmigten Umfang ausrollen, kontrollierten Produktions-Smoke-Test ohne künstliche Kundenbuchungen durchführen und Monitoring sowie Supportübergabe protokollieren.
6. Bei erfolgreicher vollständiger Abnahme den Versionsnachweis finalisieren, diesen Abschnitt nach A.3 auskommentieren und den Dokumentkopf auf „Keine offenen Versionen im vereinbarten Umfang“ setzen.

- [ ] Alle Muss-Anforderungen und externen Voraussetzungen sind belegt; keine offene Sicherheits-, Buchungs-, Abrechnungs- oder Datenverlustlücke.
- [ ] Ausdrückliche Freigabe und tatsächlicher Betriebszustand stimmen überein; Pilotfreigabe wird nicht als Produktionsfreigabe verwendet.
- [ ] Die vollständige Anleitung bleibt im Quelltext erhalten; es werden keine erledigten Versionsabschnitte gelöscht.
