export async function scaleDeployment(app, replicas) {
  const response = await fetch('/api/k8s/scale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: app.namespace,
      deployment: app.deployment,
      replicas
    })
  });
  return response.ok;
}
