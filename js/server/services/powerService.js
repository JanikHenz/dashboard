const pigpioClient = require('pigpio-client');

function createPowerService({ piIp }) {
  const pi = pigpioClient.pigpio({ host: piIp });
  let isPiConnected = false;

  pi.on('connected', () => {
    console.log(`Connected to GPIO daemon on ${piIp}`);
    isPiConnected = true;
  });

  pi.on('error', (err) => {
    console.error(`GPIO connection failed (${piIp}): ${err.message}`);
    isPiConnected = false;
  });

  async function pressPowerPin(durationMs) {
    if (!isPiConnected) {
      return { ok: false, status: 500, body: { success: false, error: 'Pi Offline' } };
    }

    try {
      const pin = pi.gpio(17);
      await pin.modeSet('output');
      await pin.write(1);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      await pin.write(0);
      return { ok: true, status: 200, body: { success: true } };
    } catch (error) {
      console.error('Switching error:', error);
      return { ok: false, status: 500, body: { success: false, error: 'Hardware error' } };
    }
  }

  function pressButton() {
    return pressPowerPin(500);
  }

  function hardShutdown() {
    return pressPowerPin(5000);
  }

  return {
    pressButton,
    hardShutdown
  };
}

module.exports = { createPowerService };
