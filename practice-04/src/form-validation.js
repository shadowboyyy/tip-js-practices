const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
// draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let finalId;
  let finalTitle;
  let finalPriority;

  // 1. Проверка ID
  if (editingId !== null) {
    // Режим редактирования
    if (!Number.isSafeInteger(editingId) || editingId <= 0) {
      errors.id = "Некорректный ID редактируемой задачи";
    } else {
      const taskExists = tasks.some((t) => t.id === editingId);
      if (!taskExists) {
        errors.id = "Редактируемая задача не найдена";
      } else {
        finalId = editingId;
      }
    }
  } else {
    // Режим создания
    // Пустая строка не должна превращаться в 0
    if (draft.id === "" || draft.id === null || draft.id === undefined) {
      errors.id = "ID не может быть пустым";
    } else {
      const parsedId = Number(draft.id);
      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
        errors.id = "ID должен быть положительным целым числом";
      } else if (tasks.some((t) => t.id === parsedId)) {
        errors.id = "Задача с таким ID уже существует";
      } else {
        finalId = parsedId;
      }
    }
  }

  // 2. Проверка Title
  if (typeof draft.title !== "string") {
    errors.title = "Название должно быть строкой";
  } else {
    const cleanTitle = draft.title.trim();
    if (cleanTitle.length < 1) {
      errors.title = "Название не может быть пустым";
    } else if (cleanTitle.length > 100) {
      errors.title = "Название не должно превышать 100 символов";
    } else {
      finalTitle = cleanTitle;
    }
  }

  // 3. Проверка Priority
  if (!ALLOWED_PRIORITIES.has(draft.priority)) {
    errors.priority = "Некорректный приоритет";
  } else {
    finalPriority = draft.priority;
  }

  // 4. Возврат результата
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }

  return {
    ok: true,
    value: {
      id: finalId,
      title: finalTitle,
      priority: finalPriority,
    },
  };
}