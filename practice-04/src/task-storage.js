export const STORAGE_VERSION = 1;

// Все функции принимают объект storage явно, чтобы их можно было проверить
// без обращения к глобальному window.localStorage.

export function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set();

  for (const task of value) {
    if (!task || typeof task !== "object" || Array.isArray(task)) return false;

    // Проверка id
    if (!Number.isSafeInteger(task.id) || task.id <= 0) return false;
    if (ids.has(task.id)) return false; // Дубликаты запрещены
    ids.add(task.id);

    // Проверка title
    if (typeof task.title !== "string") return false;
    const cleanTitle = task.title.trim();
    if (cleanTitle.length < 1 || cleanTitle.length > 100) return false;

    // Проверка completed
    if (typeof task.completed !== "boolean") return false;

    // Проверка priority
    if (!["low", "medium", "high"].includes(task.priority)) return false;
  }

  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  // Создаем независимую копию исходных данных на случай ошибки
  const fallbackCopy = fallbackTasks.map((task) => ({ ...task }));

  try {
    const raw = storage.getItem(key);

    // Если ключа нет, отдаем исходный набор
    if (raw === null) {
      return { ok: true, source: "initial", tasks: fallbackCopy };
    }

    const parsed = JSON.parse(raw);

    // Проверка версии и схемы
    if (parsed.version !== STORAGE_VERSION) {
      return { ok: false, source: "fallback", tasks: fallbackCopy, error: "Неизвестная версия схемы данных" };
    }
    if (!isValidTaskList(parsed.tasks)) {
      return { ok: false, source: "fallback", tasks: fallbackCopy, error: "Некорректная структура задач" };
    }

    // Возвращаем копию прочитанных задач
    const loadedTasks = parsed.tasks.map((task) => ({ ...task }));
    return { ok: true, source: "storage", tasks: loadedTasks };

  } catch (error) {
    return { ok: false, source: "fallback", tasks: fallbackCopy, error: "Ошибка при чтении данных" };
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Попытка сохранить некорректный список задач" };
  }

  try {
    const wrapper = {
      version: STORAGE_VERSION,
      tasks: tasks,
    };
    storage.setItem(key, JSON.stringify(wrapper));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Ошибка при сохранении данных" };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Ошибка при удалении данных" };
  }
}