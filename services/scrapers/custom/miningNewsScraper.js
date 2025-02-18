import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility function to generate a random delay between min and max milliseconds.
 * @param {number} min - Minimum delay in milliseconds.
 * @param {number} max - Maximum delay in milliseconds.
 * @returns {Promise<void>}
 */
function randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}


class MiningNewsScraper {
    constructor() {
        this.baseUrl = 'https://www.juniorminingnetwork.com/mining-topics/';
    }

    extractCompanyName(title) {
        return title.split(/\s+/).slice(0, 2).join(' ');
    }

    async initialize() {
        this.browser = await puppeteer.launch({ 
            headless: 'new',  // Use new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
    }

    async scrapeNewsItems() {
        try {
            // -------------------------------
            // Initialize the Write Stream
            // -------------------------------
    
            // Define the path to the output JSON Lines file
            const outputFilePath = path.resolve(__dirname, 'newsItems.jsonl');
    
            // Create a write stream in append mode
            const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
    
            // Handle potential errors with the write stream
            writeStream.on('error', (err) => {
                console.error('Write Stream Error:', err);
            });
    
            // -------------------------------
            // Optimize the Main Page Navigation
            // -------------------------------
    
            // Enable request interception to block unnecessary resources on the main page
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                const resourceType = request.resourceType();
                // Define resources to block
                const blockedResources = ['image', 'stylesheet', 'font', 'media', 'script'];
                if (blockedResources.includes(resourceType)) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
    
            // Introduce a random delay before navigating to the base URL
            await randomDelay();
            await this.page.goto(this.baseUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
    
            // Wait for the news items to load
            await this.page.waitForSelector('.news-item');
            // Introduce a random delay after the selector is available
            await randomDelay();
    
            // Extract the list of news items
            const newsItems = await this.page.evaluate(() => {
                const items = document.querySelectorAll('.news-item');
                return Array.from(items).map(item => {
                    const dateElement = item.querySelector('.article-date');
                    const titleElement = item.querySelector('.article-title');
                    const linkElement = titleElement?.querySelector('a');
    
                    return {
                        title: titleElement?.textContent.trim() || '',
                        date: dateElement?.textContent.trim() || '',
                        link: linkElement?.href || '',
                        companyName: titleElement?.textContent.trim().split(/\s+/).slice(0, 2).join(' ') || ''
                    };
                });
            });
    
            // Disable request interception and remove listeners to clean up
            await this.page.setRequestInterception(false);
            this.page.removeAllListeners('request');
    
            // -----------------------------------
            // Set Up Concurrency and Fetch Content
            // -----------------------------------
    
            // Set up concurrency limit (e.g., 5 concurrent pages)
            const limit = pLimit(5);
    
            /**
             * Function to fetch content for a single news item with optimizations.
             * @param {Object} item - The news item object.
             * @returns {Promise<void>}
             */
            const fetchContent = async (item) => {
                if (item.link) {
                    let articlePage;
                    try {
                        // Introduce a random delay before processing each article
                        await randomDelay(1000, 3000);
    
                        // Open a new page for the article
                        articlePage = await this.browser.newPage();
    
                        // Optimize the article page by blocking unnecessary resources
                        await articlePage.setRequestInterception(true);
                        articlePage.on('request', (request) => {
                            const resourceType = request.resourceType();
                            const blockedResources = ['image', 'stylesheet', 'font', 'media'];
                            if (blockedResources.includes(resourceType)) {
                                request.abort();
                            } else {
                                request.continue();
                            }
                        });
    
                        // Introduce a random delay before navigating to the article URL
                        await randomDelay();
                        await articlePage.goto(item.link, { 
                            waitUntil: 'networkidle2', 
                            timeout: 30000 
                        });
    
                        // Wait for the <article> element to load
                        await articlePage.waitForSelector('article');
                        // Introduce a random delay after the article is loaded
                        await randomDelay();
    
                        // Extract the innerText from the <article> element
                        const content = await articlePage.$eval('article', el => el.innerText.trim());
    
                        // Assign the extracted content to the news item
                        item.content = content;
    
                        // -------------------------------
                        // Write the News Item to the File
                        // -------------------------------
    
                        // Convert the news item object to a JSON string
                        const jsonString = JSON.stringify({
                            title: item.title,
                            date: item.date,
                            link: item.link,
                            companyName: item.companyName,
                            content: item.content
                        });
    
                        // Write the JSON string followed by a newline to the file
                        writeStream.write(jsonString + '\n');
    
                    } catch (err) {
                        console.error(`Failed to fetch content for ${item.link}:`, err);
                        // Assign an empty string or handle as needed
                        item.content = '';
    
                        // Optionally, write the item with empty content to the file
                        const jsonString = JSON.stringify({
                            title: item.title,
                            date: item.date,
                            link: item.link,
                            companyName: item.companyName,
                            content: item.content
                        });
    
                        writeStream.write(jsonString + '\n');
                    } finally {
                        if (articlePage) {
                            // Ensure that the article page is closed even if an error occurs
                            await articlePage.close();
                        }
                    }
                } else {
                    // Handle cases where the link is missing
                    item.content = '';
    
                    // Write the item with empty content to the file
                    const jsonString = JSON.stringify({
                        title: item.title,
                        date: item.date,
                        link: item.link,
                        companyName: item.companyName,
                        content: item.content
                    });
    
                    writeStream.write(jsonString + '\n');
                }
            };
    
            // Map news items to limited fetch operations with controlled concurrency
            const fetchPromises = newsItems.map(item => limit(() => fetchContent(item)));
    
            // Wait for all fetch operations to complete
            await Promise.all(fetchPromises);
    
            // -------------------------------
            // Close the Write Stream
            // -------------------------------
    
            // End the write stream to ensure all data is flushed and the file is properly closed
            writeStream.end();
    
            // Optionally, return a confirmation or summary
            console.log(`Scraping completed. Data saved to ${outputFilePath}`);
    
            // If you still want to return the newsItems array (excluding content to save memory), you can do so
            // return newsItems.map(({ content, ...rest }) => rest);
    
        } catch (error) {
            console.error('Error scraping news items:', error);
            throw error;
        }
    }

}

async function scrapeNews() {
    const scraper = new MiningNewsScraper();
    try {
        await scraper.initialize();
        const data = await scraper.scrapeNewsItems();
        return data;
    } finally {
        await scraper.close();
    }
}

export { scrapeNews };
