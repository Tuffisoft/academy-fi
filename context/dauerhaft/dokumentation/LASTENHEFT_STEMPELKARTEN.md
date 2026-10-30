<!-- Nachweiskürzung 27.10.2026: frühere Einzelbelege auf Auftrag gelöscht; historische Ergebnisangaben sind keine weiterhin verfügbaren Detailbeweise. Siehe ../nachweise/NACHWEISE.md. -->
# Lastenheft: Wallet-Stempelkarten-SaaS

| Dokumentmerkmal | Wert |
| --- | --- |
| Projekt | Stempelkarten als SaaS-Modul der Academy Fi |
| Version | 1.12 |
| Datum | 30.10.2026 |
| Status | Verbindliche Anforderungsgrundlage; lokale Teilpakete umgesetzt, vollständige Produktabnahme offen |
| Auftraggeber / Betreiber | Das Team hinter der bestehenden Academy Fi |
| Technisches Gegenstück | [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md) |

## 1. Zweck und Verbindlichkeit

Dieses Lastenheft beschreibt, was die Erweiterung aus Sicht des Auftraggebers und ihrer Nutzer leisten muss. Das Pflichtenheft beschreibt die technische Umsetzung und ordnet diese den Anforderungen dieses Dokuments zu.

Grundlage sind das bereitgestellte „Projektkonzept: Wallet-Stempelkarten-SaaS, MVP-Konzept v1.0“ und die anschließend gemeinsam getroffenen Produktentscheidungen. Die Entscheidungen zur Academy-Integration, zum vollständigen Startumfang und zur Online-Abrechnung konkretisieren beziehungsweise ersetzen die unverbindlichen Vorschläge des Ausgangskonzepts.

Alle mit `LF-F-` und `LF-N-` gekennzeichneten Anforderungen sind Muss-Anforderungen für das vollständige Release 1.0. Die Reihenfolge der Entwicklung verändert diesen Lieferumfang nicht. Änderungen an Leistungsumfang, Preisen oder Geschäftsregeln sind in einer neuen Dokumentversion festzuhalten.

Dieses Dokument enthält keine Zusage eines Fertigstellungstermins und bestätigt keine bereits erfolgte technische, rechtliche oder produktive Freigabe.

## 2. Ausgangssituation

Die Academy Fi ist eine bestehende interne Webplattform für Lernen, Aufgaben, Tagesplanung, Ideen, Chat und Lead-Recherche. Sie verfügt bereits über Benutzeranmeldung, die internen Rollen `OWNER` und `INTERN`, Datenhaltung, E-Mail-Versand, Dateiuploads und Hintergrundverarbeitung.

Eine öffentliche Unternehmensregistrierung, eine Mandantenverwaltung, Wallet-Stempelkarten und SaaS-Abonnements sind noch nicht vorhanden. Zahlreiche vorhandene Zugriffe unterscheiden bisher nur zwischen angemeldeten und nicht angemeldeten Personen. Die Öffnung für externe Unternehmen setzt deshalb eine ausdrückliche Trennung von Academy-Zugriffen und SaaS-Berechtigungen voraus.

Die Erweiterung soll die vorhandene Plattform nutzen und Geschäftskunden einen eigenständigen Bereich bieten. Geschäftskunden erhalten durch ihre Registrierung keinen Zugang zu internen Lerninhalten, Aufgaben, Chats oder Lead-Recherchen.

## 3. Ziele und Erfolgskriterien

1. Unternehmen verschiedener Branchen können selbstständig digitale Treueprogramme anbieten.
2. Endkunden können ohne Plattformkonto und zusätzliche App eine Stempelkarte erhalten und verwenden.
3. Apple Wallet, Google Wallet und Web-Karte bilden denselben verbindlichen Kartenstand ab.
4. Stempelvergabe und Belohnungseinlösung funktionieren nachvollziehbar und ohne doppelte Buchungen.
5. Ein kostenloser Einstieg und kostenpflichtige, international buchbare Monatsabos bilden das Geschäftsmodell.
6. Das interne Team kann Unternehmen und technische Probleme aus der Academy heraus betreuen.
7. Bestehende Academy-Funktionen bleiben für ihre bisherigen Nutzer nutzbar und für Geschäftskunden gesperrt.

Das Release ist erfolgreich, wenn alle Muss-Anforderungen nachgewiesen sind, die Abnahmefälle aus Abschnitt 11 bestehen und die Voraussetzungen für den produktiven Betrieb erfüllt sind.

## 4. Nutzergruppen und Begriffe

| Begriff / Nutzergruppe | Bedeutung |
| --- | --- |
| Betreiber | Euer Team; betreibt die SaaS-Plattform und die zentralen Anbieterzugänge. |
| Interner Plattform-Owner | Bestehender Academy-Nutzer mit globaler Rolle `OWNER`; verwaltet die SaaS-Plattform intern. |
| Interner Academy-Nutzer | Bestehender Nutzer mit globaler Rolle `OWNER` oder `INTERN`; dadurch nicht automatisch Mitarbeiter eines Kundenunternehmens. |
| Geschäftskonto | Angemeldeter Benutzer des Kundenbereichs; benötigt mindestens eine passende Unternehmensmitgliedschaft für Unternehmenszugriffe. |
| Unternehmen / Mandant | Geschäftskunde mit eigenen Programmen, Mitarbeitern, Kundenkarten und Abonnement. |
| Unternehmensinhaber | Rolle `OWNER` innerhalb eines Unternehmens; verantwortlich für Unternehmen und Abonnement. Diese Rolle ist von der globalen Academy-Rolle getrennt. |
| Unternehmensadministrator | Rolle `ADMIN` innerhalb eines Unternehmens; verwaltet Programme und Mitarbeiter, jedoch weder Eigentümerschaft noch Abrechnung. |
| Mitarbeiter | Rolle `STAFF` innerhalb eines Unternehmens; vergibt Stempel und löst Belohnungen ein. |
| Endkunde | Person, die ohne Geschäftskonto eine individuelle Stempelkarte nutzt. |
| Programm | Vom Unternehmen gestaltete Vorlage mit Stempelziel und Gratisbelohnung; in den Tarifen auch „aktive Stempelkarte“ genannt. |
| Kundenkarte | Individuelles Sammelkonto eines Endkunden für ein Programm. |
| Wallet-Pass | Apple- oder Google-Darstellung einer Kundenkarte; kein zusätzliches Sammelkonto. |
| Sammelzyklus | Zeitraum vom Zählerstand null bis zur Einlösung einer verdienten Belohnung. |
| Scanstation | Einem Unternehmen und Programm zugeordneter Geschäfts-QR-Zugang. Keine Filiale. |

