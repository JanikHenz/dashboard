# Dashboard

Eine selbst gehostete Web-Oberfläche als zentrales Homelab-Dashboard. Entwickelt mit purem HTML, CSS und JavaScript – kein Framework, kein Build-Step.

## Features

- 7-Segment-Display Timer
- App-Karten für Homelab-Services
- Dark/Light Mode Toggle
- Monitoring-Ansicht

## Homelab-Integration

Dieses Dashboard wird im [JanikHenz/my-homelab](https://github.com/JanikHenz/my-homelab) Kubernetes-Cluster betrieben:

- **Node:** Raspberry Pi
- **URL:** `http://raspberrypi:30080`
- **Deployment:** via ArgoCD (GitOps)

### Deployment-Flow

```
Push to main
    → GitHub Actions baut Docker Image (linux/arm64)
    → Image wird zu ghcr.io/janikhenz/dashboard:latest gepusht
    → ArgoCD synct das my-homelab Repo
    → nginx Pod auf Raspberry Pi wird aktualisiert
```

## Struktur

```
dashboard/
├── index.html
├── Dockerfile
├── css/
│   ├── style.css
│   ├── monitoring.css
│   ├── timer.css
│   └── mode.css
└── js/
    └── script.js
```

## TODO

- Figma Design
- Infos der deployten Applikationen anzeigen
- Kubernetes Monitoring implementieren

NOHC IN BEARBEITUNG...
