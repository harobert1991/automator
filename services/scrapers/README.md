# Scraper Documentation

This directory contains flexible scraping tools with various step types for web automation.

## Step Types

### CONFIGURE
The CONFIGURE step is used to set up basic scraper settings and configurations. This step should typically be one of the first steps in your scraping process.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| concurrency | number | 5 | Maximum number of concurrent operations |
| outputFileName | string | 'output.jsonl' | Path to the output JSONL file |
| blockedResources | string[] | [] | List of resource types to block (e.g., ['image', 'stylesheet']) |

#### Example Usage

{
type: STEP_TYPES.CONFIGURE,
concurrency: 3,
outputFileName: 'results.jsonl',
blockedResources: ['image', 'stylesheet', 'font']
}


#### Notes
- The `concurrency` setting affects parallel operations like batch processing
- `blockedResources` can improve performance by preventing unnecessary resource loading
- Valid blocked resource types: 
  - 'document'
  - 'stylesheet'
  - 'image'
  - 'media'
  - 'font'
  - 'script'
  - 'texttrack'
  - 'xhr'
  - 'fetch'
  - 'eventsource'
  - 'websocket'
  - 'manifest'
  - 'other'


  ### NAVIGATE
The NAVIGATE step is used to navigate to a specific URL with configurable delays and options.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| url | string | required | The URL to navigate to |
| randomDelay | object | { min: 100, max: 200 } | Random delay before navigation |
| waitUntil | string | 'networkidle2' | Navigation completion criteria |

#### Example Usage

{
type: STEP_TYPES.NAVIGATE,
url: 'https://example.com',
randomDelay: { min: 1000, max: 3000 },
waitUntil: 'networkidle2'
}

#### Notes
- `waitUntil` options: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'
- Random delays help simulate human-like behavior
- Navigation will wait for the specified condition before proceeding

### CLICK
The CLICK step simulates human-like clicking on elements with natural mouse movement.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| selector | string | null | CSS selector for the element |
| xpath | string | null | XPath selector for the element |
| waitForNav | boolean | false | Whether to wait for navigation after click |
| randomDelay | object | { min: 500, max: 1000 } | Random delay before clicking |

#### Example Usage

{
type: STEP_TYPES.CLICK,
xpath: '//button[contains(text(), "Submit")]',
waitForNav: true,
randomDelay: { min: 1000, max: 2000 }
}

#### Notes
- Either `selector` or `xpath` must be provided
- Includes human-like mouse movement to the element
- Automatically scrolls element into view if needed
- Shows debug rectangle if debug mode is enabled
- Calculates random click point within the element

### RANDOM_MOUSE_MOVEMENT
The RANDOM_MOUSE_MOVEMENT step simulates natural mouse movements across the page, creating human-like browsing patterns.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| duration | number | 5000 | Duration of random movements in milliseconds |
| minDelay | number | 100 | Minimum delay between movements |
| maxDelay | number | 500 | Maximum delay between movements |
| margin | number | 100 | Margin from page edges in pixels |

#### Example Usage

{
type: STEP_TYPES.RANDOM_MOUSE_MOVEMENT,
duration: 3000, // Move randomly for 3 seconds
minDelay: 100, // Min delay between movements
maxDelay: 500, // Max delay between movements
margin: 100, // Stay 100px away from edges
}

#### Notes
- Uses bezier curves for natural movement paths
- Maintains safe distance from page edges
- Varies movement speed randomly
- Includes subtle mouse acceleration/deceleration
- 70% chance of using bezier curves vs linear movement

### STEP_OUT_WINDOW
The STEP_OUT_WINDOW step simulates a user temporarily leaving the browser window, as if switching to another application.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| duration | object | { min: 2000, max: 10000 } | Time range to stay "outside" window |
| moveBackDelay | object | { min: 500, max: 2000 } | Delay before moving mouse back |

#### Example Usage

