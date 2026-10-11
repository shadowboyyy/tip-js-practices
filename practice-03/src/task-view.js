import { getTaskStats } from "./task-service.js";

// Здесь создаётся DOM, но не изменяется состояние приложения.
// Контракт карточки, селекторы и тексты описаны в методичке.
export function createTaskElement(task) {
  const card = document.createElement("li");
  card.classList.add("task-card");
  card.dataset.taskId = task.id;

  if (task.completed) {
    card.classList.add("is-completed");
  }

  const title = document.createElement("h3");
  title.classList.add("task-title");
  title.textContent = task.title;
  card.append(title);

  const status = document.createElement("p");
  status.classList.add("task-status");

  if (task.completed) {
    status.textContent = "Выполнена";
  } else {
    status.textContent = "В работе";
  }
  card.append(status);

  const priority = document.createElement("p");
  priority.classList.add("task-priority");

  if (task.priority === "low") {
    priority.textContent = "Низкий";
  } else if (task.priority === "medium") {
    priority.textContent = "Средний";
  } else {
    priority.textContent = "Высокий";
  }
  card.append(priority);

  const actions = document.createElement("div");
  actions.classList.add("task-actions");

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.dataset.action = "toggle";

  if (task.completed) {
    toggleBtn.setAttribute("aria-pressed", "true");
  } else {
    toggleBtn.setAttribute("aria-pressed", "false");
  }

  const toggleLabel = document.createElement("span");
  toggleLabel.classList.add("action-label");
  toggleLabel.textContent = "Выполнена";
  toggleBtn.append(toggleLabel);
  actions.append(toggleBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";

  const deleteLabel = document.createElement("span");
  deleteLabel.classList.add("action-label");
  deleteLabel.textContent = "Удалить";
  deleteBtn.append(deleteLabel);
  actions.append(deleteBtn);

  card.append(actions);

  return card;
}

export function renderTaskList(listElement, tasks) {
  const cards = [];

  for (let i = 0; i < tasks.length; i++) {
    const card = createTaskElement(tasks[i]);
    cards.push(card);
  }

  listElement.replaceChildren(...cards);
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  const stats = getTaskStats(tasks);

  const totalCell = summaryElement.querySelector('[data-stat="total"]');
  const completedCell = summaryElement.querySelector('[data-stat="completed"]');
  const pendingCell = summaryElement.querySelector('[data-stat="pending"]');
  const progressCell = summaryElement.querySelector('[data-stat="progress"]');
  const visibleCell = summaryElement.querySelector('[data-stat="visible"]');

  totalCell.textContent = stats.total;
  completedCell.textContent = stats.completed;
  pendingCell.textContent = stats.pending;
  progressCell.textContent = stats.progress.toFixed(1) + "%";
  visibleCell.textContent = visibleCount;
}


  // TODO: различать пустой общий список и пустой результат фильтра.
export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
    return;
  }

  if (total === 0) {
    messageElement.textContent = "Список задач пуст.";
  } else {
    messageElement.textContent = "Нет задач по выбранному фильтру.";
  }

  messageElement.hidden = false;
}