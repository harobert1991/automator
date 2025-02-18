import express from 'express';
import cache from './cache.js';
import rateLimiter from '../../middleware/rateLimiter.js';
import rateLimit from 'express-rate-limit';

/**
 * Route configuration type:
 * {
 *   path: string,           // Route path (e.g., '/mining-news')
 *   method: string,         // HTTP method ('get', 'post', etc.)
 *   handler: Function,      // The actual function that processes the request
 *   inputType?: {          // Input validation schema
 *     type: string,        // 'params' | 'body' | 'query'
 *     validation: Object   // Validation rules with optional nullable and default values
 *   },
 *   cache?: {              // Cache configuration
 *     duration: number,    // Cache duration in seconds
 *     keyFn: Function     // Function to generate cache key
 *   },
 *   rateLimit?: {          // Rate limiting configuration
 *     windowMs: number,    // Time window in milliseconds
 *     max: number         // Maximum requests in window
 *   },
 *   description?: string   // Route description for documentation
 * }
 */

function generateRoutes(routeConfigs) {
    const router = express.Router();

    routeConfigs.forEach(config => {
        const {
            path,
            method,
            handler,
            inputType,
            cache: cacheConfig,
            rateLimit: rateLimitConfig,
            description
        } = config;

        // Create middleware array
        const middlewares = [];

        // Add rate limiting if configured
        if (rateLimitConfig) {
            const customLimiter = rateLimit({
                windowMs: rateLimitConfig.windowMs || 15 * 60 * 1000,
                max: rateLimitConfig.max || 100
            });
            middlewares.push(customLimiter);
        } else {
            middlewares.push(rateLimiter); // Use default rate limiter
        }

        // Create the route handler
        const routeHandler = async (req, res) => {
            try {
                // Input validation
                if (inputType) {
                    const input = req[inputType.type];
                    const validationResult = validateInput(input, inputType.validation);
                    if (!validationResult.isValid) {
                        return res.status(400).json({ 
                            error: 'Invalid input', 
                            details: validationResult.errors 
                        });
                    }
                }

                // Cache handling
                if (cacheConfig) {
                    const cacheKey = cacheConfig.keyFn(req);
                    const cachedData = cache.get(cacheKey);
                    
                    if (cachedData) {
                        return res.json(cachedData);
                    }

                    const data = await handler(req, res);
                    cache.set(cacheKey, data, cacheConfig.duration);
                    return res.json(data);
                }

                // Regular handling without cache
                const data = await handler(req, res);
                return res.json(data);

            } catch (error) {
                console.error(`Error in ${path}:`, error);
                return res.status(500).json({ 
                    error: 'Internal server error',
                    path,
                    message: error.message 
                });
            }
        };

        // Register the route
        router[method](path, ...middlewares, routeHandler);

        // Log route registration
        console.log(`Route registered: ${method.toUpperCase()} ${path}${description ? ` - ${description}` : ''}`);
    });

    return router;
}

// Helper function for input validation
function validateInput(input, rules) {
    const errors = [];
    
    Object.entries(rules).forEach(([field, rule]) => {
        const value = input[field];
        const valueExists = value !== undefined && value !== '';

        // Handle required fields
        if (rule.required && !valueExists) {
            errors.push(`${field} is required`);
            return;
        }

        // Skip validation for nullable fields when value doesn't exist
        if (!valueExists) {
            if (rule.nullable) {
                // Apply default value if specified
                if (rule.default !== undefined) {
                    input[field] = rule.default;
                }
                return;
            }
        }

        // Type validation (only if value exists and field is not nullable or value is not null)
        if (valueExists && rule.type && typeof value !== rule.type) {
            errors.push(`${field} must be of type ${rule.type}`);
        }

        // Pattern validation (only if value exists)
        if (valueExists && rule.pattern && !rule.pattern.test(value)) {
            errors.push(`${field} has invalid format`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

export default generateRoutes; 