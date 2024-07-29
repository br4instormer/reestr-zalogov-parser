const { setTimeout: sleep } = require("node:timers/promises");
const { env } = require("node:process");
const { firefox } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { getRandomLine, readLinesFromFile } = require("./utilities.js");
const { RuCaptchaError } = require("./rucaptcha.js");
const Captcha = require("./captcha.js");

const RUCAPTCHA_API_KEY = env.RUCAPTCHA_API_KEY;

function parseProxy(line) {
  const { 0: server, 1: creds } = line.split("@");
  const { 0: username, 1: password } = creds.split(":");

  return {
    server,
    username,
    password,
  };
}

function fetchData(page, url, body) {
  return page.evaluate(
    async ({ url, body }) => {
      return await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        mode: "cors",
        body,
      })
        .then((response) => response.json())
        .catch((r) => new Error(r));
    },
    { url, body },
  );
}

async function fetchNotary(page, body) {
  const token = await Captcha.fetchNotaryToken();

  return await fetchData(
    page,
    `https://www.reestr-zalogov.ru/api/search/notary?token=${token}`,
    body,
  );
}

async function fetchFedresurs(page, body) {
  const token = await Captcha.fetchFedresursToken();

  return await fetchData(
    page,
    `https://www.reestr-zalogov.ru/api/search/fedresurs?token=${token}`,
    body,
  );
}

async function tryFetchData(tries, executor) {
  let errors = 0;
  let data;

  do {
    data = await executor();

    if (data instanceof RuCaptchaError) {
      errors++;
      console.warn(`Got ruCaptcha error:  ${data.message}`, data.reason());

      continue;
    }

    if (data instanceof Error) {
      errors++;
      console.warn(`Got error`, data.message);

      continue;
    }

    if (Object.hasOwn(data, "errorId")) {
      errors++;
      console.warn(`Got response with Error: ${data.message}`);

      continue;
    }

    return data;
  } while (errors <= tries);

  return data;
}

async function process(browser, data) {
  const page = await browser.newPage();
  const body = JSON.stringify(data);
  const tries = 5;
  const timeout = 30e3 * 3;

  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  await page.goto("https://www.reestr-zalogov.ru/search", {
    waitUntil: "domcontentloaded",
  });

  const { 0: notary, 1: fedresurs } = await Promise.all([
    tryFetchData(tries, () => fetchNotary(page, body)),
    tryFetchData(tries, () => fetchFedresurs(page, body)),
  ]);

  return {
    notary,
    fedresurs,
  };
}

async function start(instance, userAgents, proxies) {
  while (true) {
    const proxyLine = getRandomLine(proxies);
    const proxy = parseProxy(proxyLine);
    const userAgent = getRandomLine(userAgents);
    const browser = await instance.newContext({
      userAgent,
      proxy,
    });
    const payload = {
      mode: "onlyActual",
      filter: {
        pledgor: {
          privatePerson: {
            lastName: "Петров",
            firstName: "Иван",
            middleName: "Иванович",
            district: "",
            birthday: "05.12.1975",
            passport: "",
          },
        },
      },
      limit: 10,
      offset: 0,
    };

    console.log(`Browser uses proxy ${proxy.server}. UserAgent: ${userAgent}`);

    try {
      const { notary, fedresurs } = await process(browser, payload);

      console.log(`Notary data is:`, notary);
      console.log(`Fedresurs data is:`, fedresurs);
    } catch (r) {
      console.error(`Error while processing results`, r);
    }

    await sleep(15_000);
    await browser.close();
  }
}

async function main() {
  const userAgents = await readLinesFromFile("user_agents.txt").catch((r) => {
    console.error(`Error once reading "user_agents.txt". Cannot proceed`, r);
    process.exit(1);
  });
  const proxies = await readLinesFromFile("proxies.txt").catch((r) => {
    console.error(`Error once reading "proxies.txt". Cannot proceed`, r);
    process.exit(1);
  });
  const stealthPlugin = StealthPlugin();

  // remove automatically changing ua
  stealthPlugin.enabledEvasions.delete("user-agent-override");

  const instance = await firefox.use(stealthPlugin).launch({
    headless: false,
  });

  Captcha.setAPIKey(RUCAPTCHA_API_KEY);

  await start(instance, userAgents, proxies);
  await instance.close();
}

main();
