// storage.js - постоянное хранилище данных пользователей в JSON

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_FILE = path.join(__dirname, "..", "user_groups.json");

/**
 * Загрузить все сохранённые группы пользователей
 * @returns {Promise<object>} объект { chatId: groupNumber, ... }
 */
export async function loadUserGroups() {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * Сохранить группу пользователя
 * @param {number} chatId - ID чата
 * @param {string} group - номер группы
 */
export async function saveUserGroup(chatId, group) {
  try {
    const users = await loadUserGroups();
    users[chatId] = group;
    await fs.writeFile(STORAGE_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Ошибка сохранения группы:", e);
  }
}

/**
 * Получить группу пользователя
 * @param {number} chatId - ID чата
 * @returns {Promise<string|null>} номер группы или null
 */
export async function getUserGroup(chatId) {
  try {
    const users = await loadUserGroups();
    return users[chatId] || null;
  } catch (e) {
    console.error("Ошибка загрузки группы:", e);
    return null;
  }
}

/**
 * Удалить группу пользователя
 * @param {number} chatId - ID чата
 */
export async function deleteUserGroup(chatId) {
  try {
    const users = await loadUserGroups();
    delete users[chatId];
    await fs.writeFile(STORAGE_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Ошибка удаления группы:", e);
  }
}