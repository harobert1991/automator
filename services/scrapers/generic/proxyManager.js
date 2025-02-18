// scrapers/proxyManager.js

const proxyList = [
    // "http://user:pass@proxy1.example.com:8080",
    // "http://user:pass@proxy2.example.com:8080",
    // Add more as needed or load from a file/API
  ];
  
  export function getRandomProxy() {
    if (!proxyList.length) return null; // No proxies configured
    const index = Math.floor(Math.random() * proxyList.length);
    return proxyList[index];
  }
  