const { setTimeout: sleep } = require("node:timers/promises");
const { writeFile } = require("node:fs/promises");
const { exec } = require("node:child_process");
const { env } = require("node:process");
const { join } = require("node:path");
const { firefox } = require("playwright-extra");
const { send } = require("./humanpost.js");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const {
  getRandomLine,
  readLinesFromFile,
  getRandomInt,
} = require("./utilities.js");
const AntiCaptcha = require("./anti-captcha.js");

const ANTICAPTHA_API_KEY = env.ANTICAPTHA_API_KEY;

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
      console.log(body);
      return await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        mode: "cors",
        body,
      })
        .then((response) => {
          if ("json" in response) {
            return response.json();
          }

          throw new Error(response);
        })
        .catch((r) => new Error(r));
    },
    { url, body },
  );
}

function getPayloadFomPHP(filename) {
  return new Promise((resolve, reject) =>
    exec(`php "${filename}"`, (err, stdout) =>
      err ? reject(err) : resolve(stdout),
    ),
  );
}

function convertToPayload(parsed) {
  if (Object.keys(parsed).length === 0 && parsed.constructor === Object) {
    throw new Error("PHP вернул пустой JSON объект");
  }

  const { FullName } = parsed;

  if (!FullName) {
    throw new Error("Отсутствуют данные ФИО в PHP выводе");
  }

  if (typeof FullName !== "string") {
    throw new Error("Некорректный формат данных ФИО");
  }

  const fio = FullName.split(" ");

  if (fio.length !== 3) {
    throw new Error("Некорректный формат данных ФИО");
  }

  const { 0: lastName, 1: firstName, 2: middleName } = fio;
  const { id, Data: birthday } = parsed;

  console.log(
    `Parsed data: ${lastName} ${firstName} ${middleName} ${birthday} ${id}`,
  );

  return {
    mode: "onlyActual",
    filter: {
      pledgor: {
        privatePerson: {
          lastName,
          firstName,
          middleName,
          district: "",
          birthday,
          passport: "",
        },
      },
    },
    limit: 10,
    offset: 0,
  };
}

async function processNotaryData(data, id) {
  if (!data) {
    return;
  }

  if (data?.total === 0) {
    const text = "none";

    console.log(`По данному запросу результатов не найдено: ${data.total}`);
    console.log(text);

    const url = await send({ text, id });

    console.log(url);

    return;
  }

  if (data?.data && data?.total === 1) {
    const text = JSON.stringify(data?.data);
    const filename = "responseData.json";

    console.log(`Перехваченный ответ: ${data?.total}`);

    await writeFile(
      join(__dirname, filename),
      JSON.stringify(data?.data, null, 2),
      "utf-8",
    );

    const url = await send({ text, id });

    console.log(url);

    return;
  }

  const text = "error";
  const url = await send({ text, id });

  console.log(url);
  console.log(text);
}

async function fetchNotary(page, body) {
  const token = await AntiCaptcha.fetchNotaryToken();

  return await fetchData(
    page,
    `https://www.reestr-zalogov.ru/api/search/notary?token=${token}`,
    body,
  );
}

async function fetchFedresurs(page, body) {
  const token = await AntiCaptcha.fetchFedresursToken();

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

async function getData(browser, data) {
  const page = await browser.newPage();
  const body = JSON.stringify(data);
  const tries = 5;
  const timeout = 30e3 * 3;

  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);
  await page.goto("https://www.reestr-zalogov.ru/search", {
    waitUntil: "domcontentloaded",
  });

  const { 0: notary } = await Promise.all([
    tryFetchData(tries, () => fetchNotary(page, body)),
  ]);

  return {
    notary,
  };
}

async function process(browser, payload, id) {
  try {
    const { notary } = await getData(browser, payload);

    await processNotaryData(notary, id);
  } catch (r) {
    console.error(`Error while processing results`, r);
  }
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
    const stdout = await getPayloadFomPHP("start.php");
    const parsed = JSON.parse(stdout);
    const { id } = parsed;
    const payload = convertToPayload(parsed);

    console.log(`Browser uses proxy ${proxy.server}. UserAgent: ${userAgent}`);

    await process(browser, payload, id);
    await sleep(3_000);
    await browser.close();
  }
}

async function main() {
  const userAgents = await readLinesFromFile("user_agents.txt").catch((r) => {
    console.error(`Error once reading "user_agents.txt". Cannot proceed`, r);
    process.exit(1);
  });
  const proxies = await readLinesFromFile("proxies.txt").catch(() => {
    console.error(`Error once reading "proxies.txt". Cannot proceed`, r);
    process.exit(1);
  });
  const stealthPlugin = StealthPlugin();

  // remove automatically changing ua
  stealthPlugin.enabledEvasions.delete("user-agent-override");

  const instance = await firefox.use(stealthPlugin).launch({
    headless: false,
  });

  AntiCaptcha.setAPIKey(ANTICAPTHA_API_KEY);

  do {
    try {
      await start(instance, userAgents, proxies);
    } catch (e) {
      console.warn(`Got error while processing`, e.message);
      await sleep(getRandomInt(60_000, 120_000));
    }
  } while (true);

  await start(instance, userAgents, proxies);
  await instance.close();
}

main();
