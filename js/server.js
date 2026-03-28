const express = require('express');
const ping = require('ping');
const pigpioClient = require('pigpio-client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const projectRoot = path.join(__dirname, '..');

app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

const PC_IP = process.env.PC_IP || "192.168.1.9"; 
const PI_IP = process.env.PI_IP || "192.168.1.10";

const pi = pigpioClient.pigpio({ host: PI_IP });

const ready = new Promise((resolve, reject) => {
    pi.once('connected', () => {
        console.log(`Verbunden mit GPIO-Daemon auf ${PI_IP}`);
        resolve();
    });
    pi.once('error', (err) => {
        console.error(`Fehler bei GPIO-Verbindung: ${err.message}`);
        reject(err);
    });
});

app.get('/api/status', async (req, res) => {
    try {
        let pingResult = await ping.promise.probe(PC_IP, { timeout: 1 });
        res.json({ is_on: pingResult.alive });
    } catch (error) {
        res.status(500).json({ is_on: false, error: 'Ping fehlgeschlagen' });
    }
});

app.get('/api/press-button', async (req, res) => {
    try {
        await ready; 
        const pin = pi.gpio(17);
        await pin.modeSet('output');
        await pin.write(1);
        setTimeout(async () => {
            await pin.write(0);
            res.json({ success: true });
        }, 500);
    } catch (error) {
        console.error(`Fehler beim Schalten:`, error);
        res.status(500).json({ success: false, error: 'Hardware Fehler' });
    }
});

app.listen(PORT, () => {
    console.log(`K8s Dashboard läuft auf Port ${PORT}`);
});