{
type: STEP_TYPES.STEP_OUT_WINDOW,
duration: { min: 3000, max: 8000 }, // Stay "outside" for 3-8 seconds
moveBackDelay: { min: 500, max: 1500 } // Wait 0.5-1.5s before moving back
}

#### Notes
- Always exits through the top edge of the window
- Triggers proper browser events (mouseleave, blur, focus)
- Returns at a different X position (at least 200px difference)
- Includes natural mouse movements when returning
- Simulates realistic window switching behavior

### PRESS_ENTER
The PRESS_ENTER step simulates a natural Enter key press with variable timing and pressure.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| delay | object | { min: 50, max: 200 } | Delay before pressing Enter |
| holdDuration | object | { min: 50, max: 150 } | How long to hold the key down |

#### Example Usage

"{
  type: STEP_TYPES.PRESS_ENTER,
  delay: { min: 100, max: 300 },  // Wait 100-300ms before pressing
  holdDuration: { min: 50, max: 150 }  // Hold key for 50-150ms
}"

#### Notes
- Simulates realistic key press timing
- Includes variable hold duration
- Triggers proper keyboard events
- Adds random delays before pressing
- Logs the actual hold duration

### DEBUG_MOUSE
The DEBUG_MOUSE step enables visual debugging of mouse movements and interactions.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| enabled | boolean | true | Whether to enable mouse debugging |
| startPosition | object | { x: 200, y: 200 } | Initial mouse position |
| cursorColor | string | 'red' | Color of the debug cursor |
| rectangleColor | string | 'rgba(0, 255, 0, 0.3)' | Color of target rectangles |

#### Example Usage

"{
  type: STEP_TYPES.DEBUG_MOUSE,
  enabled: true,
  startPosition: { x: 200, y: 200 },
  cursorColor: 'red',
  rectangleColor: 'rgba(0, 255, 0, 0.3)'
}"

#### Notes
- Shows a visible cursor during mouse movements
- Highlights target elements with rectangles
- Can be enabled/disabled during execution
- Useful for testing and verification
- No impact on actual browser cursor

### CUSTOM_FUNCTION
The CUSTOM_FUNCTION step allows execution of custom JavaScript code with full access to the Puppeteer page object.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| fn | function | required | Async function to execute |
| args | array | [] | Additional arguments to pass to the function |

#### Example Usage

"{
  type: STEP_TYPES.CUSTOM_FUNCTION,
  fn: async (page) => {
    const text = 'Hello World';
    for (const char of text) {
      const delay = Math.floor(Math.random() * 250) + 50;
      await page.keyboard.type(char, { delay });
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    }
  }
}"

#### Notes
- Function receives page object as first parameter
- Can access all Puppeteer page methods
- Supports async/await syntax
- Useful for complex interactions
- Can be used for custom validations

### DETECT_CAPTCHA
The DETECT_CAPTCHA step checks for and optionally solves CAPTCHA challenges.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| autoSolve | boolean | false | Whether to attempt automatic solving |
| provider | string | '2captcha' | CAPTCHA solving service to use |
| timeout | number | 30000 | Maximum time to wait for solution |
| retries | number | 3 | Number of solve attempts |

#### Example Usage

"{
  type: STEP_TYPES.DETECT_CAPTCHA,
  autoSolve: true,
  provider: '2captcha',
  timeout: 60000,
  retries: 5
}"

#### Notes
- Supports multiple CAPTCHA types
- Can detect reCAPTCHA and hCaptcha
- Requires API key for automatic solving
- Falls back to manual solving if auto fails
- Logs detection and solving attempts

### PAGINATE
The PAGINATE step handles navigation through multiple pages with human-like delays and interactions.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| nextButtonXPath | string | required | XPath for next page button |
| pagesToScrape | number | 1 | Number of pages to process |
| randomDelay | object | { min: 1000, max: 2000 } | Delay between pages |

#### Example Usage

"{
  type: STEP_TYPES.PAGINATE,
  nextButtonXPath: '//a[contains(text(), "Next")]',
  pagesToScrape: 5,
  randomDelay: { min: 2000, max: 4000 }
}"

