// scrapers/captchaSolver.js

import axios from 'axios';
import inquirer from 'inquirer';

/**
 * Detect a reCAPTCHA sitekey on the page or an element with known "captcha" presence.
 * This is a placeholder example. In practice, you'd parse HTML or check for
 * a script with "data-sitekey".
 */
export async function detectCaptcha(page) {
  const siteKey = await page.$eval(
    '[data-sitekey]',
    (el) => el.getAttribute('data-sitekey'),
  ).catch(() => null);

  // If there's no sitekey attribute, fallback to a simpler check:
  // const hasCaptcha = !!(await page.$('div.g-recaptcha, iframe[src*="api2/anchor"]'));
  // Return an object with the siteKey or null
  return siteKey;
}

/**
 * Solve captcha with 2Captcha
 * @param {puppeteer.Page} page
 * @param {string} siteKey
 * @param {string} pageUrl
 * @param {string} apiKey - Your 2captcha API key
 * 
 * Steps:
 * 1. Send sitekey + page URL to 2captcha
 * 2. Poll for completion
 * 3. Insert the token into "g-recaptcha-response"
 * 4. Trigger submission / use the token as needed
 */
export async function solveCaptchaWith2Captcha(page, siteKey, pageUrl, apiKey) {
  console.log('Solving captcha with 2Captcha...');

  // 1. Submit a request to 2captcha
  const createUrl = `http://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
  let resp = await axios.get(createUrl);
  if (resp.data.status !== 1) {
    throw new Error(`2Captcha in.php error: ${resp.data.request}`);
  }
  const captchaId = resp.data.request;

  // 2. Poll for the result
  let solvedToken = null;
  for (let i = 0; i < 20; i++) {
    // Wait 5 seconds between polls
    await new Promise((res) => setTimeout(res, 5000));

    const resUrl = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
    resp = await axios.get(resUrl);
    if (resp.data.status === 1) {
      solvedToken = resp.data.request;
      break;
    } else if (resp.data.request === 'CAPCHA_NOT_READY') {
      console.log('Captcha not ready, retrying...');
      continue;
    } else {
      throw new Error(`2Captcha res.php error: ${resp.data.request}`);
    }
  }
  if (!solvedToken) throw new Error('Failed to solve captcha in time.');

  // 3. Insert the token into the page
  await page.evaluate((token) => {
    document.querySelector('#g-recaptcha-response').value = token;
    // If there's an invisible reCAPTCHA, you might need to set it as well
  }, solvedToken);

  console.log('Captcha solved & token injected.');
  return true;
}

/**
 * Manual fallback if needed
 */
export async function solveCaptchaManually(page) {
  console.log('Manual captcha solving. Please solve in the browser window...');
  await inquirer.prompt([
    {
      type: 'confirm',
      name: 'solved',
      message: 'Press ENTER after solving the captcha manually.',
      default: true,
    },
  ]);
}
