const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

module.exports = {
  PORT: process.env.PORT || 8080,
  projectRoot,
  PC_IP: process.env.PC_IP || '192.168.1.9',
  PI_IP: process.env.PI_IP || '192.168.1.10',
  PROMETHEUS_BASE_URL: process.env.PROMETHEUS_BASE_URL || 'http://prometheus-service.monitoring.svc.cluster.local:9090',
  STATUS_BROADCAST_MS: 5000,
  MONITORING_BROADCAST_MS: 15000,
  APPS_BROADCAST_MS: 15000
};
