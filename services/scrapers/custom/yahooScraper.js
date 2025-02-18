import { chromium } from 'playwright';

async function scrapeYahooFinanceArticles(ticker) {
 // Liste des contenus d'articles
 const articleContents = [];
 // Pour stocker les URLs déjà visitées
 const processedUrls = new Set();
 
 console.log(`Le ticker est ${ticker}`);
 
 // Lance le navigateur en mode headless
 const browser = await chromium.launch({ headless: true });
 
 try {
   const page = await browser.newPage();
   
   try {
     // Va sur la page du ticker
     await page.goto(`https://finance.yahoo.com/quote/${ticker}/`, {
       waitUntil: 'domcontentloaded',
       timeout: 60000
     });

     // Petite pause pour laisser la page se stabiliser
     await page.waitForTimeout(2000);

     // Clique sur le bouton "Accepter" ou "Submit" si nécessaire
     await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
     await page.click('button[type="submit"]');
     
     // Attend que la section "news" soit visible
     await page.waitForSelector('#tabpanel-news div section', { timeout: 30000 });
     
     // Attend la fin du chargement (plus de skeleton-loader)
     await page.waitForFunction(() => {
       const loaders = document.querySelectorAll('[data-testid="skeleton-loader"]');
       const articles = document.querySelectorAll('#tabpanel-news div section > div');
       console.log(`Loaders restants: ${loaders.length}, Articles: ${articles.length}`);
       return loaders.length === 0 && articles.length > 0;
     }, { timeout: 24000, polling: 100 });
     
     // Récupère tous les liens des articles
     const articleLinks = await page.evaluate(() => {
       const articleElements = document.querySelectorAll('#tabpanel-news div section > a');
       return Array.from(articleElements)
         .map(link => link.href)
         .filter(href => href !== null && href !== '');
     });
     
     // Parcourt les liens et extrait le contenu
     for (const link of articleLinks) {
       // Vérifie si on a déjà visité ce lien
       if (processedUrls.has(link)) {
         continue;
       }
       
       try {
         await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
         await page.waitForTimeout(3000);
         
         // Extrait le texte de l'article
         const content = await page.evaluate(() => {
           const article = document.querySelector('div[data-testid="article-content-wrapper"]');
           return article ? article.innerText : null;
         });
         
         if (content) {
           articleContents.push(content);
           processedUrls.add(link);
           console.log(`Article ${articleContents.length} extrait`);
         }
         
         // Si on ne souhaite que les 2 premiers articles, on peut décommenter :
         // if (articleContents.length >= 2) {
         //   break;
         // }
       } catch (e) {
         console.log(`Erreur lors du scraping de l'article ${link}: ${e.message}`);
         continue;
       }
     }
     
   } catch (error) {
     console.log(`Erreur lors du scraping de ${ticker}: ${error.message}`);
   } finally {
     // Ferme l'onglet
     await page.close();
   }
 } finally {
   // Ferme le navigateur
   await browser.close();
 }
 
 // Affiche le contenu récupéré
 console.log(articleContents);
 return articleContents
}

export { scrapeYahooFinanceArticles };