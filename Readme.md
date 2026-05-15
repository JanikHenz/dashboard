# Dashboard

Selbst gehostete Web-Oberfläche für ein Homelab-Dashboard mit Fokus auf drei Bereiche:

- **Power & Status** (PC online/offline, Uptime, Power-Button)
- **Monitoring** (Kennzahlen im Header, CPU-Gauge, Fingerabdruck-Scan-Deko, Safety-Switch, Zeitreihen-Charts aus Prometheus)
- **Apps / Kubernetes** (Service-Karten, Replica-Scaling)

Frontend: **HTML, CSS und JavaScript** ohne Framework und ohne Build-Schritt. Backend: **Node.js** mit **Express** und **WebSockets** für Live-Updates.

## Schnellstart

```bash
npm install
node js/server.js
```

Standard-Port: **8080** (siehe `js/server/config.js` bzw. Umgebungsvariable `PORT`). Anschließend im Browser z. B. `http://localhost:8080` öffnen.

## Funktionen (Kurz)

| Bereich | Inhalt |
|--------|--------|
| **Apps** | Karten aus `apps.yml`, Status aus Kubernetes, Replica-Slider → `POST /api/k8s/scale` |
| **Monitoring** | Prometheus-Overview (CPU, RAM, GPU, Netzwerk, Disk, Nodes), vier ECharts-Zeitreihen, Header mit LCD-Kacheln, Gauge, klickbarer Fingerabdruck-Scan (CSS-Animation + optionales Alert nach Ablauf), Safety-Switch mit Abdeckung für Hard-Shutdown |
| **Power** | LED-Status, Uptime-Timer (7-Segment), Power-Button → `GET /api/press-button` |
| **Global** | Hell/Dunkel-Theme (`themeSwitcher.js`), Wechsel zwischen Apps- und Monitoring-Ansicht (`pageSwitcher.js`) |

## Architektur

### Frontend

- **`index.html`**: Shell mit zwei Inhalten (Apps-Hauptansicht, Monitoring-Seite inkl. Header und Charts).
- **`css/style.css`**: Schrift, Paletten (`style/root.css`), Themes (`theme-light.css` / `theme-dark.css`), Layout.
- **`css/monitoring.css`**: Monitoring-spezifische Module (Header, Gauge, Fingerabdruck-Scan, Safety-Switch, Charts, Hilfsklassen).

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

- **`js/script.js`**: `DOMContentLoaded`, WebSocket, verbindet Panels und Helfer (`initSafetySwitch`, `initFingerprintScan`, …).
- **`js/client/wsClient.js`**: WebSocket `/ws`, Reconnect, Refresh mit `scope`.
- **`js/client/powerPanel.js`**: Power-Button, LED, Status-Anwendung.
- **`js/client/timerDisplay.js`**: 7-Segment-Uptime.
- **`js/client/monitoringPanel.js`**: Header + ECharts aus Monitoring-Payload.
- **`js/client/monitoring/`**: `config.js` (Chart-Liste, Header-Bindings), `header.js`, `chartOptions.js`, `style.js`.
- **`js/client/appsPanel.js`**, **`js/client/apps/`**: Karten (`cardFactory.js`), Scale-API (`scaleApi.js`, `replicaControl.js`).
- **`js/client/themeSwitcher.js`**, **`js/client/pageSwitcher.js`**: Theme und Seitenwechsel.
- **`js/client/safetySwitch.js`**: Abdeckung, Auto-Close, Hard-Shutdown-Flow (Bestätigung, `POST /api/hard-shutdown`).
- **`js/client/fingerprintScan.js`**: Scan-Animation per Klasse `is-scanning`, Dauer aus CSS `--fingerprint-scan-duration`, Abschluss-Hinweis per `alert` (anpassbar im Code).
- **`js/client/protocol.js`**: `MESSAGE_TYPES`, `SCOPES` für WebSocket-Nachrichten.

### Backend

- **`js/server.js`**: Express-App, statische Auslieferung (`/`, `/css`, `/js`, `/img`), Services, Intervalle für WebSocket-Broadcasts.
- **`js/server/routes/registerRoutes.js`**: REST-Endpunkte (siehe unten).
- **`js/server/websocket.js`**, **`js/server/websocketScopes.js`**: Scope-basierte Push-Updates.
- **`js/server/services/`**:
  - `pcStatusService.js`: Erreichbarkeit / Uptime-Aufbereitung
  - `prometheusService.js`: PromQL / Monitoring-Overview
  - `appsService.js`: `apps.yml` + Kubernetes-Deployments
  - `kubernetesService.js`: API-Zugriff, Scale
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

### 3) Apps (Karten + Scaling)

1. `appsService` liest `apps.yml` und kombiniert mit Deployment-Status.
2. WebSocket: `type: "appsState"`.
3. `appsPanel.applyAppsState()` rendert Karten; Slider nutzt `POST /api/k8s/scale` und anschließend Refresh.

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
    ├── server.js              # HTTP/WebSocket-Einstieg
    ├── client/
    │   ├── wsClient.js
    │   ├── powerPanel.js
    │   ├── timerDisplay.js
    │   ├── monitoringPanel.js
    │   ├── themeSwitcher.js
    │   ├── pageSwitcher.js
    │   ├── appsPanel.js
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
