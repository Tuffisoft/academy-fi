# Academy Fi Chat

Der Button **Chat** liegt im Dashboard direkt neben **Cloud-System**, rechts über der ersten Karte. Die Chat-Seite ist unter `/chat/index.html` erreichbar. Sie verwendet das bestehende Website-Konto; ohne gültige Website-Sitzung sind Nachrichten, Anhänge und Anrufe nicht zugänglich. Die Cloud bleibt wie bisher öffentlich.

Die Server-, Kanal- und Nachrichtenstruktur orientiert sich an dem bereitgestellten Projekt `next.js-discord-clone-main` von spsanchore13. Dessen separate Clerk-Anmeldung, MySQL-Datenbank, UploadThing- und LiveKit-Verbindungen wurden für die vorhandene Next.js-16-Webseite angepasst. Das heruntergeladene Original bleibt unverändert. Die Integration benötigt keine zusätzlichen Konten bei diesen Diensten und läuft mit demselben Website-Start.

## Funktionen

- Gemeinsamer Academy-Fi-Server mit Text-, Sprach- und Videokanälen.
- Eigene Server, Einladungslinks, Kanäle, Mitgliederrollen und Serververwaltung.
- Website-Konten mit der Rolle OWNER moderieren den gemeinsamen Academy-Fi-Server; Inhaber eigener Chat-Server verwalten ihre jeweiligen Mitglieder.
- Live-Nachrichten, private Direktnachrichten, Emojis, Bearbeiten/Löschen eigener Nachrichten, ältere Nachrichten nachladen.
- Datei-Anhänge bis 25 MB, Bildervorschau und geschützte Downloads.
- Sprach- und Videoanrufe in kleinen Räumen (bis zu 8 Verbindungen), Mikrofon/Kamera ein- und ausschalten.
- Passende Website-Farben, Raleway-Schrift, gespeicherter Hell-/Dunkelmodus und mobile Ansicht.

## Start und Speicherung

`start-webseite.bat` startet Webseite, Cloud und Chat gemeinsam. Node.js ab **22.16** wird benötigt; lokal ist Node.js 24 installiert. Die SQLite-Datenbank liegt in `.chat-data/chat.sqlite`, Anhänge in `.chat-data/attachments/`. Dieser Ordner wird nicht in Git übernommen. Zum Sichern oder Umziehen die Webseite stoppen und den gesamten Ordner kopieren.

Optional kann `CHAT_STORAGE_DIR` auf einen anderen **absoluten** dauerhaften Ordner zeigen. Bei einer Bereitstellung benötigt der Chat einen Node-Server mit dauerhaft beschreibbarem Speicher; für mehrere Serverinstanzen muss die Speicherung angepasst werden. Die bestehende Website-Datenbank und ihre Tabellen werden nicht verändert.

## Sprach- und Videoverbindungen

Die Medienverbindung verwendet WebRTC. Kamera und Mikrofon werden erst nach einem Klick auf „Raum beitreten“ bzw. den Anruf-Button angefragt. Außerhalb von localhost ist HTTPS erforderlich. Ohne weitere Konfiguration funktionieren direkte Verbindungen im lokalen Netz. Für zuverlässige Anrufe zwischen unterschiedlichen Internetanschlüssen einen eigenen STUN/TURN-Dienst konfigurieren, zum Beispiel über `CHAT_ICE_SERVERS` als JSON-Array:

```json
[{"urls":"stun:stun.example.com:3478"},{"urls":"turn:turn.example.com:3478","username":"TURN_BENUTZER","credential":"TURN_PASSWORT"}]
```

TURN-Zugangsdaten werden für die Verbindung an angemeldete Browser geliefert; kurzlebige und eingeschränkte Zugangsdaten des eigenen Anbieters verwenden. Der Textchat funktioniert unabhängig von dieser Konfiguration.

## Prüfung

```text
npx tsx --test src/lib/chat/storage.test.ts src/lib/chat/http.test.ts
npx tsc --noEmit
```

Die Tests prüfen dauerhafte Speicherung, getrennte Direktnachrichten, Serverberechtigungen, Website-Identitäten, CSRF/Ursprung, Anhänge, Nachrichtenverlauf und Anrufsignalisierung. Testkonten und Testdaten liegen ausschließlich in temporären, getrennten Speichern.
