// process5.js - LinkedIn Sales Navigator search

import { GenericFlexibleScraper, STEP_TYPES } from './generic/genericScraper.js';
import { getChromePath } from './utils.js';
import fs from 'fs/promises';
import path from 'path';

async function runProcess5(locations = ['France', 'Spain', 'Italy']) {
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
        '--start-maximized',
        '--disable-extensions',
        '--disable-plugins-discovery',
        '--disable-blink-features',
        '--disable-infobars',
      ],
    },
  });

  const allResults = {};
  const outputPath = path.join(process.cwd(), 'results', 'linkedin_ceos.json');

  try {
    await scraper.initialize();

    // Initial steps to navigate and search for CEO
    const initialSteps = [
      {
        type: STEP_TYPES.CONFIGURE,
        concurrency: 1,
      },
      {
        type: STEP_TYPES.NAVIGATE,
        url: 'https://www.linkedin.com/sales/search/people',
        randomDelay: { min: 4000, max: 8000 },
      },
      {
        type: STEP_TYPES.INSERT_DATA,
        selector: '#global-typeahead-search-input',
        text: 'CEO',
        randomDelay: { min: 1000, max: 2000 },
      },
      {
        type: STEP_TYPES.PRESS_ENTER,
        randomDelay: { min: 1000, max: 2000 },
      }
    ];

    await scraper.runSteps(initialSteps);

    // Loop through each location
    for (const location of locations) {
      console.log(`\n🔍 Searching for CEOs in ${location}...`);

      const locationSteps = [
        {
          type: STEP_TYPES.CLICK,
          selector: '#search-filter-panel-st53 > div.flex.flex-column.full-height.overflow-hidden > div.flex.flex-column.full-height.overflow-hidden > form > div > div.flex-1._column_c69tab > fieldset:nth-child(1) > div > fieldset:nth-child(1) > div > button > li-icon',
          randomDelay: { min: 2000, max: 4000 },
        },
        {
          type: STEP_TYPES.INSERT_DATA,
          selector: '#ember485 > div > input',
          text: location,
          randomDelay: { min: 1000, max: 2000 },
        },
        {
          type: STEP_TYPES.LIST_LOOP,
          listSelector: '#search-results-container > div.relative > ol',
          itemSelector: 'li',
          stepsPerItem: [
            {
              type: STEP_TYPES.EXTRACT,
              extracts: [
                {
                  variableName: 'profileInfo',
                  selector: 'div > div > div.flex.justify-space-between.full-width > div.flex.flex-column',
                  attribute: 'innerText'
                }
              ]
            }
          ],
          mouseMovement: {
            enabled: true,
            hoverTime: { min: 500, max: 1500 }
          },
          randomDelay: { min: 1000, max: 3000 }
        }
      ];

      const locationResults = await scraper.runSteps(locationSteps);
      
      if (locationResults && locationResults.length > 0) {
        // Structure the results for this location
        allResults[location] = locationResults[locationResults.length - 1].map((item, index) => ({
          [`item${index + 1}`]: {
            profileInfo: item.profileInfo
          }
        }));
        console.log(`✅ Found ${allResults[location].length} results for ${location}`);
      } else {
        allResults[location] = [];
        console.log(`⚠️ No results found for ${location}`);
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
    
    return allResults;
  } finally {
    await scraper.close();
  }
}

export default runProcess5; 