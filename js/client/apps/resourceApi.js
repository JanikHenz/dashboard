export async function patchContainerRequests({ namespace, deployment }, { cpuRequest, memoryRequest }) {
  const body = { namespace, deployment };
  if (cpuRequest !== undefined && cpuRequest !== null && cpuRequest !== '') {
    body.cpuRequest = cpuRequest;
  }
  if (memoryRequest !== undefined && memoryRequest !== null && memoryRequest !== '') {
    body.memoryRequest = memoryRequest;
  }
  const response = await fetch('/api/k8s/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.ok;
}
