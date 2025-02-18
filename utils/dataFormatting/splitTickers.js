import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function splitTickers() {
    try {
        // Lire le fichier JSON
        const filePath = path.join(__dirname, '../enriched_mining_data.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Convertir les données
        const updatedData = data.map(item => {
            const { ticker, ...rest } = item;
            
            // Si le ticker est null ou vide, retourner des valeurs vides
            if (!ticker) {
                return {
                    ...rest,
                    exchange: '',
                    companyTicker: ''
                };
            }

            // Séparer le ticker en exchange et companyTicker
            const [exchange, companyTicker] = ticker.split(': ').map(s => s.trim());

            return {
                ...rest,
                exchange,
                companyTicker
            };
        });

        // Sauvegarder les données mises à jour
        const outputPath = path.join(__dirname, '../enriched_mining_data.json');
        fs.writeFileSync(
            outputPath,
            JSON.stringify(updatedData, null, 2),
            'utf-8'
        );

        // Statistiques
        const totalEntries = updatedData.length;
        const entriesWithExchange = updatedData.filter(item => item.exchange).length;

        console.log('Séparation des tickers terminée avec succès');
        console.log(`Fichier mis à jour: ${outputPath}`);
        console.log('\nStatistiques:');
        console.log(`- Total d'entrées: ${totalEntries}`);
        console.log(`- Entrées avec exchange: ${entriesWithExchange}`);
        console.log(`- Entrées sans exchange: ${totalEntries - entriesWithExchange}`);
        console.log(`- Pourcentage de couverture: ${((entriesWithExchange/totalEntries) * 100).toFixed(2)}%`);

        // Afficher les différents exchanges trouvés
        const exchanges = [...new Set(updatedData.map(item => item.exchange).filter(Boolean))];
        console.log('\nExchanges trouvés:');
        exchanges.forEach(exchange => {
            const count = updatedData.filter(item => item.exchange === exchange).length;
            console.log(`- ${exchange}: ${count} entrées`);
        });

    } catch (error) {
        console.error('Erreur lors de la séparation des tickers:', error);
    }
}

export default splitTickers;

// Si le fichier est exécuté directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    splitTickers();
} 