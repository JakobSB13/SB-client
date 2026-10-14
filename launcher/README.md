# SB Client – Neuaufbau

Sauberer Neustart anhand der Projektbeschreibung. Der vorhandene Projektstand bleibt unangetastet.

## Launcher starten

1. Node.js 22 oder neuer installieren.
2. In diesem Ordner `npm install` ausführen.
3. `npm start` ausführen.

Instanzen und Client-Auswahl werden lokal im Electron-Benutzerprofil gespeichert. Microsoft-Anmeldung, Minecraft-Installation, Mod-Downloads und die Ingame-Mod sind noch nicht angebunden; die Oberfläche kennzeichnet diese Funktionen entsprechend.

## Aufbau

- `main.js`: Electron-Fenster und lokale Speicherung
- `preload.js`: eng begrenzte sichere Renderer-Schnittstelle
- `renderer/`: Launcher-Oberfläche und Interaktionen

## Fair Play

Dieser Neuaufbau konzentriert sich auf Performance, Anzeige- und Komfortfunktionen. Funktionen, die auf Multiplayer-Servern Vorteile durch Combat-Cheats, X-Ray, ESP, Fly, Reach oder Umgehung von Serverregeln verschaffen, sind ausgeschlossen.
