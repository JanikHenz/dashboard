const express = require('express');
const ping = require('ping');
const pigpioClient = require('pigpio-client');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const k8s = require('@kubernetes/client-node');

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

const kc = new k8s.KubeConfig();
try {
  kc.loadFromDefault();
  console.log('Kubernetes config geladen');
} catch (err) {
  console.error('Konnte Kubernetes config nicht laden:', err.message);
  console.log('K8s Features werden deaktiviert');
}
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

const PC_IP = process.env.PC_IP || "192.168.1.9";
const PI_IP = process.env.PI_IP || "192.168.1.10";

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

let realPcUptimeMs = 0;

app.post('/api/pc-data', (req, res) => {
  if (req.body && typeof req.body.uptime_ms === 'number') {
    realPcUptimeMs = req.body.uptime_ms;
    console.log(`Uptime-Update vom Ubuntu-Server: ${realPcUptimeMs} ms`);
  }
  res.json({ success: true });
});

app.get('/api/status', async (req, res) => {
  try {
    let pingResult = await ping.promise.probe(PC_IP, { timeout: 1 });

    if (!pingResult.alive) {
      realPcUptimeMs = 0;
    }

    res.json({
      is_on: pingResult.alive,
      uptime_ms: realPcUptimeMs
    });
  } catch (error) {
    realPcUptimeMs = 0;
    res.status(500).json({ is_on: false, uptime_ms: 0, error: 'Ping fehlgeschlagen' });
  }
});

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

app.get('/api/k8s/deployments', async (req, res) => {
  try {
    const fileContents = fs.readFileSync(path.join(projectRoot, 'apps.yml'), 'utf8');
    const data = yaml.load(fileContents);
    
    const deploymentStatus = {};
    
    for (const namespace of Object.keys(data.apps || {})) {
      for (const app of data.apps[namespace]) {
        if (app && app.deployment) {
          try {
            const deploymentName = String(app.deployment);
            const ns = String(namespace);
            
            const deployment = await k8sAppsApi.readNamespacedDeployment({
              name: deploymentName,
              namespace: ns
            });
            
            const status = deployment.status;
            const spec = deployment.spec;
            
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
    
    res.json(deploymentStatus);
  } catch (error) {
    console.error('K8s API Fehler:', error);
    res.status(500).json({ error: 'Kubernetes API Fehler' });
  }
});

app.post('/api/k8s/scale', async (req, res) => {
  const { namespace, deployment, replicas } = req.body;
  
  if (!namespace || !deployment || replicas === undefined) {
    return res.status(400).json({ error: 'namespace, deployment und replicas erforderlich' });
  }
  
  try {
    const currentDeployment = await k8sAppsApi.readNamespacedDeployment({
      name: deployment,
      namespace: namespace
    });
    
    currentDeployment.spec.replicas = parseInt(replicas);
    
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

app.get('/api/apps', (req, res) => {
  try {
    const fileContents = fs.readFileSync(path.join(projectRoot, 'apps.yml'), 'utf8');
    const data = yaml.load(fileContents);
    
    const allApps = [];
    if (data.apps) {
      Object.keys(data.apps).forEach(namespace => {
        data.apps[namespace].forEach(app => {
          allApps.push({
            ...app,
            namespace: namespace
          });
        });
      });
    }
    
    res.json(allApps);
  } catch (e) {
    console.error("Fehler beim Lesen der apps.yml:", e);
    res.status(500).json([]);
  }
});

app.listen(PORT, () => {
  console.log(`K8s Dashboard läuft auf Port ${PORT}`);
});
