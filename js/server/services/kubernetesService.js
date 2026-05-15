function pickK8sResource(response) {
  if (!response) return null;
  return response.body || response;
}

function isInvalidUrlMessage(message) {
  const value = String(message || '');
  return value.includes('Invalid URL')
    || value.includes('Only absolute URLs are supported')
    || value.includes('Failed to parse URL');
}

function validateClusterServer(serverUrl) {
  if (!serverUrl) return 'No Kubernetes API URL found';

  try {
    const parsed = new URL(serverUrl);
    if (!parsed.protocol || !parsed.hostname) {
      return `Kubernetes API URL incomplete: ${serverUrl}`;
    }
    if (parsed.hostname === 'undefined' || parsed.port === 'undefined') {
      return `Kubernetes API URL invalid: ${serverUrl}`;
    }
  } catch (_error) {
    return `Kubernetes API URL invalid: ${serverUrl}`;
  }

  return null;
}

function createKubernetesService() {
  let k8sAppsApi = null;
  let k8sCoreApi = null;
  let mode = 'disabled';

  async function tryInitializeClient(k8s, loadConfig, targetMode, successMessage, unavailableMessage) {
    const kubeConfig = new k8s.KubeConfig();
    try {
      loadConfig(kubeConfig);
    } catch (error) {
      console.log(unavailableMessage, error.message);
      return false;
    }

    const serverValidationError = validateClusterServer(kubeConfig.getCurrentCluster()?.server);
    if (serverValidationError) {
      console.log(unavailableMessage, serverValidationError);
      return false;
    }

    const appsApi = kubeConfig.makeApiClient(k8s.AppsV1Api);
    const coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    try {
      await appsApi.listDeploymentForAllNamespaces({ limit: 1 });
    } catch (error) {
      if (isInvalidUrlMessage(error?.message)) {
        console.log(unavailableMessage, error.message);
        return false;
      }
    }

    k8sAppsApi = appsApi;
    k8sCoreApi = coreApi;
    mode = targetMode;
    console.log(successMessage);
    return true;
  }

  async function init() {
    const k8s = await import('@kubernetes/client-node');

    const hasInClusterClient = await tryInitializeClient(
      k8s,
      (kc) => kc.loadFromCluster(),
      'in-cluster',
      'Kubernetes in-cluster config loaded',
      'In-cluster config unavailable:'
    );
    if (hasInClusterClient) return;

    const hasDefaultClient = await tryInitializeClient(
      k8s,
      (kc) => kc.loadFromDefault(),
      'kubeconfig',
      'Kubernetes config loaded from kubeconfig',
      'Kubeconfig unavailable:'
    );
    if (hasDefaultClient) return;

    k8sAppsApi = null;
    k8sCoreApi = null;
    mode = 'disabled';
    console.log('K8s features are disabled');
  }

  function ensureClient() {
    if (!k8sAppsApi || !k8sCoreApi) {
      throw new Error('Kubernetes API unavailable');
    }
  }

  function isAvailable() {
    return Boolean(k8sAppsApi && k8sCoreApi);
  }

  function getMode() {
    return mode;
  }

  async function readDeployment(namespace, deployment) {
    ensureClient();
    const response = await k8sAppsApi.readNamespacedDeployment({
      name: deployment,
      namespace
    });
    return pickK8sResource(response);
  }

  async function scaleDeployment(namespace, deployment, replicas) {
    ensureClient();
    const currentDeployment = await readDeployment(namespace, deployment);
    currentDeployment.spec = currentDeployment.spec || {};
    currentDeployment.spec.replicas = parseInt(replicas, 10);
    await k8sAppsApi.replaceNamespacedDeployment({
      name: deployment,
      namespace,
      body: currentDeployment
    });
    return { success: true, replicas: parseInt(replicas, 10) };
  }

  async function updatePrimaryContainerRequests(namespace, deploymentName, { cpuRequest, memoryRequest }) {
    ensureClient();
    const dep = await readDeployment(namespace, deploymentName);
    const containers = dep?.spec?.template?.spec?.containers;
    if (!Array.isArray(containers) || containers.length === 0) {
      throw new Error('Deployment has no containers');
    }
    const c = containers[0];
    c.resources = c.resources || {};
    c.resources.requests = { ...c.resources.requests };
    if (cpuRequest !== undefined && cpuRequest !== null && cpuRequest !== '') {
      c.resources.requests.cpu = String(cpuRequest);
    }
    if (memoryRequest !== undefined && memoryRequest !== null && memoryRequest !== '') {
      c.resources.requests.memory = String(memoryRequest);
    }
    await k8sAppsApi.replaceNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: dep
    });
    return { success: true };
  }

  function matchLabelsToSelector(matchLabels) {
    if (!matchLabels || typeof matchLabels !== 'object') return '';
    return Object.entries(matchLabels)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(',');
  }

  function podLogAsString(response) {
    if (response == null) return '';
    if (typeof response === 'string') return response;
    const body = response.body;
    if (typeof body === 'string') return body;
    if (Buffer.isBuffer(body)) return body.toString('utf8');
    return String(body ?? '');
  }

  /**
   * Letzte Logzeilen pro Pod des Deployments (Selector matchLabels).
   * @param {number} tailLines begrenzt Server-Antwort (max 2000)
   */
  async function getDeploymentPodLogs(namespace, deploymentName, tailLines = 150) {
    ensureClient();
    const dep = await readDeployment(namespace, deploymentName);
    const selector = matchLabelsToSelector(dep?.spec?.selector?.matchLabels);
    if (!selector) {
      throw new Error('Deployment hat keinen matchLabels-Selector');
    }

    const maxTail = Math.min(2000, Math.max(10, parseInt(String(tailLines), 10) || 150));
    const podListRaw = await k8sCoreApi.listNamespacedPod({
      namespace,
      labelSelector: selector
    });
    const podList = podListRaw?.items !== undefined ? podListRaw : pickK8sResource(podListRaw);
    const items = Array.isArray(podList?.items) ? podList.items : [];

    const containerName = dep?.spec?.template?.spec?.containers?.[0]?.name;

    const pods = [];
    const limitPods = Math.min(items.length, 24);
    for (let i = 0; i < limitPods; i += 1) {
      const pod = items[i];
      const podName = pod?.metadata?.name;
      if (!podName) continue;
      try {
        const logRaw = await k8sCoreApi.readNamespacedPodLog({
          name: podName,
          namespace,
          container: containerName,
          tailLines: maxTail
        });
        pods.push({
          name: podName,
          logs: podLogAsString(logRaw)
        });
      } catch (err) {
        pods.push({
          name: podName,
          logs: '',
          error: err?.body?.message || err?.message || 'Logs nicht lesbar'
        });
      }
    }

    return { pods, tailLines: maxTail };
  }

  return {
    init,
    isAvailable,
    getMode,
    readDeployment,
    scaleDeployment,
    updatePrimaryContainerRequests,
    getDeploymentPodLogs
  };
}

module.exports = { createKubernetesService };
