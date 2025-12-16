// utils.js - утилиты для работы с датами

/**
 * Парсит дату пользователя в формате YYYY-MM-DD
 * @param {string} str - строка в формате YYYY-MM-DD
 * @returns {Date|null} Date объект или null если некорректна
 */
export function parseUserDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);

  const d = new Date(year, month, day);

  // Проверка валидности даты
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
}

/**
 * Форматирует Date в строку для сравнения с календарём (DD.MM.YYYY)
 * @param {Date} dateObj
 * @returns {string} строка вида "13.12.2025"
 */
export function formatDateForCalendar(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Форматирует Date в строку YYYY-MM-DD
 * @param {Date} dateObj
 * @returns {string} строка вида "2025-12-13"
 */
export function formatDateYYYYMMDD(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}