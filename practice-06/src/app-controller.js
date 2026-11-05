import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

// Контроллер получает представление аргументом и не зависит от DOM.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  const apiMethods = ["loadInitialData", "getTasks", "createTask", "updateTask",
    "setTaskCompleted", "deleteTask", "resetDemoData"];
  const viewMethods = ["setListState", "setTasks", "setCategories", "setTotal",
    "setFormTask", "showFormErrors", "setMutationPending", "notify"];
  if (!api || !view || typeof validateDraft !== "function"
    || !apiMethods.every((name) => typeof api[name] === "function")
    || !viewMethods.every((name) => typeof view[name] === "function")) {
    throw new TypeError("Нужны API, представление и функция валидации.");
  }

  let tasks = [];
  let categories = [];
  let categoriesLoaded = false;
  let filters = {};
  let editingId = null;
  let activeLoad = null;
  let loadNumber = 0;
  let mutationPending = false;
  let destroyed = false;

  function cancelLoad() {
    loadNumber += 1;
    activeLoad?.abort();
    activeLoad = null;
  }

  async function loadCurrentTasks() {
    if (destroyed) return;
    cancelLoad();
    const number = loadNumber;
    const controller = new AbortController();
    activeLoad = controller;
    view.setListState("loading");
    try {
      const result = categoriesLoaded
        ? await api.getTasks({ ...filters }, { signal: controller.signal })
        : await api.loadInitialData({ ...filters }, { signal: controller.signal });
      // Даже API, игнорирующий сигнал, не сможет заменить новый результат старым.
      if (destroyed || number !== loadNumber) return;
      if (!categoriesLoaded) {
        categories = result.categories;
        categoriesLoaded = true;
        view.setCategories(categories);
      }
      tasks = result.tasks;
      view.setTasks(tasks, categories);
      view.setTotal(result.meta.total);
      view.setListState(tasks.length > 0 ? "ready" : "empty");
      if (mutationPending) view.setMutationPending(true);
    } catch (error) {
      if (destroyed || number !== loadNumber || error.kind === "aborted") return;
      view.setListState("error", messageForError(error));
    } finally {
      if (number === loadNumber) activeLoad = null;
    }
  }

  function cancelEdit() {
    if (destroyed) return;
    editingId = null;
    view.showFormErrors({});
    view.setFormTask(null);
  }

  async function mutate(action, message, afterSuccess = () => {}) {
    if (destroyed || mutationPending) return;
    mutationPending = true;
    cancelLoad();
    view.setMutationPending(true);
    try {
      await action();
      if (destroyed) return;
      afterSuccess();
      view.notify(message, "success");
      await loadCurrentTasks();
    } catch (error) {
      if (!destroyed && error.kind !== "aborted") view.notify(messageForError(error), "error");
    } finally {
      mutationPending = false;
      if (!destroyed) view.setMutationPending(false);
    }
  }

  async function applyFilters(nextFilters = {}) {
    filters = { ...nextFilters };
    await loadCurrentTasks();
  }

  async function submit(draft) {
    if (destroyed || mutationPending) return;
    const result = validateDraft(draft, categories);
    view.showFormErrors(result.errors);
    if (!result.valid) return;
    const id = editingId;
    await mutate(
      () => id === null ? api.createTask(result.value) : api.updateTask(id, result.value),
      id === null ? "Задача добавлена." : "Задача обновлена.",
      cancelEdit,
    );
  }

  function beginEdit(id) {
    if (destroyed || mutationPending) return;
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    editingId = id;
    view.showFormErrors({});
    view.setFormTask(task);
  }

  async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    await mutate(() => api.setTaskCompleted(id, !task.completed), "Статус задачи изменён.");
  }

  async function deleteTask(id) {
    if (!tasks.some((task) => task.id === id)) return;
    await mutate(() => api.deleteTask(id), "Задача удалена.", () => {
      if (editingId === id) cancelEdit();
    });
  }

  async function resetData() {
    await mutate(() => api.resetDemoData(), "Исходные данные восстановлены.", cancelEdit);
  }

  function destroy() {
    destroyed = true;
    cancelLoad();
  }

  return { start: applyFilters, applyFilters, refresh: loadCurrentTasks, submit,
    beginEdit, cancelEdit, toggleTask, deleteTask, resetData, destroy };
}