#### Notes
- Includes human-like mouse movements
- Handles navigation timeouts
- Stops if next button not found
- Supports dynamic loading
- Verifies successful page loads

### READ_JSONL
The READ_JSONL step reads and parses data from a JSONL (JSON Lines) file for processing.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| filePath | string | required | Path to the JSONL file to read |
| encoding | string | 'utf8' | File encoding to use |
| validateSchema | boolean | false | Whether to validate JSON schema |
| schema | object | null | JSON schema for validation |

#### Example Usage

"{
  type: STEP_TYPES.READ_JSONL,
  filePath: './data/input.jsonl',
  encoding: 'utf8',
  validateSchema: true,
  schema: {
    type: 'object',
    required: ['url', 'id']
  }
}"

#### Notes
- Reads file line by line for memory efficiency
- Parses each line as JSON
- Optionally validates against schema
- Stores results in scraper's records
- Handles malformed JSON gracefully

### FETCH_AND_MERGE
The FETCH_AND_MERGE step fetches data from URLs and merges it with existing records.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| urls | string[] | required | Array of URLs to fetch |
| mergeKey | string | 'id' | Key to use for merging data |
| timeout | number | 30000 | Fetch timeout in milliseconds |
| retries | number | 3 | Number of retry attempts |

#### Example Usage

"{
  type: STEP_TYPES.FETCH_AND_MERGE,
  urls: ['https://api.example.com/data'],
  mergeKey: 'articleId',
  timeout: 5000,
  retries: 2
}"

#### Notes
- Fetches data concurrently with rate limiting
- Merges based on specified key
- Handles network errors gracefully
- Respects concurrency settings
- Supports retry logic

### BLOCK_RESOURCES
The BLOCK_RESOURCES step configures resource blocking to improve performance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| resources | string[] | [] | Resource types to block |
| exceptions | string[] | [] | URLs to exclude from blocking |
| enabled | boolean | true | Whether blocking is active |

#### Example Usage

"{
  type: STEP_TYPES.BLOCK_RESOURCES,
  resources: ['image', 'stylesheet', 'font'],
  exceptions: ['analytics.js'],
  enabled: true
}"

#### Notes
- Improves page load performance
- Reduces bandwidth usage
- Can block multiple resource types
- Supports URL pattern exceptions
- Can be enabled/disabled dynamically

### WAIT_FOR_SELECTOR
The WAIT_FOR_SELECTOR step waits for an element to appear in the DOM before proceeding.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| selector | string | null | CSS selector to wait for |
| xpath | string | null | XPath to wait for |
| timeout | number | 30000 | Maximum wait time in milliseconds |
| visible | boolean | true | Whether element should be visible |
| hidden | boolean | false | Whether element should be hidden |

#### Example Usage

"{
  type: STEP_TYPES.WAIT_FOR_SELECTOR,
  selector: '.content-loaded',
  timeout: 5000,
  visible: true
}"

#### Notes
- Supports both CSS and XPath selectors
- Waits for element to match specified state
- Throws error if timeout is reached
- Useful for dynamic content loading
- Can wait for element visibility changes

### EXTRACT
The EXTRACT step extracts data from the page using selectors or XPath.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| selector | string | null | CSS selector for extraction |
| xpath | string | null | XPath for extraction |
| attribute | string | 'textContent' | Attribute to extract |
| multiple | boolean | false | Whether to extract multiple elements |
| transform | function | null | Transform function for extracted data |

#### Example Usage

"{
  type: STEP_TYPES.EXTRACT,
  xpath: '//div[@class="article"]//h2',
  attribute: 'innerText',
  multiple: true,
  transform: (text) => text.trim()
}"

#### Notes
- Can extract text or attributes
- Supports multiple element extraction
- Optional data transformation
- Returns null if element not found
- Handles missing attributes gracefully

