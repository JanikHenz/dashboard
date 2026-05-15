const express = require('express');
const http = require('http');
const path = require('path');
const {
  PORT,
  projectRoot,
  PC_IP,
  PI_IP,
  PROMETHEUS_BASE_URL,
  STATUS_BROADCAST_MS,
  MONITORING_BROADCAST_MS,
  APPS_BROADCAST_MS
} = require('./server/config');
const { createPrometheusService } = require('./server/services/prometheusService');
const { createPcStatusService } = require('./server/services/pcStatusService');
const { createKubernetesService } = require('./server/services/kubernetesService');
const { createAppsService } = require('./server/services/appsService');
const { createPowerService } = require('./server/services/powerService');
const { registerRoutes } = require('./server/routes/registerRoutes');
const { createDashboardWebSocket } = require('./server/websocket');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/img', express.static(path.join(projectRoot, 'img')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/app-detail.html', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'app-detail.html'));
});

const prometheusFallbackUrls = [
  PROMETHEUS_BASE_URL,
  `http://${PC_IP}:30090`,
  'http://127.0.0.1:30090'
];

const kubernetesService = createKubernetesService();
const prometheusService = createPrometheusService({
  pcIp: PC_IP,
  fallbackUrls: prometheusFallbackUrls
});
const pcStatusService = createPcStatusService({
  pcIp: PC_IP,
  prometheusService
});
const appsService = createAppsService({
  projectRoot,
  kubernetesService
});
const powerService = createPowerService({ piIp: PI_IP });

registerRoutes(app, {
  pcStatusService,
  powerService,
  appsService,
  kubernetesService,
  prometheusService
});

const ws = createDashboardWebSocket(server, {
  pcStatusService,
  appsService,
  prometheusService
});

kubernetesService.init().finally(() => {
  server.listen(PORT, () => {
    console.log(`Dashboard running on port ${PORT}`);
    setInterval(ws.broadcastStatus, STATUS_BROADCAST_MS);
    setInterval(ws.broadcastMonitoring, MONITORING_BROADCAST_MS);
    setInterval(ws.broadcastAppsState, APPS_BROADCAST_MS);
  });
});
