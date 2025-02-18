import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixJsonFile(inputPath, outputPath) {
    // Lire le fichier
    let content = fs.readFileSync(inputPath, 'utf8');
    
    // Remplacer les propriétés sans guillemets par des propriétés avec guillemets
    content = content.replace(/title:/g, '"title":');
    content = content.replace(/date:/g, '"date":');
    content = content.replace(/companyName:/g, '"companyName":');
    content = content.replace(/companyTicker:/g, '"companyTicker":');
    
    // Charger le JSON pour le reformater proprement
    const data = JSON.parse(content);
    
    // Écrire le JSON formaté
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

export default fixJsonFile;

// Utilisation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    fixJsonFile('server/utils/mining_data.txt', 'server/mining_data_fixed.json');
}