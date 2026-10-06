# Academy Fi Cloud

Die Startdatei `start-webseite.bat` startet die Webseite. Der Button **Cloud-System** rechts über der ersten Karte im Dashboard öffnet den gemeinsamen Dateimanager unter `/cloud/index.html`. Die Cloud übernimmt die Gestaltung sowie den Hell-/Dunkelmodus der Webseite.

Alle Besucher nutzen ohne Anmeldung denselben Speicher. Die Oberfläche entspricht dem Cloud-System aus der Vorlage: Ordnerbaum, neue Ordner, Datei-Upload und Drag & Drop, Fortschritt mit Abbruch, Suche im aktuellen Ordner, Vorschau, Download, Löschen und ZIP-Download der Auswahl.

## Speicherung

Dateien liegen dauerhaft im Projektordner `.cloud-data/files`. Dieser Ordner wird nicht in Git aufgenommen. Aus der Vorlage werden keine vorhandenen Dateien importiert.

Für den Betrieb auf einem Server muss dieses Verzeichnis auf einem persistenten, beschreibbaren Datenträger liegen. Alternativ legt `CLOUD_STORAGE_DIR` einen absoluten Speicherordner fest. Standardmäßig sind pro Upload-Anfrage insgesamt 100 MiB erlaubt; `CLOUD_UPLOAD_MAX_BYTES` setzt das Limit in Bytes.

Uploads mit gleichem Namen erhalten einen Zusatz wie `Datei (1).pdf`. Die Dateiaktionen sind auf den Cloud-Speicher begrenzt. Die ursprüngliche Webseite erhält ausschließlich den zusätzlichen Cloud-Button.

## Prüfung

- `npx tsx --test src/lib/cloud/storage.test.ts`: Speicherfunktionen und Pfadgrenzen.
- `CLOUD_TEST_URL=http://localhost:3001 node --test tests/cloud-api.test.mjs`: API-Tests gegen einen separaten Testserver mit isoliertem `CLOUD_STORAGE_DIR`.
- `npx tsc --noEmit`: Typprüfung.

Die bestehenden Datenbank- und Anmeldeeinstellungen der Hauptwebseite werden für die Cloud nicht benötigt.
