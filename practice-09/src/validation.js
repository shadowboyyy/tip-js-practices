import { ApiError } from './errors.js';

export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseFilters(searchParams) {
  const allowed = ['completed', 'priority', 'categoryId', 'q'];
  const invalid = message => { throw new ApiError(400, 'INVALID_QUERY', message); };
  for (const name of searchParams.keys()) {
    if (!allowed.includes(name)) invalid(`Неизвестный параметр: ${name}.`);
    if (searchParams.getAll(name).length > 1) invalid(`Параметр ${name} не должен повторяться.`);
  }
  const filters = { completed: null, priority: null, categoryId: null, q: '' };
  if (searchParams.has('completed')) {
    const raw = searchParams.get('completed');
    if (raw !== 'true' && raw !== 'false') invalid('Статус должен быть true или false.');
    filters.completed = raw === 'true';
  }
  if (searchParams.has('priority')) {
    const raw = searchParams.get('priority');
    if (!['low', 'medium', 'high'].includes(raw)) invalid('Выберите low, medium или high.');
    filters.priority = raw;
  }
  if (searchParams.has('categoryId')) {
    const id = parsePositiveId(searchParams.get('categoryId'));
    if (id === null) invalid('Категория должна быть положительным безопасным целым без ведущих нулей.');
    filters.categoryId = id;
  }
  if (searchParams.has('q')) {
    filters.q = searchParams.get('q').trim();
    if (filters.q.length > 100) invalid('Поиск должен содержать не более 100 символов.');
  }
  return filters;
}
