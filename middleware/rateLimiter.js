// middleware/rateLimiter.js

import rateLimit from 'express-rate-limit';

// Limiteur de taux par défaut
const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true, // Retourne les informations de limitation de taux dans les en-têtes
  legacyHeaders: false, // Désactive les en-têtes X-RateLimit*
});

export default defaultRateLimiter;