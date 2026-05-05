function createStatusIndicator(deployment) {
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator';
  if (!deployment) {
    statusIndicator.classList.add('unknown');
    return statusIndicator;
  }

  const isReady = deployment.readyReplicas === deployment.replicas && deployment.replicas > 0;
  statusIndicator.classList.add(isReady ? 'ready' : 'not-ready');
  return statusIndicator;
}

export function createAppCard({ app, deployment, isSelected, onSelect }) {
  const appDiv = document.createElement('div');
  appDiv.className = 'app';
  if (isSelected) {
    appDiv.classList.add('selected');
  }

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
  nameTag.appendChild(createStatusIndicator(deployment));
  nameTag.appendChild(appName);

  appDiv.addEventListener('click', (event) => {
    if (event.target.tagName === 'A' || event.target.closest('a')) return;
    onSelect(app);
  });

  return appDiv;
}
