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

async function runProcess3() {
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
        url: 'https://www.x.com',
        randomDelay: { min: 4000, max: 10000 },
      },
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
      // Click the search box
      // {
      //   type: STEP_TYPES.INSERT_DATA_IN_SEARCH_BAR,
      //   xpath: '/html/body/div[1]/div/div/div[2]/main/div/div/div/div[2]/div/div[2]/div/div/div/div/div[1]/div/div/div/form/div[1]/div/div/div/div/div[2]/div/input',
      //   text: '@Contrarian888',
      //   clickDelay: { min: 1000, max: 3000 },
      //   charDelay: { min: 50, max: 250 },
      //   pauseDelay: { min: 0, max: 200 },
      //   enterDelay: { min: 100, max: 300 },
      //   enterHoldDuration: { min: 50, max: 150 },
      //   humanize: true
      // },
      // // More random movements
      // // {
      // //   type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
      // //   duration: 2000,  // 2 seconds of random movement
      // // }
      // // Click search button
      // {
      //   type: STEP_TYPES.STEP_OUT_WINDOW,
      //   duration: { min: 3000, max: 8000 },  // Stay "outside" for 3-8 seconds
      //   moveBackDelay: { min: 500, max: 1500 }  // Wait 0.5-1.5s before moving mouse back
      // },
      // {
      //   type: STEP_TYPES.HUMAN_LIKE_TEXT_EXTRACTION,
      //   xpath: '//div[@class="tweet-text"]',
      //   moveDelay: { min: 800, max: 2000 },
      //   holdDelay: { min: 150, max: 400 },
      //   dragSpeed: { min: 300, max: 1000 },
      //   copyDelay: { min: 200, max: 500 },
      //   humanize: true
      // },
    ];

    await scraper.runSteps(steps);

    console.log('Test completed in new tab. Press Ctrl+C to close tab.');
    await new Promise(() => {});

  } catch (err) {
    console.error('Process 4 error:', err.message);
    if (err.message.includes('debuggable')) {
      console.log('\nTo fix this:');
      console.log('1. Close all Chrome windows');
      console.log('2. Open Chrome with remote debugging:');
      console.log(`"${getChromePath()}" --remote-debugging-port=9222`);
      console.log('3. Run this script again');
    }
  } finally {
    await scraper.close();
  }
}

// runProcess4().catch(console.error); 

export default runProcess3;