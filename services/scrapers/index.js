// index.js

import { GenericScraper, STEP_TYPES } from './scrapers/genericScraper.js';

const sampleTask = {
  url: 'https://example.com/login',
  steps: [
    {
      type: STEP_TYPES.CLICK,
      selector: '#login-button',
      waitForNav: true,
    },
    {
      type: STEP_TYPES.DETECT_CAPTCHA,
    },
    {
      type: STEP_TYPES.EXTRACT,
      selector: '.profile-info',
    },
  ],
};

async function main() {
  const proxyList = [
    // 'http://user:pass@proxy1.example.com:8080',
    // ...
  ];

  // Provide your 2Captcha API key via twoCaptchaApiKey if you want auto-solve
  const scraper = new GenericScraper({
    proxyList,
    maxConcurrent: 2,
    minTime: 250,
    headless: false,
    cookiesFile: './cookies.json',
    proxyRevalidateMs: 30_000,  // re-check proxies every 30s
    healthCheckUrl: 'https://example.com/ping',  // or ipinfo.io/json
    twoCaptchaApiKey: process.env.TWO_CAPTCHA_API_KEY || '',
  });

  const tasks = [sampleTask];

  try {
    const results = await scraper.runTasks(tasks);
    console.log('Scraping results:', results);
  } catch (err) {
    console.error('Error running tasks:', err);
  }
}

main();
