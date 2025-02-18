// process1_extract.js

import { GenericFlexibleScraper, STEP_TYPES } from './generic/genericScraper.js';

async function runProcess1() {
  const scraper = new GenericFlexibleScraper({
    maxConcurrent: 5,
    minTime: 200,
    headless: 'new',
    
    // Simple configuration - just specify the path
    chromePath: '/custom/path/to/chrome',

    // OR use detailed configuration
    chromeConfig: {
      findAutomatically: true,           // Search for Chrome installation
      path: '/custom/path/to/chrome',    // Optional specific path
      userDataDir: '/path/to/profile',   // Use specific Chrome profile
      defaultArgs: true,                 // Use Puppeteer's default arguments
    },
  });
  try {
    await scraper.initialize('new'); // or true/false for headless
    // define steps
    const steps = [
      {
        type: STEP_TYPES.CONFIGURE,
        concurrency: 5,
        blockedResources: ['image','stylesheet','font','media','script'],
        outputFileName: 'newsItems_part1.jsonl',
        randomDelay: { min: 200, max: 500 },
      },
      {
        type: STEP_TYPES.BLOCK_RESOURCES,
        randomDelay: { min: 500, max: 1000 },
      },
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.juniorminingnetwork.com/mining-topics/',
        randomDelay: { min: 1000, max: 2000 },
      },
      {
        type: STEP_TYPES.WAIT_FOR_SELECTOR,
        selector: '.news-item',
        randomDelay: { min: 500, max: 1000 },
      },
      {
        type: STEP_TYPES.EXTRACT,
        randomDelay: { min: 1000, max: 1500 },
        extracts: [
            {
                variableName: 'date',
                selector: '.article-date',
                attribute: 'innerText',
                multiple: false
            },
            {
                variableName: 'title',
                selector: '.article-title',
                attribute: 'innerText',
                multiple: false
            },
            {
                variableName: 'link',
                selector: '.article-title > a',
                attribute: 'href',
                multiple: false
            }
        ]
      },
      {
        type: STEP_TYPES.DISABLE_REQUEST_INTERCEPTION,
        randomDelay: { min: 500, max: 1000 },
      }
    ];

    // run steps
    await scraper.runSteps(steps);
    console.log('Process 1 completed.');
  } catch (err) {
    console.error('Process 1 error:', err);
  } finally {
    await scraper.close();
  }
}

runProcess1().catch(console.error);
