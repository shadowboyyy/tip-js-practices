import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function normalizeFilters(filters) {
  if (!filters || Object.getPrototypeOf(filters) !== Object.prototype) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }
  const query = {};
  for (const [name, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(name)) throw new TypeError(`Неизвестный фильтр: ${name}.`);
    if (value === undefined || value === null || value === "") continue;
    if (name === "completed" && typeof value !== "boolean") {
      throw new TypeError("completed должен быть boolean.");
    }
    if (name === "priority" && !ALLOWED_PRIORITIES.has(value)) {
      throw new TypeError("Некорректный приоритет.");
    }
    if (name === "categoryId" && !isPositiveSafeInteger(value)) {
      throw new TypeError("Некорректный id категории.");
    }
    if (name === "q") {
      if (typeof value !== "string" || value.trim().length > 100) {
        throw new TypeError("Поиск должен быть строкой до 100 символов.");
      }
      if (value.trim()) query.q = value.trim();
    } else {
      query[name] = value;
    }
  }
  return query;
}

function checkCollection(payload, predicate) {
  if (!Array.isArray(payload?.data) || !payload.data.every(predicate)
    || new Set(payload.data.map((item) => item.id)).size !== payload.data.length
    || payload.meta?.total !== payload.data.length) {
    throw invalidResponse("Неверная структура коллекции.");
  }
}

function checkId(id) {
  if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным целым числом.");
}

function readTask(payload) {
  if (!isTask(payload?.data)) throw invalidResponse("Неверная структура задачи.");
  return payload.data;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Нужен клиент с методом requestJson.");
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, ...options });
    checkCollection(payload, isTask);
    if (!payload.meta.filters || typeof payload.meta.filters !== "object" || Array.isArray(payload.meta.filters)) {
      throw invalidResponse("В ответе отсутствуют фильтры.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id, options = {}) {
    checkId(id);
    return readTask(await client.requestJson(`/tasks/${id}`, options));
  }

  async function getCategories(options) {
    const payload = await client.requestJson("/categories", options);
    checkCollection(payload, isCategory);
    return payload.data;
  }

  async function loadInitialData(filters = {}, options = {}) {
    const [taskResult, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);
    return { ...taskResult, categories };
  }

  async function createTask(draft, options = {}) {
    const { title, priority, categoryId } = draft;
    return readTask(await client.requestJson("/tasks", {
      ...options, method: "POST", body: { title, priority, categoryId },
    }));
  }

  async function updateTask(id, changes, options = {}) {
    checkId(id);
    return readTask(await client.requestJson(`/tasks/${id}`, {
      ...options, method: "PATCH", body: changes,
    }));
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, options = {}) {
    checkId(id);
    const result = await client.requestJson(`/tasks/${id}`, { ...options, method: "DELETE" });
    if (result !== null) throw invalidResponse("После удаления ожидался пустой ответ.");
    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", { ...options, method: "POST" });
    if (payload?.data?.reset !== true || !Number.isSafeInteger(payload.data.total) || payload.data.total < 0) {
      throw invalidResponse("Сервер не подтвердил сброс данных.");
    }
    return payload.data;
  }

  return { getTasks, getTaskById, getCategories, loadInitialData,
    createTask, updateTask, setTaskCompleted, deleteTask, resetDemoData };
}