## 5. Verbindliche Produktentscheidungen

### 5.1 Bereitstellung und Zugang

- Die Academy erhält eine interne Stempelkarten-Verwaltung; Geschäftskunden erhalten einen eigenen Bereich.
- Unternehmen registrieren sich öffentlich und bestätigen ihre E-Mail-Adresse.
- Endkunden benötigen weder Registrierung noch eine zusätzliche App der Plattform. Voraussetzungen der Wallet-Anbieter bleiben bestehen.
- Apple- und Google-Zugänge werden zentral vom Betreiber verwaltet.
- Die erste vollständige Version enthält beide Scanverfahren, dynamische Geschäfts-QR-Codes, Wiederherstellung und Online-Abrechnung.
- Der Start richtet sich an internationale B2B-Kunden. Oberfläche und E-Mails werden auf Deutsch und Englisch angeboten.
- Ein Unternehmen wird ohne gesonderte Filialverwaltung geführt. Mehrere Mitarbeiter und Scanstationen sind innerhalb dieses Unternehmens möglich.

### 5.2 Tarife

| Leistung | Free | Pro | Business |
| --- | --- | --- | --- |
| Monatspreis in EUR | 0 EUR | 9,90 EUR | 24,90 EUR |
| Monatspreis in USD | 0 USD | 9,90 USD | 24,90 USD |
| Aktive Programme | 1 | 5 | Unbegrenzt |
| Aktive Nutzer einschließlich Inhaber | 1 | 5 | 20 |
| Ausgegebene, nicht archivierte Kundenkarten pro Unternehmen | 100 | 1.000 | 10.000 |
| Apple Wallet und Google Wallet | Ja | Ja | Ja |
| Mitarbeiter-Scan und bestätigter Selbstscan | Ja | Ja | Ja |
| Dynamische Geschäfts-QR-Codes | Ja | Ja | Ja |
| Optionale E-Mail-Wiederherstellung | Ja | Ja | Ja |
| Statistik | Gesamtzahlen | Zusätzlich Zeitreihen und Filter | Zusätzlich CSV-Auswertungen |
| Support | Regulär | Regulär | Priorisierte Bearbeitung, ohne zugesicherte Reaktionszeit |

Die Preise gelten vor anfallenden Steuern. EUR und USD sind eigenständige Preisvarianten und werden nicht laufend ineinander umgerechnet. Es gibt zum Start ausschließlich monatliche Abos und keine zusätzliche kostenpflichtige Testphase. Der Free-Tarif ist dauerhaft kostenlos und benötigt keine Zahlungsmethode.

Eine Kundenkarte zählt über ihre Wallet-Darstellungen hinweg nur einmal. Die Kartengrenze gilt über alle Programme des Unternehmens. Eine zusätzliche Stempelgebühr und ein monatliches Stempelkontingent sind nicht vorgesehen.

### 5.3 Sammeln, Einlösen und Programmänderungen

- Pro bestätigtem Vorgang wird genau ein Stempel vergeben.
- Nach Erreichen des Stempelziels steht genau eine Gratisbelohnung zur Verfügung.
- Bis zur Einlösung werden keine weiteren Stempel gesammelt. Mehrere offene Belohnungen auf einer Karte sind nicht vorgesehen.
- Nach bestätigter Einlösung steht der Zähler auf null und ein neuer Sammelzyklus beginnt.
- Selbstscannen erzeugt immer eine Anfrage mit Mitarbeiterbestätigung. Auch dynamische Codes vergeben keinen unbeaufsichtigten Stempel.
- Ein Karten-QR-Code ist kopierbar und ersetzt keine Mitarbeiterautorisierung. Eine garantierte Bindung an eine bestimmte natürliche Person wird ohne Endkundenkonto nicht versprochen.
- Nach Ausgabe der ersten Kundenkarte sind Stempelziel und Belohnungsbedingungen eines Programms unveränderbar. Für neue Bedingungen wird ein neues Programm angelegt. Branding kann weiter geändert werden.

### 5.4 Abonnementwechsel und Grenzen

- Bezahlte Upgrades werden nach erfolgreicher Zahlung wirksam.
- Kündigungen und Downgrades werden zum Ende des bezahlten Zeitraums wirksam.
- Bei einer überfälligen Verlängerungszahlung gilt eine Zahlungsfrist von sieben Tagen. Danach wird auf Free zurückgestuft, falls keine erfolgreiche Zahlung vorliegt.
- Bei überschrittenen Limits nach einem Downgrade bleiben bestehende Kundenkarten zum Sammeln und Einlösen nutzbar; bestehende Mitarbeiter werden nicht automatisch ausgeschlossen.
- Neue Karten, Programmaktivierungen und Einladungen werden jeweils dann gesperrt, wenn das zugehörige Limit erreicht oder überschritten ist.
- Eine Kündigung oder ein Downgrade löscht keine bestehenden Kundenkarten oder verdienten Belohnungen. Eine ausdrückliche Sicherheits- oder Unternehmenssperre ist davon zu unterscheiden.

## 6. Funktionale Anforderungen

