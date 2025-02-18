import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertDates() {
    try {
        // Lire le fichier de données
        const filePath = path.join(__dirname, '../enriched_mining_data.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Fonction pour convertir une date
        function formatDate(dateStr) {
            const months = {
                'January': '01',
                'February': '02',
                'March': '03',
                'April': '04',
                'May': '05',
                'June': '06',
                'July': '07',
                'August': '08',
                'September': '09',
                'October': '10',
                'November': '11',
                'December': '12'
            };

            // Extraire les composants de la date
            const [month, day, year] = dateStr.split(' ');
            const dayNum = day.replace(',', '').padStart(2, '0');
            const monthNum = months[month];

            return `${dayNum}-${monthNum}-${year}`;
        }

        // Convertir les dates
        const updatedData = data.map(item => ({
            ...item,
            date: formatDate(item.date)
        }));

        // Sauvegarder les données mises à jour
        const outputPath = path.join(__dirname, '../enriched_mining_data.json');
        fs.writeFileSync(
            outputPath,
            JSON.stringify(updatedData, null, 2),
            'utf-8'
        );

        console.log('Dates converties avec succès');
        console.log(`Format: DD-MM-YYYY`);
        console.log(`Fichier mis à jour: ${outputPath}`);

    } catch (error) {
        console.error('Erreur lors de la conversion des dates:', error);
    }
}

export default convertDates;

// Si le fichier est exécuté directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    convertDates();
} 