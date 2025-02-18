// scrapers/userAgentManager.js
import randomUseragent from 'random-useragent';

/**
 * Get a random user agent string using random-useragent package.
 * You can also filter by useragent criteria if needed.
 */
export function getRandomUserAgent() {
  // Optionally specify filters:
  // e.g., only desktop browsers, minimum Chrome version, etc.
  const userAgent = randomUseragent.getRandom(/* filter */);

  // Fallback to a default if none found
  if (!userAgent) {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  }
  return userAgent;
}
