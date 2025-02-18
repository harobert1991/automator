// scrapers/proxyPool.js
import axios from 'axios';

export class ProxyPool {
  /**
   * @param {string[]} proxyList - Array of proxy URLs
   * @param {number} revalidateIntervalMs - Interval for revalidation checks
   * @param {string} healthCheckUrl - A known URL to test proxy connectivity
   */
  constructor(proxyList = [], revalidateIntervalMs = 60_000, healthCheckUrl = 'https://ipinfo.io/json') {
    // Each proxy is { url, isHealthy, lastFailedAt }
    this.proxies = proxyList.map((url) => ({
      url,
      isHealthy: true,
      lastFailedAt: null,
    }));

    this.currentIndex = 0;
    this.revalidateIntervalMs = revalidateIntervalMs;
    this.healthCheckUrl = healthCheckUrl;

    if (this.revalidateIntervalMs > 0) {
      this.startRevalidationTimer();
    }
  }

  startRevalidationTimer() {
    setInterval(async () => {
      const now = Date.now();
      for (const proxyObj of this.proxies) {
        if (!proxyObj.isHealthy && proxyObj.lastFailedAt) {
          // E.g., require at least 30 seconds since last failure
          if ((now - proxyObj.lastFailedAt) >= this.revalidateIntervalMs) {
            const revalidated = await this.testProxy(proxyObj.url);
            if (revalidated) {
              proxyObj.isHealthy = true;
              proxyObj.lastFailedAt = null;
              console.info(`Proxy re-enabled after successful test: ${proxyObj.url}`);
            }
          }
        }
      }
    }, this.revalidateIntervalMs);
  }

  /**
   * Test the proxy by making a quick request to the healthCheckUrl.
   * If it succeeds, we consider the proxy healthy again.
   */
  async testProxy(proxyUrl) {
    try {
      const response = await axios.get(this.healthCheckUrl, {
        proxy: {
          host: this.parseHost(proxyUrl),
          port: this.parsePort(proxyUrl),
          protocol: this.parseProtocol(proxyUrl),
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (err) {
      return false;
    }
  }

  parseHost(proxyUrl) {
    // Simple example parse: "http://user:pass@host:port"
    // Real parsing might use the "url" module
    const urlWithoutProtocol = proxyUrl.replace(/^https?:\/\//, '');
    const [hostPort] = urlWithoutProtocol.split('@').pop().split('/');
    const [host] = hostPort.split(':');
    return host;
  }

  parsePort(proxyUrl) {
    const urlWithoutProtocol = proxyUrl.replace(/^https?:\/\//, '');
    const [hostPort] = urlWithoutProtocol.split('@').pop().split('/');
    const parts = hostPort.split(':');
    return parts[1] || '80';
  }

  parseProtocol(proxyUrl) {
    if (proxyUrl.startsWith('https://')) return 'https';
    return 'http';
  }

  getNextProxy() {
    if (!this.proxies.length) return null;
    const startIndex = this.currentIndex;
    do {
      const proxyObj = this.proxies[this.currentIndex];
      if (proxyObj.isHealthy) {
        const chosen = proxyObj.url;
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return chosen;
      }
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    } while (this.currentIndex !== startIndex);
    return null;
  }

  markUnhealthy(proxyUrl) {
    const found = this.proxies.find((p) => p.url === proxyUrl);
    if (found) {
      found.isHealthy = false;
      found.lastFailedAt = Date.now();
      console.warn(`Proxy marked unhealthy: ${proxyUrl}`);
    }
  }

  markHealthy(proxyUrl) {
    const found = this.proxies.find((p) => p.url === proxyUrl);
    if (found && !found.isHealthy) {
      found.isHealthy = true;
      found.lastFailedAt = null;
      console.info(`Proxy re-enabled manually: ${proxyUrl}`);
    }
  }
}
