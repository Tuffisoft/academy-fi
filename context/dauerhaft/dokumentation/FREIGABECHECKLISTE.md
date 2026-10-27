<!-- Nachweiskürzung 27.10.2026: frühere Einzelbelege auf Auftrag gelöscht; historische Ergebnisangaben sind keine weiterhin verfügbaren Detailbeweise. Siehe ../nachweise/NACHWEISE.md. -->
# Freigabecheckliste – Vorlage

Stand 27.10.2026. Vorlage im bestehenden Paketabschnitt der Entwicklungsanleitung ausfüllen, keine neue Datei anlegen. Ergebnisse ausschließlich in [NACHWEISE.md](../nachweise/NACHWEISE.md) pflegen, hier referenzieren. Diese leere Vorlage ist keine Abnahme; fehlende Voraussetzungen bleiben offen, nicht anwendbare Punkte brauchen Begründung.

## Stand und Gegenstand

| Feld | Eintrag |
| --- | --- |
| Änderung / Release / Teilpaket | OFFEN |
| Commit-SHA; bei uncommittiertem Stand zusätzlich Patch-/Dateihash | OFFEN |
| Umgebung und Datum | OFFEN |
| Prüfweg: Software / reine Dokumentation (Q-T-01); Begründung | OFFEN |
| Paketabhängigkeiten / externe Voraussetzungen / Blocker | OFFEN |
| Verantwortliche Person | OFFEN |
| Betroffene Anforderungen / Regeln | OFFEN |
| Verhalten, erlaubte Rollen, Erfolgs-/Fehlerfälle | OFFEN |
| Betroffene Academy-Abläufe / Regressionsauswahl | OFFEN |

Prüfläufe nur einmal in NACHWEISE.md führen; hier präzise verlinken statt kopieren. Relevante Folgeänderungen erfordern erneute Prüfungen. Reine Dokumentation: vier Softwarechecks begründet nicht anwendbar, Dokumentationsprüfung/Review weiterhin verpflichtend; keine Software-/Produktfreigabe ableiten.

## Getrennte Nachweise

| Zustand | Status: offen / bestanden / nicht anwendbar | Beleg und gegebenenfalls Begründung |
| --- | --- | --- |
| Implementiert gemäß beschriebenem Verhalten | offen | |
| Dokumentationsprüfung: Umfang, Links/Anker, Struktur, Kennungen, Konsistenz, Diff | offen | |
| Bauphase: additive Migration, separate DB-Prüfung, Bestandsschutz, Rücknahme und ausdrückliche Anwendungsfreigabe | offen | |
| Vor Livegang: zentrale Sicherung, Zuständigkeit, separates Restoreziel sowie erprobter Job-/Widerrufs-Wiederanlauf (Q-O-01 1.5) | offen | |
| `npm run lint` | offen | |
| `npm run typecheck` | offen | |
| `npm test` einschließlich Anzahl bestanden/fehlgeschlagen/übersprungen | offen | |
| `npm run check:build` | offen | |
| Relevante echte Datenbank-/Anbieterintegrationstests | offen | |
| Betroffene Academy-Regression | offen | |
| Mobil ab 360 px, Tastatur, Fokus, Labels und Zustandsanzeigen | offen | |
| SaaS-Abläufe und transaktionale E-Mails DE/EN | offen | |
| iOS/Safari und Apple Wallet: Ausgabe und Update | offen | Gerät, OS-/Browserversion, Testkarte, Ergebnis |
| Android/Chrome und Google Wallet: Ausgabe und Update | offen | Gerät, OS-/Browserversion, Testkarte, Ergebnis |
| Kamera verweigert / manueller Ersatz / Netzwerkausfall | offen | |
| Migration auf repräsentativem Testbestand / Wiederherstellung / Job-Wiederanlauf | offen | |
| Monitoring und externe Anbieter-/Länder-/Betriebsfreigaben | offen | |

## SaaS Release 1.0 – vollständige Abnahme

Jede Zeile verweist auf die unveränderten Kriterien des Lastenhefts und Tests des Pflichtenhefts. Teilpakete markieren noch nicht gelieferte Fälle als offen, nicht als bestanden.

| Abnahme / Test | Gegenstand | Status / Beleg |
| --- | --- | --- |
| AK-01 / T-01 | Registrierung und Academy-Abgrenzung | offen |
| AK-02 / T-02 | Rollen und Unternehmen | offen |
| AK-03 / T-03 | Programme und unveränderliche Bedingungen | offen |
| AK-04 / T-04 | Anonyme Kartenausgabe | offen |
| AK-05 / T-05 | Apple Wallet auf echtem Gerät | offen |
| AK-06 / T-06 | Google Wallet auf echtem Gerät | offen |
| AK-07 / T-07 | Eine gemeinsame Kartenidentität | offen |
| AK-08 / T-08 | Bestätigter Mitarbeiter-Scan | offen |
| AK-09 / T-09 | Selbstscan, Vergleichscode und Ablauf | offen |
| AK-10 / T-10 | Parallelität und Wiederholungen | offen |
| AK-11 / T-11 | Belohnungszyklus und Korrektur | offen |
| AK-12 / T-12 | Recovery, Widerruf und Löschung | offen |
| AK-13 / T-13 | Tarife und atomare Limits | offen |
| AK-14 / T-14 | Zahlung, Steuer-Testfälle und Tarifwechsel | offen |
| AK-15 / T-15 | Anbieter-/Prozessausfall und Wiederanlauf | offen |
| AK-16 / T-16 | Statistik, Audit und Betriebsansichten | offen |
| AK-17 / T-17 | Bedienbarkeit und Sprache | offen |
| AK-18 / T-18 | Regression und Betriebsfreigabe | offen |

## Review, Mängel und Entscheidung

- Review: Prüfer, Datum, geprüfter Stand, Umfang, Befunde und Erledigungsnachweise eintragen. Ein Prüflauf allein ersetzt kein Code-Review.
- Offene Mängel mit `QL-`-/Aufgabenkennung, Auswirkung, Verantwortlichkeit und Erledigungskriterium referenzieren.
- Ausnahmen zusätzlich mit betroffener Regel, Umfang, Grund, Risiko, genehmigender Person und Ablaufdatum/Erledigungskriterium dokumentieren. Ohne ausgefüllte Zustimmung keine Ausnahme.
- Kleine Darstellungsfehler: Entscheidung des Auftraggebers und Nachbesserungsaufgabe verlinken.
- Sensible Änderung: ausdrückliche Freigabe des Auftraggebers für den konkreten Stand vor Übernahme beziehungsweise produktiver Anwendung verlinken.
- Entscheidung: **OFFEN / GESPERRT / FREIGEGEBEN**. Freigebende Person, Datum, Stand und genauer Umfang (Entwicklung, Pilot oder Produktion) eintragen. Ein Teilpaket ist keine vollständige SaaS-Abnahme.

Version 1.3 · 23.10.2026: Auf Auftraggeberentscheidung Q-O-01 1.5 angeglichen; zentrale Sicherung und separate Restore-Datenbank nach Bau vor Livegang. Keine Wiederherstellungsabnahme vorweggenommen.
