const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function extractPrimaryContainerResources(deployment) {
  const c = deployment?.spec?.template?.spec?.containers?.[0];
  const r = c?.resources;
  if (!r) {
    return {
      cpuRequest: null,
      cpuLimit: null,
      memoryRequest: null,
      memoryLimit: null
    };
  }
  const req = r.requests || {};
  const lim = r.limits || {};
  return {
    cpuRequest: req.cpu ?? null,
    cpuLimit: lim.cpu ?? null,
    memoryRequest: req.memory ?? null,
    memoryLimit: lim.memory ?? null
  };
}

function createAppsService({ projectRoot, kubernetesService }) {
  function loadYamlData() {
    const fileContents = fs.readFileSync(path.join(projectRoot, 'apps.yml'), 'utf8');
    return yaml.load(fileContents);
  }

  function flattenAppsFromYamlData(data) {
    const allApps = [];
    if (!data?.apps) return allApps;

    Object.keys(data.apps).forEach((namespace) => {
      data.apps[namespace].forEach((app) => {
        allApps.push({ ...app, namespace });
      });
    });

    return allApps;
  }

  async function buildDeploymentStatusFromYamlData(data) {
    const deploymentStatus = {};
    for (const namespace of Object.keys(data.apps || {})) {
      for (const app of data.apps[namespace]) {
        if (!app?.deployment) continue;

        try {
          const deploymentName = String(app.deployment);
          const ns = String(namespace);
          const deployment = await kubernetesService.readDeployment(ns, deploymentName);
          const status = deployment?.status || {};
          const spec = deployment?.spec || {};
          let podPlacements = [];
          try {
            podPlacements = await kubernetesService.listPodsForDeployment(ns, deploymentName);
          } catch (podErr) {
            console.error(`Pods for ${ns}/${deploymentName}:`, podErr.message);
          }
          deploymentStatus[`${ns}/${deploymentName}`] = {
            replicas: status.replicas || 0,
            readyReplicas: status.readyReplicas || 0,
            availableReplicas: status.availableReplicas || 0,
            unavailableReplicas: status.unavailableReplicas || 0,
            desiredReplicas: spec.replicas || 1,
            podPlacements,
            ...extractPrimaryContainerResources(deployment)
          };
        } catch (err) {
          console.error(`Error fetching ${namespace}/${app.deployment}:`, err.message);
          deploymentStatus[`${namespace}/${app.deployment}`] = {
            error: 'Deployment not found',
            details: err.message
          };
        }
      }
    }
    return deploymentStatus;
  }

  async function getStatePayload() {
    try {
      const data = loadYamlData();
      const apps = flattenAppsFromYamlData(data);
      if (!kubernetesService.isAvailable()) {
        return { type: 'appsState', apps, deployments: {}, k8sUnavailable: true };
      }
      return { type: 'appsState', apps, deployments: await buildDeploymentStatusFromYamlData(data) };
    } catch (error) {
      console.error('Apps/K8s payload error:', error);
      return { type: 'appsState', apps: [], deployments: {}, error: error.message || 'Loading failed' };
    }
  }

  async function getDeployments() {
    const data = loadYamlData();
    return buildDeploymentStatusFromYamlData(data);
  }

  function getAppsList() {
    return flattenAppsFromYamlData(loadYamlData());
  }

  return {
    getStatePayload,
    getDeployments,
    getAppsList
  };
}

module.exports = { createAppsService };
