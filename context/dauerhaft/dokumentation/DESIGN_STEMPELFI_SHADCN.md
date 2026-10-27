# StempelFi – Designvorgaben

Editorvorschau v0.5.0 · 27.10.2026, ausdrücklicher Auftrag: neuen echten Editor ohne Migration visuell zeigen. Unter `/preview?view=program-editor` denselben Editor mit lokalen DE/EN-Beispieldaten rendern. Alle Besucher können Texte, Ziel, Symbol und Farben verändern; drei Vorschauen reagieren unmittelbar. Speichern/Upload sichtbar deaktiviert und Nicht-Persistenz erklärt; keine DB-/Provideraufrufe. Neuladen setzt zurück; Sprachwechsel erhält den Vorschaupfad. Bestehende öffentliche Vorschau bleibt erreichbar. Folgeauftrag ersetzt den zusätzlichen Link: „Neue Karte ausprobieren“, Entwurfs- und Brandingaktionen sowie Landing-Editorlink führen ausschließlich zum neuen Designer. Alten lokalen Editor aus der Vorschaukomponente entfernen; bestehendes `view=editor` zeigt ebenfalls den neuen Designer. Veröffentlichte Beispieldaten behalten geschützte Ziel-/Belohnungswerte im gemeinsamen Editor, Branding bleibt änderbar; Entwurf bleibt frei bearbeitbar. Sprachwechsel erhält die Beispielwahl. Kriterien: DE/EN, Light/Dark, 360px/Desktop, Tastatur/Labels, keine Schreibaufrufe; LF-F-06/28, LF-N-05; T-/AK-03/17 anteilig. Prüfergebnisse ausschließlich NACHWEISE.md.

