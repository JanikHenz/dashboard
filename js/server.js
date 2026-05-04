const express = require('express');
const http = require('http');
const ping = require('ping');
const pigpioClient = require('pigpio-client');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const projectRoot = path.join(__dirname, '..');

app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/img', express.static(path.join(projectRoot, 'img')));

app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});
// ====================== Connection =============================
// ---------------------- Kuberne
let k8sAppsApi = null;
let k8sClientMode = 'disabled';

function pickK8sResource(response) {
  if (!response) return null;
  return response.body || response;
}

async function initKubernetesClient() {
  const k8s = await import('@kubernetes/client-node');
  const kc = new k8s.KubeConfig();

  try {
    kc.loadFromCluster();
    k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    k8sClientMode = 'in-cluster';
    console.log('Kubernetes In-Cluster config geladen');
    return;
  } catch (clusterErr) {
    console.log('In-Cluster config nicht verfuegbar:', clusterErr.message);
  }

  try {
    kc.loadFromDefault();
    k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    k8sClientMode = 'kubeconfig';
    console.log('Kubernetes config aus kubeconfig geladen');
  } catch (err) {
    console.error('Konnte Kubernetes config nicht laden:', err.message);
    k8sAppsApi = null;
    k8sClientMode = 'disabled';
    console.log('K8s Features werden deaktiviert');
  }
}

// -------------------- Raspberry Pi Connection ------------------------
const PC_IP = process.env.PC_IP || "192.168.1.9";
const PI_IP = process.env.PI_IP || "192.168.1.10";
const PROMETHEUS_BASE_URL = process.env.PROMETHEUS_BASE_URL || 'http://prometheus-service.monitoring.svc.cluster.local:9090';
const PROMETHEUS_FALLBACK_URLS = [
  PROMETHEUS_BASE_URL,
  `http://${PC_IP}:30090`,
  'http://127.0.0.1:30090'
];

const pi = pigpioClient.pigpio({ host: PI_IP });
let isPiConnected = false;

pi.on('connected', () => {
  console.log(`Verbunden mit GPIO-Daemon auf ${PI_IP}`);
  isPiConnected = true;
});

pi.on('error', (err) => {
  console.error(`GPIO-Verbindung fehlgeschlagen (${PI_IP}): ${err.message}`);
  isPiConnected = false;
});

// ======================= Power Status via Ping + Uptime via Prometheus ===========
async function getPcStatusPayload() {
  try {
    const pingResult = await ping.promise.probe(PC_IP, { timeout: 1 });
    let uptimeMs = 0;
    if (pingResult.alive) {
      uptimeMs = await resolvePcUptimeFromPrometheus();
    }
    return { is_on: pingResult.alive, uptime_ms: uptimeMs };
  } catch (_error) {
    return { is_on: false, uptime_ms: 0, error: 'Ping fehlgeschlagen' };
  }
}

app.get('/api/status', async (req, res) => {
  const payload = await getPcStatusPayload();
  if (payload.error) {
    res.status(500).json(payload);
  } else {
    res.json(payload);
  }
});

