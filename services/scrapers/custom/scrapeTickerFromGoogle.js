import { chromium } from 'playwright';

async function scrapeGoogleCompanyTickers(companies) {
  const browser = await chromium.launch({
    headless: false,
    defaultViewport: {
      width: 1280,
      height: 800
    }
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const results = [];

    for (const company of companies) {
      try {
        // Aller sur Google
        await page.goto('https://www.google.com');

        // Gérer le bouton de consentement (seulement pour la première itération si nécessaire)
        try {
          const consentButton = page.locator('xpath=/html/body/div[2]/div[2]/div[3]/span/div/div/div/div[3]/div[1]/button[2]');
          await consentButton.waitFor({ state: 'visible', timeout: 5000 });
          await consentButton.click();
          await page.waitForTimeout(2000);
        } catch (error) {
          console.log('Bouton de consentement non trouvé ou déjà accepté');
        }

        // Recherche pour chaque entreprise
        const textareaLocator = page.locator(
          'xpath=/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div[1]/div[2]/textarea'
        );
        await textareaLocator.waitFor({ state: 'visible' });
        await textareaLocator.fill(`${company.companyName} ticker`);
        await page.waitForTimeout(1000);
        await textareaLocator.press('Enter');
        await page.waitForLoadState('networkidle');

        // Extraction du ticker
        let extractedData = null;
        const resultLocator = page.locator(
          'xpath=/html/body/div[3]/div/div[13]/div[2]/div/div/div/div/div/div/div[3]/div/div[1]/div/div/div[2]/div[2]/div[1]/div/span'
        );

        try {
          await resultLocator.waitFor({ state: 'visible', timeout: 7000 });
          extractedData = await resultLocator.textContent();
        } catch (error) {
          console.error(`Impossible de trouver le ticker pour ${company.companyName}:`, error);
        }

        // Ajouter le résultat à l'objet company
        results.push({
          ...company,
          companyTicker: extractedData
        });

      } catch (error) {
        console.error(`Erreur lors du traitement de ${company.companyName}:`, error);
        results.push({
          ...company,
          companyTicker: null
        });
      }
    }

    return results;

  } finally {
    // Fermer le navigateur seulement après avoir traité toutes les entreprises
    await browser.close();
  }
}

export default scrapeGoogleCompanyTickers;