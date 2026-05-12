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
    console.log('Power button triggered from browser!');
    const result = await powerService.pressButton();
    res.status(result.status).json(result.body);
  });

  app.post('/api/hard-shutdown', async (_req, res) => {
    console.log('Hard shutdown triggered from safety switch!');
    const result = await powerService.hardShutdown();
    res.status(result.status).json(result.body);
  });

  app.get('/api/k8s/deployments', async (_req, res) => {
    if (!kubernetesService.isAvailable()) {
      res.status(503).json({ error: 'Kubernetes API unavailable' });
      return;
    }
    try {
      res.json(await appsService.getDeployments());
    } catch (error) {
      console.error('K8s API error:', error);
      res.status(500).json({ error: 'Kubernetes API error' });
    }
  });

  app.post('/api/k8s/scale', async (req, res) => {
    if (!kubernetesService.isAvailable()) {
      res.status(503).json({ error: 'Kubernetes API unavailable' });
      return;
    }

    const { namespace, deployment, replicas } = req.body;
    if (!namespace || !deployment || replicas === undefined) {
      res.status(400).json({ error: 'namespace, deployment and replicas are required' });
      return;
    }

    try {
      res.json(await kubernetesService.scaleDeployment(namespace, deployment, replicas));
    } catch (error) {
      console.error('Scale error:', error);
      res.status(500).json({ error: 'Scaling failed' });
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
      console.error('Error reading apps.yml:', error);
      res.status(500).json([]);
    }
  });
}

module.exports = { registerRoutes };
