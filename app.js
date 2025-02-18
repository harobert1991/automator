import express from 'express';
import config from './config/config.js';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import logger from './utils/appUtils/logger.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import runProcess6 from './services/scrapers/process6.js';

// Importer les routes générées
import scraperRoutes from './routes/scraperRoutes.js';

import bodyParser from 'body-parser';


const app = express();

const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Finance Agent API',
        version: '1.0.0',
        description: 'API pour la gestion des articles, compagnies, catégories et prix de stock.',
      },
    },
    apis: ['./routes/*.js'], // Chemin vers les fichiers contenant la documentation des routes
  };

const specs = swaggerJsdoc(options);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


dotenv.config();

// Connexion à la base de données
connectDB();

// Utiliser les routes
app.use('/scraper', scraperRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


runProcess6();


// Route par défaut
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API Finance Agent');
});

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur' });
});


// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});