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
    try {
      await appsApi.listDeploymentForAllNamespaces({ limit: 1 });
    } catch (error) {
      if (isInvalidUrlMessage(error?.message)) {
        console.log(unavailableMessage, error.message);
        return false;
      }
    }

    k8sAppsApi = appsApi;
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
    mode = 'disabled';
    console.log('K8s features are disabled');
  }

  function ensureClient() {
    if (!k8sAppsApi) {
      throw new Error('Kubernetes API unavailable');
    }
  }

  function isAvailable() {
    return Boolean(k8sAppsApi);
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

  return {
    init,
    isAvailable,
    getMode,
    readDeployment,
    scaleDeployment
  };
}

module.exports = { createKubernetesService };
