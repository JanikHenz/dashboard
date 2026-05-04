// ===================== 7 Segment =============================
document.addEventListener('DOMContentLoaded', () => {
  const DIGITS = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 1, 1, 0, 0, 0, 0],
    2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1],
    7: [1, 1, 1, 0, 0, 0, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1]
  };

  const segmentClasses = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  function renderDigit(digitId, number) {
    const digitEl = document.getElementById(digitId);
    if (!digitEl) return;

    const pattern = DIGITS[number] || DIGITS[0];

    segmentClasses.forEach((segClass, index) => {
      const segment = digitEl.querySelector(`.seg-${segClass}`);
      if (segment) {
        if (pattern[index]) {
          segment.classList.add('on');
        } else {
          segment.classList.remove('on');
        }
      }
    });
  }

  function updateTimerDisplay(uptimeMs) {
    if (uptimeMs <= 0) {
      renderDigit('d0', 0); renderDigit('d1', 0);
      renderDigit('h0', 0); renderDigit('h1', 0);
      renderDigit('m0', 0); renderDigit('m1', 0);
      return;
    }

    const totalMins = Math.floor(uptimeMs / 1000 / 60);
    const d = Math.floor(totalMins / (24 * 60));
    const h = Math.floor((totalMins % (24 * 60)) / 60);
    const m = totalMins % 60;

    const dStr = String(d).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');

    renderDigit('d0', parseInt(dStr[0]));
    renderDigit('d1', parseInt(dStr[1]));
    renderDigit('h0', parseInt(hStr[0]));
    renderDigit('h1', parseInt(hStr[1]));
    renderDigit('m0', parseInt(mStr[0]));
    renderDigit('m1', parseInt(mStr[1]));
  }

// =============== Power Status + Timer ===========================
  const powerBtn = document.querySelector('.power-btn');
  const pwrLed = document.querySelector('.pwr-led');
  let isPcOn = false;
  let wasOn = false; 
  let wasPressed = false;

  let statusWs = null;
  let statusWsReconnectTimer = null;

  function applyPcStatus(data) {
    if (data.is_on === undefined) return;
    isPcOn = data.is_on;

    if (pwrLed) {
      if (wasPressed && isPcOn === wasOn) {
        pwrLed.style.backgroundColor = 'var(--pending)';
        pwrLed.style.boxShadow = '0 0 6px var(--pending), 0 0 14px var(--pending)';
      } else {
        wasPressed = false;
        pwrLed.style.backgroundColor = isPcOn ? 'var(--online)' : 'var(--offline)';
        pwrLed.style.boxShadow = isPcOn ? '0 0 6px var(--online), 0 0 14px var(--online)' : '0 0 6px var(--offline), 0 0 14px var(--offline)';
      }
    }
    const uptime = Number(data.uptime_ms);
    updateTimerDisplay(Number.isFinite(uptime) ? uptime : 0);
  }

  function requestPcStatusRefresh() {
    if (statusWs && statusWs.readyState === WebSocket.OPEN) {
      statusWs.send(JSON.stringify({ type: 'refresh' }));
    }
  }

  function requestMonitoringRefresh() {
    if (statusWs && statusWs.readyState === WebSocket.OPEN) {
      statusWs.send(JSON.stringify({ type: 'refresh', scope: 'monitoring' }));
    }
  }

  function requestAppsRefresh() {
    if (statusWs && statusWs.readyState === WebSocket.OPEN) {
      statusWs.send(JSON.stringify({ type: 'refresh', scope: 'apps' }));
    }
  }

// ================== Power Control ===========================================
  if (powerBtn) {
    powerBtn.addEventListener('click', async () => {
      powerBtn.style.transform = 'scale(0.95)';
      setTimeout(() => powerBtn.style.transform = 'scale(1)', 150);
      const action = isPcOn ? "Ubuntu-Server hart ausschalten?" : "Ubuntu-Server einschalten?";
      if (confirm(action)) {
        try {
          wasOn = isPcOn;
          const response = await fetch('/api/press-button');
          if (response.ok) {
            console.log("Befehl gesendet, warte auf Statusänderung...");
            wasPressed = true;
            if (pwrLed) pwrLed.style.backgroundColor = '#FFA500';
            setTimeout(requestPcStatusRefresh, 1500);
          } else {
            wasPressed = false;
            alert("Backend-Fehler!");
          }
        } catch (err) {
          console.error("Netzwerkfehler:", err);
          wasPressed = false;
          alert("Konnte den Befehl nicht senden.");
        }
      }
    });
  }
