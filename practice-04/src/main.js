import { demoTasks, variantTasks, variantNumber } from "./data.js";
import {
  addTask,
  findTaskById,
  removeTask,
  setTaskCompleted,
  updateTask,
} from "./task-service.js";
import { getVisibleTasks } from "./task-selectors.js";
import { renderEmptyState, renderSummary, renderTaskList } from "./task-view.js";
import { validateTaskDraft } from "./form-validation.js";
import { loadTasks, removeSavedTasks, saveTasks } from "./task-storage.js";

const elements = {
  list: document.querySelector("#task-list"),
  filters: document.querySelector("#task-filters"),
  summary: document.querySelector("#task-summary"),
  empty: document.querySelector("#empty-message"),
  message: document.querySelector("#operation-message"),
  datasetLabel: document.querySelector("#dataset-label"),
  storageStatus: document.querySelector("#storage-status"),
  form: document.querySelector("#task-form"),
  formHeading: document.querySelector("#form-heading"),
  formMode: document.querySelector("#form-mode"),
  formMessage: document.querySelector("#form-message"),
  idInput: document.querySelector("#task-id"),
  titleInput: document.querySelector("#task-title"),
  priorityInput: document.querySelector("#task-priority"),
  submitButton: document.querySelector("#form-submit"),
  cancelButton: document.querySelector("#cancel-edit"),
  resetButton: document.querySelector("#reset-data"),
};

const params = new URLSearchParams(window.location.search);
const isVariant = params.get("dataset") === "variant";
const isCheckRun = params.get("mode") === "check";
const initialTasks = isVariant ? variantTasks : demoTasks;
const datasetName = isVariant ? "variant" : "demo";
const storageKey = isCheckRun
  ? `tip-js-practice-04:checks:${datasetName}`
  : `tip-js-practice-04:${datasetName}`;

// Готовая граница запуска: даже незавершённый или ошибочный модуль хранилища
// не должен оставлять страницу без диагностического сообщения.
let loaded;
try {
  loaded = loadTasks(window.localStorage, storageKey, initialTasks);
} catch (error) {
  loaded = {
    ok: false,
    source: "fallback",
    tasks: initialTasks.map((task) => ({ ...task })),
    error: `Хранилище не инициализировано: ${error.message}`,
  };
  console.error(error);
}
let currentTasks = loaded.tasks;
let currentFilter = "all";
let editingId = null;

elements.datasetLabel.textContent = isVariant
  ? `Индивидуальный вариант: ${variantNumber ?? "не указан"}`
  : "Общий контрольный набор";

if (loaded.source === "storage") {
  elements.storageStatus.textContent = "Данные восстановлены из localStorage.";
} else if (loaded.ok) {
  elements.storageStatus.textContent = "Используется исходный набор; сохранённых данных пока нет.";
} else {
  elements.storageStatus.textContent = loaded.error;
  elements.storageStatus.classList.add("is-warning");
}

function renderApp() {
  const visibleTasks = getVisibleTasks(currentTasks, currentFilter);
  
  renderTaskList(elements.list, visibleTasks);
  renderSummary(elements.summary, currentTasks, visibleTasks.length);
  renderEmptyState(elements.empty, currentTasks.length, visibleTasks.length);

  // Обновляем активную кнопку фильтра
  const filterButtons = elements.filters.querySelectorAll('[data-filter]');
  for (const btn of filterButtons) {
    if (btn.dataset.filter === currentFilter) {
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.setAttribute("aria-pressed", "false");
    }
  }
}

function clearFieldError(name) {
  const input = elements.form.elements.namedItem(name);
  const message = elements.form.querySelector(`[data-error-for="${name}"]`);
  if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  }
  if (message) message.textContent = "";
}

function clearFormErrors() {
  for (const name of ["id", "title", "priority"]) clearFieldError(name);
  elements.formMessage.textContent = "";
}

function showFormErrors(errors) {
  clearFormErrors();
  for (const [name, text] of Object.entries(errors)) {
    const input = elements.form.elements.namedItem(name);
    const message = elements.form.querySelector(`[data-error-for="${name}"]`);
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
      input.setCustomValidity(text);
      input.setAttribute("aria-invalid", "true");
    }
    if (message) message.textContent = text;
  }
  elements.form.reportValidity();
}

