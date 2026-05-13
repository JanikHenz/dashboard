# Dashboard

Selbst gehostete Web-Oberflaeche fuer ein Homelab-Dashboard mit Fokus auf drei Bereiche:

- **Power/Status** (PC online/offline, Uptime, Power-Button)
- **Monitoring** (Header-Kennzahlen + Zeitreihen-Charts aus Prometheus)
- **Apps/Kubernetes** (Service-Karten + Replica-Scaling)

Die Anwendung nutzt **pures HTML/CSS/JavaScript** im Frontend und ein schlankes **Node.js/Express-Backend** mit WebSocket-Push.

## Architektur auf einen Blick

### Frontend

- `index.html`: statisches UI-Layout mit zwei Seiten in einer Shell (Apps und Monitoring)

### Farbschema (CSS)

Jede chromatische Familie sowie **Neutral** haben **fuenf physische Helligkeitsstufen** in `:root` als `--pal-{name}-1` (hell) bis `--pal-{name}-5` (dunkel), definiert in `css/style/root.css`.

Die **Verwendung** dieser Stufen haengt vom Modus ab. Semantische Rollen (pro Familie) setzen `body` bzw. `body.dark-mode` in `css/style/theme-light.css` / `theme-dark.css`:

| Stufe | Hell (`body`) | Dunkel (`body.dark-mode`) |
|-------|----------------|---------------------------|
| 1 | **Highlight** (`-hl`) | *unbenutzt* |
| 2 | **Gradient 1** (`-g1`) | **Highlight** (`-hl`) |
| 3 | **Gradient 2** (`-g2`) | **Gradient 1** (`-g1`) |
| 4 | **Schatten** (`-sh`) | **Gradient 2** (`-g2`) |
| 5 | *unbenutzt* | **Schatten** (`-sh`) |

API pro Familie: `--hue-{neutral,blue,green,yellow,orange,red,purple}-{hl|g1|g2|sh}` verweist immer auf die passende `--pal-*-n` fuer den aktuellen Modus.

Komponenten und Semantik-Tokens (`--text-main`, `--chart-grid`, …) nutzen diese Rollen oder `color-mix` darauf. Wo das Layout absichtlich die **hellste physische Stufe** braucht (z. B. helle Gitterlinien im Dark-Chart), kann weiterhin `--pal-blue-1` o. ae. direkt gesetzt werden.

**ECharts:** Achsen, Gitter, Tooltip und Titel lesen weiterhin `getPalette()` aus (`--text-accent`, `--chart-grid`, …). Pro Metrik gibt es `--echarts-{cpu|memory|network|power}-{line|area}` in den Theme-Dateien (Linie = jeweils `--hue-*-g1`, Flaeche = `color-mix` darauf). `chartOptions.js` wertet sie per `getComputedStyle(document.body)` aus. Beim Theme-Wechsel ruft `monitoringPanel.reapplyTheme()` die zuletzt gueltigen Daten erneut auf, damit die Kurven sofort umschalten (zusaetzlich zum bestehenden Monitoring-Refresh).

Einstieg Styles: `css/style.css` importiert `style/root.css` (Paletten), dann Theme und Layout.
- `js/script.js`: Einstiegspunkt, verbindet alle Panels und startet den WebSocket-Client
- `js/client/powerPanel.js`: Power-Button, LED-Status und Timer-Update
- `js/client/monitoringPanel.js`: aktualisiert Header-Werte und ECharts-Diagramme
- `js/client/appsPanel.js`: rendert App-Karten und steuert Replica-Slider
- `js/client/wsClient.js`: WebSocket-Verbindung (`/ws`) inkl. Reconnect und Refresh-Requests

### Backend

- `js/server.js`: Bootstrap, Service-Erzeugung, API- und WebSocket-Registrierung
- `js/server/routes/registerRoutes.js`: REST-Endpunkte (`/api/status`, `/api/monitoring/overview`, `/api/k8s/*`, `/api/apps`, `/api/press-button`)
- `js/server/websocket.js`: Scope-basierte Broadcasts fuer Status/Monitoring/Apps
- `js/server/websocketScopes.js`: ordnet Scopes den Services und Message-Formaten zu

