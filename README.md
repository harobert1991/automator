# Web Scraping System

A flexible web scraping system built with Puppeteer that executes scraping steps sequentially.

## Key Components

- `genericScraper.js`: Core scraping engine that executes steps in sequence
- `process1.js`: Example scraper for mining news articles
- `process2.js`: Example scraper with article content fetching

## Important Considerations

### Rate Limiting
- Configure `minTime` between requests
- Consider `randomDelay` for more natural behavior

```javascript
const scraper = new GenericFlexibleScraper({
  minTime: 1000, // 1 second between requests
});
```

### Resource Management
- Block unnecessary resources to improve performance:
```javascript
{
  type: STEP_TYPES.CONFIGURE,
  blockedResources: ['image', 'stylesheet', 'font'],
}
```

### Error Handling
- Each step is executed sequentially
- Clear error reporting per step
- Automatic retry logic for failed requests

## Example Usage

```javascript
const steps = [
  {
    type: STEP_TYPES.CONFIGURE,
    concurrency: 3,
    blockedResources: ['image', 'stylesheet', 'font'],
  },
  {
    type: STEP_TYPES.READ_JSONL,
    inputFile: 'input.jsonl',
  },
  {
    type: STEP_TYPES.FETCH_AND_MERGE,
    outputFile: 'output.jsonl',
    delayConfig: {
      minDelay: 2000,
      maxDelay: 5000
    }
  }
];

const scraper = new GenericFlexibleScraper();
await scraper.runSteps(steps);
```

## Best Practices

1. **Use Random Delays**: Add randomization to appear more human-like
2. **Monitor Resources**: Watch memory usage during long runs
3. **Error Recovery**: Implement retry logic for failed requests
4. **Resource Blocking**: Block unnecessary resources for better performance

## File Structure

```
services/
├── scrapers/
│   ├── generic/
│   │   └── genericScraper.js    # Core scraping engine
│   ├── process1.js              # Mining news scraper
│   └── process2.js              # Article content scraper
```

## Dependencies

- Puppeteer: Web scraping and browser automation
- p-limit: Concurrency control
- Bottleneck: Rate limiting