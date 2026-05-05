export const monitoringConfig = [
  { id: 'chart-cpu', key: 'cpu', title: 'CPU Auslastung', unit: '%' },
  { id: 'chart-memory', key: 'memory', title: 'RAM Auslastung', unit: '%' },
  { id: 'chart-network', key: 'networkRx', title: 'Netzwerk RX', unit: 'Mbit/s' },
  { id: 'chart-disk', key: 'diskFree', title: 'Disk frei', unit: '%' }
];

export const monitorHeaderBindings = [
  { key: 'cpu', id: 'monitor-stat-cpu-value', unit: '%', digits: 0 },
  { key: 'memory', id: 'monitor-stat-memory-value', unit: '%', digits: 0 },
  { key: 'gpu', id: 'monitor-stat-gpu-value', unit: '%', digits: 0 },
  { key: 'gpuTemp', id: 'monitor-stat-gpuTemp-value', unit: '°C', digits: 0 },
  { key: 'powerW', id: 'monitor-stat-powerW-value', unit: 'W', digits: 0 },
  { key: 'networkRx', id: 'monitor-stat-networkRx-value', unit: 'Mbit/s', digits: 1 },
  { key: 'diskFree', id: 'monitor-stat-diskFree-value', unit: '%', digits: 0 },
  { key: 'nodesUp', id: 'monitor-stat-nodesUp-value', unit: '', digits: 0 }
];
