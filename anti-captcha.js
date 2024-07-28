const { env } = require("node:process");
const antiCaptcha = require("@antiadmin/anticaptchaofficial");

function fetchToken(action) {
  const url = "https://www.reestr-zalogov.ru/search";
  const websiteKey = env.WEBSITE_KEY;

  return antiCaptcha.solveRecaptchaV3(
    url,
    websiteKey,
    0.9, //minimum score required: 0.3, 0.7 or 0.9
    action,
  );
}

const fetchNotaryToken = () => fetchToken("search_notary");
const fetchFedresursToken = () => fetchToken("search_fedresurs");
const fetchTokens = () =>
  Promise.all([fetchNotaryToken(), fetchFedresursToken()]);
const setAPIKey = (key) => antiCaptcha.setAPIKey(key);

module.exports = {
  setAPIKey,
  fetchTokens,
  fetchNotaryToken,
  fetchFedresursToken,
};