### Services

- `js/server/services/pcStatusService.js`: Ping + Uptime-Aufbereitung
- `js/server/services/prometheusService.js`: Prometheus-Queries fuer Monitoring-Zeitreihen und Uptime
- `js/server/services/appsService.js`: liest `apps.yml` und kombiniert Daten mit Deployment-Status
- `js/server/services/kubernetesService.js`: Zugriff auf Kubernetes API (Deployments, Scale)
- `js/server/services/powerService.js`: Power-Trigger Richtung Pi/Hardware

## Datenfluss

### 1) Status (Power + Timer)

1. Backend fragt periodisch `pcStatusService.getPayload()`.
2. WebSocket sendet `type: "status"` an Clients.
3. Frontend verarbeitet Nachricht in `script.js`.
4. `powerPanel.applyStatus()` setzt LED-Farbe und aktualisiert Uptime-Anzeige.

### 2) Monitoring (Header + Charts)

1. `prometheusService.getOverview()` fuehrt PromQL-Queries aus (CPU, RAM, GPU, Netzwerk, Disk, Nodes).
2. Ergebnis kommt als `type: "monitoring"` ueber WebSocket.
3. `monitoringPanel.applyPayload()`:
   - schreibt Header-Kennzahlen (`renderHeader()` aus `js/client/monitoring/header.js`)
   - aktualisiert die vier Zeitreihen-Charts (ECharts)
4. Das Mapping zwischen Metrik-Key und Header-DOM-Element steht in `js/client/monitoring/config.js` (`monitorHeaderBindings`).

### 3) Apps (Cards + Scaling)

1. `appsService` liest `apps.yml` und verbindet App-Definitionen mit K8s-Deployment-Status.
2. WebSocket sendet `type: "appsState"`.
3. `appsPanel.applyAppsState()` rendert Karten und Replica-Infos.
4. Slider-Aenderung ruft `/api/k8s/scale` auf und triggert danach ein Refresh.

## Wo wird was "gebaut"?

- **Monitoring-Header-Markup (HTML):** `index.html` (`<header id="monitoring-header">`)
- **Monitoring-Header-Werte (JS):** `js/client/monitoring/header.js`
- **Monitoring-Datenquelle:** `js/server/services/prometheusService.js`
- **Verkabelung der Monitoring-Pipeline:** `js/client/monitoringPanel.js`, `js/server/websocketScopes.js`

## Konfiguration

Relevante Werte in `js/server/config.js`:

- `PORT` (Default `8080`)
- `PC_IP` und `PI_IP`
- `PROMETHEUS_BASE_URL`
- Broadcast-Intervalle:
  - `STATUS_BROADCAST_MS`
  - `MONITORING_BROADCAST_MS`
  - `APPS_BROADCAST_MS`

Zusatz: Das Dashboard versucht Prometheus ueber mehrere Fallback-URLs zu erreichen.

## API- und WebSocket-Ueberblick

### REST

- `GET /api/status`
- `GET /api/press-button`
- `GET /api/monitoring/overview`
- `GET /api/apps`
- `GET /api/k8s/deployments`
- `POST /api/k8s/scale`

### WebSocket (`/ws`)

- Initial push bei Verbindung: `status`, `monitoring`, `appsState`
- Periodische Broadcasts fuer alle Scopes
- Client kann Refresh senden (`type: "refresh"`, optional mit `scope`)

## Projektstruktur (vereinfacht)

```text
dashboard/
├── index.html
├── apps.yml
├── css/
├── img/
└── js/
    ├── script.js
    ├── client/
    │   ├── wsClient.js
    │   ├── powerPanel.js
    │   ├── monitoringPanel.js
    │   ├── appsPanel.js
    │   └── monitoring/
    │       ├── config.js
    │       ├── header.js
    │       └── chartOptions.js
    └── server/
        ├── config.js
        ├── websocket.js
        ├── websocketScopes.js
        ├── routes/registerRoutes.js
        └── services/
```
