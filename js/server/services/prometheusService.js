function createPrometheusService({ pcIp, fallbackUrls }) {
  function parseRangeSeconds(rangeParam) {
    if (!rangeParam) return 3600;
    const match = String(rangeParam).trim().match(/^(\d+)([smhd])$/i);
    if (!match) return 3600;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return Math.max(60, value * multipliers[unit]);
  }

  async function queryRange(query, start, end, step) {
    const params = new URLSearchParams({
      query,
      start: String(start),
      end: String(end),
      step: String(step)
    });
    let lastError = null;

    for (const baseUrl of fallbackUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/query_range?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Prometheus HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (payload.status !== 'success') {
          throw new Error(payload.error || 'Prometheus query failed');
        }
        return payload.data?.result || [];
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Prometheus unavailable');
  }

  async function queryInstant(query) {
    const params = new URLSearchParams({ query });
    let lastError = null;

    for (const baseUrl of fallbackUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/query?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Prometheus HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (payload.status !== 'success') {
          throw new Error(payload.error || 'Prometheus query failed');
        }
        return payload.data?.result || [];
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Prometheus unavailable');
  }

  async function resolvePcUptimeMs() {
    const uptimeQueries = [
      `max((node_time_seconds{instance=~"${pcIp}(:\\\\d+)?"} - node_boot_time_seconds{instance=~"${pcIp}(:\\\\d+)?"}))`,
      'max(node_time_seconds - node_boot_time_seconds)'
    ];

    for (const query of uptimeQueries) {
      try {
        const result = await queryInstant(query);
        const raw = result?.[0]?.value?.[1];
        const seconds = Number(raw);
        if (Number.isFinite(seconds) && seconds > 0) {
          return Math.round(seconds * 1000);
        }
      } catch (_error) {
      }
    }

    return 0;
  }

  function flattenSeries(result) {
    const points = new Map();
    result.forEach((series) => {
      (series.values || []).forEach(([ts, value]) => {
        const timestamp = Number(ts) * 1000;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          points.set(timestamp, numeric);
        }
      });
    });
    return Array.from(points.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, value]) => ({ timestamp, value: Number(value.toFixed(2)) }));
  }

  async function getOverview(rangeParam, stepParam) {
    try {
      const rangeSeconds = parseRangeSeconds(rangeParam || '1h');
      const step = Math.max(15, Number(stepParam) || 30);
      const end = Math.floor(Date.now() / 1000);
      const start = end - rangeSeconds;

      const queries = {
        cpu: '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
        memory: '100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))',
        networkRx: 'sum(rate(node_network_receive_bytes_total{device!~"lo"}[5m])) * 8 / 1000000',
        gpu: 'avg(DCGM_FI_DEV_GPU_UTIL) or avg(nvidia_smi_utilization_gpu_ratio) * 100 or avg(nvidia_gpu_duty_cycle)',
        gpuTemp: 'max(DCGM_FI_DEV_GPU_TEMP) or max(nvidia_smi_temperature_gpu)',
        powerW: 'sum(DCGM_FI_DEV_POWER_USAGE) or sum(rate(node_rapl_package_joules_total[5m]))',
        diskFree: '100 * (sum(node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) / sum(node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}))',
        nodesUp: 'count(up{job="node-exporter"} == 1)'
      };

      const settled = await Promise.allSettled(
        Object.entries(queries).map(async ([key, promql]) => [key, flattenSeries(await queryRange(promql, start, end, step))])
      );

      const entries = Object.keys(queries).map((key, idx) => {
        const outcome = settled[idx];
        if (outcome.status === 'fulfilled') return outcome.value;
        console.warn(`Prometheus Query ${key} failed:`, outcome.reason?.message);
        return [key, []];
      });

      return {
        start: start * 1000,
        end: end * 1000,
        step,
        series: Object.fromEntries(entries),
        units: {
          cpu: '%',
          memory: '%',
          networkRx: 'Mbit/s',
          gpu: '%',
          gpuTemp: '°C',
          powerW: 'W',
          diskFree: '%',
          nodesUp: ''
        }
      };
    } catch (error) {
      console.error('Monitoring API error:', error.message);
      return { error: 'Monitoring data could not be loaded' };
    }
  }

  return {
    getOverview,
    resolvePcUptimeMs
  };
}

module.exports = { createPrometheusService };
