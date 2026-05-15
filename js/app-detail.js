import { scaleDeployment } from './client/apps/scaleApi.js';
import { patchContainerRequests } from './client/apps/resourceApi.js';
import { getAppsIndexHref, isDetailPageUnlocked } from './client/detailAccess.js';
import {
  formatResourcePair,
  millicoresToCpuString,
  miToMemoryString,
  parseCpuToMillicores,
  parseMemoryToMi,
  renderResourceReplicaPanel,
  syncSliderValueLabel
} from './client/apps/replicaControl.js';

const POD_LOG_TAIL_LINES = 200;

function deploymentKey(namespace, deployment) {
  return `${namespace}/${deployment}`;
}

function panelElements(prefix) {
  return {
    title: document.getElementById(`${prefix}-title`),
    metaLine: document.getElementById(`${prefix}-meta`),
    count: document.getElementById(`${prefix}-count`),
    countLabel: document.getElementById(`${prefix}-label`),
    slider: document.getElementById(`${prefix}-slider`),
    sliderValue: document.getElementById(`${prefix}-slider-value`)
  };
}

async function fetchDeploymentsMap() {
  const res = await fetch('/api/k8s/deployments');
  if (res.status === 503) {
    throw new Error('Kubernetes nicht erreichbar');
  }
  if (!res.ok) {
    throw new Error('Deployments konnten nicht geladen werden');
  }
  return res.json();
}

