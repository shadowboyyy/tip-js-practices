// Прикладные функции работы с задачами.
// Ошибки возвращаются как данные { ok: false, error: "..." }, а не выбрасываются.
// console.log(), DOM и чтение внешних данных здесь не используются.

export function createTask(id, title, priority = "medium") {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный id" };
  }

  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length < 1 || cleanTitle.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100" };
  }

  if (!["low", "medium", "high"].includes(priority)) {
    return { ok: false, error: "Приоритет должен быть low, medium или high" };
  }

  const task = {
    id: id,
    title: cleanTitle,
    completed: false,
    priority: priority,
  };

  return { ok: true, task: task };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed === true);
  const completed = completedTasks.length;
  const pending = total - completed;

  let progress = 0;
  if (total > 0) {
    progress = completed / total * 100;
  }

  return { total: total, completed: completed, pending: pending, progress: progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);

  if (!created.ok) {
    return created;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: "Задача с таким id уже существует" };
  }

  const newTasks = [...tasks, created.task];

  return { ok: true, tasks: newTasks };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный id" };
  }

  if (typeof completed !== "boolean") {
    return { ok: false, error: "Признак выполнения должен быть true или false" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача не найдена" };
  }

  const newTasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: completed };
    }
    return task;
  });

  return { ok: true, tasks: newTasks };
}

export function renameTask(tasks, id, title) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный id" };
  }

  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length < 1 || cleanTitle.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача не найдена" };
  }

  const newTasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, title: cleanTitle };
    }
    return task;
  });

  return { ok: true, tasks: newTasks };
}

export function removeTask(tasks, id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный id" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: "Задача не найдена" };
  }

  const newTasks = tasks.filter((task) => task.id !== id);

  return { ok: true, tasks: newTasks };
}
