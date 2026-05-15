# Dashboard

Selbst gehostete Web-Oberfläche für ein Homelab-Dashboard mit Fokus auf drei Bereiche:

- **Power & Status** (PC online/offline, Uptime, Power-Button)
- **Monitoring** (Kennzahlen im Header, CPU-Gauge, Fingerabdruck-Scan-Deko, Safety-Switch, Zeitreihen-Charts aus Prometheus)
- **Apps / Kubernetes** (Service-Karten in voller Breite, **Detailseite** pro Deployment mit CPU-, Memory- und Replica-Steuerung, Pod-Logs, Zugriff nur nach Fingerabdruck-Passwort)

Frontend: **HTML, CSS und JavaScript** ohne Framework und ohne Build-Schritt. Backend: **Node.js** mit **Express** und **WebSockets** für Live-Updates.

## Schnellstart

```bash
npm install
node js/server.js
```

Standard-Port: **8080** (siehe `js/server/config.js` bzw. Umgebungsvariable `PORT`). Anschließend im Browser z. B. `http://localhost:8080` öffnen. Die App-Detailseite liegt unter derselben Basis-URL als **`/app-detail.html`** (mit Query-Parametern `namespace` und `deployment`).

## Funktionen (Kurz)

| Bereich | Inhalt |
|--------|--------|
| **Apps** | Karten aus `apps.yml`, Status aus Kubernetes, Klick öffnet **`app-detail.html`** (nach Fingerabdruck-Freischaltung). Detailseite nutzt `GET /api/k8s/deployments`, `POST /api/k8s/scale`, `POST /api/k8s/resources`, `GET /api/k8s/pod-logs`. Auf der Startseite kein globales Replica-Panel mehr. |
| **Monitoring** | Prometheus-Overview (CPU, RAM, GPU, Netzwerk, Disk, Nodes), vier ECharts-Zeitreihen, Header mit LCD-Kacheln, Gauge, **Fingerabdruck-Scan** (CSS-Animation, danach Dialog mit Passwortabfrage und Freischaltung der App-Detailseite per `sessionStorage`), Safety-Switch mit Abdeckung für Hard-Shutdown |
| **Power** | LED-Status, Uptime-Timer (7-Segment), Power-Button → `GET /api/press-button` |
| **Global** | Hell/Dunkel-Theme (`themeSwitcher.js`), Wechsel zwischen Apps- und Monitoring-Ansicht (`pageSwitcher.js`) |

## Architektur

### Frontend

- **`index.html`**: Shell mit zwei Inhalten (Apps-Hauptansicht, Monitoring-Seite inkl. Header und Charts).
- **`app-detail.html`**: Pro-Deployment-Ansicht (drei Replica-Controls nebeneinander im linken Drittel, Pod-Logs im rechten Bereich). Wird von Express unter `/app-detail.html` ausgeliefert.
- **`css/style.css`**: Schrift, Paletten (`style/root.css`), Themes (`theme-light.css` / `theme-dark.css`), Layout.
- **`css/monitoring.css`**: Monitoring-spezifische Module (Header, Gauge, Fingerabdruck-Scan, Safety-Switch, Charts, Hilfsklassen).
- **`css/apps.css`**: App-Karten, App-Detail-Layout, Replica-Control-Widgets, Log-Panel.

### Farbschema (CSS)

Jede chromatische Familie sowie **Neutral** haben **fünf physische Helligkeitsstufen** in `:root` als `--pal-{name}-1` (hell) bis `--pal-{name}-5` (dunkel), definiert in `css/style/root.css`.

Die **Verwendung** dieser Stufen hängt vom Modus ab. Semantische Rollen setzen `body` bzw. `body.dark-mode` in `css/style/theme-light.css` / `theme-dark.css`:

| Stufe | Hell (`body`) | Dunkel (`body.dark-mode`) |
|-------|----------------|---------------------------|
| 1 | **Highlight** (`-hl`) | *unbenutzt* |
| 2 | **Gradient 1** (`-g1`) | **Highlight** (`-hl`) |
| 3 | **Gradient 2** (`-g2`) | **Gradient 1** (`-g1`) |
| 4 | **Schatten** (`-sh`) | **Gradient 2** (`-g2`) |
| 5 | *unbenutzt* | **Schatten** (`-sh`) |

API pro Familie: `--hue-{neutral,blue,green,yellow,orange,red,purple}-{hl|g1|g2|sh}` verweist auf die passende `--pal-*-n` für den aktuellen Modus.

