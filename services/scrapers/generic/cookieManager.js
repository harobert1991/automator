// scrapers/cookieManager.js
import fs from 'fs/promises';
import path from 'path';

export class CookieManager {
  constructor(cookiesFile) {
    this.cookiesFile = cookiesFile;
  }

  async getAllCookies() {
    try {
      const data = await fs.readFile(this.cookiesFile, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading cookies file:', err.message);
      return [];
    }
  }

  async getCookiesForDomain(domain) {
    const allCookies = await this.getAllCookies();
    return allCookies.filter(cookie => cookie.domain === domain);
  }

  async saveCookies(cookies) {
    try {
      await fs.writeFile(
        this.cookiesFile,
        JSON.stringify(cookies, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Error saving cookies:', err.message);
    }
  }

  async updateCookies(newCookies) {
    try {
      const existingCookies = await this.getAllCookies();
      
      // Update or add new cookies
      for (const newCookie of newCookies) {
        const index = existingCookies.findIndex(
          c => c.name === newCookie.name && c.domain === newCookie.domain
        );
        
        if (index !== -1) {
          existingCookies[index] = newCookie;
        } else {
          existingCookies.push(newCookie);
        }
      }

      await this.saveCookies(existingCookies);
    } catch (err) {
      console.error('Error updating cookies:', err.message);
    }
  }
}
