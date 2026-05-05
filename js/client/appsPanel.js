import { createAppCard } from './apps/cardFactory.js';
import { scaleDeployment } from './apps/scaleApi.js';
import {
  renderReplicaControl,
  renderNoSelection,
  resetSliderToDeployment
} from './apps/replicaControl.js';

export function createAppsPanel({ onRequestAppsRefresh }) {
  const state = {
    selectedApp: null,
    apps: [],
    deployments: {}
  };

  const elements = {
    grid: document.getElementById('app-grid'),
    appName: document.getElementById('selected-app-name'),
    replicaCount: document.getElementById('replica-count'),
    slider: document.getElementById('global-slider'),
    sliderValue: document.getElementById('slider-value')
  };

  function getDeploymentKey(app) {
    return `${app.namespace}/${app.deployment}`;
  }

  function getSelectedDeployment() {
    if (!state.selectedApp) return null;
    return state.deployments[getDeploymentKey(state.selectedApp)] || null;
  }

  function selectApp(app) {
    state.selectedApp = app;
    renderApps();
    renderReplicaControl(elements, app, getSelectedDeployment());
  }

  function renderApps() {
    if (!elements.grid) return;
    elements.grid.innerHTML = '';
    state.apps.forEach((app) => {
      elements.grid.appendChild(createAppCard({
        app,
        deployment: state.deployments[getDeploymentKey(app)],
        isSelected: state.selectedApp
          ? getDeploymentKey(state.selectedApp) === getDeploymentKey(app)
          : false,
        onSelect: selectApp
      }));
    });
  }

  async function handleSliderChange(event) {
    if (!state.selectedApp) return;

    const newReplicas = Number.parseInt(event.target.value, 10);
    try {
      const success = await scaleDeployment(state.selectedApp, newReplicas);
      if (!success) {
        resetSliderToDeployment(elements, getSelectedDeployment());
        return;
      }

      setTimeout(onRequestAppsRefresh, 1000);
    } catch (error) {
      console.error('Error scaling deployment:', error);
      resetSliderToDeployment(elements, getSelectedDeployment());
    }
  }

  function applyAppsState(data) {
    if (!data || typeof data !== 'object') return;
    if (!elements.grid) return;

    if (data.error && (!Array.isArray(data.apps) || data.apps.length === 0)) {
      elements.grid.innerHTML = '<p style="color:red; grid-column: 1 / -1; text-align: center;">Konnte Apps nicht laden.</p>';
      return;
    }

    state.apps = Array.isArray(data.apps) ? data.apps : [];
    state.deployments = data.deployments && typeof data.deployments === 'object' ? data.deployments : {};
    if (state.selectedApp) {
      state.selectedApp = state.apps.find((app) => (
        app.namespace === state.selectedApp.namespace
        && app.deployment === state.selectedApp.deployment
      )) || null;
    }
    renderApps();

    if (state.selectedApp) {
      renderReplicaControl(elements, state.selectedApp, getSelectedDeployment());
    } else {
      renderNoSelection(elements);
    }
  }

  if (elements.slider && elements.sliderValue) {
    elements.slider.addEventListener('input', (event) => {
      elements.sliderValue.textContent = event.target.value;
    });
    elements.slider.addEventListener('change', handleSliderChange);
  }

  return {
    applyAppsState
  };
}
