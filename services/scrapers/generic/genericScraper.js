import puppeteer from 'puppeteer-core';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';

// ---------- ADDITIONAL IMPORTS FROM THE SECOND FILE ----------
import Bottleneck from 'bottleneck';
import { ProxyPool } from './proxyPool.js';
import { getRandomUserAgent } from './userAgents.js';
import { detectCaptcha, solveCaptchaWith2Captcha, solveCaptchaManually } from './captchaSolver.js';
import { CookieManager } from './cookieManager.js';
// -------------------------------------------------------------

// Add these utility functions at the top of the file after imports
function easeOutQuad(t) {
  return t * (2 - t);
}

function getRandomPoint(start, end) {
  const random = Math.random();
  return start + (end - start) * easeOutQuad(random);
}

// Add bezierCurve function here, outside the class
function bezierCurve(p0, p1, p2, t) {
  return {
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y
  };
}

/**
 * Utility function to generate a random delay between min and max milliseconds.
 */
export function randomDelay(min = 500, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Add this utility function at the top with other utility functions
function timeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), ms)
    )
  ]);
}

// Update the chrome paths configuration to be more flexible
const DEFAULT_CHROME_PATHS = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH, // Allow override via environment variable
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.CHROME_PATH,
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    process.env.CHROME_PATH,
  ],
};

/**
 * Find the first existing Chrome path from the list of possible paths
 */
function findChromePath(customPath = null) {
  // First check custom path if provided
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // Then check environment variable
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  // Finally check platform-specific paths
  const paths = DEFAULT_CHROME_PATHS[process.platform] || [];
  for (const path of paths) {
    if (path && fs.existsSync(path)) {
      return path;
    }
  }

  return null; // No valid Chrome path found
}

// Add stealth plugin and use defaults 
puppeteerExtra.use(StealthPlugin());

/**
 * Combined STEP_TYPES from both files
 */
export const STEP_TYPES = {
  // From the first file:
  CONFIGURE: 'CONFIGURE',
  READ_JSONL: 'READ_JSONL',
  FETCH_AND_MERGE: 'FETCH_AND_MERGE',
  BLOCK_RESOURCES: 'BLOCK_RESOURCES',
  NAVIGATE: 'NAVIGATE',
  WAIT_FOR_SELECTOR: 'WAIT_FOR_SELECTOR',
  EXTRACT: 'EXTRACT',  // The first file's EXTRACT logic
  DISABLE_REQUEST_INTERCEPTION: 'DISABLE_REQUEST_INTERCEPTION',
  FETCH_ARTICLES: 'FETCH_ARTICLES',

  // From the second file:
  CLICK: 'CLICK',
  PAGINATE: 'PAGINATE',
  CUSTOM_FUNCTION: 'CUSTOM_FUNCTION',
  DETECT_CAPTCHA: 'DETECT_CAPTCHA',
  RANDOM_MOUSE_MOVEMENT: 'RANDOM_MOUSE_MOVEMENT',
  DEBUG_MOUSE: 'DEBUG_MOUSE',
  STEP_OUT_WINDOW: 'STEP_OUT_WINDOW',
  PRESS_ENTER: 'PRESS_ENTER',
  HUMAN_LIKE_TEXT_EXTRACTION: 'HUMAN_LIKE_TEXT_EXTRACTION',
  INSERT_DATA: 'INSERT_DATA',
  EXTRACT_LIST: 'EXTRACT_LIST',
  LIST_LOOP: 'LIST_LOOP',
  REFRESH_PAGE: 'REFRESH_PAGE',
};

// Move isChromiumDebuggerRunning outside the class as a utility function
async function isChromiumDebuggerRunning(port = 9222) {
  try {
    const response = await fetch(`http://localhost:${port}/json/version`);
    return response.ok;
  } catch (e) {
    return false;
  }
}

// Add a new custom error class
class ElementNotFoundError extends Error {
  constructor(selector, xpath) {
    const elementDesc = xpath ? `xpath: ${xpath}` : `selector: ${selector}`;
    super(`Element not found with ${elementDesc}`);
    this.name = 'ElementNotFoundError';
    this.selector = selector;
    this.xpath = xpath;
  }
}

// Add this utility function at the top of the file
function getRelativeXPath(parentXPath, childXPath) {
  if (!childXPath.startsWith(parentXPath)) {
    return childXPath; // Return original if not a child path
  }

  // Remove the parent path from the beginning
  let relativePath = childXPath.slice(parentXPath.length);
  
  // Remove leading slash if present
  if (relativePath.startsWith('/')) {
    relativePath = relativePath.slice(1);
  }

  // Add ./ prefix for relative path
  return './' + relativePath;
}

/**
 * A flexible, generic scraper class that merges
 * the functionality from both versions.
 */
export class GenericFlexibleScraper {
  /**
   * @param {object} options
   * @param {string[]} [options.proxyList]          - from the second file
   * @param {number}   [options.maxConcurrent]      - from the second file (Bottleneck)
   * @param {number}   [options.minTime]            - from the second file (Bottleneck)
   * @param {boolean | 'new'} [options.headless]    - used by the first file & second file
   * @param {string}   [options.cookiesFile]        - from the second file
   * @param {number}   [options.proxyRevalidateMs]  - from the second file
   * @param {string}   [options.healthCheckUrl]     - from the second file
   * @param {string}   [options.twoCaptchaApiKey]   - from the second file
   * @param {string}   [options.chromePath]         - from the second file
   * @param {object}   [options.chromeConfig]       - from the second file
   * @param {boolean}  [options.debugMouse]         - from the second file
   */
  constructor({
    proxyList = [],
    maxConcurrent = 2,
    minTime = 0,
    headless = 'new', // default to 'new' (puppeteer >= v19), or true/false
    cookiesFile = '',
    proxyRevalidateMs = 60_000,
    healthCheckUrl = 'https://ipinfo.io/json',
    twoCaptchaApiKey = '',
    chromePath = null,
    chromeConfig = {},  // Add new parameter for additional Chrome configuration
    debugMouse = false,  // Add debug parameter
  } = {}) {
    // Replace puppeteer with puppeteerExtra
    this.puppeteer = puppeteerExtra;

    // ------------------- FROM THE FIRST FILE -------------------
    // Default config used by some steps (CONFIGURE, etc.)
    this.config = {
      concurrency: 5,
      blockedResources: [],
      outputFileName: 'output.jsonl',
    };

    this.browser = null;
    this.page = null;
    this.limit = null;  // assigned after CONFIGURE step
    this.writeStream = null;
    // ----------------------------------------------------------

    // ------------------- NEW ADDITIONS (SECOND FILE) ----------
    this.headlessMode = headless;
    // If you want to re-use the same browser for tasks or open new ones each time, 
    // we'll show the simpler approach: one browser, one page, as in the first file.
    // 
    // But we still incorporate proxy logic, Bottleneck concurrency for "tasks" if desired,
    // user-agent rotation, cookies, captcha, etc.

    // Initialize Bottleneck for external "tasks" if you prefer to wrap tasks in runTasks():
    this.taskLimiter = new Bottleneck({ maxConcurrent, minTime });

    // Create a proxy pool if provided:
    this.proxyPool = new ProxyPool(proxyList, proxyRevalidateMs, healthCheckUrl);

    // Cookie manager if cookiesFile is provided
    this.cookieManager = cookiesFile ? new CookieManager(cookiesFile) : null;

    // 2Captcha key for captcha solving:
    this.twoCaptchaApiKey = twoCaptchaApiKey;

    // Store chrome configuration
    this.chromeConfig = {
      findAutomatically: true,  // Whether to search for Chrome automatically
      path: chromePath,         // Specific Chrome path if provided
      userDataDir: null,        // Chrome user profile directory
      defaultArgs: true,        // Use Puppeteer's default arguments
      ...chromeConfig,          // Override with provided config
    };

    // Find Chrome path based on configuration
    this.chromePath = this.chromeConfig.findAutomatically ? 
      findChromePath(this.chromeConfig.path) : 
      this.chromeConfig.path;

    // Add mouse state
    this.mouseState = {
      currentX: 200,
      currentY: 200,
      lastMoveTime: Date.now(),
    };

    // Add debug configuration
    this.debugConfig = {
      showMouse: debugMouse,
    };
    // ----------------------------------------------------------
  }

