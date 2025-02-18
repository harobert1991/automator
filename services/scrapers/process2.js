import { GenericFlexibleScraper, STEP_TYPES } from "./generic/genericScraper.js"

async function runProcess2() {
  const scraper = new GenericFlexibleScraper({
    // Global scraper config options
    maxConcurrent: 2,
    minTime: 1000, // minimum time between tasks in ms
    headless: 'new'
  });

  const steps = [
    {
      type: STEP_TYPES.CONFIGURE,
      concurrency: 3,  // Reduced concurrency to be gentler on the server
      blockedResources: ['image', 'stylesheet', 'font'], // Optional: block unnecessary resources
      cookiesFile: 'cookies.json',
      domain: 'www.juniorminingnetwork.com',
      headless: false,
    },
    {
      type: STEP_TYPES.READ_JSONL,
      inputFile: 'newsItems_part1_filtered_2.jsonl',
    },
    {
      type: STEP_TYPES.FETCH_AND_MERGE,
      outputFile: 'output2.jsonl',
      contentSelector: 'article',
      // New delay configuration
      delayConfig: {
        minDelay: 2000,    // 2 seconds minimum between requests
        maxDelay: 5000     // 5 seconds maximum between requests
      },
      // Retry configuration
      retryConfig: {
        maxRetries: 3,          // Number of retry attempts
        initialDelay: 1000,     // Initial delay in ms
        maxDelay: 10000,        // Maximum delay in ms
        backoff: 2,             // Exponential backoff multiplier
      }
    }
  ];

  try {
    await scraper.runSteps(steps);
  } catch (error) {
    console.error('Error running scraper:', error);
  } finally {
    await scraper.close();
  }
}

// runProcess2().catch(console.error);
export default runProcess2;