function setFormMode(id = null) {
  if (id === null) {
    // Режим создания
    editingId = null;
    elements.form.reset();
    clearFormErrors();
    elements.idInput.disabled = false;
    elements.formHeading.textContent = "Добавление задачи";
    elements.submitButton.textContent = "Добавить задачу";
    elements.cancelButton.hidden = true;
    elements.idInput.focus();
  } else {
    // Режим редактирования
    const task = findTaskById(currentTasks, id);
    if (!task) {
      elements.message.textContent = "Задача не найдена";
      return;
    }
    editingId = id;
    clearFormErrors();
    elements.idInput.value = task.id;
    elements.titleInput.value = task.title;
    elements.priorityInput.value = task.priority;
    elements.idInput.disabled = true; // Блокируем id
    elements.formHeading.textContent = "Редактирование задачи";
    elements.submitButton.textContent = "Сохранить";
    elements.cancelButton.hidden = false;
    elements.titleInput.focus();
  }
}

function persistCurrentTasks(successMessage) {
  const saved = saveTasks(window.localStorage, storageKey, currentTasks);
  elements.storageStatus.classList.toggle("is-warning", !saved.ok);
  elements.storageStatus.textContent = saved.ok
    ? "Изменения сохранены в localStorage."
    : saved.error;
  elements.message.textContent = saved.ok ? successMessage : `${successMessage} ${saved.error}`;
  renderApp();
  return saved;
}

function restoreTaskFocus(id, action) {
  const actionButton = elements.list.querySelector(
    `[data-task-id="${id}"] button[data-action="${action}"]`,
  );
  const filterButton = elements.filters.querySelector(`[data-filter="${currentFilter}"]`);
  (actionButton ?? filterButton)?.focus();
}

function handleFormSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(elements.form);
  const draft = {
    id: formData.get("id"),
    title: formData.get("title"),
    priority: formData.get("priority"),
  };

  const validation = validateTaskDraft(draft, currentTasks, editingId);

  if (!validation.ok) {
    showFormErrors(validation.errors);
    return;
  }

  let result;
  if (editingId === null) {
    const { id, title, priority } = validation.value;
    result = addTask(currentTasks, id, title, priority);
    if (result.ok) {
      currentTasks = result.tasks;
      persistCurrentTasks("Задача успешно добавлена.");
      setFormMode();
    } else {
      showFormErrors({ id: result.error });
    }
  } else {
    const { title, priority } = validation.value;
    result = updateTask(currentTasks, editingId, title, priority);
    if (result.ok) {
      currentTasks = result.tasks;
      persistCurrentTasks("Задача успешно обновлена.");
      setFormMode();
    } else {
      showFormErrors({ title: result.error });
    }
  }
}

function handleTaskListClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const card = button.closest(".task-card");
  if (!card) return;

  const id = Number(card.dataset.taskId);
  const action = button.dataset.action;

  if (action === "edit") {
    setFormMode(id);
    return;
  }

  let result;
  if (action === "toggle") {
    const task = findTaskById(currentTasks, id);
    if (task) {
      result = setTaskCompleted(currentTasks, id, !task.completed);
      if (result.ok) {
        currentTasks = result.tasks;
        persistCurrentTasks("Статус задачи изменен.");
        restoreTaskFocus(id, action);
      }
    }
  } else if (action === "delete") {
    result = removeTask(currentTasks, id);
    if (result.ok) {
      currentTasks = result.tasks;
      if (editingId === id) setFormMode();
      
      persistCurrentTasks("Задача удалена.");
      restoreTaskFocus(id, action);
    }
  }
}

function handleFilterClick(event) {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;
  renderApp();
}

function handleResetClick() {
  const result = removeSavedTasks(window.localStorage, storageKey);
  
  if (!result.ok) {
    elements.storageStatus.classList.add("is-warning");
    elements.storageStatus.textContent = result.error;
    return;
  }

  currentTasks = initialTasks.map((task) => ({ ...task }));
  currentFilter = "all";
  
  setFormMode();
  elements.storageStatus.classList.remove("is-warning");
  elements.storageStatus.textContent = "Данные сброшены до исходного набора.";
  elements.message.textContent = "";
  
  renderApp();
}

elements.form.addEventListener("submit", handleFormSubmit);
elements.form.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    clearFieldError(event.target.name);
  }
});
elements.list.addEventListener("click", handleTaskListClick);
elements.filters.addEventListener("click", handleFilterClick);
elements.cancelButton.addEventListener("click", () => setFormMode());
elements.resetButton.addEventListener("click", handleResetClick);

try {
  setFormMode();
  renderApp();
} catch (error) {
  elements.message.textContent = `Ошибка запуска: ${error.message}`;
  console.error(error);
}