  /**
   * Initialize Puppeteer with proxy, cookies, and user agent configuration.
   */
  async initialize() {
    try {
      await this.checkDebuggerConnection();
      await this.setupBrowser();
      await this.setupPage();
      
      // Load all cookies without filtering by domain
      if (this.cookieManager) {
        const cookies = await this.cookieManager.getAllCookies();
        if (cookies.length > 0) {
          await this.browser.setCookie(...cookies);
          // Don't log specific cookie info
          console.log('✅ Browser configured');
        }
      }

      await this.setupCookieHandling();
      await this.setupStealthMode();
      // await this.setupUserAgent();
      
      // Don't log initialization details
      console.log('✅ Setup complete');
    } catch (err) {
      console.error('❌ Setup error:', err);
      throw err;
    }
  }

  async checkDebuggerConnection() {
    const isRunning = await isChromiumDebuggerRunning();
    if (!isRunning) {
      console.log('No debuggable Chrome instance found.');
      console.log('Please make sure Chrome is running with:');
      console.log(`"${this.chromePath}" --remote-debugging-port=9222`);
      throw new Error('No debuggable Chrome instance found');
    }
  }

  async setupBrowser() {
    console.log('Connecting to existing Chrome instance with stealth...');
    this.browser = await this.puppeteer.connect({
      browserURL: 'http://localhost:9222/json/version',
      defaultViewport: null,
      protocolTimeout: 0,
    });
  }

  async setupPage() {
    this.page = await this.browser.newPage();
  }

  async setupCookieHandling() {
    if (this.cookieManager) {
        this.page.on('response', async (response) => {
            try {
                const cookies = response.headers()['set-cookie']; // Extract cookies from headers
                if (cookies) { // Only update if cookies exist
                    console.log(`🍪 Cookies found in response from ${response.url()}`);
                    const parsedCookies = await this.browser.cookies();
                    await this.cookieManager.updateCookies(parsedCookies);
                }
            } catch (error) {
                console.warn('Error handling cookie update:', error);
            }
        });
    }
}

  async setupStealthMode() {
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    console.log('Stealth mode configured');
  }

  async setupUserAgent() {
    const userAgent = getRandomUserAgent();
    await this.page.setUserAgent(userAgent);
    console.log('User agent configured');
  }

