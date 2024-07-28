const { env } = require("node:process");
const { RuCaptcha } = require("./rucaptcha.js");

let ruCaptcha = new RuCaptcha();

function fetchToken(action, userAgent) {
  const url = "https://www.reestr-zalogov.ru/search";
  const websiteKey = env.WEBSITE_KEY;

  return ruCaptcha.solveRecaptchaV3(url, websiteKey, action, userAgent);
}

const fetchNotaryToken = () => fetchToken("search_notary");
const fetchFedresursToken = () => fetchToken("search_fedresurs");
const fetchTokens = () =>
  Promise.all([fetchNotaryToken(), fetchFedresursToken()]);
const setAPIKey = (key) => ruCaptcha.setAPIKey(key);

module.exports = {
  setAPIKey,
  fetchTokens,
  fetchNotaryToken,
  fetchFedresursToken,
};
