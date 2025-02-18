import generateRoutes from '../utils/appUtils/routeGenerator.js';
import { scrapeNews } from '../services/scrapers/custom/miningNewsScraper.js';
import scrapeGoogleCompanyNews from '../services/scrapers/custom/googleNewsScraper.js';
import { scrapeYahooFinanceArticles } from '../services/scrapers/custom/yahooScraper.js';
import scrapeTickerFromGoogle from '../services/scrapers/custom/scrapeTickerFromGoogle.js';
import { scrapeYoutubeSubtitles } from '../services/scrapers/custom/youtubeSubtitlesScraper.js';

const scraperRoutes = [
    {
        path: '/mining-news',
        method: 'get',
        handler: async () => await scrapeNews(),
        cache: {
            duration: 3600,
            keyFn: () => 'mining-news'
        },
        description: 'Fetch latest mining news'
    },
    {
        path: '/google-news/:companyName',
        method: 'get',
        handler: async (req) => await scrapeGoogleCompanyNews(req.params.companyName),
        inputType: {
            type: 'params',
            validation: {
                companyName: { required: true, type: 'string' }
            }
        },
        cache: {
            duration: 3600,
            keyFn: (req) => `google-news-${req.params.companyName}`
        },
        description: 'Fetch Google news for a specific company'
    },
    {
        path: '/company-tickers',
        method: 'post',
        handler: async (req) => await scrapeTickerFromGoogle(req.body.companies),
        inputType: {
            type: 'body',
            validation: {
                companies: { required: true, type: 'object' }
            }
        },
        rateLimit: {
            windowMs: 30 * 60 * 1000, // 30 minutes
            max: 50 // 50 requests per 30 minutes
        },
        description: 'Get tickers for a list of companies'
    },
    {
        path: '/youtube-subtitles',
        method: 'get',
        handler: async (req) => await scrapeYoutubeSubtitles(req.query.url, req.query.lang),
        inputType: {
            type: 'query',
            validation: {
                url: { required: true, type: 'string' },
                lang: { 
                    required: false, 
                    type: 'string', 
                    default: 'en',
                    nullable: true  // Add this to allow null/undefined values
                }
            }
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        description: 'Fetch subtitles from a YouTube video'
    }
];

export default generateRoutes(scraperRoutes); 