async function fetchPodLogsSummary(namespace, deploymentName, tailLines) {
  const u = new URL('/api/k8s/pod-logs', window.location.origin);
  u.searchParams.set('namespace', namespace);
  u.searchParams.set('deployment', deploymentName);
  u.searchParams.set('tailLines', String(tailLines));
  const res = await fetch(u);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

document.addEventListener('DOMContentLoaded', () => {
  const backLink = document.getElementById('detail-back-link');
  if (backLink) {
    backLink.href = getAppsIndexHref();
  }

  if (!isDetailPageUnlocked()) {
    window.location.replace(getAppsIndexHref());
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const namespace = params.get('namespace');
  const deployment = params.get('deployment');
  const titleEl = document.getElementById('detail-page-title');
  const subEl = document.getElementById('detail-page-sub');

  const cpu = panelElements('detail-cpu');
  const mem = panelElements('detail-memory');
  const rep = panelElements('detail-replica');
  const logsPanels = document.getElementById('detail-logs-panels');
  const logsRefresh = document.getElementById('detail-logs-refresh');
  const nodesList = document.getElementById('detail-nodes-list');
  const nodesEmpty = document.getElementById('detail-nodes-empty');

  function renderPodNodes(podPlacements) {
    if (!nodesList || !nodesEmpty) return;
    nodesList.replaceChildren();
    const rows = Array.isArray(podPlacements) ? podPlacements : [];
    if (rows.length === 0) {
      nodesEmpty.hidden = false;
      nodesEmpty.textContent = 'Keine Pods fuer dieses Deployment gefunden.';
      return;
    }
    nodesEmpty.hidden = true;
    rows.forEach((row) => {
      const li = document.createElement('li');
      li.className = 'app-detail__nodes-item';
      const podSpan = document.createElement('span');
      podSpan.className = 'app-detail__pod-name';
      podSpan.textContent = row.pod || '—';
      li.appendChild(podSpan);
      li.appendChild(document.createTextNode(' \u2192 '));
      const nodeSpan = document.createElement('span');
      nodeSpan.className = 'app-detail__pod-node';
      nodeSpan.textContent = row.node || '(noch kein Node)';
      li.appendChild(nodeSpan);
      if (row.phase && row.phase !== 'Running') {
        const ph = document.createElement('span');
        ph.className = 'app-detail__pod-phase';
        ph.textContent = ` (${row.phase})`;
        li.appendChild(ph);
      }
      nodesList.appendChild(li);
    });
  }

  function renderLogsPlaceholder(message) {
    if (!logsPanels) return;
    logsPanels.replaceChildren();
    const p = document.createElement('p');
    p.className = 'app-detail__log-empty';
    p.textContent = message;
    logsPanels.appendChild(p);
  }

  async function loadPodLogs() {
    if (!logsPanels || !namespace || !deployment) return;

    const { ok, data } = await fetchPodLogsSummary(namespace, deployment, POD_LOG_TAIL_LINES);
    if (!ok) {
      renderLogsPlaceholder(data?.error || 'Logs konnten nicht geladen werden.');
      return;
    }
    const podsList = Array.isArray(data?.pods) ? data.pods : [];
    if (podsList.length === 0) {
      renderLogsPlaceholder('Keine Pods fuer dieses Deployment gefunden.');
      return;
    }

    logsPanels.replaceChildren();
    podsList.forEach((p) => {
      const article = document.createElement('article');
      article.className = 'app-detail__log-pod';
      const h3 = document.createElement('h3');
      h3.className = 'app-detail__log-pod-title';
      h3.textContent = p.name || 'Pod';
      const pre = document.createElement('pre');
      pre.className = 'app-detail__log-pre';
      if (p.error) {
        pre.textContent = `Fehler: ${p.error}`;
      } else {
        const text = p.logs != null ? String(p.logs) : '';
        pre.textContent = text.trim() ? text : '(keine Logzeilen in diesem Ausschnitt)';
      }
      article.appendChild(h3);
      article.appendChild(pre);
      logsPanels.appendChild(article);
    });
  }

  if (!namespace || !deployment) {
    if (titleEl) titleEl.textContent = 'Keine App gewaehlt';
    if (subEl) subEl.textContent = 'Bitte in der URL namespace und deployment angeben.';
    return;
  }

  if (subEl) subEl.textContent = `${namespace} / ${deployment}`;

  let appLabel = deployment;

  function setPanelsDisabled(disabled) {
    [cpu, mem, rep].forEach((p) => {
      if (p.slider) p.slider.disabled = disabled;
    });
  }

  async function refresh() {
    let map;
    try {
      map = await fetchDeploymentsMap();
    } catch (err) {
      if (titleEl) titleEl.textContent = 'Daten nicht verfuegbar';
      if (subEl) subEl.textContent = err.message || 'API-Fehler';
      setPanelsDisabled(true);
      renderPodNodes([]);
      renderLogsPlaceholder('Deployments-API fehlgeschlagen.');
      return;
    }

    const key = deploymentKey(namespace, deployment);
    const dep = map[key];

    if (!dep || dep.error) {
      if (titleEl) titleEl.textContent = 'Deployment nicht gefunden';
      setPanelsDisabled(true);
      renderPodNodes([]);
      renderLogsPlaceholder('Deployment nicht gefunden oder nicht lesbar.');
      return;
    }

    renderPodNodes(dep.podPlacements);
    try {
      const appsRes = await fetch('/api/apps');
      if (appsRes.ok) {
        const appsList = await appsRes.json();
        if (Array.isArray(appsList)) {
          const meta = appsList.find(
            (a) => a.namespace === namespace && a.deployment === deployment
          );
          if (meta?.name) appLabel = meta.name;
        }
      }
    } catch (_e) {
      /* App-Name ist optional */
    }

    if (titleEl) titleEl.textContent = appLabel;

    const cpuReq = dep.cpuRequest;
    const cpuLim = dep.cpuLimit;
    const memReq = dep.memoryRequest;
    const memLim = dep.memoryLimit;
    const ready = dep.readyReplicas ?? 0;
    const total = dep.replicas ?? 0;
    const desired = dep.desiredReplicas ?? total;

    const mc = parseCpuToMillicores(cpuReq);
    const mib = parseMemoryToMi(memReq);
    const vmax = Math.max(12, desired + 4, total + 2);

    renderResourceReplicaPanel(cpu, {
      titleHtml: 'CPU<br>Control',
      metaLine: appLabel,
      countText: formatResourcePair(cpuReq, cpuLim),
      countLabel: 'req / limit',
      sliderMin: 50,
      sliderMax: 8000,
      sliderStep: 50,
      sliderValue: mc,
      sliderDisabled: false,
      sliderValueLabel: millicoresToCpuString(mc)
    });

    renderResourceReplicaPanel(mem, {
      titleHtml: 'Memory<br>Control',
      metaLine: appLabel,
      countText: formatResourcePair(memReq, memLim),
      countLabel: 'req / limit',
      sliderMin: 64,
      sliderMax: 16384,
      sliderStep: 64,
      sliderValue: mib,
      sliderDisabled: false,
      sliderValueLabel: miToMemoryString(mib)
    });

    renderResourceReplicaPanel(rep, {
      titleHtml: 'Replica<br>Control',
      metaLine: appLabel,
      countText: `${ready}/${total}`,
      countLabel: 'bereit / gesamt',
      sliderMin: 0,
      sliderMax: vmax,
      sliderStep: 1,
      sliderValue: desired,
      sliderDisabled: false
    });

    await loadPodLogs();
  }

  function wireCpuMemPreview() {
    cpu.slider?.addEventListener('input', () => {
      const v = Number.parseInt(cpu.slider.value, 10);
      cpu.sliderValue.textContent = millicoresToCpuString(v);
    });
    mem.slider?.addEventListener('input', () => {
      const v = Number.parseInt(mem.slider.value, 10);
      mem.sliderValue.textContent = miToMemoryString(v);
    });
  }

  function wireReplicaPreview() {
    rep.slider?.addEventListener('input', () => {
      syncSliderValueLabel(rep, rep.slider.value);
    });
  }

  async function saveResources() {
    const mc = Number.parseInt(cpu.slider.value, 10);
    const mib = Number.parseInt(mem.slider.value, 10);
    const cpuStr = millicoresToCpuString(mc);
    const memStr = miToMemoryString(mib);
    const ok = await patchContainerRequests({ namespace, deployment }, {
      cpuRequest: cpuStr,
      memoryRequest: memStr
    });
    if (!ok) await refresh();
    else window.setTimeout(refresh, 1400);
  }

  async function onReplicaChange() {
    const n = Number.parseInt(rep.slider.value, 10);
    const ok = await scaleDeployment({ namespace, deployment }, n);
    if (!ok) await refresh();
    else window.setTimeout(refresh, 1200);
  }

  logsRefresh?.addEventListener('click', () => {
    loadPodLogs();
  });

  wireCpuMemPreview();
  wireReplicaPreview();
  cpu.slider?.addEventListener('change', saveResources);
  mem.slider?.addEventListener('change', saveResources);
  rep.slider?.addEventListener('change', onReplicaChange);

  refresh();
});
