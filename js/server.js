const express = require('express');
const ping = require('ping');
const pigpioClient = require('pigpio-client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const projectRoot = path.join(__dirname, '..');

app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

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

app.listen(PORT, () => {
  console.log(`K8s Dashboard läuft auf Port ${PORT}`);
});
