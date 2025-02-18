// scrapers/cookieManager.js
import fs from 'fs';

export class CookieManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.cookieJar = {}; // { domain: [ cookieObj, ... ] }
    this.load();
  }

  load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.cookieJar = data;
      console.log(`Loaded cookies from ${this.filePath}`);
    } catch (err) {
      console.error('Failed to load cookies:', err);
    }
  }

  save() {
    if (!this.filePath) return;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cookieJar, null, 2), 'utf-8');
      console.log(`Cookies saved: ${this.filePath}`);
    } catch (err) {
      console.error('Failed to save cookies:', err);
    }
  }

  /**
   * Merges new cookies from a single domain
   */
  mergeCookies(domain, newCookies) {
    if (!this.cookieJar[domain]) {
      this.cookieJar[domain] = [];
    }
    // Overwrite or add new
    newCookies.forEach((nc) => {
      const idx = this.cookieJar[domain].findIndex((c) => c.name === nc.name && c.path === nc.path);
      if (idx >= 0) {
        this.cookieJar[domain][idx] = nc; // Update existing
      } else {
        this.cookieJar[domain].push(nc);
      }
    });
  }

  /**
   * Get cookies for a domain (fuzzy domain matching if needed)
   */
  getCookiesForDomain(domain) {
    return this.cookieJar[domain] || [];
  }
}