**ECharts:** Achsen, Gitter, Tooltip und Titel lesen CSS-Variablen aus (`getComputedStyle(document.body)`). Pro Metrik gibt es `--echarts-{cpu|memory|network|power}-{line|area}` in den Theme-Dateien. Beim Theme-Wechsel ruft `monitoringPanel.reapplyTheme()` die zuletzt gültigen Daten erneut auf (zusätzlich zum Monitoring-Refresh).

### Einstieg & Client-Module

- **`js/script.js`**: `DOMContentLoaded`, WebSocket, verbindet Panels und Helfer (`initSafetySwitch`, `initFingerprintScan`, …). Beim Laden der Startseite wird die Detail-Freischaltung per `clearDetailPageUnlock()` zurückgesetzt (erneute Passwortabfrage vor dem nächsten Besuch der Detailseite).
- **`js/app-detail.js`**: Detailseite (Steuerung, Logs, Zurück-Link), prüft `sessionStorage`-Freischaltung.
- **`js/client/detailAccess.js`**: Freischalt-Flag für die Detailseite (`sessionStorage`).
- **`js/client/wsClient.js`**: WebSocket `/ws`, Reconnect, Refresh mit `scope`.
- **`js/client/powerPanel.js`**: Power-Button, LED, Status-Anwendung.
- **`js/client/timerDisplay.js`**: 7-Segment-Uptime.
- **`js/client/monitoringPanel.js`**: Header + ECharts aus Monitoring-Payload.
- **`js/client/monitoring/`**: `config.js` (Chart-Liste, Header-Bindings), `header.js`, `chartOptions.js`, `style.js`.
- **`js/client/appsPanel.js`**, **`js/client/apps/`**: Karten (`cardFactory.js`), Scale-API (`scaleApi.js`), Ressourcen-Patch (`resourceApi.js`), Hilfsfunktionen und Panel-Rendering (`replicaControl.js`).
- **`js/client/themeSwitcher.js`**, **`js/client/pageSwitcher.js`**: Theme und Seitenwechsel.
- **`js/client/safetySwitch.js`**: Abdeckung, Auto-Close, Hard-Shutdown-Flow (Bestätigung, `POST /api/hard-shutdown`).
- **`js/client/fingerprintScan.js`**: Scan-Animation per Klasse `is-scanning`, Dauer aus CSS `--fingerprint-scan-duration`, anschließend `<dialog>` mit Passwortfeld (Standardpasswort im Code `fingerprintScan.js` anpassbar), bei Erfolg setzt `setDetailPageUnlocked()` das Flag für die Detailseite.
- **`js/client/protocol.js`**: `MESSAGE_TYPES`, `SCOPES` für WebSocket-Nachrichten.

### Backend

- **`js/server.js`**: Express-App, statische Auslieferung (`/`, `/index.html`, `/app-detail.html`, `/css`, `/js`, `/img`), Services, Intervalle für WebSocket-Broadcasts.
- **`js/server/routes/registerRoutes.js`**: REST-Endpunkte (siehe unten).
- **`js/server/websocket.js`**, **`js/server/websocketScopes.js`**: Scope-basierte Push-Updates.
- **`js/server/services/`**:
  - `pcStatusService.js`: Erreichbarkeit / Uptime-Aufbereitung
  - `prometheusService.js`: PromQL / Monitoring-Overview
  - `appsService.js`: `apps.yml` + Kubernetes-Deployments (inkl. CPU-/Memory-Requests und Limits des ersten Containers im Status)
  - `kubernetesService.js`: Apps- und Core-API (Deployments lesen, skalieren, Requests des ersten Containers patchen, Pod-Logs über Deployment-`matchLabels`)
  - `powerService.js`: Power-Button und Hard-Shutdown Richtung Pi/Hardware (`pigpio-client`)

## Datenfluss

### 1) Status (Power + Timer)

1. Backend ruft periodisch `pcStatusService.getPayload()` auf.
2. WebSocket sendet `type: "status"` an Clients.
3. `powerPanel.applyStatus()` setzt LED und Uptime.

### 2) Monitoring (Header + Charts)

1. `prometheusService.getOverview()` führt PromQL aus (optional `range`, `step` per Query).
2. WebSocket: `type: "monitoring"`.
3. `monitoringPanel.applyPayload()` aktualisiert Header (`renderHeader`) und die vier Zeitreihen-Charts.
4. Mapping Metrik → DOM: `js/client/monitoring/config.js` (`monitorHeaderBindings`).

### 3) Apps (Karten + Detailseite)

