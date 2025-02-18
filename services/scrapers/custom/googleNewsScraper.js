import { chromium } from 'playwright';

class GoogleNewsScraper {
    constructor(options = {}) {
        this.options = {
            headless: true,
            maxPages: 3,
            articleWaitTime: 2000,
            ...options
        };
    }

    async initialize() {
        this.browser = await chromium.launch({
            headless: this.options.headless
        });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
    }

    async handleConsent() {
        try {
            const consentButton = this.page.locator('xpath=/html/body/div[2]/div[2]/div[3]/span/div/div/div/div[3]/div[1]/button[2]');
            await consentButton.click({ timeout: 5000 });
            await this.page.waitForTimeout(1000);
        } catch (error) {
            // Consent already given or button not found
        }
    }

    async searchNews(companyName) {
        await this.page.goto('https://www.google.com');
        await this.handleConsent();

        const searchBox = this.page.locator('textarea[name="q"]');
        await searchBox.fill(`${companyName} news`);
        await searchBox.press('Enter');
        await this.page.waitForLoadState('networkidle');
    }

    async scrapeArticles() {
        const articles = [];
        
        for (let page = 1; page <= this.options.maxPages; page++) {
            const pageArticles = await this._scrapeCurrentPage(page);
            articles.push(...pageArticles);

            if (page < this.options.maxPages) {
                if (!await this._goToNextPage(page)) break;
            }
        }

        return articles;
    }

    async close() {
        await this.browser?.close();
    }
}

async function scrapeGoogleCompanyNews(companyName, options = {}) {
    const scraper = new GoogleNewsScraper(options);
    try {
        await scraper.initialize();
        await scraper.searchNews(companyName);
        return await scraper.scrapeArticles();
    } finally {
        await scraper.close();
    }
}

export default scrapeGoogleCompanyNews;