v0.5.0 · 27.10.2026: echter Entwurfseditor übernimmt die vorhandene Atelier-/shadcn-Gestaltung mit explizitem Speichern, optionalem Logo, freien HEX-Markenfarben und blockierender Lesbarkeitsprüfung (4,5:1). Drei aus denselben Daten gespeiste Vorschauen mit Abweichungshinweis; keine Wallet-Ausgabe. Mobil Vorschauen vor Formular, Desktop daneben; große Ziele als Textstand, beschriftete Inputs und textliche Status-/Fehlermeldungen. Unternehmensübersicht erhält paginierte echte Entwürfe nur für OWNER/ADMIN, öffentliche Vorschau bleibt synthetisch. Keine Aufhebung späterer Geräte-/Zustandsprüfungen. Anforderungen/Prüfstand im [Paketabschnitt](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#v050--programm-anlegen-und-karte-gestalten) und [Nachweis](../nachweise/NACHWEISE.md#v050--implementierung-27102026).

Stand 27.10.2026; Auftraggeberentscheidung vom 23.10.2026 bleibt gültig: Atelier, ausschließlich bestehende shadcn/ui-Komponenten und semantische variable Themefarben; keine eigenen Hex-/RGB-/OKLCH-Werte oder beiläufigen globalen Themeänderungen. Light/Dark, DE/EN, ab 360 CSS-px ohne horizontales Scrollen, Tastatur/Fokus/Labels und verständliche Fehler.

Öffentliche Produktseite: /[locale]/tools/calem/stempelkarten. /preview bleibt synthetische Portal-/Editoransicht ohne Kundendaten, Persistenz, Registrierung/Zahlung; Reload verwirft Entwurf. Lokaler Editor: positive ganze Zielzahl, verknüpfte Fehler, Leerplatzhalter, große Ziele kompakt. Beim Wechsel zum veröffentlichten Beispiel Ziel/Belohnung auf dessen Bedingungen zurücksetzen und sperren; Branding weiter editierbar. Keine Speichermeldung/Publish-Aktion. Beliebige Markenfarben/Logo und vollständige Wallet-Vorschauen erst im Editorpaket.

Öffentliche Produktseite, Designiteration vom 27.10.2026 (Auftraggeberauftrag): Apple-inspirierte Ruhe innerhalb der bestehenden Atelier-Farben und shadcn-Komponenten. Vor Umsetzung festgelegtes Verhalten: alle Besucher sehen Produktbeispiel, Ablauf und Tarife ohne Anmeldung; Hauptaktion öffnet den synthetischen Editor, Ablauf-/Tariflinks springen zum Abschnitt. Sprach-/Themewechsel und EUR/USD-Auswahl bleiben erhalten. Keine Speicherung, neuen Rollen oder neuen Produktversprechen. Kriterien: begrenzte Inhaltsbreite, serifenlose Seitenüberschriften, gerade ausgerichtete Beispielkarte, klare Hauptaktion; DE/EN und Light/Dark ab 360px ohne Überlauf, erreichbare Tastaturziele. Lade-/Leer-/Serverfehlerzustände nicht neu eingeführt; bestehende Navigation bleibt maßgeblich. LF-F-28, LF-N-05/08; T-17/T-18 und AK-17/18 anteilig. Prüfstand und getrennte Teilabnahme: [Nachweis](../nachweise/NACHWEISE.md#produktseite-designiteration-27102026).

Echtes /app folgt [Zugangsregeln](ZUGANG_STEMPELFI.md), /admin bleibt geschützt. Öffentliche Designseiten ohne Academy-Loginfooter/Sitzungsabruf. Tarifanzeigen aus gemeinsamer Konfiguration gewähren keine Rechte. LF-F-01/05/06/07/21/28, LF-N-05/08, T-/AK-03/13/17/18 anteilig.

v0.4.0 · 27.10.2026: Echtes Portal mit serifenlosem Unternehmenseinstieg, sichtbarer Rolle und aktiver Navigation; interne Suchtreffer als umbrechende Karten mit echten Basisdaten. Nicht verfügbare Funktionen erhalten Text statt Scheinaktion. Vorhandene shadcn-/Themebausteine, DE/EN und Fokusdarstellung weiterverwenden. Kriterien/Teilcheckliste im [Paketabschnitt](ENTWICKLUNGSANLEITUNG_STEMPELKARTEN.md#v040--verhalten-rollen-und-abnahmekriterien); Prüf- und Bedienabnahmestand nur im [Nachweis](../nachweise/NACHWEISE.md#v040--umsetzung-27102026).

Historisch: 23.10.2026, Basis 7f82a2b, vier Checks/106 Tests und DE/EN-Browser/360px/Tastatur/Theme geprüft, Codex-Selbstreview. Keine echte iPhone-/Android-/Wallet-/Betriebsabnahme. Stand 27.10.2026. Historische Einzelbelege wurden auf Auftrag gelöscht; Prüfergebnisse nur als [Kurzfassung](../nachweise/NACHWEISE.md) erhalten. Keine neue Produktfreigabe.

Header-Schritt 27.10.2026, Kriterien vor Umsetzung: Beschreibungshinweis nur auf der öffentlichen Produktseite entfernen; Vorschauhinweis im Editor erhalten. Öffentliche Navigation erhält Zurück zur Academy / Back to Academy als sprachgebundenen Link auf / (Academy-Einstieg, vorhandene Zugangskontrolle). Preise und Unternehmensanmeldung bleiben erreichbar. Bei 360px mehrzeilige Navigation, Tastaturfokus und DE/EN prüfen; keine Rollen-/Speicheränderung. LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig.

Hero-Schritt 27.10.2026, Kriterien vor Umsetzung: bestehende Aussage in zwei sprachabhängige Überschriftteile gliedern, Stammgäste/regulars über primary hervorheben. Beispielkarte nur auf Produktseite größer, mit serifenloser Typografie und klaren ausgefüllten Stempeln präsentieren; als Beispiel kennzeichnen. Editor-/Portal-Kartendarstellung unverändert. DE/EN, Light/Dark, 360px/Desktop, CTA und unveränderte Beispielzählung 6/8 prüfen. Keine Wallet-/Speicherzusage, Fachregel-/Rollenänderung; LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig.

Hero-Detail 27.10.2026, vor Umsetzung: Auf Auftrag das Kicker-Badge über der öffentlichen Hauptüberschrift in DE/EN entfernen; Überschrift, Karte, Navigation und Aktionen erhalten. LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig; reine Darstellungsänderung ohne neue Zustände oder Rollen.

Editoriteration 27.10.2026, Kriterien vor Umsetzung: synthetischer Editor für alle Besucher; serifenlose Überschriften/Karte, kompakter Kopf ohne Sitzungsabruf, Portalnavigation nur in Übersicht. Große Beispielkarte mobil vor Formular, ab lg daneben; mobiler Sprunglink zur Vorschau nach Eingaben. Beschriftete Theme-Farbmuster mit Häkchen/aria-pressed. DE/EN, Light/Dark, 360px/Desktop, Tastatur, Leerwerte, ungültiges/großes Ziel und gesperrtes Beispiel prüfen. Keine Speicherung, Fachregel-/Rollenänderung oder neue Ladezustände. LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig. Erweitert frühere Landing-showcase-Variante auf Editor. Ergebnisse/Abnahmen in NACHWEISE.md.

### Editoriteration – Teilcheckliste

| Feld | Eintrag |
| --- | --- |
| Gegenstand / Prüfweg | Öffentliche synthetische Editor-Vorschau, Softwareänderung; kein funktionales Editorpaket v0.5.0. |
| Stand / Umgebung / Prüfer | 27.10.2026, Windows / Node 24.21.0, Codex-Selbstreview; Commit und Dateihashes im Nachweis. |
| Rollen / Verhalten / Anforderungen | Alle Besucher, ausschließlich lokale Beispieldaten; Erfolg: direkte Vorschau, Fehler: verknüpfte Zielvalidierung, Leerwerte: Platzhalter; LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig. |
| Implementierung / Automatik / Review | Stand und Befunde im [Editor-Nachweis](../nachweise/NACHWEISE.md#editoriteration-27102026). |
| Regression / Abhängigkeiten | Gemeinsamer Header und Beispielkarte, Landing/Portal-Aufrufwege sowie bestehende Academy-Tests prüfen; shadcn und Theme erhalten. |
| DB / Geräte / Betrieb / AK-01–16 | DB-/Provider-/Fachregeln unberührt; dafür keine neuen Integrationstests erforderlich. Echte Geräte-/Wallet-/Betriebsabnahme bleibt offen; kein Gesamtnachweis AK-01–18. |
| Entscheidung | Reversibler lokaler Entwurf; keine Produkt-/Betriebsfreigabe, kein Merge/Deployment. Offene Prüfungen sperren vollständige Übernahme. |

Editor-Detail: Sprachwechsel erhält die Editoransicht über view=editor; lokale Inhalte bleiben weiterhin unverbindliche Beispieldaten. Kein Versprechen der Entwurfserhaltung beim Sprachwechsel oder Neuladen.

Editor-Headerkorrektur 27.10.2026, Auftraggeberentscheidung/Kriterien vor Umsetzung: oberen Designvorschau-Hinweis auch auf /preview entfernen; ersetzt frühere Vorgabe zum Erhalt. Landingheader mit Academy-Rückweg, Preisen, Unternehmensanmeldung, Sprache und Theme auch für Vorschau verwenden. Preise führen zum Landing-Preisabschnitt; Sprachwechsel erhält Editoransicht. Lokaler Nicht-Speicherhinweis im Formular bleibt. Alle Besucher, keine neuen Rollen/Zustände/Fachregeln; LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig. Teilcheckliste der Editoriteration gilt mit aktualisiertem Stand in NACHWEISE.md.

Calem-Toolkarte 27.10.2026, Kriterien vor Umsetzung: bestehende Academy-Zugriffskontrolle unverändert; StempelFi-Karte mit Rechtspfeil wie Lead-Recherche, Produktname StempelFi und kurzer DE/EN-Beschreibung digitaler Stempelkarten/Kundenbindung. Technischen Header-Zugangshinweis aus Karte entfernen. Gleicher sprachgebundener Landinglink, Tastatur/Fokus und 360px-Umbruch erhalten; keine neuen Zustände, Rollen oder Fachregeln. LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig. Teilcheckliste der Designiteration gilt entsprechend, Stand/Ergebnisse nur NACHWEISE.md.

### Calem-Toolkarte – Teilcheckliste

| Feld | Eintrag |
| --- | --- |
| Umfang / Prüfweg | Toolkarte unter /tools/calem; Software, kein neues Fachpaket. |
| Stand / Umgebung / Verantwortung | 27.10.2026, Windows/Node 24.21.0; Codex; Commit/Dateihashes im [Nachweis](../nachweise/NACHWEISE.md#calem-toolkarte-27102026). |
| Anforderungen / Verhalten | LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig; bestehende Academy-Mitglieder, unveränderte Landingnavigation; DE/EN-Beschreibung und dekorativer Rechtspfeil. Keine neuen Lade-/Leer-/Fehler-/Schreibzustände. |
| Implementierung / Automatik / Review | Ergebnis und Regression der Academy ausschließlich im Nachweis; gezieltes Selbstreview, keine neuen Fachtests für reine Darstellung nötig. |
| Geräte / DB / Betrieb | Geräte-/authentifizierte Browserabnahme offen; DB/Provider/Fachregeln unberührt, keine neue Integration nötig. Kein Gesamtnachweis AK-01–18. |
| Entscheidung | Reversibler lokaler Entwurf; keine Produkt-/Betriebsfreigabe, kein Merge/Deployment; offene Prüfungen im Nachweis. |

Übersichtsiteration 27.10.2026, Kriterien vor Umsetzung: synthetische /preview-Übersicht für alle Besucher mit unverändertem öffentlichem Header. Sidebar durch kompakten Unternehmenskontext ersetzen; serifenloser Einstieg, ruhige Kennzahlen, visuelle Programmkarten für veröffentlichtes Beispiel und Entwurf, übersichtliche Aktivitäten. Beispieldaten/Kontext und Nicht-Persistenz inhaltlich erhalten; keine echten Statistiken, Buchungen oder neue Rollen. Aktionen öffnen weiterhin lokalen Editor; veröffentlichte Ziel-/Belohnungswerte bleiben gesperrt. Programmwahl zeigt den jeweiligen Beispieltitel im Editor. DE/EN, Light/Dark, 360px/Desktop, Tastatur/Editorhin-/Rückweg prüfen. Keine neuen Lade-/Serverfehlerzustände; vorhandene Editorvalidierung bleibt. LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig; keine Fachregeländerung, keine Erweiterung v0.4.0/v0.5.0. Stand/Ergebnisse nur NACHWEISE.md.

### Vorschauübersicht – Teilcheckliste

| Feld | Eintrag |
| --- | --- |
| Umfang / Prüfweg | Neugestaltung synthetischer /preview-Übersicht; Software, kein funktionales Portalpaket. |
| Stand / Umgebung / Verantwortung | 27.10.2026, Windows/Node 24.21.0, Codex-Selbstreview; Commit/Dateihashes im [Nachweis](../nachweise/NACHWEISE.md#vorschauübersicht-27102026). |
| Anforderungen / Verhalten | Alle Besucher; LF-F-28, LF-N-05/08, T-/AK-17/18 anteilig; lokale Kartenwahl, veröffentlichte Ziel-/Belohnungswerte gesperrt. Synthetische Aktivitäten/Kennzahlen; keine Speicherung, keine neue Lade-/Serverfehlerlogik. |
| Implementierung / Automatik / Regression / Review | Ergebnisse ausschließlich im Nachweis; bestehende Academy-Tests und Header/Editor-Rückweg prüfen. |
| Geräte / DB / Betrieb | Echte Geräte-/Wallet-/Betriebsabnahme bleibt offen; keine neue DB-/Provider-/Rollenlogik, daher keine neue Integration nötig. Kein Gesamtnachweis AK-01–18. |
| Entscheidung | Lokaler reversibler Entwurf; keine Produkt-/Betriebsfreigabe, kein Merge/Deployment. Offene Gesamtprüfungen bleiben sperrend. |

Platzhalter/Validierung · 27.10.2026: Auftrag für Programmname, Beschreibung und Gratisbelohnung. DE/EN-Beispielplatzhalter; neue Karten beginnen leer (bestehende Beispiele/Entwürfe behalten ihre Werte). Zod-Schemata und Formular teilen Grenzen 80/500/160 Zeichen, nun schon für rohe Eingaben vor Normalisierung; On-Blur-Zod-Prüfung mit verknüpften Feldfehlern, Pflichtfelder unverändert. Serverseitige Validierung und begrenzter HTTP-Body bleiben verbindlich. Prüfen: exakte Grenze, Grenzüberschreitung, überlange Leerzeichen-/Million-Zeichen-Eingaben, direkte Action/API-Abweisung; keine echten riesigen Allokationen. LF-F-06/28, LF-N-05; T-/AK-03/17 anteilig. Ergebnisse nur NACHWEISE.md.

Auftraggeberänderung 27.10.2026: Programmname maximal 40, Beschreibung maximal 250 Zeichen; Gratisbelohnung unverändert 160. Ersetzt frühere 80/500-Grenzen für diese Felder. Gemeinsame Zod-/UI-Grenzen, sichtbarer Zeichenzähler je Textfeld und textliche, höflich angekündigte Warnung bei erreichter Grenze; Grenze selbst bleibt gültig, weitere Eingabe wird begrenzt. Bestehende technische DB-Spaltenbreiten bleiben erhalten, keine Migration/Abschneidung vorhandener Daten. LF-F-06/28, LF-N-05, T-/AK-03/17 anteilig; Ergebnisse nur NACHWEISE.md.

Auftraggeberänderung 27.10.2026: aktuelle Textgrenzen Name 40, Beschreibung 70, Gratisbelohnung 40 Zeichen; ersetzt vorherige 40/250/160-Grenzen. Zentrale Zod-/Formulargrenzen, Zähler und Grenzwarnung gelten unverändert gemeinsam; keine Migration oder Datenkürzung. LF-F-06/28, LF-N-05, T-/AK-03/17 anteilig. Ergebnisse ausschließlich NACHWEISE.md.

Warntexte 27.10.2026: verständliche DE/EN-Hinweise getrennt für leeres Pflichtfeld, zu langen Text und unzulässigen Textinhalt; keine kombinierte technische HTML-/Steuerzeichen-Meldung. Grenzwarnung nennt die maximale Länge ohne Fehlerstatus bei exakt gültiger Grenze.

Farbige Textwarnungen 27.10.2026, ausdrücklicher Auftrag: erreichte Zeichengrenze gelb, Überschreitung rot. Zähler und Status textlich erhalten, oberhalb Grenze ausdrücklich Kürzungsfehler statt Erreicht-Hinweis. Auf diese Hinweise begrenzte gelbe/rote Tailwindfarben mit Light-/Dark-Varianten sind durch den Farbauftrag autorisiert; keine globale Themeänderung. Textfehler ebenfalls rot. Prüfkriterien: unter Grenze neutral, exakt gelb, darüber rot, Text farbunabhängig verständlich; zentrale 40/70/40-Grenzen unverändert. LF-F-06/28, LF-N-05; Nachweise nur NACHWEISE.md.
