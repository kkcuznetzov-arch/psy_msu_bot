// state.js - управление состоянием пользователя (временное, в памяти)

const userState = new Map();

/**
 * Получить состояние пользователя
 * @param {number} chatId - ID чата
 * @returns {object} состояние пользователя
 */
export function getState(chatId) {
  return userState.get(chatId) || {};
}

/**
 * Обновить состояние пользователя
 * @param {number} chatId - ID чата
 * @param {object} patch - объект с новыми данными
 */
export function setState(chatId, patch) {
  const prev = userState.get(chatId) || {};
  userState.set(chatId, { ...prev, ...patch });
}

/**
 * Сбросить состояние пользователя
 * @param {number} chatId - ID чата
 */
export function resetState(chatId) {
  userState.delete(chatId);
}