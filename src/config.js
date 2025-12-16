// config.js - конфигурация приложения

export const PSY_MSU_SCHEDULE_URL =
  "https://psy-msu.ru/educat/raspisanie-uchebnykh-zanyatiy/";

export const DATE_INPUT_FORMAT = "YYYY-MM-DD"; // формат даты ГГГГ-ММ-ДД

export const PUPPETEER_TIMEOUT = 20000; // timeout для браузера (ms)

// Если нужно ограничить список групп, раскомментируй и добавь номера
// export const SUPPORTED_GROUPS = ["101", "102", "108", "313"];
export const SUPPORTED_GROUPS = null; // null = все группы разрешены