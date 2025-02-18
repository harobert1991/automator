import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exportToCsv() {
    try {
        // Lire le fichier JSON
        const filePath = path.join(__dirname, '../enriched_mining_data.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Définir les en-têtes CSV
        const headers = ['Date', 'Company Name', 'Exchange', 'Company Ticker', 'Title', 'Link'];

        // Convertir les données en format CSV
        const csvRows = [];
        
        // Ajouter les en-têtes
        csvRows.push(headers.join(','));

        // Ajouter les données
        data.forEach(item => {
            const row = [
                `"${item.date}"`,
                `"${item.companyName.replace(/"/g, '""')}"`, // Échapper les guillemets dans les noms
                `"${item.exchange || ''}"`,
                `"${item.companyTicker || ''}"`,
                `"${item.title.replace(/"/g, '""')}"`, // Échapper les guillemets dans les titres
                `"${item.link}"`
            ];
            csvRows.push(row.join(','));
        });

        // Écrire le fichier CSV
        const outputPath = path.join(__dirname, '../mining_data.csv');
        fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf-8');

        // Statistiques
        const totalEntries = data.length;
        const entriesWithTicker = data.filter(item => item.companyTicker).length;
        const uniqueExchanges = [...new Set(data.map(item => item.exchange).filter(Boolean))];
        
        console.log('Export CSV terminé avec succès');
        console.log(`Fichier sauvegardé: ${outputPath}`);
        console.log('\nStatistiques:');
        console.log(`- Total d'entrées: ${totalEntries}`);
        console.log(`- Entrées avec ticker: ${entriesWithTicker}`);
        console.log(`- Entrées sans ticker: ${totalEntries - entriesWithTicker}`);
        console.log(`- Pourcentage de couverture: ${((entriesWithTicker/totalEntries) * 100).toFixed(2)}%`);
        
        console.log('\nRépartition par exchange:');
        uniqueExchanges.forEach(exchange => {
            const count = data.filter(item => item.exchange === exchange).length;
            console.log(`- ${exchange}: ${count} entrées (${((count/totalEntries) * 100).toFixed(2)}%)`);
        });

    } catch (error) {
        console.error('Erreur lors de l\'export en CSV:', error);
    }
}

// Exporter la fonction
export default exportToCsv;

// Si le fichier est exécuté directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    exportToCsv();
}