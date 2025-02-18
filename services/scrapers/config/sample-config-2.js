// configs/sample-config-2.js

/**
 * This config doesn’t define steps but uses a "customFunction" 
 * to do more advanced scraping logic within a single function.
 */
export const sampleConfig2 = {
    customFunction: async (page, browser, task) => {
      // Example: navigate to a page, fill a form, etc.
      await page.goto('https://news.ycombinator.com/', { waitUntil: 'networkidle2' });
  
      // Let's collect all the story titles
      const titles = await page.$$eval('.storylink', (links) => links.map((l) => l.textContent.trim()));
  
      // Potentially do more complex interactions
      // ...
  
      // Return the data
      return titles;
    },
  };
  