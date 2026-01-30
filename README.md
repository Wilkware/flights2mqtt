# flights2mqtt

[![NodeJs](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg?style=flat-square)](https://github.com/Wilkware/flights2mqtt)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=8816166)

## Über das Projekt

flights2mqtt ist ein leichtgewichtiger Node.js-Service, der Flugdaten von FlightRadar24 lokal verfügbar macht.

Das Projekt überwacht ankommende und abfliegende Flüge eines konfigurierbaren Flughafens und veröffentlicht die wichtigsten Fluginformationen über MQTT. Jeder Flug wird über eindeutige Topics identifizierbar gemacht (anhand der Flugnummer), ergänzt um strukturierte Detaildaten wie Flugzeugtyp, Status und aktuelle Infos.

Damit eignet sich flights2mqtt ideal zur Integration von Fluginformationen in Smart-Home-Umgebungen, Visualisierungen, LED-Displays oder andere Automatisierungs- und Monitoring-Anwendungen.

## Installation

Lade dieses Projekt auf dein System herunter – in ein beliebiges Verzeichnis (im folgenden Beispiel wird /opt/flights2mqtt verwendet).

```bash
// switch to opt directory
cd /opt

// clone this project
git clone https://github.com/wilkware/flights2mqtt

// change directory to the project directory
cd flights2mqtt

// installs this project along with codetheweb/tuyapi project
npm install

// installs this project as system service
sudo cp ./docs/flights2mqtt.service /etc/systemd/system

// as a service, the file must be executable
sudo chmod +x /opt/flights2mqtt/index.js

// Reload systemd to recognize new or changed unit files
sudo systemctl daemon-reexec
sudo systemctl daemon-reload

// Enable the service to start automatically on boot
sudo systemctl enable flights2mqtt.service

// Start the service immediately
sudo systemctl start flights2mqtt.service

// Check the current status of the service
sudo systemctl status flights2mqtt.service

```

## Konfiguration

Die Anwendung wird über eine JSON-Konfigurationsdatei (config.json) gesteuert.

Beispiel __config.json__

```json
{
    "mqtt": {
        "broker": "mqtt://127.0.0.1",
        "port": 1883,
        "topic": "flights/muc",
        "clientId": "flights2mqtt"
    },
    "tracking": {
        "latitude": 48.353802,
        "longitude": 11.7861,
        "radius": 50,
        "airport": "MUC",
        "interval": 300
    }
}
```

### Einrichtung von config.json:

```
cp config.json.sample config.json
```
Bearbeite die __config.json__ und trage die Einstellungen deines MQTT-Brokers und die Tracking Daten ein. Speichere die Datei anschließend.
```
nano config.json
```

#### MQTT-Konfiguration

Der Abschnitt __mqtt__ definiert die Verbindung zum MQTT-Broker sowie das Topic, in dem die Flugdaten veröffentlicht werden.

| Feld       | Typ    | Beschreibung                                        |
| ---------- | ------ | --------------------------------------------------- |
| `broker`   | String | Adresse des MQTT-Brokers (z. B. `mqtt://localhost`) |
| `port`     | Number | Port des MQTT-Brokers (Standard: `1883`)            |
| `topic`    | String | MQTT-Topic für die Veröffentlichung der Flugdaten   |
| `clientId` | String | Eindeutige Client-ID für die MQTT-Verbindung        |

#### Tracking-Konfiguration

Der Abschnitt __tracking__ definiert das geografische Suchgebiet und das Abfrageintervall.

| Feld        | Typ    | Beschreibung                                      |
| ----------- | ------ | ------------------------------------------------- |
| `latitude`  | Number | Breitengrad des Zentrums der Tracking-Zone        |
| `longitude` | Number | Längengrad des Zentrums der Tracking-Zone         |
| `radius`    | Number | Radius der Tracking-Zone in **Kilometern**        |
| `airport`   | String | ICAO- oder IATA-Code des Flughafens (z. B. `MUC`) |
| `interval`  | Number | Aktualisierungsintervall in **Sekunden**          |

__Besonderheit: airport-Filter__  
Ist airport gesetzt (z. B. MUC), werden nur Flüge berücksichtigt, die diesen Flughafen als Start- oder Zielflughafen haben.  
Ist airport leer ("") oder nicht gesetzt, erfolgt keine Filterung nach An- oder Abflughafen.
In diesem Fall werden alle Flüge innerhalb des definierten Radius erfasst.

__Beispiel:__  
Mit den oben gezeigten Werten werden alle Flugzeuge im Umkreis von 50 km um den Flughafen München (MUC) alle 300 Sekunden abgefragt und per MQTT veröffentlicht.

### Direktes starten von flights2mqtt

```
node index.js
```
Um Debug-Ausgaben zu aktivieren (erforderlich beim Eröffnen eines Issues):
```
DEBUG=flights2mqtt:* index.js
```

## Related Projects:

- https://github.com/JeanExtreme002/FlightRadarAPI

[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com)
