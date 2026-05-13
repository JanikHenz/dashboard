export const monitoringConfig = [
  {
    id: 'chart-cpu',
    key: 'cpu',
    title: 'CPU Usage',
    unit: '%',
    cssLineVar: '--echarts-cpu-line',
    cssAreaVar: '--echarts-cpu-area'
  },
  {
    id: 'chart-memory',
    key: 'memory',
    title: 'RAM Usage',
    unit: '%',
    cssLineVar: '--echarts-memory-line',
    cssAreaVar: '--echarts-memory-area'
  },
  {
    id: 'chart-network',
    key: 'networkRx',
    title: 'Network RX',
    unit: 'Mbit/s',
    cssLineVar: '--echarts-network-line',
    cssAreaVar: '--echarts-network-area'
  },
  {
    id: 'chart-power',
    key: 'powerW',
    title: 'Power Usage',
    unit: 'W',
    cssLineVar: '--echarts-power-line',
    cssAreaVar: '--echarts-power-area'
  }
];

export const monitorHeaderBindings = [
  { key: 'cpu', id: 'monitor-stat-cpu-value', unit: '%', digits: 0 },
  { key: 'memory', id: 'monitor-stat-memory-value', unit: '%', digits: 0 },
  { key: 'gpu', id: 'monitor-stat-gpu-value', unit: '%', digits: 0 },
  { key: 'gpuTemp', id: 'monitor-stat-gpuTemp-value', unit: '°C', digits: 0 },
  { key: 'diskUsage', id: 'monitor-stat-diskUsage-value', unit: '%', digits: 0 },
  { key: 'networkRx', id: 'monitor-stat-networkRx-value', unit: 'Mbit/s', digits: 1 },
  { key: 'nodesUp', id: 'monitor-stat-nodesUp-value', unit: '', digits: 0 }
];
