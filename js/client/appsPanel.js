import { createAppCard } from './apps/cardFactory.js';

export function createAppsPanel(_options = {}) {
  const state = {
    apps: [],
    deployments: {}
  };

  const elements = {
    grid: document.getElementById('app-grid')
  };

  function getDeploymentKey(app) {
    return `${app.namespace}/${app.deployment}`;
  }

  function renderApps() {
    if (!elements.grid) return;
    elements.grid.innerHTML = '';
    state.apps.forEach((app) => {
      elements.grid.appendChild(createAppCard({
        app,
        deployment: state.deployments[getDeploymentKey(app)]
      }));
    });
  }

  function applyAppsState(data) {
    if (!data || typeof data !== 'object') return;
    if (!elements.grid) return;

    if (data.error && (!Array.isArray(data.apps) || data.apps.length === 0)) {
      const errorMessage = document.createElement('p');
      errorMessage.className = 'apps-error';
      errorMessage.textContent = 'Could not load apps.';
      elements.grid.replaceChildren(errorMessage);
      return;
    }

    state.apps = Array.isArray(data.apps) ? data.apps : [];
    state.deployments = data.deployments && typeof data.deployments === 'object' ? data.deployments : {};
    renderApps();
  }

  return {
    applyAppsState
  };
}
