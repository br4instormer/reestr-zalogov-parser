const { setTimeout: sleep } = require("node:timers/promises");

class HttpError extends Error {}
class RuCaptchaError extends Error {
  static codes = {
    0: {
      code: "-",
      reason: "Ошибка отсутствует",
    },
    1: {
      code: "ERROR_KEY_DOES_NOT_EXIST",
      reason:
        "Ваш API-ключ неверен. Убедитесь, что вы правильно установили ключ и скопировали его из кабинета в режиме Заказчик или Разработчик",
    },
    2: {
      code: "ERROR_NO_SLOT_AVAILABLE",
      reason:
        "Ваша ставка слишком мала для отправленной вами капчи, или очередь ваших капч слишком длинная, и мы временно не принимаем от вас больше капч",
    },
    3: {
      code: "ERROR_ZERO_CAPTCHA_FILESIZE",
      reason: "Размер изображения составляет менее 100 байт",
    },
    4: {
      code: "ERROR_TOO_BIG_CAPTCHA_FILESIZE",
      reason:
        "Размер изображения превышает 100 Кб или изображение больше 600 пикселей с любой стороны",
    },
    10: {
      code: "ERROR_ZERO_BALANCE",
      reason: "У вас нет средств на вашем счете",
    },
    11: {
      code: "ERROR_IP_NOT_ALLOWED",
      reason:
        "Запрос отправляется с IP-адреса, которого нет в списке ваших доверенных IP-адресов",
    },
    12: {
      code: "ERROR_CAPTCHA_UNSOLVABLE",
      reason:
        "Мы не можем разгадать вашу капчу - трое наших сотрудников не смогли ее разгадать. Стоимость капчи автоматически возвращается на ваш баланс",
    },
    13: {
      code: "ERROR_BAD_DUPLICATES",
      reason:
        "Ошибка возвращается, когда включена функция 100% Распознавание. Ошибка означает, что достигнуто максимальное количество попыток, но минимальное количество совпадений не достигнуто",
    },
    14: {
      code: "ERROR_NO_SUCH_METHOD",
      reason:
        "Запрос, отправленный в API с помощью метода, который не существует",
    },
    15: {
      code: "ERROR_IMAGE_TYPE_NOT_SUPPORTED",
      reason:
        "Изображение не может быть обработано из-за неправильного формата или размера, или изображение повреждено. Пожалуйста, проверьте отправляемое изображение",
    },
    16: {
      code: "ERROR_NO_SUCH_CAPCHA_ID",
      reason: "Вы указали неверный идентификатор taskId в запросе",
    },
    21: {
      code: "ERROR_IP_BLOCKED",
      reason: "Ваш IP-адрес заблокирован из-за неправильного использования API",
    },
    22: {
      code: "ERROR_TASK_ABSENT",
      reason: "Cвойство task отсутствует в вашем вызове метода createTask",
    },
    23: {
      code: "ERROR_TASK_NOT_SUPPORTED",
      reason:
        "Свойство task в вашем вызове метода createTask содержит тип задачи, который не поддерживается нашим API, или у вас ошибка в свойстве type.",
    },
    31: {
      code: "ERROR_RECAPTCHA_INVALID_SITEKEY",
      reason: "Значение sitekey, указанное в вашем запросе, недействительно",
    },
    55: {
      code: "ERROR_ACCOUNT_SUSPENDED",
      reason:
        "Ваш доступ к API был заблокирован за ненадлежащее использование API. Пожалуйста, свяжитесь с нашей службой поддержки, чтобы решить проблему",
    },
    110: {
      code: "ERROR_BAD_PARAMETERS",
      reason:
        "Требуемые параметры капчи в вашем запросе отсутствуют или имеют неправильный формат. Пожалуйста, убедитесь, что ваш запрос имеет правильный формат для выбранного типа задачи",
    },
    115: {
      code: "ERROR_BAD_IMGINSTRUCTIONS",
      reason:
        "Ошибка возвращается в случаях, когда imgInstructions содержит неподдерживаемый тип файла, поврежденный файл, либо размер файла или изображения превышает лимиты. Лимиты описаны в спецификации соответствующего типа задачи",
    },
    130: {
      code: "ERROR_BAD_PROXY",
      reason:
        "Неверные параметры прокси-сервера или не удается установить соединение через прокси-сервер",
    },
  };
  #id;

  constructor(id) {
    super(RuCaptchaError.codes[id].code);
    this.#id = id;
  }

  reason() {
    return RuCaptchaError.codes[this.#id].reason;
  }
}

class RuCaptcha {
  static #endpoints = {
    createTask: "https://api.rucaptcha.com/createTask",
    getTaskResult: "https://api.rucaptcha.com/getTaskResult",
  };
  #clientKey;
  #timeout = 5e3;

  #createTask(payload) {
    return fetch(RuCaptcha.#endpoints.createTask, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .catch((r) => new HttpError(r));
  }

  #getTaskResult(taskId) {
    const payload = {
      clientKey: this.#clientKey,
      taskId,
    };

    return fetch(RuCaptcha.#endpoints.getTaskResult, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .catch((r) => new HttpError(r));
  }

  setAPIKey(apiKey) {
    this.#clientKey = apiKey;
  }

  async solveRecaptchaV3(
    websiteURL,
    websiteKey,
    pageAction,
    minScore = 0.9,
    isEnterprise = false,
  ) {
    let repeat = false;
    const payload = {
      clientKey: this.#clientKey,
      task: {
        type: "RecaptchaV3TaskProxyless",
        websiteURL,
        websiteKey,
        minScore,
        pageAction,
        isEnterprise,
        apiDomain: "google.com",
      },
    };

    const response = await this.#createTask(payload);

    if (response instanceof HttpError) {
      throw new Error(response.message);
    }

    const { errorId, taskId } = response;

    if (errorId !== 0) {
      throw new RuCaptchaError(errorId);
    }

    await sleep(this.#timeout);

    do {
      const response = await this.#getTaskResult(taskId);

      if (response instanceof HttpError) {
        throw new Error(response.message);
      }

      const { errorId, status, solution } = response;

      if (errorId !== 0) {
        throw new RuCaptchaError(errorId);
      }

      repeat = status === "processing";

      if (!repeat) {
        return solution.token;
      }

      console.log(
        `ruCaptcha still processing. Waiting ${this.#timeout / 1e3} sec`,
      );
      await sleep(this.#timeout);
    } while (repeat);
  }
}

module.exports = { RuCaptcha, RuCaptchaError };
