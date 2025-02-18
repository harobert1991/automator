const { fetchTweets, tweetResults } = require('../services/twitterService');
const { ACCOUNTS, INTERVAL_MINUTES } = require('../config/config');

const scheduleFetchTweets = () => {
    ACCOUNTS.forEach((account, index) => {
        setTimeout(async () => {
            console.log(`Récupération des tweets pour ${account}...`);
            tweetResults[account] = await fetchTweets(account);
        }, index * INTERVAL_MINUTES * 60 * 1000);
    });

    setInterval(() => {
        ACCOUNTS.forEach((account, index) => {
            setTimeout(async () => {
                console.log(`Mise à jour des tweets pour ${account}...`);
                tweetResults[account] = await fetchTweets(account);
            }, index * INTERVAL_MINUTES * 60 * 1000);
        });
    }, INTERVAL_MINUTES * 60 * 1000 * ACCOUNTS.length);
};

module.exports = scheduleFetchTweets;