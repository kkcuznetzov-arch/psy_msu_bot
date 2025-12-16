// parser-prod-1gb.js
// 🚀 PRODUCTION парсер для 1GB RAM: максимальная скорость + минимальная память
// Ключевые отличия от 4GB версии:
// 1. 2 браузера вместо 3-4 (экономия ~300-400MB)
// 2. Максимум 4 параллельных вместо 6-8 (стабильность)
// 3. Максимум 300 кешей вместо 500 (экономия памяти)
// 4. Агрессивная очистка старых записей

import puppeteer from "puppeteer";
import pQueue from "p-queue";

// ═══════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ ДЛЯ 1GB RAM
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 часа в памяти
const MAX_BROWSERS = 4; // 🎯 2 браузера для 1GB (критично!)
const QUEUE_CONCURRENCY = 16; // 🎯 Макс 4 параллельных парсингов
const MAX_CACHE_ITEMS = 800; // 🎯 Макс 300 записей в кеше (экономия)
const MEMORY_CHECK_INTERVAL = 30000; // Проверка памяти каждые 30 сек

class ProductionScheduleCache1GB {
  constructor() {
    this.cache = new Map();
    this.queue = new pQueue({ concurrency: QUEUE_CONCURRENCY });
    this.browsers = [];
    this.currentBrowserIndex = 0;
    this.requestCounter = 0;
    this.memoryWarningTriggered = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  async initBrowserPool() {
    console.log("\n🚀 ИНИЦИАЛИЗАЦИЯ ПУЛА БРАУЗЕРОВ (1GB RAM)");
    console.log("═".repeat(50));

    for (let i = 0; i < MAX_BROWSERS; i++) {
      try {
        const browser = await puppeteer.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage", // 🎯 Критично для 1GB!
            "--disable-gpu",
            "--disable-extensions",
            "--disable-sync", // Отключить синхронизацию
          ],
        });

        this.browsers.push(browser);
        console.log(`✅ Браузер ${i + 1}/${MAX_BROWSERS} инициализирован`);
      } catch (err) {
        console.error(`❌ Ошибка браузера ${i + 1}:`, err.message);
      }
    }

    console.log(`✅ Пул готов: ${this.browsers.length} браузеров (1GB режим)`);
    console.log(`📊 Кеш: макс ${MAX_CACHE_ITEMS} записей`);
    console.log(`⚙️  Параллелизм: макс ${QUEUE_CONCURRENCY} одновременных`);
    console.log("═".repeat(50) + "\n");

    // Запустить мониторинг памяти
    this.startMemoryMonitoring();
  }

  // ═══════════════════════════════════════════════════════════════
  // МОНИТОРИНГ ПАМЯТИ
  // ═══════════════════════════════════════════════════════════════

  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // Предупреждение при 60% использовании
      if (heapUsedMB > heapTotalMB * 0.6) {
        if (!this.memoryWarningTriggered) {
          console.warn(
            `⚠️  ВНИМАНИЕ: Высокое использование памяти: ${heapUsedMB}MB / ${heapTotalMB}MB`
          );
          this.memoryWarningTriggered = true;

          // Очистить кеш агрессивно
          this.aggressiveCleanup();
        }
      } else if (heapUsedMB < heapTotalMB * 0.4) {
        this.memoryWarningTriggered = false;
      }

      // Логировать при необходимости
      if (this.cache.size > MAX_CACHE_ITEMS * 0.8) {
        console.log(
          `📊 ПАМЯТ: ${heapUsedMB}MB (Кеш: ${this.cache.size}/${MAX_CACHE_ITEMS})`
        );
      }
    }, MEMORY_CHECK_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════════════
  // АГРЕССИВНАЯ ОЧИСТКА ПАМЯТИ
  // ═══════════════════════════════════════════════════════════════

  aggressiveCleanup() {
    const now = Date.now();
    let cleaned = 0;

    // 1. Удалить истёкшие по TTL
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // 2. Если всё ещё много — удалить самые старые (FIFO)
    while (this.cache.size > MAX_CACHE_ITEMS * 0.7) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0]?.[0];

      if (oldestKey) {
        this.cache.delete(oldestKey);
        cleaned++;
      } else {
        break;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Агрессивная очистка: удалено ${cleaned} записей`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // КЕШИРОВАНИЕ
  // ═══════════════════════════════════════════════════════════════

  getCacheKey(groupCode, dateStr) {
    return `${groupCode}:${dateStr}`;
  }

  getFromCache(groupCode, dateStr) {
    const key = this.getCacheKey(groupCode, dateStr);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    console.log(`⚡ КЕШИРОВАНИЕ [Возраст: ${Math.round(age / 1000)}s] ${key}`);
    return cached.data;
  }

  setInCache(groupCode, dateStr, data) {
    const key = this.getCacheKey(groupCode, dateStr);

    // Проверка переполнения
    if (this.cache.size >= MAX_CACHE_ITEMS) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      this.cache.delete(oldestKey);
      console.log(`🗑️  Удалена старая запись: ${oldestKey}`);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    console.log(
      `💾 КЕШИРОВАНИЕ [${this.cache.size}/${MAX_CACHE_ITEMS}] ${key}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧЕНИЕ БРАУЗЕРА
  // ═══════════════════════════════════════════════════════════════

  getNextBrowser() {
    if (this.browsers.length === 0) {
      throw new Error("❌ Пул браузеров пуст!");
    }
    const browser = this.browsers[this.currentBrowserIndex];
    this.currentBrowserIndex =
      (this.currentBrowserIndex + 1) % this.browsers.length;
    return browser;
  }

  // ═══════════════════════════════════════════════════════════════
  // ГЛАВНЫЙ API
  // ═══════════════════════════════════════════════════════════════

  async fetchSchedule(groupCode, dateObj) {
    this.requestCounter++;
    const requestId = this.requestCounter;

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Проверка кеша ПЕРЕД постановкой в очередь
    const cached = this.getFromCache(groupCode, dateStr);
    if (cached) {
      return cached;
    }

    console.log(
      `📋 ОЧЕРЕДЬ [#${requestId}] Добавлен: ${groupCode} на ${dateStr}`
    );

    return this.queue.add(() =>
      this._parseSchedule(requestId, groupCode, dateStr, dateObj)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ПАРСИНГ (ИДЕНТИЧЕН ОРИГИНАЛУ)
  // ═══════════════════════════════════════════════════════════════

  async _parseSchedule(requestId, groupCode, dateStr, dateObj) {
    const browser = this.getNextBrowser();
    let page;

    try {
      console.log(`\n🔄 [#${requestId}] ПАРСИНГ НАЧАТ`);
      console.log(`   Группа: ${groupCode}`);
      console.log(`   Дата: ${dateStr}`);

      /* ==========================
         1. Создание страницы
         ========================== */

      page = await browser.newPage();
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      /* ==========================
         2. Открытие главной страницы
         ========================== */

      const mainUrl = `https://psy-msu.ru/educat/raspisanie-uchebnykh-zanyatiy/schedule_group/${groupCode}/`;

      console.log(`   🌐 Загрузка...`);
      await page.goto(mainUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Пауза для загрузки iframe
      await new Promise((r) => setTimeout(r, 3000));

      /* ==========================
         3. Поиск iframe календаря
         ========================== */

      const iframeSrcOriginal = await page.$eval(
        'iframe[src*="calendar.yandex.ru"]',
        (el) => el.src
      );

      if (!iframeSrcOriginal) {
        throw new Error("Iframe календаря не найден");
      }

      console.log(`   📄 Найден iframe календаря`);

      /* ==========================
         4. Подстановка даты в URL iframe
         ========================== */

      let iframeSrc = iframeSrcOriginal;
      if (iframeSrc.includes("show_date=")) {
        iframeSrc = iframeSrc.replace(
          /show_date=\d{4}-\d{2}-\d{2}/,
          `show_date=${dateStr}`
        );
      } else {
        iframeSrc += `&show_date=${dateStr}`;
      }

      console.log(`   📅 Дата установлена: ${dateStr}`);

      /* ==========================
         5. Открытие iframe с датой
         ========================== */

      await page.goto(iframeSrc, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // КРИТИЧЕСКАЯ ПАУЗА
      console.log(`   ⏳ Ожидание рендеринга (5 сек)...`);
      await new Promise((r) => setTimeout(r, 5000));

      /* ==========================
         6. ПАРСИНГ СОБЫТИЙ
         ========================== */

      const lessons = await page.evaluate(() => {
        const result = [];
        const events = Array.from(
          document.querySelectorAll("[class*='GridEvent__wrap']")
        );

        for (const event of events) {
          try {
            const title = event.getAttribute("title");
            if (!title) continue;

            const lines = title
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            if (lines.length < 2) continue;

            const time = lines[0];
            if (!/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(time)) {
              continue;
            }

            const subject = lines[1] || "";
            const room = lines.slice(2).join(", ");

            result.push({
              time: time.replace(/\s*[–-]\s*/g, "-").replace(/\s+/g, ""),
              subject: subject.substring(0, 150),
              room: room.substring(0, 100),
              teacher: "",
            });
          } catch (_) {
            // пропускаем битые события
          }
        }
        return result;
      });

      /* ==========================
         7. РЕЗУЛЬТАТ И КЕШИРОВАНИЕ
         ========================== */

      this.setInCache(groupCode, dateStr, lessons);

      if (lessons.length === 0) {
        console.log(`   ⚠️  Пар НЕ найдено`);
      } else {
        console.log(`   ✅ Найдено пар: ${lessons.length}`);
      }

      console.log(`✅ [#${requestId}] ПАРСИНГ ЗАВЕРШЁН\n`);
      return lessons;
    } catch (err) {
      console.error(`❌ [#${requestId}] ОШИБКА:`, err.message);
      return [];
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (_) {}
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SHUTDOWN
  // ═══════════════════════════════════════════════════════════════

  async shutdown() {
    console.log("\n🛑 ЗАВЕРШЕНИЕ РАБОТЫ");
    console.log("═".repeat(50));

    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (_) {}
    }

    this.browsers = [];
    console.log("✅ Все браузеры закрыты");
    console.log("═".repeat(50) + "\n");
  }

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА
  // ═══════════════════════════════════════════════════════════════

  getStats() {
    const memUsage = process.memoryUsage();
    return {
      browsers: this.browsers.length,
      cacheSize: this.cache.size,
      queueSize: this.queue.size,
      totalRequests: this.requestCounter,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЙ КЕШ
// ═══════════════════════════════════════════════════════════════

const scheduleCache = new ProductionScheduleCache1GB();

// Инициализация при запуске
await scheduleCache.initBrowserPool();

// Graceful shutdown
process.on("SIGTERM", () => scheduleCache.shutdown());
process.on("SIGINT", () => scheduleCache.shutdown());

// ═══════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════

export async function fetchSchedule(groupCode, dateObj) {
  return scheduleCache.fetchSchedule(groupCode, dateObj);
}

export function getParserStats() {
  return scheduleCache.getStats();
}

export { scheduleCache };