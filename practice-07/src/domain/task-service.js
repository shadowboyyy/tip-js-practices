// Чистые функции не изменяют аргументы и не обращаются к React или DOM.
export function validateTaskDraft(draft, categories) {
  const value = {
    title: typeof draft.title === 'string' ? draft.title.trim() : '',
    priority: draft.priority, categoryId: Number(draft.categoryId),
  };
  const errors = {};
  if (!value.title || value.title.length > 100) errors.title = 'Введите от 1 до 100 символов после удаления пробелов по краям.';
  if (!['low', 'medium', 'high'].includes(value.priority)) errors.priority = 'Выберите приоритет.';
  if (!Number.isSafeInteger(value.categoryId) || !categories.some(category => category.id === value.categoryId)) {
    errors.categoryId = 'Выберите существующую категорию.';
  }
  return { valid: Object.keys(errors).length === 0, value, errors };
}
export function selectTasks(tasks, filters) {
  const q = filters.q.trim().toLocaleLowerCase('ru-RU');
  return tasks.filter(task =>
    (!q || task.title.toLocaleLowerCase('ru-RU').includes(q)) &&
    (filters.completed === '' || task.completed === (filters.completed === 'true')) &&
    (filters.priority === '' || task.priority === filters.priority) &&
    (filters.categoryId === '' || task.categoryId === Number(filters.categoryId))
  );
}
export function getTaskStats(tasks) {
  const completed = tasks.filter(task => task.completed).length;
  return { total: tasks.length, completed, active: tasks.length - completed };
}
export function addTask(tasks, value, id) {
  if (!Number.isSafeInteger(id) || id <= 0 || tasks.some(task => task.id === id)) {
    throw new Error('Идентификатор должен быть положительным целым и уникальным.');
  }
  return [...tasks, { id, title: value.title, priority: value.priority, categoryId: value.categoryId, completed: false }];
}
export function updateTask(tasks, id, value) {
  return tasks.map(task => task.id === id ? {
    ...task, title: value.title, priority: value.priority, categoryId: value.categoryId,
  } : task);
}
export function toggleTask(tasks, id) {
  return tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
}
export function removeTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}