### 6.1 Plattform, Unternehmen und Mitarbeiter

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-01 | Die Plattform muss interne Academy-Verwaltung, Geschäftskundenbereich und Endkundenansichten trennen. | Ein Geschäftskonto kann interne Academy-Seiten und zugehörige Datenschnittstellen nicht nutzen. |
| LF-F-02 | Unternehmen müssen sich mit E-Mail und Passwort registrieren, ihre Adresse bestätigen und Zugangsdaten zurücksetzen können. | Ein bestätigtes Konto kann sein Unternehmen verwenden; Registrierung kann keine interne Rolle vergeben. |
| LF-F-03 | Unternehmen müssen Namen, Kontaktangaben, Branding und berechtigte Mitgliedschaften verwalten können. Nutzer müssen zwischen ihren Unternehmen wechseln können. | Die Auswahl zeigt ausschließlich Unternehmen mit berechtigtem Zugriff. |
| LF-F-04 | Unternehmensinhaber und Administratoren müssen Mitarbeiter per E-Mail einladen, verwalten und entfernen können. | Rollenrechte und Tarifgrenzen werden eingehalten; nur der Inhaber verwaltet Eigentümerschaft und Abrechnung. |

### 6.2 Programme und Kundenkarten

Konkretisierung v0.6.0 · 30.10.2026: OWNER/ADMIN verwalten Veröffentlichung, Archivierung, Reaktivierung und eine davon unabhängige ausdrückliche Programmsperre. Entwürfe und archivierte Programme zählen nicht zum aktiven Programmlimit; veröffentlichte gesperrte Programme zählen weiterhin. Reaktivierung prüft das Limit erneut, hebt keine Sperre auf. Bestehende Karten bleiben bei Archivierung nutzbar; ausdrückliche Sperren verhindern Buchungen. Die erste Ausgabe bindet Ziel und Belohnungsbedingungen dauerhaft, auch nach Löschung aller Karten; Branding bleibt separat bearbeitbar. Öffentliche Programmseite/Aufnahme-Link geben ausschließlich freigegebene Inhalte aus und erzeugen in v0.6.0 noch keine Karte. Verhalten, Rollen und prüfbare Fälle V060-01–08 im [Paketplan](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#v060--veröffentlichen-archivieren-und-bedingungen-schützen); LF-F-05/07/21/22, T-/AK-03/10/13 anteilig. Spezifikation, keine Abnahme; verschobene v0.5.5-Gerätetests bleiben offen.

Konkretisierung v0.5.0 · 27.10.2026, genehmigter Implementierungsplan: Entwürfe werden ausdrücklich gespeichert und zählen nicht als aktive Programme. Name 1–40, Beschreibung 0–70, Gratisbelohnung 1–40 Zeichen; normalisierte Leerzeichen, keine Steuerzeichen/HTML-Eingaben. Stempelziel 1–10 (Auftraggeberänderung 28.10.2026). Symbole: Stempel, Stern, Herz, Geschenk, Kaffee. Freie sechsstellige HEX-Farben mit mindestens 4,5:1 Text-/Hintergrundkontrast. Logo optional: PNG/JPEG/WebP, maximal 4 MiB/16 Megapixel, keine Animation/SVG; kontrollierte PNG bis 1024×1024px ohne Metadaten. Drei Vorschauen ohne Wallet-Ausgabe; Unternehmensinhalte werden nicht automatisch übersetzt. Veröffentlichung und Schutz ausgegebener Sammelbedingungen bleiben unverändert verbindlich und folgen in späteren Paketen. LF-F-05/06/28, LF-N-05; T-/AK-03/17 anteilig. [Prüfstand](../nachweise/NACHWEISE.md#v050--implementierung-27102026).

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-05 | Unternehmen müssen Programme als Entwurf erstellen, veröffentlichen und archivieren können. | Nur veröffentlichte Programme geben neue Karten aus; Archivierung und Sperrung sind unterscheidbar. |
| LF-F-06 | Ein geführter Editor muss Logo, Farben, Stempelsymbol, Texte, Stempelziel und Gratisbelohnung konfigurieren und Vorschauen anzeigen. | Apple-, Google- und Web-Vorschau zeigen die gespeicherten Inhalte innerhalb der jeweiligen Darstellungsgrenzen. |
| LF-F-07 | Bereits ausgegebene Karten müssen vor nachträglicher Änderung von Stempelziel und Belohnungsbedingungen geschützt sein. | Solche Änderungen werden nach erster Kartenausgabe zurückgewiesen; Branding bleibt bearbeitbar. |
| LF-F-08 | Endkunden müssen über eine öffentliche Programmseite bewusst eine anonyme Karte anfordern können. | Keine Kontoerstellung erforderlich; wiederholte Ausgabe desselben Programms im selben berechtigten Browser erzeugt keine zusätzliche Karte. |
| LF-F-09 | Endkunden müssen eine mobile Web-Karte mit Stempelstand, Ziel, Gratisbelohnung und Karten-QR-Code öffnen können. | Sensible Verwaltung und Wiederherstellung benötigen zusätzlich die berechtigte Kundensitzung. |

### 6.3 Wallets

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-10 | Eine Kundenkarte muss in Apple Wallet gespeichert werden können. | Ein echter iPhone-Test zeigt individuellen QR-Code, Stempelstand und Belohnung. |
| LF-F-11 | Eine Kundenkarte muss in Google Wallet gespeichert werden können. | Ein echter Android-Test zeigt individuellen QR-Code, Stempelstand und Belohnung. |
| LF-F-12 | Stempeländerungen, Einlösungen und Branding-Änderungen müssen zuverlässig in beide Wallet-Darstellungen übertragen werden. | Anbieterfehler verlieren keine Buchung; ausstehende Updates sind erkennbar und nachholbar. Dieselbe Karte behält bei erneuter Ausgabe ihre Identität. |

### 6.4 Scannen, Stempeln und Belohnungen

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-13 | Berechtigte Mitarbeiter müssen Kundenkarten per Kamera scannen und einen Stempel ausdrücklich bestätigen können. | Ein bestätigter Vorgang erzeugt genau einen Stempel; fremde Unternehmen werden abgewiesen. |
| LF-F-14 | Endkunden müssen über einen statischen Geschäfts-QR-Code eine Stempelanfrage stellen können. | Die Anfrage gehört zur richtigen Karte, Station und zum richtigen Unternehmen; ohne Bestätigung erfolgt keine Buchung. |
| LF-F-15 | Unternehmen müssen einen alle 60 Sekunden wechselnden Geschäfts-QR-Code anzeigen können. | Abgelaufene Codes werden bei neuen Anfragen zurückgewiesen; mehrere Kunden können den aktuell gültigen Stationscode nutzen. |
| LF-F-16 | Mitarbeiter müssen offene Selbstscan-Anfragen anhand eines auf beiden Geräten angezeigten Vergleichscodes bestätigen oder ablehnen können. | Eine Anfrage verfällt nach fünf Minuten und kann nur einmal wirksam bestätigt werden. |
| LF-F-17 | Beim Erreichen des Stempelziels muss genau eine offene Belohnung entstehen und weiteres Sammeln blockiert werden. | Auch parallele Anfragen überschreiten das Ziel nicht und erzeugen keine zweite Belohnung. |
| LF-F-18 | Mitarbeiter müssen eine verfügbare Belohnung ausdrücklich einlösen können. | Genau eine Einlösung wird gebucht; der Zähler wird atomar auf null gesetzt und ein neuer Zyklus beginnt. |
| LF-F-19 | Inhaber und Administratoren müssen fehlerhafte Stempel nachvollziehbar korrigieren können. | Korrekturen enthalten Akteur und Begründung; ursprüngliche Buchungen bleiben nachvollziehbar und der Stand wird weder negativ noch größer als das Ziel. |

### 6.5 Wiederherstellung und Datenschutzfunktionen

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-20 | Endkunden müssen freiwillig eine E-Mail-Adresse bestätigen und damit dieselbe Karte wiederherstellen können. | Ein Wiederherstellungslink ist einmalig und 15 Minuten gültig; ein Gerätewechsel erzeugt kein neues Sammelkonto. |
| LF-F-27 | Die Plattform muss die Entfernung der Wiederherstellungsadresse und eine kontrollierte Karten- beziehungsweise Unternehmenslöschung unterstützen. | Berechtigungen werden geprüft, weitere Zugriffe widerrufen und betroffene Systeme berücksichtigt; erforderliche Aufbewahrung wird dokumentiert. |

### 6.6 SaaS, Abrechnung und Betreuung

| ID | Anforderung | Überprüfbares Ergebnis |
| --- | --- | --- |
| LF-F-21 | Die drei Tarife aus Abschnitt 5.2 müssen angeboten und serverseitig angewendet werden. | Rechte und Grenzen hängen vom wirksamen Tarif des Unternehmens ab. |
| LF-F-22 | Programm-, Nutzer- und Kartengrenzen müssen auch bei parallelen Vorgängen eingehalten werden. | Grenzüberschreitende Neuanlagen werden verhindert; wiederholtes Hinzufügen derselben Wallet-Darstellung zählt nicht erneut. |
| LF-F-23 | Internationale Geschäftskunden müssen Monatsabos in EUR oder USD über Stripe abschließen und Rechnungen beziehungsweise Zahlungsdaten verwalten können. | Firmen- und Rechnungsdaten werden erfasst; Checkout berechnet anfallende Steuern für freigegebene Verkaufsländer. |
| LF-F-24 | Upgrades, Downgrades, Kündigungen und fehlgeschlagene Zahlungen müssen nach Abschnitt 5.4 verarbeitet werden. | Erfolgsmeldungen im Browser allein schalten keinen Bezahltarif frei; bestehende Karten bleiben bei Tarifrückstufung erhalten. |
| LF-F-25 | Unternehmen müssen die tarifabhängigen Nutzungsstatistiken erhalten. | Free zeigt Gesamtzahlen; Pro zusätzlich Zeitreihen und Filter nach Programm, Scanverfahren und Mitarbeiter; Business zusätzlich CSV-Auswertungen. |
| LF-F-26 | Interne Plattform-Owner müssen Unternehmen suchen, Nutzung und Tarif prüfen, Unternehmen sperren und technische Fehler bearbeiten können. | Verwaltungszugriffe und manuelle Wiederholungen fehlgeschlagener Aufträge werden protokolliert. |
| LF-F-28 | Oberfläche und transaktionale E-Mails müssen Deutsch und Englisch unterstützen. | Zentrale Kundenabläufe sind in beiden Sprachen vollständig nutzbar. |

## 7. Nichtfunktionale Anforderungen

| ID | Anforderung | Nachweis |
| --- | --- | --- |
| LF-N-01 | Mandantendaten und interne Academy-Daten müssen serverseitig voneinander isoliert sein. | Automatisierte Negativtests für fremde Kennungen, Rollen und direkte Schnittstellenzugriffe. |
| LF-N-02 | Sitzungen, Einladungen, Wiederherstellungslinks, sensible Aktionen und Anbieteraufrufe müssen angemessen authentifiziert und gegen Missbrauch begrenzt werden. | Tests für Tokenablauf, Wiederverwendung, Rollenmanipulation, fehlende Autorisierung und Anfragelimits. |
| LF-N-03 | Buchungen müssen atomar, nachvollziehbar und bei Wiederholung desselben Vorgangs idempotent sein. | Parallelitäts- und Wiederholungstests einschließlich gleichzeitiger Einlösungen. |
| LF-N-04 | Endkundendaten müssen standardmäßig auf die benötigten Kartenkennungen beschränkt bleiben. Geheimnisse und Wiederherstellungstokens dürfen nicht in Protokollen erscheinen. | Prüfung gespeicherter Daten, Log-Ausgaben, Löschverfahren und der getrennten freiwilligen E-Mail-Verarbeitung. |
| LF-N-05 | Kundenkarte, Scanner und Portal müssen auf mobilen Geräten bedienbar sein; Formulare müssen beschriftet und Statusmeldungen verständlich sein. | Geräteprüfung, Tastaturbedienung und nachvollziehbarer Ablauf bei verweigerter Kamerafreigabe. |
| LF-N-06 | Ausfälle von Wallet- oder E-Mail-Anbietern dürfen bestätigte Stempel und Einlösungen nicht verlieren. | Ausfalltest mit anschließendem Wiederanlauf und Abgleich der endgültigen Kartenstände. |
| LF-N-07 | Kritische Hintergrundfehler, Rückstände, Abrechnungsprobleme und auslaufende Wallet-Zertifikate müssen für den Betreiber erkennbar sein. | Betriebsansichten, strukturierte Fehlermeldungen und getestete Alarmbedingungen. |
| LF-N-08 | Die Erweiterung muss modular, versionierbar und mit der bestehenden Academy kompatibel sein. | Codeprüfungen, automatisierte Prüfungen und Regressionstests der bisherigen Kernabläufe. |
| LF-N-09 | Die Stempelbuchung muss unabhängig von der Laufzeit externer Wallet-Updates bestätigt werden. | Benutzer sieht den gespeicherten Stand und gegebenenfalls „Wallet-Update ausstehend“, ohne auf den Anbieter warten zu müssen. |
| LF-N-10 | Datenbankwiederherstellung und Wiederanlauf der Hintergrundverarbeitung müssen dokumentiert und erprobt sein. | Durchgeführte Wiederherstellungsprobe in einer getrennten Umgebung; keine doppelten Buchungen durch erneut gestartete Aufträge. |

Es wird in Version 1.0 kein pauschales Verfügbarkeits-SLA und keine feste Wallet-Zustellzeit zugesichert. Gemessene Leistungswerte und Betriebskosten sind im Pilot zu dokumentieren und bilden die Grundlage späterer Betriebszusagen.

## 8. Fachliche Abläufe

### 8.1 Unternehmen startet

1. Inhaber registriert sich und bestätigt seine E-Mail-Adresse.
2. Er richtet das Unternehmen ein und beginnt im Free-Tarif.
3. Er erstellt und veröffentlicht ein Programm im geführten Editor.
4. Er teilt den Aufnahme-QR-Code beziehungsweise den Link zur Programmseite.
5. Bei Bedarf schließt er ein bezahltes Abo ab und lädt Mitarbeiter ein.

### 8.2 Endkunde erhält eine Karte

1. Endkunde öffnet die öffentliche Programmseite.
2. Er fordert bewusst eine Karte an; die Plattform richtet eine anonyme Browsersitzung ein.
3. Er speichert dieselbe Karte in einer unterstützten Wallet oder nutzt die Web-Karte.
4. Optional hinterlegt und bestätigt er eine E-Mail-Adresse für die Wiederherstellung.

### 8.3 Stempel wird vergeben

Beim Mitarbeiter-Scan zeigt der Kunde seine Karte und der angemeldete Mitarbeiter bestätigt die Buchung. Beim Selbstscan öffnet der Kunde den Geschäfts-Code, wählt seine berechtigte Karte und zeigt dem Mitarbeiter den Vergleichscode. Erst dessen Bestätigung bucht den Stempel.

Ein Geschäfts-Code allein ist weder Kaufnachweis noch Freigabe. Bei verlorener Browsersitzung kann die Plattform keine installierte Wallet automatisch auslesen; der Kunde nutzt Wiederherstellung oder den Mitarbeiter-Scan.

### 8.4 Belohnung und Wiederherstellung

Nach dem Stempelziel zeigt die Karte die verfügbare Belohnung. Ein Mitarbeiter bestätigt die tatsächliche Einlösung; anschließend beginnt der nächste Sammelzyklus. Bei Gerätewechsel stellt der Kunde über eine zuvor bestätigte E-Mail-Adresse dieselbe Karte wieder her. Ohne geeignete Sitzung oder eingerichtete Wiederherstellung besteht kein Anspruch auf automatische technische Wiederzuordnung.

## 9. Leistungsabgrenzung

Nicht Bestandteil von Release 1.0 sind:

- Filialverwaltung und standortbezogene Mitarbeiterrechte.
- Kassenschnittstellen, automatische Kaufprüfung und unbeaufsichtigte Stempelvergabe.
- Mehrere gleichzeitig angesparte Belohnungen, Punktekonten, Geldguthaben und Rabattregeln.
- Eine frei platzierbare Drag-and-drop-Gestaltung oder mehrere Layoutvorlagen.
- Marketing-Push, Newsletter-Funktionen und automatische KI-Auswertungen.
- Native Endkunden- oder Mitarbeiter-Apps und Offline-Buchungen.
- Kundeneigene Wallet-Anbieterzugänge, eigene Kundendomains und weitere Wallet-Anbieter.
- Jahresabos, weitere Währungen oder automatische Währungswechsel laufender Abos.
- Garantierte Verhinderung des Teilens einer anonymen Wallet-Karte.

Priorisierter Business-Support bezeichnet die organisatorische Priorisierung vorhandener Supportwege. Ein neues Ticketsystem gehört nicht zum Lieferumfang.

## 10. Voraussetzungen und Mitwirkung

| Voraussetzung | Verantwortlichkeit | Erforderlicher Nachweis |
| --- | --- | --- |
| Apple-Developer-Zugang, Pass Type ID, gültiges Zertifikat und privater Schlüssel | Betreiber | Funktionierende Passsignierung und Update-Test auf echtem Gerät. |
| Google-Wallet-Issuer, Dienstkonto und Veröffentlichungsfreigabe | Betreiber | Testausgabe und Freigabe zur Ausgabe an reguläre Nutzer. |
| Berechtigung zur Ausgabe von Programmen mit Kundenbranding | Betreiber und Geschäftskunde | Passende Anbieter- und Nutzungsbedingungen sowie Prüfung des zentralen Betriebsmodells. |
| Stripe-Konto, Produkte und Preise in beiden Währungen, Kundenportal und Stripe Tax | Betreiber | Test- und Live-Konfiguration sowie erfolgreich geprüfte Zahlungsfälle. |
| Verkaufsländer, steuerliche Einrichtung und Rechnungsanforderungen | Betreiber mit zuständiger fachlicher Unterstützung | Dokumentierte Länderfreigabe; keine Gleichsetzung von Steuerberechnung und vollständiger steuerlicher Erledigung. |
| E-Mail-Absender und Domain | Betreiber | Funktionierende Zustellung von Verifikation, Einladung, Passwortreset und Recovery. |
| HTTPS-Domain, Hosting, Hintergrundjobs und Datensicherung | Betreiber / Umsetzung | Erreichbare Anbieterendpunkte und geprüfter Wiederanlauf. |
| Datenschutzinformationen, Vertragsgrundlagen, Aufbewahrungs- und Löschregeln | Betreiber mit zuständiger fachlicher Unterstützung | Für die freigegebenen Märkte dokumentierte und veröffentlichte Regelungen. |
| Reale iOS-/Android-Geräte und Pilotunternehmen | Betreiber | Protokollierte Pilotdurchläufe. |

Ob diese Zugänge und Freigaben bereits vorliegen, wurde für dieses Dokument nicht durch Kontozugriff geprüft. Fehlende Konfigurationen sind Betriebs- beziehungsweise Launch-Voraussetzungen und keine stillschweigend als erledigt angenommenen Aufgaben.

## 11. Abnahmekriterien

| ID | Abnahmefall | Bestanden, wenn |
| --- | --- | --- |
| AK-01 | Registrierung und Bereichstrennung | Ein verifiziertes Geschäftskonto sein Unternehmen öffnet und sämtliche geprüften internen Academy-Zugriffe verweigert werden. |
| AK-02 | Rollen und Unternehmen | Rollenrechte, Einladungen, Entfernung und Unternehmenswechsel funktionieren; fremde Mandantendaten bleiben unzugänglich. |
| AK-03 | Programmverwaltung | Entwurf, Vorschau, Veröffentlichung und Archivierung funktionieren; nach erster Ausgabe sind Ziel und Belohnung geschützt. |
| AK-04 | Anonyme Ausgabe | Ein Kunde ohne Plattformkonto eine Karte erhält und Wiederholung im selben Browser keine zusätzliche Karte erzeugt. |
| AK-05 | Apple Wallet | Ausgabe und anschließende Aktualisierung einer realen Karte auf einem iPhone nachgewiesen sind. |
| AK-06 | Google Wallet | Ausgabe und anschließende Aktualisierung einer realen Karte auf einem Android-Gerät nachgewiesen sind. |
| AK-07 | Gemeinsame Kartenidentität | Apple, Google und Web für dieselbe Karte denselben Datenbankstand verwenden und nur ein Kartenkontingent belegen. |
| AK-08 | Mitarbeiter-Scan | Nur ein berechtigter Mitarbeiter nach ausdrücklicher Bestätigung genau einen Stempel bucht. |
| AK-09 | Selbstscan | Statischer und dynamischer Code nur Anfragen erzeugen; Vergleichscode, Freigabe, Ablehnung und Ablauf korrekt funktionieren. |
| AK-10 | Parallelität und Wiederholung | Wiederholte oder konkurrierende Vorgänge weder doppelte Stempel noch doppelte Belohnungen oder Einlösungen erzeugen. |
| AK-11 | Belohnungszyklus und Korrektur | Zielerreichung, Sammelsperre, einmalige Einlösung, Neustart bei null und nachvollziehbare Korrektur funktionieren. |
| AK-12 | Recovery und Löschung | Verifizierte E-Mail dieselbe Karte wiederherstellt; ungültige Links scheitern und Entfernung beziehungsweise Löschung wirksam sind. |
| AK-13 | Tarife und Limits | Alle drei Tarifprofile einschließlich paralleler Grenzfälle und gemeinsamer Wallet-Zählung korrekt angewendet werden. |
| AK-14 | Zahlung und Tarifwechsel | EUR/USD-Abschluss, Rechnungszugang, Steuer-Testfälle, Zahlungsausfall und Tarifwechsel einschließlich Bestandskartenschutz bestehen. |
| AK-15 | Anbieter- und Prozessausfälle | Buchungen erhalten bleiben und ausstehende Wallet-Aufträge nach Wiederanlauf ohne veralteten Endstand verarbeitet werden. |
| AK-16 | Statistik und Betrieb | Tarifgerechte Auswertungen, Business-CSV, interne Mandantenverwaltung und Fehlerbehandlung funktionieren. |
| AK-17 | Bedienbarkeit und Sprache | Kernabläufe auf den Testgeräten in Deutsch und Englisch einschließlich Kamera-Fehlerfall bedienbar sind. |
| AK-18 | Regression und Betriebsfreigabe | Academy-Regression, technische Prüfungen und dokumentierte Wiederherstellungsprobe bestehen; Launch-Voraussetzungen sind erfüllt. |

Die Abnahme wird mit Testumgebung, Geräte- und Browserversionen, Testergebnis und verbleibenden Mängeln dokumentiert. Ein technischer Testzugang ersetzt keine Freigabe zur öffentlichen Wallet-Ausgabe oder zu Live-Zahlungen.

## 12. Projektorganisation und Dokumentenpflege

Konkretisierung v0.4.7 · 27.10.2026: LF-F-03/LF-N-05 verlangen konsistente bedienbare Navigation. Die tarifunabhängige Basisübersicht bietet Mitarbeiterverwaltung nur an, wenn Rolle, Feature-Schalter und bereits unterstützter Tarif den vorhandenen Fachservice erlauben; sonst ausdrücklicher Nicht-verfügbar-Hinweis. Keine Änderung von Tarif-/Rollenrechten oder Muss-Kennungen. Technische Umsetzung im Pflichtenheft 5.2, Prüfergebnisse ausschließlich im [Bediennachweis](../nachweise/NACHWEISE.md#v047--bedienprufung-27102026).

Version 1.5 · 27.10.2026: v0.4.0 konkretisiert LF-F-01/03/26/28 und LF-N-01/02/05 im [Paketabschnitt](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#v040--verhalten-rollen-und-abnahmekriterien): Geschäftskundenportal mit echten Basisdaten und rollenbezogener Navigation, interne Suche nur für globale Plattform-OWNER mit explizitem auditiertem Supportdetail. Fehlende Funktionen werden als nicht verfügbar ausgewiesen. Unterschritte v0.4.0–v0.4.8 gehören zu einem Paket; Anforderungen und vollständige AK-01/02/16/17 bleiben unverändert. Prüf- und Freigabestand ausschließlich in [NACHWEISE.md](../nachweise/NACHWEISE.md#v040--umsetzung-27102026).

Die Entwicklung erfolgt in fachlich abnehmbaren Schritten: Zugriffsabsicherung und Mandantenbasis, Programme und Web-Karte, Wallet-Anbindung, Scan- und Belohnungsabläufe, Wiederherstellung und SaaS-Abrechnung, anschließend geschlossener Pilot und öffentlicher Start.

Die im Ausgangskonzept genannten acht Wochen sind eine unverbindliche Orientierung aus einer früheren Umfangsannahme. Eine belastbare Terminplanung folgt aus der technischen Zerlegung, verfügbaren Kapazitäten und den Anbieterfreigaben.

Die Dokumente werden lokal unter context/dauerhaft/dokumentation/ mit eigener Versionshistorie gepflegt; context/dauerhaft/dokumentation/ wird nicht von Git erfasst. Anforderungen behalten ihre Kennung bei; Änderungen erhalten Versionsdatum und nachvollziehbare Beschreibung. Technische Ausgestaltung und Testzuordnung stehen im [Pflichtenheft](PFLICHTENHEFT_STEMPELKARTEN.md).

Version 1.1 · 22.10.2026: lokale Ablage unter context/dauerhaft/dokumentation/; Anforderungen unverändert.

Version 1.2 · 23.10.2026: Auftraggeber legt zentrale Sicherung und separate Restore-Datenbank nach dem Bau, zwingend vor Livegang fest (Q-O-01 1.5). LF-N-10, T-18 und AK-18 samt erprobter Wiederherstellung vor Produktfreigabe bleiben unverändert verbindlich; keine ausgeführte Sicherung/Probe behauptet. Entwicklungs-Migrationen bleiben additiv, isoliert geprüft und ausdrücklich autorisiert. Details: Pflichtenheft, technische Ergänzung 1.7.

Version 1.3 · 23.10.2026, Auftraggeberentscheidung zu LF-F-01/02/03: StempelFi verwendet dieselben Better-Auth-Konten und Sitzungen. Bestehende INTERN-Konten dürfen nach abschließender Auftraggeberentscheidung beliebig viele eigene Unternehmen gründen und nutzen nur explizite eigene Mitgliedschaften; sie erhalten keine fremden Unternehmensdaten. Die frühere Begrenzung auf ein erstes Unternehmen ist aufgehoben. Globaler OWNER sieht alle Unternehmen als interner Plattformverwalter. Geschäftliche und globale Rollen bleiben getrennt. Künftige Kunden erhalten einen eigenen Kontotyp CUSTOMER statt INTERN und erstellen eigene Konten über das spätere Registrierungs-/Verifikationspaket. Deren Unternehmensanlage wird separat spezifiziert und hier nicht freigeschaltet. Calem öffnet die öffentliche Landingpage, deren Header den Geschäftszugang anbietet. Siehe [Zugangsverhalten](ZUGANG_STEMPELFI.md); keine zweite Anmeldung bei bereits gültiger Sitzung.

Version 1.4 · 27.10.2026: redaktioneller Statusabgleich; Muss-Anforderungen, Produktentscheidungen und AK unverändert. Teilpaketstatus ausschließlich im Entwicklungsregister.

Konkretisierung 27.10.2026, v0.5.0: bestehende Textgrenzen 80/500/160 gelten auch vor Normalisierung. Platzhalter sind Beispiele, keine gespeicherten Werte; neue Entwürfe beginnen leer. Gemeinsame Zod-Feldschemata für Formular und Server, lokale Feldfehler bei Fokusverlust; HTTP-Body bleibt begrenzt. Keine Änderung der bestehenden LF-/T-/AK-Zuordnung oder Freigaben; Ergebnisse in NACHWEISE.md.

Auftraggeberänderung 27.10.2026: Programmname maximal 40, Beschreibung maximal 250 Zeichen; Gratisbelohnung unverändert 160. Ersetzt frühere 80/500-Grenzen für diese Felder. Gemeinsame Zod-/UI-Grenzen, sichtbarer Zeichenzähler je Textfeld und textliche, höflich angekündigte Warnung bei erreichter Grenze; Grenze selbst bleibt gültig, weitere Eingabe wird begrenzt. Bestehende technische DB-Spaltenbreiten bleiben erhalten, keine Migration/Abschneidung vorhandener Daten. LF-F-06/28, LF-N-05, T-/AK-03/17 anteilig; Ergebnisse nur NACHWEISE.md.

Auftraggeberänderung 27.10.2026: aktuelle Textgrenzen Name 40, Beschreibung 70, Gratisbelohnung 40 Zeichen; ersetzt vorherige 40/250/160-Grenzen. Zentrale Zod-/Formulargrenzen, Zähler und Grenzwarnung gelten unverändert gemeinsam; keine Migration oder Datenkürzung. LF-F-06/28, LF-N-05, T-/AK-03/17 anteilig. Ergebnisse ausschließlich NACHWEISE.md.

Auftraggeberänderung 27.10.2026, v0.5.3: ausschließlich StempelFi-Logoablage auf privaten Cloudflare-R2-Testbucket umstellen, gespeicherte STEMPELFI_R2-Konfiguration verwenden und live testen. Ersetzt die UploadThing-Ablage für neue StempelFi-Logos; Academy-Uploads bleiben unverändert. Zod-/Sharp-/Rollen-/Mandanten-/Revisionsregeln bleiben erhalten. Getrennte serverseitige Speicheranbindung mit aws4fetch (MIT), S3-Signaturheader und Region auto, nur HTTPS-R2-Accountendpoints, keine öffentlich ausgegebenen Credentials oder signierten Browserlinks. Objektschlüssel deterministisch nach Unternehmen/Vorgang/normalisiertem Inhalt; DB speichert weiterhin Schlüssel, keine neue Migration. Kein Import/Löschen alter UploadThing-Objekte; alte Schlüssel werden nicht an R2 fehlgeleitet. V053-01–05 gelten weiter; bestehende historische UploadThing-Nachweise belegen R2 nicht. Live-Test nur bestätigter R2-Testbucket und getrennte Loyalty-Test-DB mit Kindprozess-Opt-in; eigene synthetische Dateien/Zeilen bereinigen, Fremdbestand erhalten. Ergebnisse nur NACHWEISE.md.

28.10.2026 · Version 1.8: ausdrücklich Stempelziel auf ganze Zahlen 1–10 begrenzt, DE/EN-Fehler nennen den Bereich. Vorhandene Ziele über 10 bleiben unverändert lesbar; neue Speicherung erst nach bewusster Korrektur, keine automatische Bestands-/Kartenänderung oder Migration. LF-F-05/06/28, LF-N-05; T-/AK-03/17 anteilig. Ergebnisse ausschließlich NACHWEISE.md.

28.10.2026 · Version 1.9: nach bestätigtem Entwurfsspeichern direkt zur eigenen Unternehmensübersicht. Sichtbar Gespeichert/Nicht gespeichert statt Revisionsnummer, interne Revision und Konfliktschutz unverändert. Bei Fehler/unbestätigtem Ergebnis im Editor bleiben; keine Erfolgsnavigation ohne Bestätigung. LF-F-05/06, LF-N-05; T-/AK-03/17 anteilig. Ergebnisse nur NACHWEISE.md.


Auftraggeberänderung 28.10.2026 · QL-021: Ersetzte oder entfernte StempelFi-Logos nach bestätigtem Speichern automatisch aus R2 löschen, ausschließlich wenn kein Programm sie mehr verwendet. Neue Auswahl allein löscht kein bisher gespeichertes Logo. Vor beziehungsweise bei Auswahl eines Ersatzes sichtbar warnen, dass das alte Logo nach dem Speichern gelöscht wird, sofern ungenutzt; Hinweis DE/EN zugänglich. Fehler, Konflikte oder unklare Commits dürfen verwendete Logos nicht löschen. Anbieterfehler erhalten einen wiederholbaren Bereinigungsauftrag und einen sichtbaren Hinweis. LF-F-06/28, LF-N-02/05; T-/AK-03/17 anteilig. Academy-Uploads bleiben UploadThing; keine Migration oder pauschale Bucketbereinigung.

28.10.2026 · 1.10: Logoersatz/-entfernung mit referenzsicherer automatischer Bereinigung und Warnung, ersetzt frühere reine Referenzänderung. Ergebnisse nur NACHWEISE.md.


Auftraggeberentscheidung 28.10.2026: Logo-Uploadbedienung im bestehenden v0.5.5 mit kompakter Dropzone, Tastatur-/Handy-Dateiauswahl und aktuellem Vorschaubild. Ersetzen/Entfernen jeweils erst nach Bestätigungsdialog mit kurzem rotem Warntext; Abbrechen/Escape erhält altes Logo und startet keinen Upload. Dauerhaften großen Warnhinweis entfernen. Konkrete Größen-/Format-/Bild-/Rechte-/Netz-/Timeout-/Anbieterfehler DE/EN; ein PNG/JPEG/WebP bis 4 MiB unverändert. Echter Transferfortschritt mit Prozent/Balken, übertragenen MB, gemessenen MB/s, vergangener Zeit und geschätzter Restzeit; anschließend explizite Verarbeitung mit Spinner, niemals Asseterfolg allein aus 100 Prozent Transfer ableiten. Laufenden Upload abbrechen, bisherigen Stand erhalten; unklarer Ausgang bleibt bis identischer Wiederholung oder bewusstem Verwerfen gesperrt. LF-F-06/28, LF-N-02/05; T-/AK-03/17 anteilig. R2-Löschung weiterhin ausschließlich nach Programmcommit gemäß QL-021, keine Academy-Änderung/Migration.

28.10.2026 · 1.11: bestätigte Logo-Dialog-/Dropzone-/Fortschritts-/Abbruchanforderungen; ersetzt den dauerhaft eingeblendeten QL-021-Warntext durch Popup vor Aktion. Prüfergebnisse nur NACHWEISE.md.


30.10.2026 · 1.12: Lebenszyklus, aktive Programmzählung, unabhängige Sperre und dauerhafter Bedingungsschutz für v0.6.0 konkretisiert; Kriterien im Paketplan, Ergebnis ausschließlich NACHWEISE.md.
