import { getSubtitles } from 'youtube-captions-scraper';
import logger from '../../../utils/appUtils/logger.js';

function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            // Handle youtube.com URLs
            const searchParams = new URLSearchParams(urlObj.search);
            return searchParams.get('v');
        } else if (urlObj.hostname === 'youtu.be') {
            // Handle youtu.be URLs
            return urlObj.pathname.slice(1);
        }
        throw new Error('Invalid YouTube URL');
    } catch (error) {
        throw new Error('Invalid URL format');
    }
}

/**
 * Scrapes YouTube video subtitles and returns a standardized response
 * @param {string} videoUrl - The YouTube video URL
 * @param {string} [lang='en'] - The language code for subtitles
 * @returns {Object} Response object with the following structure:
 * {
 *   success: boolean,
 *   data?: {
 *     videoId: string,
 *     language: string,
 *     fullText: string,
 *     captions?: Array<{start: string, dur: string, text: string}>
 *   },
 *   error?: string
 * }
 */
export async function scrapeYoutubeSubtitles(videoUrl, lang = 'en') {
    try {
        const videoID = extractVideoId(videoUrl);
        
        if (!videoID) {
            return {
                success: false,
                error: 'Could not extract video ID from URL',
                data: {
                    videoId: null,
                    language: lang,
                    fullText: ''
                }
            };
        }

        const captions = await getSubtitles({
            videoID,
            lang
        });

        // Check if captions array is empty or undefined
        if (!captions || captions.length === 0) {
            return {
                success: false,
                error: `No subtitles available for this video in language: ${lang}`,
                data: {
                    videoId: videoID,
                    language: lang,
                    fullText: ''
                }
            };
        }

        // Concatenate all texts together, filtering out [Music] tags and empty strings
        const fullText = captions
            .map(caption => caption.text)
            .filter(text => text && !text.includes('[Music]'))
            .join(' ');

        // Standard success response format
        return {
            success: true,
            data: {
                videoId: videoID,
                language: lang,
                fullText,
                captions: captions
            }
        };

    } catch (error) {
        // Handle specific error cases
        if (error.message.includes('Could not find automatic captions')) {
            return {
                success: false,
                error: `No automatic captions available for this video in language: ${lang}`,
                data: {
                    videoId: videoID,
                    language: lang,
                    fullText: ''
                }
            };
        }

        if (error.message.includes('Status code: 403')) {
            return {
                success: false,
                error: 'Access to video captions is forbidden. The video might be private or region-restricted.',
                data: {
                    videoId: null,
                    language: lang,
                    fullText: ''
                }
            };
        }

        logger.error(`Error scraping YouTube subtitles: ${error.message}`);
        return {
            success: false,
            error: error.message,
            data: {
                videoId: null,
                language: lang,
                fullText: ''
            }
        };
    }
} 