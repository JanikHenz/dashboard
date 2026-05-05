function registerRoutes(app, services) {
  const {
    pcStatusService,
    powerService,
    appsService,
    kubernetesService,
    prometheusService
  } = services;

  app.get('/api/status', async (_req, res) => {
    const payload = await pcStatusService.getPayload();
    if (payload.error) {
      res.status(500).json(payload);
      return;
    }
    res.json(payload);
  });

  app.get('/api/press-button', async (_req, res) => {
    console.log('Jemand hat den Power-Button im Browser gedrückt!');
    const result = await powerService.pressButton();
    res.status(result.status).json(result.body);
  });

  app.get('/api/k8s/deployments', async (_req, res) => {
    if (!kubernetesService.isAvailable()) {
      res.status(503).json({ error: 'Kubernetes API nicht verfügbar' });
      return;
    }
    try {
      res.json(await appsService.getDeployments());
    } catch (error) {
      console.error('K8s API Fehler:', error);
      res.status(500).json({ error: 'Kubernetes API Fehler' });
    }
  });

  app.post('/api/k8s/scale', async (req, res) => {
    if (!kubernetesService.isAvailable()) {
      res.status(503).json({ error: 'Kubernetes API nicht verfügbar' });
      return;
    }

    const { namespace, deployment, replicas } = req.body;
    if (!namespace || !deployment || replicas === undefined) {
      res.status(400).json({ error: 'namespace, deployment und replicas erforderlich' });
      return;
    }

    try {
      res.json(await kubernetesService.scaleDeployment(namespace, deployment, replicas));
    } catch (error) {
      console.error('Scale Fehler:', error);
      res.status(500).json({ error: 'Scaling fehlgeschlagen' });
    }
  });

  app.get('/api/monitoring/overview', async (req, res) => {
    const payload = await prometheusService.getOverview(req.query.range, req.query.step);
    if (payload.error) {
      res.status(500).json({ error: payload.error });
      return;
    }
    res.json(payload);
  });

  app.get('/api/apps', (_req, res) => {
    try {
      res.json(appsService.getAppsList());
    } catch (error) {
      console.error('Fehler beim Lesen der apps.yml:', error);
      res.status(500).json([]);
    }
  });
}

module.exports = { registerRoutes };
