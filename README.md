# Парсер реестра уведомлений о залоге движимого имущества (версия с ruCaptcha)

Переписанный парсер из задачи [Необходимо помощь в обходе блокировки, на платформе javascript node.js](https://www.fl.ru/projects/5342330/neobhodimo-pomosch-v-obhode-blokirovki-na-platforme-javascript-nodejs-.html)

## Назначение

Парсер получает данные по `Федеральной нотариальной палате` и `Федресурсу`, передавая требуемые реквизиты искомого субъекта.

Решает reCaptcha c помощью сервиса [ruCaptcha](https://rucaptcha.com/enterpage)

Так же в парсер были внедрены эвристики по получению входящих данных из PHP-скрипта `start.php`

## Технологический стэк

* Nodejs v20.15
* Playwright v1.45

## Развертывание

План:

1. [Установка Nodejs](#установка-nodejs)
2. [Эусплуатация](#эксплуатация)

### Установка Nodejs

С сайта [Nodejs](https://nodejs.org/download/release/v20.15.1/) скачать и установить подходящий тип дистрибутива

Пользователям MacOS рекомендуется воспользоваться утилитой [Homebrew](https://brew.sh/index_ru).
Выполнить в терминале `brew install node@20.15`. Либо скачать и установить `pkg`-пакет вручную.

Пользователям Linux воспользоваться системным [пакетным менеджером](https://nodejs.org/en/download/package-manager)

## Эксплуатация

* [Установка зависимостей](#установка-зависимостей)
* [Запуск](#запуск)
* [Запуск в headless-режиме](#запуск-в-headless-режиме)
* [Остановка](#остановка)

### Установка зависимостей

```bash
# установка пакетов
pnpm i

# установка браузера
pnpm run install-ff
```

### Запуск

```bash
pnpm run start
```

### Запуск в headless-режиме

На строке `260` файла `main.js` изменить параметр `headless: false` на `headless: true`

```bash
pnpm run start
```

### Остановка

Нажмите в терминале <pre>CTRL+C</pre>

## Связь с автором

[br4instormer](https://www.fl.ru/users/br4instormer/portfolio/) на fl.ru

[Telegram](https://t.me/br4instormer)

[Github](https://github.com/br4instormer)
