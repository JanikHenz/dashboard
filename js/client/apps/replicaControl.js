export function renderReplicaControl(elements, app, deployment) {
  if (!elements.appName || !elements.replicaCount || !elements.slider || !elements.sliderValue) return;

  elements.appName.textContent = app.name;
  if (!deployment) {
    elements.replicaCount.textContent = '-/-';
    elements.slider.disabled = true;
    elements.slider.value = 0;
    elements.sliderValue.textContent = '-';
    return;
  }

  const ready = deployment.readyReplicas || 0;
  const total = deployment.replicas || 0;
  elements.replicaCount.textContent = `${ready}/${total}`;
  elements.slider.disabled = false;
  elements.slider.value = total;
  elements.sliderValue.textContent = total;
}

export function renderNoSelection(elements) {
  if (!elements.appName || !elements.replicaCount || !elements.slider || !elements.sliderValue) return;
  elements.appName.textContent = 'No app selected';
  elements.replicaCount.textContent = '-/-';
  elements.slider.disabled = true;
  elements.slider.value = 0;
  elements.sliderValue.textContent = '-';
}

export function resetSliderToDeployment(elements, deployment) {
  if (!elements.slider || !elements.sliderValue || !deployment) return;
  const replicas = deployment.replicas || 0;
  elements.slider.value = replicas;
  elements.sliderValue.textContent = replicas;
}
