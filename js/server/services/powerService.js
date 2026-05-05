const pigpioClient = require('pigpio-client');

function createPowerService({ piIp }) {
  const pi = pigpioClient.pigpio({ host: piIp });
  let isPiConnected = false;

  pi.on('connected', () => {
    console.log(`Verbunden mit GPIO-Daemon auf ${piIp}`);
    isPiConnected = true;
  });

  pi.on('error', (err) => {
    console.error(`GPIO-Verbindung fehlgeschlagen (${piIp}): ${err.message}`);
    isPiConnected = false;
  });

  async function pressButton() {
    if (!isPiConnected) {
      return { ok: false, status: 500, body: { success: false, error: 'Pi Offline' } };
    }

    try {
      const pin = pi.gpio(17);
      await pin.modeSet('output');
      await pin.write(1);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await pin.write(0);
      return { ok: true, status: 200, body: { success: true } };
    } catch (error) {
      console.error('Fehler beim Schalten:', error);
      return { ok: false, status: 500, body: { success: false, error: 'Hardware Fehler' } };
    }
  }

  return {
    pressButton
  };
}

module.exports = { createPowerService };