// =========================== Apps get Information ========================================
  let selectedApp = null;
  let appsData = [];
  let deploymentsData = {};

  function applyAppsState(data) {
    const grid = document.getElementById('app-grid');
    if (!grid) return;

    if (data.error && (!Array.isArray(data.apps) || data.apps.length === 0)) {
      grid.innerHTML = '<p style="color:red; grid-column: 1 / -1; text-align: center;">Konnte Apps nicht laden.</p>';
      return;
    }

    appsData = Array.isArray(data.apps) ? data.apps : [];
    deploymentsData = data.deployments && typeof data.deployments === 'object' ? data.deployments : {};
    renderApps();
  }
// ---------------------------- Render Apps form Yaml ------------------------------
  function renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = '';

    appsData.forEach(app => {
      const deploymentKey = `${app.namespace}/${app.deployment}`;
      const deployment = deploymentsData[deploymentKey];

      const appDiv = document.createElement('div');
      appDiv.className = 'app';
      if (selectedApp && selectedApp.name === app.name) {
        appDiv.classList.add('selected');
      }
// -------------------------------- Deployment Status -------------------------------
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'status-indicator';
      if (deployment) {
        const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0;
        statusIndicator.classList.add(isReady ? 'ready' : 'not-ready');
      } else {
        statusIndicator.classList.add('unknown');
      }
// ------------------------------- Build App design ---------------------------
      const threed = document.createElement('div');
      threed.className = 'threed';

      const icon = document.createElement('div');
      icon.className = 'icon';

      const link = document.createElement('a');
      link.href = app.url;
      link.target = '_blank';

      const img = document.createElement('img');
      img.src = app.icon;
      img.alt = app.name;

      const nameTag = document.createElement('div');
      nameTag.className = 'nameTag';
      
      const appName = document.createElement('label');
      appName.className = 'appName';
      appName.textContent = app.name;

      link.appendChild(img);
      icon.appendChild(link);
      threed.appendChild(icon);

      appDiv.appendChild(threed);
      appDiv.appendChild(nameTag);
      nameTag.appendChild(statusIndicator);
      nameTag.appendChild(appName);

// ------------------------ Select App -------------------------
      appDiv.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) {
          return;
        }
        selectApp(app, deployment);
      });

      grid.appendChild(appDiv);
    });
  }

  function selectApp(app, deployment) {
    selectedApp = app;
    renderApps(); // Re-render to update selected state
    updateReplicaControl(app, deployment);
  }

// ---------------------------- Show Replicas -----------------------------
  function updateReplicaControl(app, deployment) {
    const appNameEl = document.getElementById('selected-app-name');
    const replicaCountEl = document.getElementById('replica-count');
    const sliderEl = document.getElementById('global-slider');
    const sliderValueEl = document.getElementById('slider-value');
    if (!appNameEl || !replicaCountEl || !sliderEl || !sliderValueEl) return;

    appNameEl.textContent = app.name;

    if (deployment) {
      const ready = deployment.readyReplicas || 0;
      const total = deployment.replicas || 0;
      replicaCountEl.textContent = `${ready}/${total}`;

      sliderEl.disabled = false;
      sliderEl.value = total;
      sliderValueEl.textContent = total;
    } else {
      replicaCountEl.textContent = '-/-';
      sliderEl.disabled = true;
      sliderEl.value = 0;
      sliderValueEl.textContent = '-';
    }
  }

// ---------------------------- Slider ----------------------------
  const globalSlider = document.getElementById('global-slider');
  const sliderValue = document.getElementById('slider-value');

  if (globalSlider && sliderValue) {
    globalSlider.addEventListener('input', (e) => {
      sliderValue.textContent = e.target.value;
    });

    globalSlider.addEventListener('change', async (e) => {
      if (!selectedApp) return;

      const newReplicas = parseInt(e.target.value);
      try {
        const response = await fetch('/api/k8s/scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namespace: selectedApp.namespace,
            deployment: selectedApp.deployment,
            replicas: newReplicas
          })
        });

        if (response.ok) {
          console.log(`Scaled ${selectedApp.name} to ${newReplicas} replicas`);
          setTimeout(requestAppsRefresh, 1000);
        } else {
          console.error('Failed to scale deployment');
          const deploymentKey = `${selectedApp.namespace}/${selectedApp.deployment}`;
          const deployment = deploymentsData[deploymentKey];
          if (deployment) {
            globalSlider.value = deployment.replicas || 0;
            sliderValue.textContent = deployment.replicas || 0;
          }
        }
      } catch (error) {
        console.error('Error scaling deployment:', error);
        const deploymentKey = `${selectedApp.namespace}/${selectedApp.deployment}`;
        const deployment = deploymentsData[deploymentKey];
        if (deployment) {
          globalSlider.value = deployment.replicas || 0;
          sliderValue.textContent = deployment.replicas || 0;
        }
      }
    });
  }

