// process4.js - Test mouse movement in new tab

import { GenericFlexibleScraper, STEP_TYPES } from './generic/genericScraper.js';
import path from 'path';
import os from 'os';

// Get Chrome path based on platform
function getChromePath() {
  switch (process.platform) {
    case 'darwin': // macOS
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32': // Windows
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    default: // Linux
      return '/usr/bin/google-chrome';
  }
}

async function runProcess4() {
  console.log('Checking for Chrome with remote debugging...');
  
  const scraper = new GenericFlexibleScraper({
    headless: false,
    chromeConfig: {
      findAutomatically: false,
      path: getChromePath(),
      args: [
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        // '--window-size=1920,1080',
        '--start-maximized',
        '--disable-extensions',
        '--disable-plugins-discovery',
        '--disable-blink-features',
        '--disable-infobars',
      ],
    },
  });

  try {
    console.log('Attempting to connect to Chrome...');
    console.log('Make sure Chrome is running with remote debugging:');
    console.log(`"${getChromePath()}" --remote-debugging-port=9222`);
    
    await scraper.initialize();

    const steps = [
      {
        type: STEP_TYPES.CONFIGURE,
        concurrency: 1,
      },
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.juniorminingnetwork.com/junior-miner-news',
        randomDelay: { min: 2000, max: 5000 },
      },
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.colruyt.be/fr/producten?searchTerm=legume&o=homepage&suggestion=none&type=product&method=user+typed&page=1',
        randomDelay: { min: 4000, max: 10000 },
      },
      // {
      //   type: STEP_TYPES.REFRESH_PAGE,
      //   waitUntil: 'networkidle2',
      //   timeout: 30000,
      //   randomDelay: {
      //     min: 1000,
      //     max: 3000
      //   }
      // },
      // {
      //   type: STEP_TYPES.DEBUG_MOUSE,
      //   enabled: true,
      //   startPosition: { x: 200, y: 200 },
      //   rectangleColor: 'rgba(0, 255, 0, 0.3)',
      // },
      // Add random mouse movements
      {
        type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
        duration: 3000,        // Move randomly for 3 seconds
        minDelay: 100,         // Min delay between movements
        maxDelay: 500,         // Max delay between movements
        margin: 100,           // Stay 100px away from edges
      },
      // // Click the search box
      // {
      //   type: STEP_TYPES.STEP_OUT_WINDOW,
      //   duration: { min: 3000, max: 8000 },  // Stay "outside" for 3-8 seconds
      //   moveBackDelay: { min: 500, max: 1500 }  // Wait 0.5-1.5s before moving mouse back
      // },
      {
        type: STEP_TYPES.LIST_LOOP,
        listXPath: '/html/body/div[2]/main/div/div[6]/div/div/div/div[1]/div[1]/div/div[5]/div/div[2]/div[2]/div/div',
        itemXPath: '/a',
        stepsPerItem: [
          {
            type: STEP_TYPES.EXTRACT,
            extracts: [
              {
                variableName: 'productName',
                xpath: '/html/body/div[2]/main/div/div[6]/div/div/div/div[1]/div[1]/div/div[5]/div/div[2]/div[2]/div/div/a[1]/div[3]/div[1]/p[1]',
                attribute: 'innerText'
              }
            ]
          },
          {
            type: STEP_TYPES.CLICK,
            xpath: '/html/body/div[2]/main/div/div[6]/div/div/div/div[1]/div[1]/div/div[5]/div/div[2]/div[2]/div/div/a[1]/div[3]/div[2]/div[2]/button[2]',
            waitForNav: false
          }
        ],
        mouseMovement: {
          enabled: true,
          hoverTime: { min: 300, max: 1000 }
        },
        randomDelay: { min: 800, max: 2000 }
      },
    ];

    const results = await scraper.runSteps(steps);
    
    if (results && results.length > 0) {
      console.log('\n✅ Successfully completed steps with results:', results);
    } else {
      console.log('\nℹ️  Process completed without results');
    }

    console.log('\n⌛ Waiting for manual close. Press Ctrl+C to close tab.');
    await new Promise(() => {});

  } catch (err) {
    if (err.message.includes('debuggable')) {
      console.log('\n❌ Chrome Connection Error:');
      console.log('1. Close all Chrome windows');
      console.log('2. Open Chrome with remote debugging:');
      console.log(`"${getChromePath()}" --remote-debugging-port=9222`);
      console.log('3. Run this script again');
    } else {
      console.error('\n❌ Unexpected error:', err.message);
    }
  } finally {
    await scraper.close();
  }
}

// runProcess4().catch(console.error); 

export default runProcess4;