// process5.js - LinkedIn Sales Navigator search

import { GenericFlexibleScraper, STEP_TYPES } from './generic/genericScraper.js';

import fs from 'fs/promises';
import path from 'path';

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

async function runProcess5(locations = ['Job étudiant', 'infirmier']) {
  const scraper = new GenericFlexibleScraper({
    headless: false,
    chromeConfig: {
      findAutomatically: false,
      path: getChromePath(),
      args: [
        // '--remote-debugging-port=9222',
        // '--start-maximized',
        // '--disable-blink-features=AutomationControlled',
        // '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-features=AutomationControlled',
        // '--no-sandbox',
        // '--disable-setuid-sandbox'
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    },
  });

  const allResults = {};
  const outputPath = path.join(process.cwd(), 'results', 'linkedin_ceos.json');

  try {
    // Initialize with no specific domain
    await scraper.initialize();

    // Initial steps to navigate and search for CEO
    const initialSteps = [
      {
        type: STEP_TYPES.CONFIGURE,
        concurrency: 1,
      },
      {
        type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
        duration: Math.floor(Math.random() * 2000) + 1000,
        minDelay: 100,
        maxDelay: 500,
      },
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.x.com',
        randomDelay: { min: 2000, max: 5000 },
      },
      {
        type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
        duration: 996,        // Move randomly for 3 seconds
        minDelay: 100,         // Min delay between movements
        maxDelay: 500,         // Max delay between movements
        margin: 100,           // Stay 100px away from edges
      },
      // Add random delay before navigation
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.linkedin.com/sales/search/people',
        randomDelay: { min: 2000, max: 5000 },
      },
      {
        type: STEP_TYPES.CLICK,
        selector: '#global-typeahead-search-input',
        randomDelay: { min: 1000, max: 2000 },
      },
      {
        type: STEP_TYPES.INSERT_DATA,
        selector: '#global-typeahead-search-input',
        text: '« Logistics » OR « Operations » OR « E-commerce » OR « supply chain » OR « delivery » ',
        randomDelay: { min: 1000, max: 2000 },
      },
      {
        type: STEP_TYPES.PRESS_ENTER,
        randomDelay: { min: 1000, max: 2000 },
      },
      {
        type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
        duration: 996,        // Move randomly for 3 seconds
        minDelay: 100,         // Min delay between movements
        maxDelay: 500,         // Max delay between movements
        margin: 100,           // Stay 100px away from edges
      },
      
    ];

    await scraper.runSteps(initialSteps);

    // // Loop through each location
    for (const location of locations) {
      console.log(`\n🔍 Searching for Hires in ${location}...`);

      const locationSteps = [

        {
          type: STEP_TYPES.CLICK,
          xpath: '/html/body/main/div[1]/div[1]/div[2]/div[1]/form/div/div[4]/fieldset[1]/div/fieldset[1]/div[2]/button',
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.CLICK,
          xpath: '/html/body/main/div[1]/div[1]/div[2]/div[1]/form/div/div[4]/fieldset[1]/div/fieldset[1]/div[3]/div[1]/div[1]/div/input',
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.INSERT_DATA,
          selector: '/html/body/main/div[1]/div[1]/div[2]/div[1]/form/div/div[4]/fieldset[1]/div/fieldset[1]/div[3]/div[1]/div[1]/div/input',
          text: location,
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.CLICK,
          xpath: '/html/body/main/div[1]/div[1]/div[2]/div[1]/form/div/div[4]/fieldset[1]/div/fieldset[1]/div[3]/div[1]/ul/div/div[2]/li[1]/div',
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
          duration: 996,        // Move randomly for 3 seconds
          minDelay: 100,         // Min delay between movements
          maxDelay: 500,         // Max delay between movements
          margin: 100,           // Stay 100px away from edges
        },
        {
          type: STEP_TYPES.STEP_OUT_WINDOW,
          duration: { min: 3000, max: 5000 },  // Will also add ±10% to the selected duration
        },
        {
          type: STEP_TYPES.LIST_LOOP,
          listXPath: '/html/body/main/div[1]/div[2]/div[2]/div[2]/ol',
          itemXPath: '/li',
          stepsPerItem: [
            {
              type: STEP_TYPES.EXTRACT,
              extracts: [
                {
                  variableName: 'fullData',
                  selector: 'div',
                  attribute: 'innerHtml'
                }
              ]
            },
            {
              type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
              duration: 447,        // Move randomly for 3 seconds
              minDelay: 100,         // Min delay between movements
              maxDelay: 500,         // Max delay between movements
              margin: 100,           // Stay 100px away from edges
            },
          ]
        },
        

        {
          type: STEP_TYPES.CLICK,
          xpath: '/html/body/div[8]/div[1]/div[1]/button/svg/path',
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
          duration: 996,        // Move randomly for 3 seconds
          minDelay: 100,         // Min delay between movements
          maxDelay: 500,         // Max delay between movements
          margin: 100,           // Stay 100px away from edges
        },
      ];

      const locationResults = await scraper.runSteps(locationSteps);
      
      // Save raw results to debug file
      const debugPath = path.join(process.cwd(), 'results', 'debug_raw_results.json');
      try {
        // Create or append to the debug file
        const debugData = {
          timestamp: new Date().toISOString(),
          location,
          rawResults: locationResults
        };

        // Ensure directory exists
        await fs.mkdir(path.dirname(debugPath), { recursive: true });

        // Read existing debug data if file exists
        let existingDebug = [];
        try {
          const existing = await fs.readFile(debugPath, 'utf8');
          existingDebug = JSON.parse(existing);
        } catch (e) {
          // File doesn't exist or is invalid, start fresh
        }

        // Add new debug data and write back
        existingDebug.push(debugData);
        await fs.writeFile(
          debugPath,
          JSON.stringify(existingDebug, null, 2),
          'utf8'
        );
        console.log(`\n🔍 Raw results saved to: ${debugPath}`);
      } catch (debugErr) {
        console.error('Failed to save debug data:', debugErr.message);
      }

      console.log('\nDebug - Location Results:', {
        hasResults: !!locationResults,
        length: locationResults?.length,
        lastItem: locationResults?.[locationResults?.length - 1]
      });

      if (locationResults?.length > 0) {
        // Get the LIST_LOOP results
        const listResults = Array.isArray(locationResults[locationResults.length - 1]) 
          ? locationResults[locationResults.length - 1]  // If it's nested array
          : locationResults;  // If it's direct array of results

        console.log('\nDebug - List Results:', {
          type: typeof listResults,
          isArray: Array.isArray(listResults),
          value: listResults
        });

        if (Array.isArray(listResults)) {
          allResults[location] = listResults.map((item, index) => ({
            [`item${index + 1}`]: {
              profileInfo: item.EXTRACT.profileInfo
            }
          }));
          console.log(`✅ Found ${allResults[location].length} results for ${location}`);
        } else {
          console.log('⚠️ Invalid results format - expected array but got:', typeof listResults);
          allResults[location] = [];
        }
      } else {
        console.log('⚠️ No results found for location:', location);
        allResults[location] = [];
      }

      // Random delay between locations
      await new Promise(resolve => setTimeout(resolve, 
        Math.floor(Math.random() * 3000) + 2000
      ));
    }

    // Ensure results directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write results to file
    await fs.writeFile(
      outputPath,
      JSON.stringify(allResults, null, 2),
      'utf8'
    );

    console.log('\n📊 Search complete! Results summary:');
    for (const [location, results] of Object.entries(allResults)) {
      console.log(`${location}: ${results.length} profiles found`);
    }
    console.log(`\n💾 Results saved to: ${outputPath}`);

    return allResults;
    await new Promise(() => {});
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    
    // Try to save partial results if we have any
    if (Object.keys(allResults).length > 0) {
      try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(
          outputPath,
          JSON.stringify(allResults, null, 2),
          'utf8'
        );
        console.log(`\n💾 Partial results saved to: ${outputPath}`);
      } catch (writeErr) {
        console.error('Failed to save partial results:', writeErr.message);
      }
    }
    
  } finally {
    await scraper.close();
  }
}

export default runProcess5; 