// ======================= Power Control via Raspberry pi =============================
app.get('/api/press-button', async (req, res) => {
  console.log('Jemand hat den Power-Button im Browser gedrückt!');

  if (!isPiConnected) {
    console.error('Befehl ignoriert: Keine Verbindung zum Pi.');
    return res.status(500).json({ success: false, error: 'Pi Offline' });
  }
  try {
    const pin = pi.gpio(17);
    await pin.modeSet('output');
    await pin.write(1);
    await new Promise(resolve => setTimeout(resolve, 500));
    await pin.write(0);
    res.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Schalten:`, error);
    res.status(500).json({ success: false, error: 'Hardware Fehler' });
  }
});

//=================== Kubernetes ==========================================
function flattenAppsFromYamlData(data) {
  const allApps = [];
  if (data && data.apps) {
    Object.keys(data.apps).forEach((namespace) => {
      data.apps[namespace].forEach((app) => {
        allApps.push({
          ...app,
          namespace
        });
      });
    });
  }
  return allApps;
}

function loadAppsYamlData() {
  const fileContents = fs.readFileSync(path.join(projectRoot, 'apps.yml'), 'utf8');
  return yaml.load(fileContents);
}

async function buildDeploymentStatusFromYamlData(data) {
  const deploymentStatus = {};
  for (const namespace of Object.keys(data.apps || {})) {
    for (const app of data.apps[namespace]) {
      if (app && app.deployment) {
        try {
          const deploymentName = String(app.deployment);
          const ns = String(namespace);
          const deploymentResponse = await k8sAppsApi.readNamespacedDeployment({
            name: deploymentName,
            namespace: ns
          });
          const deployment = pickK8sResource(deploymentResponse);
          const status = deployment?.status || {};
          const spec = deployment?.spec || {};
          deploymentStatus[`${ns}/${deploymentName}`] = {
            replicas: status.replicas || 0,
            readyReplicas: status.readyReplicas || 0,
            availableReplicas: status.availableReplicas || 0,
            unavailableReplicas: status.unavailableReplicas || 0,
            desiredReplicas: spec.replicas || 1
          };
        } catch (err) {
          console.error(`Fehler beim Abrufen von ${namespace}/${app.deployment}:`, err.message);
          deploymentStatus[`${namespace}/${app.deployment}`] = {
            error: 'Deployment nicht gefunden',
            details: err.message
          };
        }
      }
    }
  }
  return deploymentStatus;
}

async function getAppsStatePayload() {
  try {
    const data = loadAppsYamlData();
    const apps = flattenAppsFromYamlData(data);
    if (!k8sAppsApi) {
      return { type: 'appsState', apps, deployments: {}, k8sUnavailable: true };
    }
    const deployments = await buildDeploymentStatusFromYamlData(data);
    return { type: 'appsState', apps, deployments };
  } catch (error) {
    console.error('Apps/K8s Payload Fehler:', error);
    return { type: 'appsState', apps: [], deployments: {}, error: error.message || 'Laden fehlgeschlagen' };
  }
}

//--------------------- Get Deployments ------------------------------------
app.get('/api/k8s/deployments', async (req, res) => {
  if (!k8sAppsApi) {
    return res.status(503).json({ error: 'Kubernetes API nicht verfügbar' });
  }
  try {
    const data = loadAppsYamlData();
    const deploymentStatus = await buildDeploymentStatusFromYamlData(data);
    res.json(deploymentStatus);
  } catch (error) {
    console.error('K8s API Fehler:', error);
    res.status(500).json({ error: 'Kubernetes API Fehler' });
  }
});

// -------------------- Scale Replicas -------------------------------
app.post('/api/k8s/scale', async (req, res) => {
  if (!k8sAppsApi) {
    return res.status(503).json({ error: 'Kubernetes API nicht verfügbar' });
  }
  const { namespace, deployment, replicas } = req.body;
  if (!namespace || !deployment || replicas === undefined) {
    return res.status(400).json({ error: 'namespace, deployment und replicas erforderlich' });
  }
  try {
    const currentDeploymentResponse = await k8sAppsApi.readNamespacedDeployment({
      name: deployment,
      namespace: namespace
    });
    const currentDeployment = pickK8sResource(currentDeploymentResponse);
    currentDeployment.spec = currentDeployment.spec || {};
    currentDeployment.spec.replicas = parseInt(replicas, 10);
    await k8sAppsApi.replaceNamespacedDeployment({
      name: deployment,
      namespace: namespace,
      body: currentDeployment
    });
    res.json({ success: true, replicas: parseInt(replicas) });
  } catch (error) {
    console.error('Scale Fehler:', error);
    res.status(500).json({ error: 'Scaling fehlgeschlagen' });
  }
});

// =========================== Monitoring ==================================
function parseRangeSeconds(rangeParam) {
  if (!rangeParam) return 3600;
  const match = String(rangeParam).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return 3600;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return Math.max(60, value * multipliers[unit]);
}

async function queryPrometheusRange(query, start, end, step) {
  const params = new URLSearchParams({
    query,
    start: String(start),
    end: String(end),
    step: String(step)
  });
  let lastError = null;
  for (const baseUrl of PROMETHEUS_FALLBACK_URLS) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/query_range?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Prometheus HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.status !== 'success') {
        throw new Error(payload.error || 'Prometheus query fehlgeschlagen');
      }
      return payload.data?.result || [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Prometheus nicht erreichbar');
}

async function queryPrometheusInstant(query) {
  const params = new URLSearchParams({ query });
  let lastError = null;
  for (const baseUrl of PROMETHEUS_FALLBACK_URLS) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/query?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Prometheus HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.status !== 'success') {
        throw new Error(payload.error || 'Prometheus query fehlgeschlagen');
      }
      return payload.data?.result || [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Prometheus nicht erreichbar');
}

async function resolvePcUptimeFromPrometheus() {
  const uptimeQueries = [
    `max((node_time_seconds{instance=~"${PC_IP}(:\\\\d+)?"} - node_boot_time_seconds{instance=~"${PC_IP}(:\\\\d+)?"}))`,
    'max(node_time_seconds - node_boot_time_seconds)'
  ];

  for (const query of uptimeQueries) {
    try {
      const result = await queryPrometheusInstant(query);
      const raw = result?.[0]?.value?.[1];
      const seconds = Number(raw);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.round(seconds * 1000);
      }
    } catch (_error) {
      // weiter zur naechsten Query
    }
  }

  return 0;
}

function flattenSeries(result) {
  const points = new Map();
  result.forEach((series) => {
    (series.values || []).forEach(([ts, value]) => {
      const timestamp = Number(ts) * 1000;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        points.set(timestamp, numeric);
      }
    });
  });
  return Array.from(points.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, value]) => ({ timestamp, value: Number(value.toFixed(2)) }));
}

async function getMonitoringOverviewPayload(rangeParam, stepParam) {
  try {
    const rangeSeconds = parseRangeSeconds(rangeParam || '1h');
    const step = Math.max(15, Number(stepParam) || 30);
    const end = Math.floor(Date.now() / 1000);
    const start = end - rangeSeconds;

    const queries = {
      cpu: '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
      memory: '100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))',
      networkRx: 'sum(rate(node_network_receive_bytes_total{device!~"lo"}[5m])) * 8 / 1000000',
      gpu: 'avg(DCGM_FI_DEV_GPU_UTIL) or avg(nvidia_smi_utilization_gpu_ratio) * 100 or avg(nvidia_gpu_duty_cycle)',
      gpuTemp: 'max(DCGM_FI_DEV_GPU_TEMP) or max(nvidia_smi_temperature_gpu)',
      powerW: 'sum(DCGM_FI_DEV_POWER_USAGE) or sum(rate(node_rapl_package_joules_total[5m]))',
      diskFree: '100 * (sum(node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) / sum(node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}))',
      nodesUp: 'count(up{job="node-exporter"} == 1)'
    };

    const settled = await Promise.allSettled(Object.entries(queries).map(async ([key, promql]) => {
      const result = await queryPrometheusRange(promql, start, end, step);
      return [key, flattenSeries(result)];
    }));

    const entries = Object.keys(queries).map((key, idx) => {
      const outcome = settled[idx];
      if (outcome.status === 'fulfilled') return outcome.value;
      console.warn(`Prometheus Query ${key} fehlgeschlagen:`, outcome.reason?.message);
      return [key, []];
    });

    return {
      start: start * 1000,
      end: end * 1000,
      step,
      series: Object.fromEntries(entries),
      units: {
        cpu: '%',
        memory: '%',
        networkRx: 'Mbit/s',
        gpu: '%',
        gpuTemp: '°C',
        powerW: 'W',
        diskFree: '%',
        nodesUp: ''
      }
    };
  } catch (error) {
    console.error('Monitoring API Fehler:', error.message);
    return { error: 'Monitoring-Daten konnten nicht geladen werden' };
  }
}

app.get('/api/monitoring/overview', async (req, res) => {
  const payload = await getMonitoringOverviewPayload(req.query.range, req.query.step);
  if (payload.error) {
    res.status(500).json({ error: payload.error });
  } else {
    res.json(payload);
  }
});

// =============================== Apps from Yaml ======================
app.get('/api/apps', (req, res) => {
  try {
    const data = loadAppsYamlData();
    res.json(flattenAppsFromYamlData(data));
  } catch (e) {
    console.error('Fehler beim Lesen der apps.yml:', e);
    res.status(500).json([]);
  }
});

// ========================= WebSocket (Status, Monitoring, Apps) =========================
const STATUS_BROADCAST_MS = 5000;
const MONITORING_BROADCAST_MS = 15000;
const APPS_BROADCAST_MS = 15000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function wsSendJson(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

function wsSendStatus(ws, payload) {
  wsSendJson(ws, { type: 'status', ...payload });
}

function wsSendMonitoring(ws, payload) {
  if (payload.error) {
    wsSendJson(ws, { type: 'monitoring', error: payload.error });
  } else {
    wsSendJson(ws, { type: 'monitoring', ...payload });
  }
}

function wsSendAppsState(ws, payload) {
  wsSendJson(ws, payload);
}

function broadcastPcStatus() {
  getPcStatusPayload()
    .then((payload) => {
      const msg = JSON.stringify({ type: 'status', ...payload });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(msg);
      });
    })
    .catch(() => {});
}

function broadcastMonitoring() {
  getMonitoringOverviewPayload('1h', 30)
    .then((payload) => {
      const msg = payload.error
        ? JSON.stringify({ type: 'monitoring', error: payload.error })
        : JSON.stringify({ type: 'monitoring', ...payload });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(msg);
      });
    })
    .catch(() => {});
}

function broadcastAppsState() {
  getAppsStatePayload()
    .then((payload) => {
      const msg = JSON.stringify(payload);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(msg);
      });
    })
    .catch(() => {});
}

function handleWsRefresh(ws, msg) {
  if (msg.type === 'requestStatus') {
    getPcStatusPayload().then((payload) => wsSendStatus(ws, payload));
    return;
  }
  if (msg.type !== 'refresh') return;

  const scope = msg.scope || 'status';
  if (scope === 'status' || scope === 'all') {
    getPcStatusPayload().then((payload) => wsSendStatus(ws, payload));
  }
  if (scope === 'monitoring' || scope === 'all') {
    getMonitoringOverviewPayload('1h', 30).then((payload) => wsSendMonitoring(ws, payload));
  }
  if (scope === 'apps' || scope === 'all') {
    getAppsStatePayload().then((payload) => wsSendAppsState(ws, payload));
  }
}

wss.on('connection', (ws) => {
  getPcStatusPayload().then((payload) => wsSendStatus(ws, payload));
  getMonitoringOverviewPayload('1h', 30).then((payload) => wsSendMonitoring(ws, payload));
  getAppsStatePayload().then((payload) => wsSendAppsState(ws, payload));

  ws.on('message', (raw) => {
    let msg = null;
    try {
      msg = JSON.parse(raw.toString());
    } catch (_err) {
      return;
    }
    if (msg && (msg.type === 'refresh' || msg.type === 'requestStatus')) {
      handleWsRefresh(ws, msg);
    }
  });
});

// ========================= General Infos =========================
initKubernetesClient().finally(() => {
  server.listen(PORT, () => {
    console.log(`Dashboard läuft auf Port ${PORT}`);
    setInterval(broadcastPcStatus, STATUS_BROADCAST_MS);
    setInterval(broadcastMonitoring, MONITORING_BROADCAST_MS);
    setInterval(broadcastAppsState, APPS_BROADCAST_MS);
  });
});