  /**
   * Close resources like the write stream and the browser.
   */
  async close() {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    if (this.page) {
      await this.page.close(); // Close only the tab, not the entire browser
      this.page = null;
    }
    // Don't close the browser if we connected to an existing instance
    if (this.browser && !this.browser._connection) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Main entry point for running steps sequentially
   */
  async runSteps(steps, domain = null) {
    if (!Array.isArray(steps)) {
      throw new Error('Steps must be an array');
    }

    // Initialize browser if not already done
    if (!this.browser) {
      await this.initialize(domain);
    }

    // Find CONFIGURE step to apply configuration
    const configStep = steps.find(step => step.type === STEP_TYPES.CONFIGURE);
    if (configStep) {
      await this.handleConfigure(configStep);
    }

    console.log('Running steps sequentially');

    try {
      const results = await this.runStepsSequentially(steps);
      // Filter out null/undefined results and flatten arrays
      return results.filter(r => r != null).flat();
    } catch (error) {
      console.error('Error in sequential execution:', error);
      throw error;
    }
  }

  /**
   * Sequential execution of steps
   */
  async runStepsSequentially(steps) {
    const results = [];
    for (const step of steps) {
      try {
        const result = await this.executeStep(step);
        if (result != null) {
          results.push(result);
        }
        if (step.randomDelay) {
          const { min, max } = step.randomDelay;
          await randomDelay(min, max);
        }
      } catch (err) {
        if (err instanceof ElementNotFoundError) {
          console.log('\n🔍 Element not found:');
          console.log(`   Step type: ${step.type}`);
          if (err.xpath) console.log(`   XPath: ${err.xpath}`);
          if (err.selector) console.log(`   Selector: ${err.selector}`);
          console.log('\n⏹️  Stopping process gracefully...\n');
          return results;
        }
        
        // Handle both custom and Puppeteer navigation timeouts
        if (err.message === 'NAVIGATION_TIMEOUT' || 
            (err.name === 'TimeoutError' && err.message.includes('Navigation timeout'))) {
          console.log('\n⏱️  Navigation timeout:');
          console.log(`   Step type: ${step.type}`);
          console.log('   Continuing with next step...\n');
          continue;
        }

        // For other errors, log and rethrow
        console.error(`❌ Error executing step ${step.type}:`, err);
        throw err;
      }
    }
    return results;
  }

  /**
   * Execute a single step
   */
  async executeStep(step) {
    console.log(`Executing step: ${step.type}`);
    
    try {
      const result = await this._executeStepInternal(step);
      
      // Log the result for debugging (optional)
      if (result != null) {
        console.log(`Step ${step.type} produced result:`, 
          Array.isArray(result) ? `Array[${result.length}]` : typeof result
        );
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to execute step ${step.type}:`, error);
      throw error;
    }
  }

  /**
   * Internal step execution with consistent return handling
   */
  async _executeStepInternal(step) {
    switch (step.type) {
      // case STEP_TYPES.CONFIGURE:
      //   return await this.handleConfigure(step);
      case STEP_TYPES.READ_JSONL: {
        await this.handleReadJsonl(step);
        return this.records; // Return loaded records
      }
      case STEP_TYPES.FETCH_AND_MERGE:
        return await this.handleFetchAndMerge(step);
      case STEP_TYPES.BLOCK_RESOURCES:
        return await this.handleBlockResources(step);
      case STEP_TYPES.NAVIGATE:
        return await this.handleNavigate(step);
      case STEP_TYPES.WAIT_FOR_SELECTOR:
        return await this.handleWaitForSelector(step);
      case STEP_TYPES.EXTRACT: {
        const result = await this.handleExtract(step);
        return result; // Already returns in correct format
      }
      case STEP_TYPES.DISABLE_REQUEST_INTERCEPTION:
        return await this.handleDisableRequestInterception();
      case STEP_TYPES.FETCH_ARTICLES:
        return await this.handleFetchArticles(step);
      case STEP_TYPES.CLICK:
        return await this.handleClick(step);
      case STEP_TYPES.PAGINATE:
        return await this.handlePagination(step);
      case STEP_TYPES.CUSTOM_FUNCTION:
        return await this.handleCustomFunction(step);
      case STEP_TYPES.DETECT_CAPTCHA:
        return await this.handleCaptcha(step);
      case STEP_TYPES.RANDOM_MOUSE_MOVEMENT:
        return await this.handleRandomMouseMovement(step);
      case STEP_TYPES.DEBUG_MOUSE:
        return await this.handleDebugMouse(step);
      case STEP_TYPES.STEP_OUT_WINDOW:
        return await this.handleStepOutWindow(step);
      case STEP_TYPES.PRESS_ENTER:
        return await this.handlePressEnter(step);
      case STEP_TYPES.HUMAN_LIKE_TEXT_EXTRACTION:
        return await this.handleHumanLikeTextExtraction(step);
      case STEP_TYPES.INSERT_DATA:
        return await this.handleInsertData(step);
      case STEP_TYPES.EXTRACT_LIST:
        return await this.handleExtractList(step);
      case STEP_TYPES.LIST_LOOP:
        return await this.handleListLoop(step);
      case STEP_TYPES.REFRESH_PAGE:
        return await this.handleRefreshPage(step);
      default:
        console.warn(`Unknown step type: ${step.type}`);
        return null;
    }
  }

  // Implementation
  async handleReadJsonl(step) {
    const { inputFile, limitRecords = Infinity } = step;
    if (!fs.existsSync(inputFile)) {
      console.warn(`File not found: ${inputFile}`);
      this.records = [];
      return;
    }
    const lines = fs
      .readFileSync(inputFile, 'utf-8')
      .split('\n')
      .filter(Boolean);

    const limitedLines = lines.slice(0, limitRecords);
    this.records = limitedLines.map((line) => JSON.parse(line));
    console.log(`Loaded ${this.records.length} records from ${inputFile}.`);
  }

  /**
   * STEP: FETCH_AND_MERGE
   * Sequential version that processes one record at a time
   */
  async handleFetchAndMerge(step) {
    const outputFilePath = step.outputFile;
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

    // Get retry configuration from step or use defaults
    const retryConfig = {
      maxRetries: step.maxRetries || 3,
      initialDelay: step.initialDelay || 1000,
      maxDelay: step.maxDelay || 10000,
      backoff: step.backoff || 2,
      ...step.retryConfig
    };

    // Add delay configuration
    const delayConfig = {
      minDelay: step.minDelay || 2000,    // Minimum delay between requests
      maxDelay: step.maxDelay || 5000,    // Maximum delay between requests
      ...step.delayConfig
    };

    try {
      // Process records sequentially
      for (const record of this.records) {
        // Add random delay before each request
        await randomDelay(delayConfig.minDelay, delayConfig.maxDelay);
        
        // Process record with retry logic
        await this.fetchWithRetry(record, writeStream, retryConfig, step);
        
        console.log(`Processed record: ${record.link || 'no link'}`);
      }
    } catch (error) {
      console.error('Error in fetch and merge:', error);
      throw error;
    } finally {
      writeStream.end();
      console.log(`Wrote final data to ${outputFilePath}`);
    }
  }

  /**
   * Wrapper function that implements retry logic
   */
  async fetchWithRetry(record, writeStream, retryConfig, step) {
    const {
      maxRetries,
      initialDelay,
      maxDelay,
      backoff
    } = retryConfig;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await this.fetchAndAppend(record, writeStream, step);
      } catch (error) {
        lastError = error;
        
        // If this was our last attempt, throw the error
        if (attempt === maxRetries + 1) {
          console.error(`Failed to fetch ${record.link} after ${maxRetries} retries:`, error);
          throw error;
        }

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoff, maxDelay);
        
        // Log retry attempt
        console.warn(`Attempt ${attempt}/${maxRetries + 1} failed for ${record.link}. Retrying in ${delay}ms...`);
        console.warn(`Error was: ${error.message}`);

        // Wait before next attempt
        await randomDelay(delay, delay);
      }
    }
  }

  /**
   * Modified fetchAndAppend to throw errors instead of handling them
   * (error handling moved to fetchWithRetry)
   */
  async fetchAndAppend(record, writeStream, step) {
    if (!record.link) {
      record.content = '';
      this.writeRecord(writeStream, record);
      return;
    }

    

      await this.page.goto(record.link, {
        waitUntil: 'networkidle0',
        timeout: this.config.pageTimeout || 30000
      });

      // Use extractData instead of extractContent
      const content = await this.extractData({
        selector: step.contentSelector, // or your preferred content selector
        attribute: 'innerText',
        multiple: false
      });
      
      // Merge and write
      const mergedRecord = {
        ...record,
        content
      };
      
      this.writeRecord(writeStream, mergedRecord);
      
    
  }

  writeRecord(writeStream, record) {
    writeStream.write(JSON.stringify(record) + '\n');
  }

  /**
   * STEP: CONFIGURE
   * Update concurrency, blocked resources, output file name, cookies, etc.
   */
  async handleConfigure(step) {
    const {
      concurrency = 5,
      blockedResources = [],
      outputFileName = 'output.jsonl',
      proxyRotation = false,
      mouseMovements = true,
      // ... other scraping-specific configs
    } = step;

    try {
      // Set concurrency limit
      this.limit = pLimit(concurrency);
      
      // Configure resource blocking if needed
      if (blockedResources.length > 0) {
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
          if (blockedResources.includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });
      }

      // Configure output file
      this.config.outputFileName = outputFileName;
      
      // Store other configurations
      this.config = {
        ...this.config,
        concurrency,
        blockedResources,
        proxyRotation,
        mouseMovements
      };

      console.log('✅ Scraping configuration complete');
    } catch (err) {
      console.error('❌ Configuration error:', err);
      throw err;
    }
  }

  /**
   * STEP: BLOCK_RESOURCES
   */
  async handleBlockResources(step) {
    console.log('Blocking resources...');
    await this.page.setRequestInterception(true);

    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (this.config.blockedResources.includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * STEP: NAVIGATE
   */
  async handleNavigate(step) {
    const { url, waitUntil = 'networkidle2', timeout = 30000, randomDelay } = step;

    try {
      console.log(`\n🌐 Navigating to: ${url}`);

      // Add webdriver masking before navigation
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      // Random delay before navigation if specified
      if (randomDelay) {
        const delay = Math.floor(Math.random() * (randomDelay.max - randomDelay.min)) + randomDelay.min;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Navigate to the URL
      await this.page.goto(url, {
        waitUntil,
        timeout,
      });

      console.log('✅ Navigation successful');

    } catch (err) {
      if (err.name === 'TimeoutError') {
        console.log('\n⚠️  Navigation timeout - continuing execution...');
      } else {
        console.error('❌ Navigation error:', err);
        throw err;
      }
    }
  }

  /**
   * STEP: WAIT_FOR_SELECTOR
   */
  async handleWaitForSelector(step) {
    const { selector, timeout = 30000 } = step;
    console.log(`Waiting for selector: ${selector}`);
    await this.page.waitForSelector(selector, { timeout });
  }

/**
 * STEP: EXTRACT
 * Removes domain-specific logic and uses a "mappings" array.
 * Each mapping tells which selector/xpath to query and
 * where to store the extracted data (variableName).
 */
  async handleExtract(step) {
    // `step.extracts` is an array describing what to extract
    // e.g. step.extracts = [
    //   {
    //     variableName: 'title',
    //     selector: '.article-title',
    //     attribute: 'innerText',
    //     multiple: false
    //   },
    //   { ... }
    // ]
  
    const { extracts = [] } = step;
    if (!Array.isArray(extracts) || extracts.length === 0) {
      console.warn('No extraction mappings provided. Skipping EXTRACT step.');
      return;
    }
  
    // This will be our final result object
    const result = {};
  
    // Go through each mapping
    for (const extractConfig of extracts) {
      const {
        variableName,
        selector,
        xpath,
        attribute = 'innerText',
        multiple = false,
      } = extractConfig;
  
      if (!variableName) {
        console.warn('No "variableName" specified in an extract config. Skipping.');
        continue;
      }
  
      // Extract data (we'll use a small helper below)
      const extractedValue = await this.extractData({
        selector,
        xpath,
        attribute,
        multiple
      });
  
      // Store in result object
      result[variableName] = extractedValue;
    }
  
    // Optionally write the entire result object to JSONL 
    // if that's desired for every EXTRACT step:
    this.writeToJSONL(result);
  
    // Also return it in case other steps need it
    return result;
  }
  
  /**
   * A helper that actually queries the DOM (similar to `_handleExtractGeneric`)
   */
  async extractData({ selector, xpath, attribute, multiple }) {
    try {
      if (xpath) {
        if (multiple) {
          // Get multiple elements using XPath
          const elements = await this.page.waitForSelector(`::-p-xpath(${xpath}`);
          return Promise.all(elements.map(el => this.getAttributeOrText(el, attribute)));
        } else {
          // Get single element using XPath
          const element = await this.page.waitForSelector(`::-p-xpath(${xpath})`, {
            timeout: 5000
          }).catch(() => null);
          
          if (!element) return null;
          return this.getAttributeOrText(element, attribute);
        }
      } else if (selector) {
        // If using a CSS selector
        if (multiple) {
          // Return an array of values
          return await this.page.$$eval(
            selector,
            (els, attr) => {
              return els.map(el => {
                if (attr === 'innerText' || attr === 'textContent') {
                  return el.innerText;
                } else {
                  return el.getAttribute(attr);
                }
              });
            },
            attribute
          );
        } else {
          // Single element
          return await this.page.$eval(
            selector,
            (el, attr) => {
              if (!el) return null;
              if (attr === 'innerText' || attr === 'textContent') {
                return el.innerText;
              } else {
                return el.getAttribute(attr);
              }
            },
            attribute
          );
        }
      }
    } catch (err) {
      console.error('Error extracting data:', err);
    }
    return null;
  }
  
  /**
   * Mini-helper to read either an attribute or text from an ElementHandle
   */
  async getAttributeOrText(elementHandle, attribute) {
    if (!elementHandle) return null;
  
    if (attribute === 'innerText' || attribute === 'textContent') {
      // Evaluate the element to get text
      return await elementHandle.evaluate(el => el.innerText);
    } else {
      // Evaluate the element to get a particular attribute
      return await elementHandle.evaluate((el, attr) => el.getAttribute(attr), attribute);
    }
  }

  /**
   * STEP: DISABLE_REQUEST_INTERCEPTION
   */
  async handleDisableRequestInterception() {
    console.log('Disabling request interception...');
    await this.page.setRequestInterception(false);
    this.page.removeAllListeners('request');
  }

  /**
   * STEP: FETCH_ARTICLES
   * concurrency-limited approach to fetch content for each item
   */
  async handleFetchArticles(step) {
    console.log('Fetching articles with concurrency:', this.config.concurrency);

    const items = step.items || [];
    const tasks = items.map(item => this.limit(() => this.fetchSingleArticle(item)));

    await Promise.all(tasks);
    console.log('All articles fetched.');
  }

  /**
   * Actual logic to open a new page, block resources if needed,
   * random delays, extract content from <article>, etc.
   */
  async fetchSingleArticle(item) {
    if (!item.link) {
      console.log(`No link for item titled "${item.title}", skipping...`);
      item.content = '';
      this.writeToJSONL(item);
      return;
    }

    let articlePage;
    try {
      // random delay
      await randomDelay(1000, 3000);
      articlePage = await this.browser.newPage();

      // block resources in new page if desired
      if (this.config.blockedResources.length > 0) {
        await articlePage.setRequestInterception(true);
        articlePage.on('request', req => {
          const resType = req.resourceType();
          if (this.config.blockedResources.includes(resType)) {
            req.abort();
          } else {
            req.continue();
          }
        });
      }

      await randomDelay();
      await articlePage.goto(item.link, { waitUntil: 'networkidle2', timeout: 30000 });
      await articlePage.waitForSelector('article');
      await randomDelay();

      const content = await articlePage.$eval('article', el => el.innerText.trim());
      item.content = content;
      this.writeToJSONL(item);

    } catch (err) {
      console.error(`Failed to fetch content for ${item.link}:`, err);
      item.content = '';
      this.writeToJSONL(item);
    } finally {
      if (articlePage) {
        await articlePage.close();
      }
    }
  }

  /**
   * Helper to write an object to the JSONL output stream.
   */
  writeToJSONL(obj) {
    if (!this.writeStream) return;
    const line = JSON.stringify(obj) + '\n';
    this.writeStream.write(line);
  }
  /**
   * Additional step: CLICK
   */
  async handleClick(step) {
    const { 
      selector, 
      xpath, 
      waitForNav = false, 
      navigationTimeout = 60000,
      maxRetries = 3 
    } = step;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Find and validate element
        const element = await this.findClickableElement(selector, xpath);
        
        // Get element position and prepare for click
        const clickPosition = await this.prepareElementForClick(element);
        
        // Perform the click
        await this.executeClick(clickPosition.x, clickPosition.y);

        // Handle navigation if needed
        if (waitForNav) {
          await this.handleNavigation(navigationTimeout, attempt, maxRetries);
        }
        
        return; // Success - exit the retry loop

      } catch (err) {
        await this.handleClickError(err, attempt, maxRetries);
      }
    }
  }

  async findClickableElement(selector, xpath) {
    const element = xpath ? 
      await this.page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 }) :
      await this.page.$(selector);

    if (!element) {
      throw new ElementNotFoundError(selector, xpath);
    }
    return element;
  }

  async prepareElementForClick(element) {
    const box = await this.scrollElementIntoViewIfNeeded(element);
    return this.getPointPosition(box);
  }

  async executeClick(x, y) {
    console.log(`\n🖱️  Clicking at position: x=${Math.round(x)}, y=${Math.round(y)}`);
    await this.moveMouseHumanlike(x, y);
    await this.page.mouse.click(x, y);
  }

  async handleNavigation(timeout, attempt, maxRetries) {
    try {
      await Promise.race([
        this.page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('NAVIGATION_TIMEOUT')), timeout)
        )
      ]);
    } catch (navError) {
      if (navError.message === 'NAVIGATION_TIMEOUT' || navError.name === 'TimeoutError') {
        if (attempt === maxRetries) {
          console.log('\n⚠️  Navigation failed after all attempts - continuing execution...');
          await this.page.waitForTimeout(1000);
          return;
        }
        console.log(`\n⚠️  Navigation timeout (attempt ${attempt}/${maxRetries}) - retrying...`);
        await this.page.waitForTimeout(1000);
        throw navError; // Propagate to retry logic
      }
      throw navError;
    }
  }

  async handleClickError(err, attempt, maxRetries) {
    if (err instanceof ElementNotFoundError) {
      throw err; // Let element not found errors propagate up
    }
    if (attempt === maxRetries) {
      throw err; // Let the final error propagate up
    }
    console.log(`\n⚠️  Click failed (attempt ${attempt}/${maxRetries}) - retrying...`);
    await this.page.waitForTimeout(1000);
  }

  // Rename the helper function
  getPointPosition(box) {
    // Find center point
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Calculate random offset from center (within 20% of dimensions)
    const maxOffset = Math.min(box.width, box.height) * 0.2;
    const offsetX = (Math.random() - 0.5) * maxOffset;
    const offsetY = (Math.random() - 0.5) * maxOffset;

    // Final coordinates (ensuring we stay within bounds)
    const x = Math.min(Math.max(centerX + offsetX, box.x + 5), box.x + box.width - 5);
    const y = Math.min(Math.max(centerY + offsetY, box.y + 5), box.y + box.height - 5);

    return { x, y };
  }

  /**
   * Additional step: PAGINATE
   */
  async handlePagination(step) {
    const { 
      nextButtonXPath, 
      pagesToScrape = 1,
      randomDelay: stepDelay = { min: 1000, max: 2000 }
    } = step;

    for (let i = 0; i < pagesToScrape; i++) {
      try {
        // Find the next button using new XPath syntax
        const nextButton = await this.page.waitForSelector(`::-p-xpath(${nextButtonXPath})`, {
          timeout: 5000
        }).catch(() => null);

        if (nextButton) {
          // Get button position and scroll into view
          const box = await this.scrollElementIntoViewIfNeeded(nextButton);
          if (box) {
            // Get click point using the renamed helper function
            const { x, y } = this.getPointPosition(box);

            // Move mouse to button with human-like movement
            await this.moveMouseHumanlike(x, y, {
              steps: Math.floor(Math.random() * 20) + 20,
              minDelay: 20,
              maxDelay: 50,
              useBezier: true,
            });

            // Small delay before clicking
            await randomDelay(50, 150);

            // Click and wait for navigation
            console.log(`\n🖱️  Clicking pagination at position: x=${Math.round(x)}, y=${Math.round(y)}`);
            await this.page.mouse.click(x, y);
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

            // Random delay between pages
            if (i < pagesToScrape - 1) { // Don't delay after last page
              await randomDelay(stepDelay.min, stepDelay.max);
            }
          }
        } else {
          console.log('Next button not found, stopping pagination');
          break;
        }
      } catch (err) {
        console.error(`Error during pagination (page ${i + 1}):`, err);
        break;
      }
    }
  }

  /**
   * Additional step: CUSTOM_FUNCTION
   * If step.fn is a function, we can call it with page, or pass what you need.
   */
  async handleCustomFunction(step) {
    if (typeof step.fn === 'function') {
      await step.fn(this.page);
    } else {
      console.warn('CUSTOM_FUNCTION step provided, but "fn" is not a function.');
    }
  }

  /**
   * Additional step: DETECT_CAPTCHA
   */
  async handleCaptcha(step) {
    const siteKey = await detectCaptcha(this.page);
    if (siteKey) {
      console.log(`Captcha sitekey found: ${siteKey}`);
      if (this.twoCaptchaApiKey) {
        // Use 2Captcha solver
        await solveCaptchaWith2Captcha(
          this.page,
          siteKey,
          this.page.url(),
          this.twoCaptchaApiKey
        );
      } else if (this.headlessMode === false || this.headlessMode === 'false') {
        // If truly headful, we could solve manually
        await solveCaptchaManually(this.page);
      } else {
        console.warn('Captcha detected in headless mode with no solver available!');
      }
    } else {
      console.log('No captcha detected on this step.');
    }
  }

  // --------------------------------------------------
  //   UTILS FROM SECOND FILE (Proxy/cookie usage)
  // --------------------------------------------------

  /**
   * Extract domain from a URL
   */
  extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch (err) {
      return 'unknown';
    }
  }

  isProxyError(error) {
    const message = error.message || '';
    const proxyErrorSignatures = [
      'ECONNRESET',
      'net::ERR_PROXY_CONNECTION_FAILED',
      'net::ERR_TUNNEL_CONNECTION_FAILED',
      'ECONNREFUSED',
      'socket hang up',
      'HPE_INVALID_HEADER_TOKEN',
    ];
    return proxyErrorSignatures.some((sig) => message.includes(sig));
  }

  // Update the moveMouseHumanlike method in the GenericFlexibleScraper class
  async moveMouseHumanlike(targetX, targetY, options = {}) {
    const {
      steps = 30,
      minDelay = 20,
      maxDelay = 50,
      useBezier = true,
    } = options;

    const currentX = this.mouseState.currentX;
    const currentY = this.mouseState.currentY;
    
    // 50% chance to use linear movement
    const useLinear = Math.random() < 0.5;
    
    // Control point for bezier curve
    const controlX = (currentX + targetX) / 2 + Math.random() * 100 - 50;
    const controlY = (currentY + targetY) / 2 + Math.random() * 100 - 50;

    // Ensure debug cursor exists before starting movement
    await this.ensureDebugCursor();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let newX, newY;

      if (useBezier && !useLinear) {
        // Curved movement with Bezier
        const { x, y } = bezierCurve(
          { x: currentX, y: currentY },
          { x: controlX, y: controlY },
          { x: targetX, y: targetY },
          t
        );
        newX = Math.round(x);
        newY = Math.round(y);
      } else {
        // Smooth linear movement with noise
        const noiseX = (Math.random() - 0.5) * 5;
        const noiseY = (Math.random() - 0.5) * 5;
        newX = Math.round(currentX + (targetX - currentX) * t + noiseX);
        newY = Math.round(currentY + (targetY - currentY) * t + noiseY);
      }

      // Move mouse to the next point
      await this.page.mouse.move(newX, newY);
      
      // Update state
      this.mouseState.currentX = newX;
      this.mouseState.currentY = newY;
      this.mouseState.lastMoveTime = Date.now();

      // Update debug cursor if enabled
      if (this.debugConfig.showMouse) {
        await this.page.evaluate((x, y) => {
          const cursor = document.getElementById('debug-mouse');
          if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
          }
        }, newX, newY);
      }

      // Random delay for variable human-like speed
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Final precise movement to target
    await this.page.mouse.move(targetX, targetY);
    this.mouseState.currentX = targetX;
    this.mouseState.currentY = targetY;
    this.mouseState.lastMoveTime = Date.now();

    // Update debug cursor if enabled
    if (this.debugConfig.showMouse) {
      await this.page.evaluate((x, y) => {
        const cursor = document.getElementById('debug-mouse');
        if (cursor) {
          cursor.style.left = `${x}px`;
          cursor.style.top = `${y}px`;
        }
      }, targetX, targetY);
    }
  }

  // Add this method to ensure debug cursor exists
  async ensureDebugCursor(cursorColor = 'red') {
    if (this.debugConfig.showMouse) {
      await this.page.evaluate((color) => {
        let cursor = document.getElementById('debug-mouse');
        if (!cursor) {
          cursor = document.createElement("div");
          cursor.id = "debug-mouse";
          cursor.style.position = "fixed";
          cursor.style.width = "10px";
          cursor.style.height = "10px";
          cursor.style.background = color;  // Use the passed color parameter
          cursor.style.borderRadius = "50%";
          cursor.style.zIndex = "9999";
          cursor.style.pointerEvents = "none";
          cursor.style.transition = "all 0.05s linear";
          document.body.appendChild(cursor);
        }
        // Make sure cursor is visible
        cursor.style.display = "block";
      }, cursorColor);  // Pass the color to the evaluate function
    }
  }

  async handleRandomMouseMovement(step) {
    const {
      duration = 5000,  // Base duration in milliseconds
      minDelay = 100,   // Minimum delay between movements
      maxDelay = 500,   // Maximum delay between movements
      margin = 100,     // Margin from page edges
    } = step;

    // Calculate random duration within ±10% of specified duration
    const variance = duration * 0.1; // 10% of duration
    const randomDuration = duration + (Math.random() * variance * 2 - variance);
    
    const startTime = Date.now();

    try {
      // Get page dimensions
      const dimensions = await this.page.evaluate(() => ({
        width: Math.min(
          document.documentElement.clientWidth,
          document.documentElement.scrollWidth,
          document.documentElement.offsetWidth
        ),
        height: Math.min(
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        )
      }));

      // Keep moving until randomDuration is reached
      while (Date.now() - startTime < randomDuration) {
        // Generate random target coordinates within viewport
        const targetX = Math.floor(Math.random() * (dimensions.width - 2 * margin) + margin);
        const targetY = Math.floor(Math.random() * (dimensions.height - 2 * margin) + margin);

        // Move to random point with bezier curve
        await this.moveMouseHumanlike(targetX, targetY, {
          steps: Math.floor(Math.random() * 30) + 20, // 20-50 steps
          minDelay: 10,
          maxDelay: 30,
          useBezier: Math.random() > 0.3, // 70% chance of bezier
        });

        // Random pause between movements
        await randomDelay(minDelay, maxDelay);
      }
    } catch (err) {
      console.error('Error in random mouse movement:', err);
      throw err;
    }
  }

  // Add this method to create debug rectangle
  async createDebugRectangle(box, color = 'rgba(0, 255, 0, 0.3)') {
    if (this.debugConfig.showMouse) {
      await this.page.evaluate(({ x, y, width, height, color }) => {
        // Remove any existing debug rectangle
        const existingRect = document.getElementById('debug-rectangle');
        if (existingRect) existingRect.remove();

        // Create new rectangle
        const rect = document.createElement('div');
        rect.id = 'debug-rectangle';
        rect.style.position = 'absolute';
        rect.style.left = `${x}px`;
        rect.style.top = `${y}px`;
        rect.style.width = `${width}px`;
        rect.style.height = `${height}px`;
        rect.style.backgroundColor = color;
        rect.style.border = '2px solid darkgreen';
        rect.style.zIndex = '9998'; // Below the mouse cursor
        rect.style.pointerEvents = 'none';
        rect.style.transition = 'all 0.3s ease-in-out';
        
        // Add target point
        const target = document.createElement('div');
        target.style.position = 'absolute';
        target.style.width = '6px';
        target.style.height = '6px';
        target.style.backgroundColor = 'red';
        target.style.borderRadius = '50%';
        rect.appendChild(target);

        document.body.appendChild(rect);

        // Remove rectangle after 2 seconds
        setTimeout(() => rect.remove(), 2000);
      }, { x: box.x, y: box.y, width: box.width, height: box.height, color });
    }
  }

  // Add the debug mouse handler
  async handleDebugMouse(step) {
    const {
      enabled = true,
      startPosition = { x: 200, y: 200 },
      cursorColor = 'red',
      rectangleColor = 'rgba(0, 255, 0, 0.3)',
    } = step;

    // Update debug config
    this.debugConfig.showMouse = enabled;

    // Update mouse state with start position
    this.mouseState.currentX = startPosition.x;
    this.mouseState.currentY = startPosition.y;

    // Move mouse to start position
    await this.page.mouse.move(startPosition.x, startPosition.y);

    // Initialize debug cursor with custom color
    await this.ensureDebugCursor(cursorColor);

    console.log(`Mouse debugging ${enabled ? 'enabled' : 'disabled'} at position (${startPosition.x}, ${startPosition.y})`);
  }

  // Add the step out window handler
  async handleStepOutWindow(step) {
    const {
      duration = { min: 2000, max: 10000 },  // Base duration or range
      exitEdge = 'top',
      moveBackDelay = { min: 500, max: 2000 },
    } = step;

    // If duration is a number, treat it as base duration and add ±10% variance
    const baseDuration = typeof duration === 'number' ? duration : 
      Math.floor(Math.random() * (duration.max - duration.min)) + duration.min;

    // Calculate random duration within ±10% of base duration
    const variance = baseDuration * 0.1;
    const randomDuration = baseDuration + (Math.random() * variance * 2 - variance);

    try {
      // Get viewport dimensions
      const dimensions = await this.page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));

      // Store exit X position
      const exitX = Math.random() * dimensions.width;
      
      // Exit from top edge
      const exitPoint = {
        x: exitX,
        y: 0
      };

      // Move mouse to exit point
      await this.moveMouseHumanlike(exitPoint.x, exitPoint.y);

      // Dispatch mouseleave event
      await this.page.evaluate(() => {
        const event = new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        document.dispatchEvent(event);
      });

      // Trigger blur event
      await this.page.evaluate(() => {
        window.dispatchEvent(new Event('blur'));
      });

      // Use randomDuration instead of timeOutside
      console.log(`Stepping out of window for ${Math.round(randomDuration)}ms`);
      await new Promise(resolve => setTimeout(resolve, randomDuration));

      // Trigger focus event to "come back"
      await this.page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Random delay before moving mouse
      const moveDelay = Math.floor(Math.random() * (moveBackDelay.max - moveBackDelay.min)) + moveBackDelay.min;
      await new Promise(resolve => setTimeout(resolve, moveDelay));

      // Calculate new X position at least 200px away from exit position
      let returnX;
      do {
        returnX = Math.random() * dimensions.width;
      } while (Math.abs(returnX - exitX) < 200); // Ensure at least 200px difference

      // Update mouse state with new position before random movements
      this.mouseState.currentX = returnX;
      this.mouseState.currentY = 0;

      // Move mouse back with random movements from new position
      await this.handleRandomMouseMovement({
        duration: 2000,
        minDelay: 50,
        maxDelay: 200,
        margin: 100
      });

    } catch (err) {
      console.error('Error in handleStepOutWindow:', err);
      throw err;
    }
  }

  // Add the press enter handler
  async handlePressEnter(step) {
    const {
      delay = { min: 50, max: 200 },  // Random delay before pressing Enter
      holdDuration = { min: 50, max: 150 }  // How long to hold the key
    } = step;

    try {
      // Random delay before pressing
      const preDelay = Math.floor(Math.random() * (delay.max - delay.min)) + delay.min;
      await new Promise(resolve => setTimeout(resolve, preDelay));

      // Calculate hold duration
      const duration = Math.floor(Math.random() * (holdDuration.max - holdDuration.min)) + holdDuration.min;

      // Press Enter
      await this.page.keyboard.down('Enter');
      
      // Hold for random duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Release Enter
      await this.page.keyboard.up('Enter');

      console.log(`Pressed Enter (held for ${duration}ms)`);

    } catch (err) {
      console.error('Error pressing Enter:', err);
      throw err;
    }
  }

  // Add the new method
  async handleHumanLikeTextExtraction(step) {
    const { selector, xpath } = step;

    try {
      // Find the element
      const element = xpath ? 
        await this.page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 }) :
        await this.page.waitForSelector(selector, { timeout: 5000 });

      if (!element) {
        throw new ElementNotFoundError(selector, xpath);
      }

      // Scroll element into view and get its position
      const box = await this.scrollElementIntoViewIfNeeded(element);
      
      // Get the text content
      const text = await this.page.evaluate(el => el.textContent, element);

      // Simulate reading with mouse movements
      const numPoints = Math.floor(text.length / 50) + 2; // One point per ~50 chars
      const points = [];

      // Generate points along the text (left to right, top to bottom)
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: box.x + (box.width * (i / (numPoints - 1))),
          y: box.y + (box.height * 0.5 + (Math.random() - 0.5) * 10) // Small vertical variation
        });
      }

      // Move through each point with human-like motion
      for (const point of points) {
        await this.moveMouseHumanlike(point.x, point.y);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
      }

      return text;

    } catch (err) {
      if (err instanceof ElementNotFoundError) {
        console.log('\nSmoothly stopping process:', err.message);
        throw err;
      }
      console.error('Error in text extraction:', err);
      throw err;
    }
  }

  // Add the new method
  async handleInsertData(step) {
    const { selector, xpath, text, randomDelay = { min: 100, max: 300 } } = step;

    try {
      // Find the element
      const element = xpath ? 
        await this.page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 }) :
        await this.page.waitForSelector(selector, { timeout: 5000 });

      if (!element) {
        throw new ElementNotFoundError(selector, xpath);
      }

      // Get element position and scroll into view
      const box = await this.scrollElementIntoViewIfNeeded(element);

      // Get click position using our helper function
      const { x, y } = this.getPointPosition(box);

      // Move mouse to input field
      console.log(`\n🖱️  Moving to input at position: x=${Math.round(x)}, y=${Math.round(y)}`);
      await this.moveMouseHumanlike(x, y);

      // Small delay before clicking
      await new Promise(resolve => setTimeout(resolve, 
        Math.floor(Math.random() * 200) + 100
      ));

      // Click the element
      await this.page.mouse.click(x, y);

      // Small delay before typing
      await new Promise(resolve => setTimeout(resolve, 
        Math.floor(Math.random() * randomDelay.max - randomDelay.min) + randomDelay.min
      ));

      // Type the text with random delays between keystrokes
      await element.type(text, { delay: Math.floor(Math.random() * 100) + 50 });

    } catch (err) {
      if (err instanceof ElementNotFoundError) {
        console.log('\nFailed to find input element:', err.message);
        throw err;
      }
      console.error('Error in text insertion:', err);
      throw err;
    }
  }

  // Add this helper method
  async scrollElementIntoViewIfNeeded(element) {
    try {
      // Get initial element position
      const getElementPosition = async (el) => {
        const rect = await el.boundingBox();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      };

      // Check if element is in viewport
      const isVisible = await this.page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
        const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
        const verticalPadding = viewHeight * 0.2; // 20% padding
        const horizontalPadding = viewWidth * 0.2; // 20% padding
        
        return (
          rect.top >= -verticalPadding &&
          rect.left >= -horizontalPadding &&
          rect.bottom <= viewHeight + verticalPadding &&
          rect.right <= viewWidth + horizontalPadding
        );
      }, element);
  
      // If already visible, return current position
      if (isVisible) {
        return await getElementPosition(element);
      }

      // If not visible, scroll then return new position
      const { targetX, targetY } = await this.page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        const absoluteLeft = window.scrollX + rect.left;
        const randomVertical = (Math.random() - 0.5) * 100;
        const randomHorizontal = (Math.random() - 0.5) * 100;
        return {
          targetY: absoluteTop - (window.innerHeight / 2) + randomVertical,
          targetX: absoluteLeft - (window.innerWidth / 2) + randomHorizontal
        };
      }, element);
  
      // Perform smooth scrolling
      await this.page.evaluate(
        async (targetX, targetY) => {
          function easeOutQuad(t) {
            return t * (2 - t);
          }
  
          // Get current scroll positions
          const startX = window.scrollX;
          const startY = window.scrollY;
          const diffX = targetX - startX;
          const diffY = targetY - startY;
  
          // Define the scroll duration (randomized between 800 and 1500ms)
          const duration = Math.floor(Math.random() * 700) + 800;
          const startTime = performance.now();
  
          return new Promise(resolve => {
            function step(currentTime) {
              const elapsed = currentTime - startTime;
              const t = Math.min(elapsed / duration, 1); // Normalize time to [0, 1]
              const easedT = easeOutQuad(t);
  
              // Calculate new positions
              const currentX = startX + diffX * easedT;
              const currentY = startY + diffY * easedT;
  
              window.scrollTo(currentX, currentY);
  
              // Optionally add a small random pause at some intervals (simulate human hesitation)
              if (t < 1) {
                requestAnimationFrame(step);
              } else {
                // Optionally, overshoot slightly and then correct
                const overshootX = currentX + (Math.random() - 0.5) * 20;
                const overshootY = currentY + (Math.random() - 0.5) * 20;
                window.scrollTo(overshootX, overshootY);
                setTimeout(() => {
                  window.scrollTo(targetX, targetY);
                  resolve();
                }, Math.floor(Math.random() * 150) + 50);
              }
            }
            requestAnimationFrame(step);
          });
        },
        targetX,
        targetY
      );
  
      // Wait after scrolling
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 500));

      // Return final position
      return await getElementPosition(element);

    } catch (err) {
      console.error('Error in scrollElementIntoViewIfNeeded:', err);
      throw err;
    }
  }

  async handleExtractList(step) {
    const {
      listSelector,
      listXPath,
      itemXPath,
      extractFields = [],
      randomDelay = { min: 500, max: 1500 },
      mouseMovement = {
        enabled: true,
        hoverTime: { min: 300, max: 1000 }  // How long to hover over each item
      }
    } = step;

    try {
      // Find the list container
      let listElement;
      if (listXPath) {
        listElement = await this.page.waitForSelector(`::-p-xpath(${listXPath})`, {
          timeout: 5000
        }).catch(() => null);
      } else if (listSelector) {
        listElement = await this.page.$(listSelector);
      }

      if (!listElement) {
        throw new ElementNotFoundError(listSelector, listXPath);
      }

      // Get all items using waitForSelector
      const items = await this.page.$$eval(`::-p-xpath(${itemXPath})`, elements => {
        return elements.map(el => el.outerHTML);
      });
      console.log(`Found ${items.length} items to extract`);

      const results = [];
      for (let i = 0; i < items.length; i++) {
        // Get the current item element
        const item = await this.page.waitForSelector(`::-p-xpath(${itemXPath})[${i + 1}]`, {
          timeout: 2000
        }).catch(() => null);

        if (!item) continue;


        const box = await this.scrollElementIntoViewIfNeeded(item);

          // Move mouse over item if enabled
        if (mouseMovement.enabled && box) {
          // Calculate points using getPointPosition
          const points = [
            this.getPointPosition({
              x: box.x,
              y: box.y,
              width: box.width * 0.4,  // Use first 40% of box
              height: box.height * 0.4
            }),
            this.getPointPosition({
              x: box.x + box.width * 0.3,
              y: box.y + box.height * 0.3,
              width: box.width * 0.4,  // Use middle 40% of box
              height: box.height * 0.4
            }),
            this.getPointPosition({
              x: box.x + box.width * 0.6,
              y: box.y + box.height * 0.6,
              width: box.width * 0.4,  // Use last 40% of box
              height: box.height * 0.4
            })
          ];

          // Move through the points
          for (const point of points) {
            await this.moveMouseHumanlike(point.x, point.y);
            await new Promise(resolve => setTimeout(resolve, 
              Math.random() * (mouseMovement.hoverTime.max - mouseMovement.hoverTime.min) + 
              mouseMovement.hoverTime.min
            ));
          }
        }

        // Random delay between items
        const delay = Math.floor(Math.random() * (randomDelay.max - randomDelay.min)) + randomDelay.min;
        await new Promise(resolve => setTimeout(resolve, delay));
        

        // Extract each field for the current item
        const itemData = {};
        for (const field of extractFields) {
          try {
            const fieldElement = await this.page.waitForSelector(
              `::-p-xpath(${itemXPath})[${i + 1}]${field.xpath}`,
              { timeout: 2000 }
            ).catch(() => null);

            if (fieldElement) {
              const text = await this.page.evaluate(el => el.textContent.trim(), fieldElement);
              itemData[field.name] = text;
            }
          } catch (fieldErr) {
            console.log(`Warning: Could not extract field ${field.name} for item ${i + 1}`);
            itemData[field.name] = null;
          }
        }
        
        results.push(itemData);
      }

      return results;

    } catch (err) {
      if (err instanceof ElementNotFoundError) {
        console.log('\nList container not found:', err.message);
        throw err;
      }
      console.error('Error extracting list data:', err);
      throw err;
    }
  }

  async handleListLoop(step) {
    const {
      listSelector,
      listXPath,
      itemXPath,
      stepsPerItem = [],
      mouseMovement = {
        enabled: true,
        hoverTime: { min: 300, max: 1000 }
      },
      randomDelay = { min: 500, max: 1500 }
    } = step;

    try {
      // Find the list container
      let listElement;
      if (listXPath) {
        listElement = await this.page.waitForSelector(`::-p-xpath(${listXPath})`, {
          timeout: 5000
        }).catch(() => null);
      } else if (listSelector) {
        listElement = await this.page.$(listSelector);
      }

      if (!listElement) {
        throw new ElementNotFoundError(listSelector, listXPath);
      }

      // Get first item's full XPath for conversion
      const firstItemFullXPath = `${listXPath}${itemXPath}[1]`;

      // Convert substeps' XPaths to relative paths
      const normalizedSteps = stepsPerItem.map(subStep => {
        const modifiedStep = { ...subStep };

        // Handle regular xpath property
        if (subStep.xpath) {
          modifiedStep.xpath = getRelativeXPath(firstItemFullXPath, subStep.xpath);
        }

        // Handle EXTRACT type with multiple xpaths
        if (subStep.type === STEP_TYPES.EXTRACT && subStep.extracts) {
          modifiedStep.extracts = subStep.extracts.map(extract => ({
            ...extract,
            xpath: extract.xpath ? getRelativeXPath(firstItemFullXPath, extract.xpath) : extract.xpath
          }));
        }

        return modifiedStep;
      });

      // Get count of items
      const itemCount = await this.page.$$eval(`::-p-xpath(${listXPath}${itemXPath})`, elements => elements.length);
      console.log(`Found ${itemCount} items to process`);

      const results = [];
      
      // Process each item
      for (let i = 0; i < itemCount; i++) {
        console.log(`\nProcessing item ${i + 1}/${itemCount}`);
        
        // Get current item
        const currentItemXPath = `${listXPath}${itemXPath}[${i + 1}]`;
        const item = await this.page.waitForSelector(`::-p-xpath(${currentItemXPath})`, {
          timeout: 2000
        }).catch(() => null);

        if (!item) {
          console.log(`Warning: Could not find item ${i + 1}`);
          continue;
        }

        // Scroll item into view and handle mouse movement
        const box = await this.scrollElementIntoViewIfNeeded(item);
        
        if (mouseMovement.enabled && box) {
          // Calculate points using getPointPosition
          const points = [
            this.getPointPosition({
              x: box.x,
              y: box.y,
              width: box.width * 0.4,  // Use first 40% of box
              height: box.height * 0.4
            }),
            this.getPointPosition({
              x: box.x + box.width * 0.3,
              y: box.y + box.height * 0.3,
              width: box.width * 0.4,  // Use middle 40% of box
              height: box.height * 0.4
            }),
            this.getPointPosition({
              x: box.x + box.width * 0.6,
              y: box.y + box.height * 0.6,
              width: box.width * 0.4,  // Use last 40% of box
              height: box.height * 0.4
            })
          ];

          // Move through the points
          for (const point of points) {
            await this.moveMouseHumanlike(point.x, point.y);
            await new Promise(resolve => setTimeout(resolve, 
              Math.random() * (mouseMovement.hoverTime.max - mouseMovement.hoverTime.min) + 
              mouseMovement.hoverTime.min
            ));
          }
        }

        // Execute each normalized step for this item
        const itemResults = {};
        for (const subStep of normalizedSteps) {
          try {
            const modifiedStep = { ...subStep };

            if (subStep.type === STEP_TYPES.EXTRACT && subStep.extracts) {
              // Handle EXTRACT type with multiple selectors/xpaths
              modifiedStep.extracts = subStep.extracts.map(extract => ({
                ...extract,
                // If xpath is provided, make it relative to current item
                xpath: extract.xpath ? `${currentItemXPath}/${extract.xpath.replace('./', '')}` : undefined,
                // If selector is provided, scope it to current item
                selector: extract.selector ? `[data-item-index="${i}"] ${extract.selector}` : undefined
              }));
            } else {
              // Handle regular xpath/selector properties
              modifiedStep.xpath = subStep.xpath ? 
                `${currentItemXPath}/${subStep.xpath.replace('./', '')}` : undefined;
              modifiedStep.selector = subStep.selector ? 
                `[data-item-index="${i}"] ${subStep.selector}` : undefined;
            }

            // Add data-item-index to the current item for selector scoping
            await this.page.evaluate((itemEl, index) => {
              itemEl.setAttribute('data-item-index', index);
            }, item, i);

            const result = await this.executeStep(modifiedStep);
            if (result != null) {
              itemResults[subStep.type] = result;
            }
          } catch (stepErr) {
            console.log(`Warning: Step ${subStep.type} failed for item ${i + 1}:`, stepErr.message);
          }
        }
        

        results.push(itemResults);

        // Random delay between items
        const delay = Math.floor(Math.random() * (randomDelay.max - randomDelay.min)) + randomDelay.min;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return results;

    } catch (err) {
      if (err instanceof ElementNotFoundError) {
        console.log('\nList container not found:', err.message);
        throw err;
      }
      console.error('Error in list loop:', err);
      throw err;
    }
  }

  async handleRefreshPage(step) {
    const {
      waitUntil = 'networkidle2',
      timeout = 30000,
      randomDelay = { min: 1000, max: 3000 }
    } = step;

    try {
      console.log('\n🔄 Refreshing page...');

      // Random delay before refresh
      const preDelay = Math.floor(Math.random() * (randomDelay.max - randomDelay.min)) + randomDelay.min;
      await new Promise(resolve => setTimeout(resolve, preDelay));

      // Save current cookies
      console.log('📝 Saving cookies...');
      const cookies = await this.page.cookies();

      // Refresh the page
      await this.page.reload({ waitUntil, timeout });

      // Restore cookies using evaluate for better performance
      console.log('🔄 Restoring cookies...');
      await this.page.evaluate((cookiesArray) => {
        cookiesArray.forEach(cookie => {
          document.cookie = `${cookie.name}=${cookie.value}`;
        });
      }, cookies);

      // Wait for navigation to complete
      await this.page.waitForNavigation({ 
        waitUntil, 
        timeout 
      }).catch(() => console.log('Navigation timeout - continuing...'));

      // Random delay after refresh
      const postDelay = Math.floor(Math.random() * (randomDelay.max - randomDelay.min)) + randomDelay.min;
      await new Promise(resolve => setTimeout(resolve, postDelay));

      console.log('✅ Page refreshed successfully with cookies preserved');
      
    } catch (err) {
      if (err.name === 'TimeoutError') {
        console.log('\n⚠️  Refresh timeout - continuing execution...');
        await this.page.waitForTimeout(1000);
      } else {
        console.error('❌ Error refreshing page:', err);
        throw err;
      }
    }
  }

}