### DISABLE_REQUEST_INTERCEPTION
The DISABLE_REQUEST_INTERCEPTION step disables any active request interception.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| clearRules | boolean | true | Whether to clear existing rules |
| timeout | number | 1000 | Timeout for disabling interception |

#### Example Usage

"{
  type: STEP_TYPES.DISABLE_REQUEST_INTERCEPTION,
  clearRules: true,
  timeout: 2000
}"

#### Notes
- Removes resource blocking rules
- Restores normal page loading
- Useful after using BLOCK_RESOURCES
- Helps when full page loading is needed
- Can improve stability in some cases

### INSERT_DATA
The INSERT_DATA step simulates human-like typing of text with natural variations in timing.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| text | string | required | Text to be typed |
| charDelay | object | { min: 50, max: 250 } | Delay range between keystrokes |
| pauseDelay | object | { min: 0, max: 200 } | Additional random pauses |
| humanize | boolean | true | Whether to add human-like typing patterns |

#### Example Usage

"{
  type: STEP_TYPES.INSERT_DATA,
  text: '@username123',
  charDelay: { min: 50, max: 250 },
  pauseDelay: { min: 0, max: 200 },
  humanize: true
}"

#### Notes
- Simulates realistic typing patterns
- Adds random delays between keystrokes
- Includes occasional longer pauses
- More natural than direct input
- Configurable timing parameters

### INSERT_DATA_IN_SEARCH_BAR
The INSERT_DATA_IN_SEARCH_BAR step combines clicking a search field, typing text, and pressing Enter in one natural sequence.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| selector | string | null | CSS selector for search input |
| xpath | string | null | XPath for search input |
| text | string | required | Text to be typed |
| clickDelay | object | { min: 1000, max: 3000 } | Delay before clicking |
| charDelay | object | { min: 50, max: 250 } | Delay between keystrokes |
| pauseDelay | object | { min: 0, max: 200 } | Random pauses while typing |
| enterDelay | object | { min: 100, max: 300 } | Delay before pressing Enter |
| enterHoldDuration | object | { min: 50, max: 150 } | How long to hold Enter |
| humanize | boolean | true | Add human-like variations |

#### Example Usage

"{
  type: STEP_TYPES.INSERT_DATA_IN_SEARCH_BAR,
  xpath: '//input[@type="search"]',
  text: '@username123',
  clickDelay: { min: 1000, max: 3000 },
  charDelay: { min: 50, max: 250 },
  pauseDelay: { min: 0, max: 200 },
  enterDelay: { min: 100, max: 300 },
  enterHoldDuration: { min: 50, max: 150 },
  humanize: true
}"

#### Notes
- Combines three steps into one fluid action
- Maintains natural timing between actions
- Includes all human-like behaviors
- Handles scrolling and visibility
- Shows debug visualization if enabled

### HUMAN_LIKE_TEXT_EXTRACTION
The HUMAN_LIKE_TEXT_EXTRACTION step simulates human-like text selection and copying behavior.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| selector | string | null | CSS selector for text element |
| xpath | string | null | XPath for text element |
| moveDelay | object | { min: 500, max: 1500 } | Delay before moving mouse |
| holdDelay | object | { min: 100, max: 300 } | How long to hold before dragging |
| dragSpeed | object | { min: 200, max: 800 } | Speed of text selection in ms |
| copyDelay | object | { min: 200, max: 500 } | Delay before pressing Ctrl+C |
| humanize | boolean | true | Add human-like variations |

#### Example Usage

"{
  type: STEP_TYPES.HUMAN_LIKE_TEXT_EXTRACTION,
  xpath: '//div[@class="article-content"]//p',
  moveDelay: { min: 800, max: 2000 },
  holdDelay: { min: 150, max: 400 },
  dragSpeed: { min: 300, max: 1000 },
  copyDelay: { min: 200, max: 500 },
  humanize: true
}"

#### Notes
- Simulates natural mouse movement to text
- Includes realistic selection behavior
- Uses keyboard shortcuts (Ctrl/Cmd + C)
- Handles text selection across elements
- Returns extracted text content