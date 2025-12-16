// bot-prod-fancy.js
// 🎨 PRODUCTION БОТ С КРАСИВЫМИ АНИМАЦИЯМИ И ЭФФЕКТАМИ
// Все оптимизации Production версии + улучшенный UI

import { Bot, InlineKeyboard } from "grammy";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { SUPPORTED_GROUPS } from "./config.js";
import { getState, setState, resetState } from "./state.js";
import { parseUserDate, formatDateYYYYMMDD } from "./utils.js";
import { fetchSchedule, getParserStats } from "./parser-prod-1gb.js";
import { getUserGroup, saveUserGroup, deleteUserGroup } from "./storage.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

console.log("\n" + "═".repeat(50));
console.log("🎨 ИНИЦИАЛИЗАЦИЯ PRODUCTION БОТА (FANCY UI)");
console.log("═".repeat(50));
console.log(`🔍 BOT_TOKEN: ${BOT_TOKEN ? "✅ LOADED" : "❌ MISSING"}`);

if (!BOT_TOKEN) {
  console.error("\n❌ ОШИБКА: BOT_TOKEN не найден!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ═══════════════════════════════════════════════════════════════
// АНИМИРОВАННЫЕ ЭМОДЗИ И ЭФФЕКТЫ
// ═══════════════════════════════════════════════════════════════

const LOADING_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const PULSE_FRAMES = ["🟢", "🟡", "🔴"];
const SPARKLE = "✨";
const SEPARATOR = "━".repeat(40);

function getLoadingEmoji(step) {
  return LOADING_FRAMES[step % LOADING_FRAMES.length];
}

function getPulseEmoji(step) {
  return PULSE_FRAMES[step % PULSE_FRAMES.length];
}

// ═══════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════

function getDateAfterDays(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function getDayName(dateObj) {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return days[dateObj.getDay()];
}

function formatDateWithDay(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  const dayName = getDayName(dateObj);
  return `${dd}.${mm}.${yyyy} (${dayName})`;
}

function getDateKeyboard() {
  const today = getDateAfterDays(0);
  const tomorrow = getDateAfterDays(1);
  return new InlineKeyboard()
    .text("📅 Сегодня", `date_${formatDateYYYYMMDD(today)}`)
    .text("📅 Завтра", `date_${formatDateYYYYMMDD(tomorrow)}`)
    .row()
    .text("📝 Дата вручную", "date_manual")
    .row()
    .text("🔄 Обновить", `date_${formatDateYYYYMMDD(today)}`);
}

// ═══════════════════════════════════════════════════════════════
// КРАСИВЫЕ СООБЩЕНИЯ
// ═══════════════════════════════════════════════════════════════

function formatWelcome() {
  return (
    `${"═".repeat(40)}\n` +
    `🎓 *РАСПИСАНИЕ ПСИХФАКА МГУ*\n` +
    `${"═".repeat(40)}\n` +
    `\n👋 *Добро пожаловать!*\n` +
    `Это интеллектуальный бот расписания.\n\n` +
    `📚 *Возможности:*\n` +
    `• Просмотр расписания по датам\n` +
    `• Сохранение группы\n` +
    `• Быстрый доступ к информации\n` +
    `• Статистика сервера\n\n` +
    `Начнём! Введите номер группы → *108*`
  );
}

function formatGroupSaved(group) {
  return (
    `${SPARKLE} *Успешно!*\n\n` +
    `✅ Группа \`${group}\` сохранена!\n\n` +
    `📅 Выберите дату для просмотра расписания:`
  );
}

function formatScheduleHeader(group, date) {
  return (
    `${SEPARATOR}\n` +
    `📖 *РАСПИСАНИЕ ГРУППЫ ${group}*\n` +
    `📅 ${date}\n` +
    `${SEPARATOR}\n\n`
  );
}

function formatLesson(index, lesson) {
  let text = `*${index}. ${lesson.time}* ⏰\n`;
  text += `📚 ${lesson.subject}\n`;
  if (lesson.room) text += `🏫 ${lesson.room}\n`;
  if (lesson.teacher) text += `👨🏫 ${lesson.teacher}\n`;
  text += `\n`;
  return text;
}

function formatScheduleFooter(count) {
  const icon = count > 0 ? "✅" : "📭";
  const text = count === 1 ? "пара" : "пар";
  return (
    `${SEPARATOR}\n` +
    `${icon} Всего ${count} ${text}\n` +
    `${SEPARATOR}`
  );
}

function formatNoClasses() {
  return (
    `📭 *На этот день пар нет*\n\n` +
    `${SPARKLE} Расслабьтесь, это отличная новость!\n` +
    `День свободный — используйте время для учёбы или отдыха.`
  );
}

function formatError() {
  return (
    `❌ *Ошибка при загрузке*\n\n` +
    `🔧 Что-то пошло не так:\n` +
    `• Проверьте номер группы\n` +
    `• Убедитесь в интернет-соединении\n` +
    `• Попробуйте позже\n\n` +
    `📞 Если проблема повторяется, свяжитесь с администратором.`
  );
}

function formatStats() {
  const stats = getParserStats();
  const memPercent = Math.round((stats.heapUsedMB / stats.heapTotalMB) * 100);
  const status = memPercent > 70 ? "⚠️" : "✅";

  return (
    `${"═".repeat(40)}\n` +
    `📊 *СТАТИСТИКА СЕРВЕРА*\n` +
    `${"═".repeat(40)}\n\n` +
    `🌐 Браузеры в пуле: ${stats.browsers}\n` +
    `💾 Записей в кеше: ${stats.cacheSize}/300\n` +
    `📋 В очереди: ${stats.queueSize}\n` +
    `📈 Всего запросов: ${stats.totalRequests}\n\n` +
    `${status} *Память:* ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB (${memPercent}%)\n` +
    `${"═".repeat(40)}`
  );
}

// ═══════════════════════════════════════════════════════════════
// КОМАНДЫ
// ═══════════════════════════════════════════════════════════════

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  const savedGroup = await getUserGroup(chatId);

  if (savedGroup) {
    setState(chatId, { step: "ASK_DATE", group: savedGroup });
    await ctx.reply(
      `${SPARKLE} *Добро пожаловать обратно!*\n\n` +
        `📚 Группа: \`${savedGroup}\`\n\n` +
        `Выберите дату для расписания:`,
      { parse_mode: "Markdown", reply_markup: getDateKeyboard() }
    );
  } else {
    resetState(chatId);
    setState(chatId, { step: "ASK_GROUP" });
    await ctx.reply(formatWelcome(), {
      parse_mode: "Markdown",
    });
  }
});

bot.command("schedule", async (ctx) => {
  const chatId = ctx.chat.id;
  const savedGroup = await getUserGroup(chatId);

  if (!savedGroup) {
    await ctx.reply(
      `❌ *Сначала укажите группу*\n\n` +
        `Выполните */start* и введите номер группы.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  setState(chatId, { step: "ASK_DATE", group: savedGroup });
  await ctx.reply(
    `📅 *Выберите дату для группы* \`${savedGroup}\`:`,
    { parse_mode: "Markdown", reply_markup: getDateKeyboard() }
  );
});

bot.command("mygroup", async (ctx) => {
  const chatId = ctx.chat.id;
  const savedGroup = await getUserGroup(chatId);

  if (savedGroup) {
    await ctx.reply(
      `${SPARKLE} *Ваша текущая группа:* \`${savedGroup}\`\n\n` +
        `Используйте */changegroup* для изменения.`,
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.reply(
      `📭 *Группа не установлена*\n\n` +
        `Выполните */start* чтобы её добавить.`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.command("changegroup", async (ctx) => {
  const chatId = ctx.chat.id;
  resetState(chatId);
  setState(chatId, { step: "ASK_GROUP" });
  await ctx.reply(
    `✏️ *Введите новый номер группы*\n\n` +
      `Пример: \`108\`, \`209\`, \`310\``,
    { parse_mode: "Markdown" }
  );
});

bot.command("deletegroup", async (ctx) => {
  const chatId = ctx.chat.id;
  await deleteUserGroup(chatId);
  resetState(chatId);
  await ctx.reply(
    `🗑️ *Группа удалена*\n\n` +
      `${SPARKLE} Выполните */start* для начала заново.`,
    { parse_mode: "Markdown" }
  );
});

bot.command("stats", async (ctx) => {
  await ctx.reply(formatStats(), { parse_mode: "Markdown" });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `*📖 ДОСТУПНЫЕ КОМАНДЫ*\n\n` +
      `*/start* — начало работы\n` +
      `*/schedule* — быстрый доступ к расписанию\n` +
      `*/mygroup* — текущая группа\n` +
      `*/changegroup* — изменить группу\n` +
      `*/deletegroup* — удалить группу\n` +
      `*/stats* — статистика сервера\n` +
      `*/help* — эта справка\n\n` +
      `${SPARKLE} *Советы:*\n` +
      `• Используйте кнопки для навигации\n` +
      `• Повторные запросы работают из кеша (<100ms)\n` +
      `• Первый запрос займёт ≈ 8 сек`,
    { parse_mode: "Markdown" }
  );
});

// ═══════════════════════════════════════════════════════════════
// ТЕКСТОВЫЕ СООБЩЕНИЯ
// ═══════════════════════════════════════════════════════════════

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  const state = getState(chatId);

  if (!state.step) {
    const savedGroup = await getUserGroup(chatId);
    if (savedGroup) {
      setState(chatId, { step: "ASK_DATE", group: savedGroup });
      await ctx.reply(
        `📅 *Выберите дату для группы* \`${savedGroup}\`:`,
        { parse_mode: "Markdown", reply_markup: getDateKeyboard() }
      );
    } else {
      setState(chatId, { step: "ASK_GROUP" });
      await ctx.reply(formatWelcome(), { parse_mode: "Markdown" });
    }
    return;
  }

  if (state.step === "ASK_GROUP") {
    const group = text;
    if (SUPPORTED_GROUPS && !SUPPORTED_GROUPS.includes(group)) {
      await ctx.reply(
        `❌ *Группа не найдена*\n\n` +
          `🔍 Проверьте номер и попробуйте ещё раз.\n` +
          `Допустимые группы: 101-120`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await saveUserGroup(chatId, group);
    setState(chatId, { step: "ASK_DATE", group });
    await ctx.reply(formatGroupSaved(group), {
      parse_mode: "Markdown",
      reply_markup: getDateKeyboard(),
    });
    return;
  }

  if (state.step === "ASK_DATE") {
    const dateStr = text;
    const dateObj = parseUserDate(dateStr);
    if (!dateObj) {
      await ctx.reply(
        `❌ *Неверный формат даты*\n\n` +
          `📝 Используйте формат: \`ГГГГ-ММ-ДД\`\n` +
          `✅ Пример: \`2025-12-16\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await fetchAndSendSchedule(ctx, state.group, dateStr, dateObj);
    setState(chatId, { step: "ASK_DATE" });
    return;
  }

  await ctx.reply(
    `❓ *Команда не понята*\n\n` +
      `Используйте */help* для справки или нажмите /start.`,
    { parse_mode: "Markdown" }
  );
});

// ═══════════════════════════════════════════════════════════════
// CALLBACK КНОПКИ
// ═══════════════════════════════════════════════════════════════

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;
  const state = getState(chatId);

  if (data === "date_manual") {
    setState(chatId, { step: "ASK_DATE" });
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 *Введите дату в формате ГГГГ-ММ-ДД*\n\n` +
        `✅ Пример: \`2025-12-16\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (data.startsWith("date_")) {
    const dateStr = data.substring(5);
    const dateObj = parseUserDate(dateStr);
    if (!dateObj) {
      await ctx.answerCallbackQuery(`❌ Ошибка даты`, { show_alert: true });
      return;
    }

    const savedGroup = state.group || (await getUserGroup(chatId));
    if (!savedGroup) {
      await ctx.answerCallbackQuery(
        `❌ Группа не выбрана. Выполните /start`,
        { show_alert: true }
      );
      return;
    }

    await ctx.answerCallbackQuery();
    await fetchAndSendSchedule(ctx, savedGroup, dateStr, dateObj);
    return;
  }

  await ctx.answerCallbackQuery(`❓ Неизвестная команда`);
});

// ═══════════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ: КРАСИВЫЙ ПАРСИНГ И ОТПРАВКА
// ═══════════════════════════════════════════════════════════════

async function fetchAndSendSchedule(ctx, group, dateStr, dateObj) {
  const formattedDate = formatDateWithDay(dateObj);
  const chatId = ctx.chat.id;

  // Асинхронно в фоне
  setImmediate(async () => {
    // Красивое сообщение загрузки
    const loadingMsg = await ctx.reply(
      `⏳ *Загружаю расписание...*\n\n` +
        `📚 Группа: \`${group}\`\n` +
        `📅 Дата: \`${formattedDate}\`\n\n` +
        `${getLoadingEmoji(0)} Поиск в календаре...`,
      { parse_mode: "Markdown" }
    );

    let frame = 0;
    const loadingInterval = setInterval(async () => {
      frame++;
      if (frame < 20) {
        try {
          await ctx.api.editMessageText(chatId, loadingMsg.message_id, 
            `⏳ *Загружаю расписание...*\n\n` +
            `📚 Группа: \`${group}\`\n` +
            `📅 Дата: \`${formattedDate}\`\n\n` +
            `${getLoadingEmoji(frame)} Рендеринг календаря...`,
            { parse_mode: "Markdown" }
          );
        } catch (_) {}
      }
    }, 500);

    try {
      console.log(`👤 [Chat ${chatId}] Запрос расписания ${group}/${dateStr}`);
      const lessons = await fetchSchedule(group, dateObj);

      clearInterval(loadingInterval);

      // Удаляем сообщение о загрузке
      await ctx.api
        .deleteMessage(ctx.chat.id, loadingMsg.message_id)
        .catch(() => {});

      // Результат: нет пар
      if (!lessons || lessons.length === 0) {
        await ctx.reply(
          formatNoClasses() + `\n\n📅 Дата: \`${formattedDate}\``,
          {
            parse_mode: "Markdown",
            reply_markup: getDateKeyboard(),
          }
        );
        return;
      }

      // Результат: расписание найдено
      let scheduleText = formatScheduleHeader(group, formattedDate);

      lessons.forEach((lesson, idx) => {
        scheduleText += formatLesson(idx + 1, lesson);
      });

      scheduleText += formatScheduleFooter(lessons.length);

      await ctx.reply(scheduleText, {
        parse_mode: "Markdown",
        reply_markup: getDateKeyboard(),
      });
    } catch (e) {
      clearInterval(loadingInterval);
      console.error(`❌ [Chat ${chatId}] Ошибка:`, e.message);

      // Удаляем сообщение о загрузке
      await ctx.api
        .deleteMessage(ctx.chat.id, loadingMsg.message_id)
        .catch(() => {});

      // Красивое сообщение об ошибке
      await ctx.reply(formatError(), {
        parse_mode: "Markdown",
        reply_markup: getDateKeyboard(),
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// ЗАПУСК
// ═══════════════════════════════════════════════════════════════

bot.start();

console.log(`✅ Бот запущен успешно!`);
console.log(`🎨 Режим: FANCY UI с анимациями`);
console.log(`📝 Команды: /start, /schedule, /stats, /help`);
console.log(`⚡ Асинхронная обработка: ВКЛЮЧЕНА`);
console.log(`🎉 БОТ ГОТОВ К РАБОТЕ!`);
console.log("═".repeat(50) + "\n");