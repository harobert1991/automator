// configs/sample-config-1.js

import { STEP_TYPES } from '../scrapers/genericScraper.js';

export const sampleConfig1 = {
  url: 'https://example.com/login',
  steps: [
    // Click a login button
    {
      type: STEP_TYPES.CLICK,
      selector: '#login-button',
      waitForNav: true,
    },
    // Extract some user info or page content
    {
      type: STEP_TYPES.EXTRACT,
      selector: '.user-info',
      multiple: false,
    },
    // Possibly handle pagination
    {
      type: STEP_TYPES.PAGINATE,
      nextButtonXPath: '//a[contains(text(),"Next")]',
      pagesToScrape: 3,
    },
  ],
};