1. `appsService` liest `apps.yml` und kombiniert mit Deployment-Status (Replicas, CPU-/Memory-Werte des ersten Containers).
2. WebSocket: `type: "appsState"`.
3. `appsPanel.applyAppsState()` rendert nur noch die Karten (volle Breite der Apps-Fläche).
4. **Detailseite** (`app-detail.html`) lädt per `GET /api/k8s/deployments` und `GET /api/apps` den aktuellen Stand, steuert Replicas über `POST /api/k8s/scale`, CPU-/Memory-Requests über `POST /api/k8s/resources`, Pod-Logs über `GET /api/k8s/pod-logs`. Zugriff nur wenn zuvor auf der Monitoring-Seite der Fingerabdruck-Dialog mit richtigem Passwort abgeschlossen wurde (Flag in `sessionStorage`, wird beim erneuten Laden von `index.html` gelöscht).

## Konfiguration

Zentrale Werte in **`js/server/config.js`** (teilweise per Umgebungsvariable überschreibbar):

| Variable / Konstante | Bedeutung |
|----------------------|-----------|
| `PORT` | HTTP-Port (Default `8080`) |
| `PC_IP` | Ziel für Status/Prometheus-Fallbacks |
| `PI_IP` | Ziel für Power-/Shutdown-Steuerung |
| `PROMETHEUS_BASE_URL` | Basis-URL Prometheus |
| `STATUS_BROADCAST_MS` | Intervall Status-Push (Default `5000`) |
| `MONITORING_BROADCAST_MS` | Intervall Monitoring-Push (Default `2500`) |
| `APPS_BROADCAST_MS` | Intervall Apps-Push (Default `5000`) |

Prometheus wird bei Bedarf über **Fallback-URLs** (siehe `js/server.js`) versucht.

## REST-API

| Methode | Pfad | Zweck |
|---------|------|--------|
| `GET` | `/api/status` | PC-Status / Uptime |
| `GET` | `/api/press-button` | Power-Impuls triggern |
| `POST` | `/api/hard-shutdown` | Hard-Shutdown (vom Safety-Switch) |
| `GET` | `/api/monitoring/overview` | Monitoring-JSON (Query: `range`, `step`) |
| `GET` | `/api/apps` | Liste aus `apps.yml` |
| `GET` | `/api/k8s/deployments` | Deployment-Übersicht |
| `POST` | `/api/k8s/scale` | Body: `namespace`, `deployment`, `replicas` |
| `POST` | `/api/k8s/resources` | Body: `namespace`, `deployment`, optional `cpuRequest` und/oder `memoryRequest` (Kubernetes-Quantities, erster Container) |
| `GET` | `/api/k8s/pod-logs` | Query: `namespace`, `deployment`, optional `tailLines` (max. 2000). Antwort: `{ pods: [{ name, logs, error? }], tailLines }`. Die Detailseite setzt `tailLines` fest im Client (`js/app-detail.js`, Konstante `POD_LOG_TAIL_LINES`). Für Logs braucht der Cluster-Account u. a. `get` auf `pods` und `pods/log`. |

## WebSocket (`/ws`)

- Nach Verbindung: Push für `status`, `monitoring`, `appsState`.
- Regelmäßige Broadcasts pro Scope.
- Client: `type: "refresh"` mit optionalem `scope` (`status`, `monitoring`, `apps`, `all`) — siehe `js/client/protocol.js`.

## Projektstruktur (vereinfacht)

```text
dashboard/
├── Readme.md
├── package.json
├── apps.yml
├── index.html
├── app-detail.html
├── css/
│   ├── style.css
│   ├── monitoring.css
│   ├── apps.css
│   ├── timer.css
│   ├── mode.css
│   ├── power.css
│   ├── style/          # root, themes, layout
│   └── monitoring/     # header, gauge, fingerprint-scan, safety-switch, charts, …
├── img/
└── js/
    ├── script.js
    ├── app-detail.js
    ├── server.js              # HTTP/WebSocket-Einstieg
    ├── client/
    │   ├── wsClient.js
    │   ├── powerPanel.js
    │   ├── timerDisplay.js
    │   ├── monitoringPanel.js
    │   ├── themeSwitcher.js
    │   ├── pageSwitcher.js
    │   ├── appsPanel.js
    │   ├── detailAccess.js
    │   ├── safetySwitch.js
    │   ├── fingerprintScan.js
    │   ├── protocol.js
    │   ├── apps/
    │   └── monitoring/
    └── server/
        ├── config.js
        ├── websocket.js
        ├── websocketScopes.js
        ├── protocol.js
        ├── routes/registerRoutes.js
        └── services/
```

Hinweis: Zum Starten **`node js/server.js`** im Projektroot verwenden.

## Lizenz

ISC (siehe `package.json`).