// ======================== Monitoring ===================================
  const monitoringConfig = [
    { id: 'chart-cpu', key: 'cpu', title: 'CPU Auslastung', unit: '%' },
    { id: 'chart-memory', key: 'memory', title: 'RAM Auslastung', unit: '%' },
    { id: 'chart-network', key: 'networkRx', title: 'Netzwerk RX', unit: 'Mbit/s' },
    { id: 'chart-disk', key: 'diskFree', title: 'Disk frei', unit: '%' }
  ];
  const monitoringCharts = new Map();

  const monitorHeaderBindings = [
    { key: 'cpu', id: 'monitor-stat-cpu-value', unit: '%', digits: 0 },
    { key: 'memory', id: 'monitor-stat-memory-value', unit: '%', digits: 0 },
    { key: 'gpu', id: 'monitor-stat-gpu-value', unit: '%', digits: 0 },
    { key: 'gpuTemp', id: 'monitor-stat-gpuTemp-value', unit: '°C', digits: 0 },
    { key: 'powerW', id: 'monitor-stat-powerW-value', unit: 'W', digits: 0 },
    { key: 'networkRx', id: 'monitor-stat-networkRx-value', unit: 'Mbit/s', digits: 1 },
    { key: 'diskFree', id: 'monitor-stat-diskFree-value', unit: '%', digits: 0 },
    { key: 'nodesUp', id: 'monitor-stat-nodesUp-value', unit: '', digits: 0 }
  ];

  function latestValue(points) {
    if (!Array.isArray(points) || points.length === 0) return null;
    const value = Number(points[points.length - 1]?.value);
    return Number.isFinite(value) ? value : null;
  }

  function formatMetric(value, unit, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    const formatted = Number(value).toFixed(digits);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  function setMonitorTextById(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  }

  function renderMonitoringHeaderFromData(data) {
    const series = data.series || {};
    monitorHeaderBindings.forEach((row) => {
      const v = latestValue(series[row.key]);
      setMonitorTextById(row.id, formatMetric(v, row.unit, row.digits));
    });
  }

  function clearMonitoringHeaderValues(placeholder = '--') {
    monitorHeaderBindings.forEach((row) => {
      setMonitorTextById(row.id, placeholder);
    });
  }

  function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function getMonitoringPalette() {
    return {
      text: getCssVar('--text-accent'),
      stroke: getCssVar('--text-stroke-color') || '#000',
      grid: 'rgba(0, 0, 0, 0.25)',
      line: getCssVar('--lcd-on'),
      area: getCssVar('--on')
    };
  }

  function createBaseChartOption(config, points) {
    const palette = getMonitoringPalette();
    const seriesData = points.map((point) => [point.timestamp, point.value]);
    return {
      animation: false,
      title: {
        text: config.title,
        left: 12,
        top: 8,
        textStyle: {
          color: palette.text,
          fontFamily: 'Patrick Hand, cursive',
          fontSize: 18,
          textBorderColor: palette.stroke,
          textBorderWidth: 1
        }
      },
      grid: { left: 48, right: 14, top: 46, bottom: 26 },
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        confine: false,
        backgroundColor: 'rgba(30, 38, 48, 0.94)',
        borderColor: '#000000',
        borderWidth: 2,
        padding: [8, 12],
        textStyle: {
          color: '#f5f8fb',
          fontFamily: 'Patrick Hand, cursive',
          fontSize: 14
        },
        valueFormatter: (value) => `${Number(value).toFixed(2)} ${config.unit}`
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: palette.text },
        axisLine: { lineStyle: { color: palette.grid } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: palette.text,
          formatter: (value) => `${value}${config.unit === '%' ? '%' : ''}`
        },
        axisLine: { lineStyle: { color: palette.grid } },
        splitLine: { lineStyle: { color: palette.grid } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: palette.line },
        areaStyle: { color: palette.area },
        data: seriesData
      }]
    };
  }

  function ensureMonitoringCharts() {
    if (!window.echarts) return false;
    monitoringConfig.forEach((config) => {
      const target = document.getElementById(config.id);
      if (!target) return;
      if (!monitoringCharts.has(config.id)) {
        monitoringCharts.set(config.id, echarts.init(target));
      }
    });
    return monitoringCharts.size > 0;
  }

  function resizeMonitoringCharts() {
    requestAnimationFrame(() => {
      monitoringCharts.forEach((chart) => {
        try {
          chart.resize();
        } catch (_err) {
          /* ignore */
        }
      });
    });
  }

  function showMonitoringChartError(message) {
    const palette = getMonitoringPalette();
    monitoringConfig.forEach((config) => {
      const chart = monitoringCharts.get(config.id);
      if (!chart) return;
      chart.clear();
      chart.setOption({
        title: {
          text: config.title,
          left: 'center',
          top: 'middle',
          textStyle: {
            color: palette.text,
            fontFamily: 'Patrick Hand, cursive',
            textBorderColor: palette.stroke,
            textBorderWidth: 1,
            fontSize: 16
          },
          subtext: message,
          subtextStyle: {
            color: getCssVar('--offline'),
            fontFamily: 'Patrick Hand, cursive',
            fontSize: 14
          }
        }
      }, true);
    });
  }

  function applyMonitoringPayload(data) {
    if (!ensureMonitoringCharts()) return;
    if (data.error) {
      clearMonitoringHeaderValues('--');
      const msg = typeof data.error === 'string' ? data.error : 'Monitoring nicht erreichbar';
      showMonitoringChartError(msg);
      return;
    }
    renderMonitoringHeaderFromData(data);
    monitoringConfig.forEach((config) => {
      const chart = monitoringCharts.get(config.id);
      if (!chart) return;
      const points = data.series?.[config.key] || [];
      chart.setOption(createBaseChartOption(config, points), true);
    });
    resizeMonitoringCharts();
  }

  function connectDashboardWebSocket() {
    if (statusWsReconnectTimer) {
      clearTimeout(statusWsReconnectTimer);
      statusWsReconnectTimer = null;
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    statusWs = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'status':
            applyPcStatus(data);
            break;
          case 'monitoring':
            applyMonitoringPayload(data);
            break;
          case 'appsState':
            applyAppsState(data);
            break;
          default:
            if (data.is_on !== undefined) applyPcStatus(data);
        }
      } catch (error) {
        console.error('WebSocket Parsefehler:', error);
      }
    };

    ws.onerror = () => {
      if (pwrLed) pwrLed.style.backgroundColor = '#888';
    };

    ws.onclose = () => {
      statusWs = null;
      if (pwrLed) pwrLed.style.backgroundColor = '#888';
      statusWsReconnectTimer = setTimeout(connectDashboardWebSocket, 3000);
    };
  }

  if (ensureMonitoringCharts()) {
    window.addEventListener('resize', resizeMonitoringCharts);
    const chartsRoot = document.getElementById('charts');
    if (chartsRoot && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => resizeMonitoringCharts());
      ro.observe(chartsRoot);
    }
  }

  connectDashboardWebSocket();

// ======================== Page Switcher ==================================
const isAndroid = () => /Android/i.test(navigator.userAgent + (navigator.userAgentData?.platform || ""));
const shell = document.getElementById('app-shell');

document.querySelectorAll('.hint').forEach(btn => {
  btn.onclick = () => {
    const isShow = shell?.classList.contains('show-monitoring');
    if (!shell || (isAndroid() && !isShow && !btn.classList.contains('back-hint'))) return;

    shell.classList.toggle('show-monitoring');
    resizeMonitoringCharts();
  };
});
// ======================== Theme Toggle ===================================
  const themeToggle = document.getElementById('theme-toggle');
  const drehteil = document.querySelector('.drehteil');
  const themes = ['light', 'dark'];
  const savedTheme = themes.includes(localStorage.getItem('theme'))
    ? localStorage.getItem('theme')
    : 'light';

  function applyTheme(theme) {
    document.body.classList.remove('dark-mode');
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    if (drehteil) {
      drehteil.classList.remove('rotated');
      if (theme === 'dark') {
        drehteil.classList.add('rotated');
      }
    }
    localStorage.setItem('theme', theme);
    requestMonitoringRefresh();
  }

  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const activeTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
      const nextTheme = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
      applyTheme(nextTheme);
    });
  }
});
