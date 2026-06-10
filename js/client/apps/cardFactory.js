import { isDetailPageUnlocked } from '../detailAccess.js';

function createStatusIndicator(deployment) {
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator';
  if (!deployment) {
    statusIndicator.classList.add('unknown');
    return statusIndicator;
  }

  if (deployment.error) {
    statusIndicator.classList.add('unknown');
    return statusIndicator;
  }

  const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0;
  statusIndicator.classList.add(isReady ? 'ready' : 'not-ready');
  return statusIndicator;
}

export function createAppCard({ app, deployment }) {
  const appDiv = document.createElement('div');
  appDiv.className = 'app';

  const threed = document.createElement('div');
  threed.className = 'threed';

  const icon = document.createElement(app.url ? 'a' : 'div');
  icon.className = 'icon';

  if (app.url) {
    icon.href = app.url;
    icon.target = '_blank';
    icon.rel = 'noopener noreferrer';
  }

  if (app.icon) {
    const img = document.createElement('img');
    img.src = app.icon;
    img.alt = app.name;
    icon.appendChild(img);
  }

  const nameTag = document.createElement('div');
  nameTag.className = 'nameTag';

  const appName = document.createElement('label');
  appName.className = 'appName';
  appName.textContent = app.name;
  threed.appendChild(icon);
  appDiv.appendChild(threed);
  appDiv.appendChild(nameTag);
  nameTag.appendChild(createStatusIndicator(deployment));
  nameTag.appendChild(appName);

  appDiv.addEventListener('click', (event) => {
    if (event.target.tagName === 'A' || event.target.closest('a')) return;
    if (!isDetailPageUnlocked()) {
      window.alert(
        'Bitte zuerst den Fingerabdruck-Sensor auf der Monitoring-Seite nutzen und das richtige Passwort eingeben.'
      );
      return;
    }
    const q = new URLSearchParams({
      namespace: app.namespace,
      deployment: app.deployment
    });
    const detailUrl = new URL(`app-detail.html?${q.toString()}`, window.location.href);
    window.location.assign(detailUrl.href);
  });

  return appDiv;
}
