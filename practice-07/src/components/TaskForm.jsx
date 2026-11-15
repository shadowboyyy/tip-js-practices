import { useState } from 'react';
import { validateTaskDraft } from '../domain/task-service.js';

export default function TaskForm({ categories, initialTask = null, onSave, onCancel }) {
  const emptyDraft = () => ({ title: '', priority: 'medium', categoryId: String(categories[0]?.id ?? '') });
  const [draft, setDraft] = useState(() => initialTask ? {
    title: initialTask.title, priority: initialTask.priority, categoryId: String(initialTask.categoryId),
  } : emptyDraft());
  const [errors, setErrors] = useState({});
  const change = event => setDraft(previous => ({ ...previous, [event.target.name]: event.target.value }));
  function submit(event) {
    event.preventDefault();
    const result = validateTaskDraft(draft, categories);
    setErrors(result.errors);
    if (!result.valid) return;
    if (onSave(result.value) === true) {
      if (!initialTask) setDraft(emptyDraft());
    } else {
      setErrors({ submit: 'Не удалось сохранить задачу. Введённые значения сохранены.' });
    }
  }
  return <section aria-label="Форма задачи">
    <h2>{initialTask ? 'Редактирование задачи' : 'Новая задача'}</h2>
    <form onSubmit={submit} noValidate>
      <label htmlFor="title">Название</label>
      <input id="title" name="title" value={draft.title} onChange={change} aria-invalid={Boolean(errors.title)} aria-describedby="title-hint title-error" />
      <p id="title-hint">От 1 до 100 символов после удаления пробелов по краям.</p>
      <p id="title-error" className="error">{errors.title}</p>
      <label htmlFor="priority">Приоритет</label>
      <select id="priority" name="priority" value={draft.priority} onChange={change} aria-invalid={Boolean(errors.priority)} aria-describedby="priority-error">
        <option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option>
      </select><p id="priority-error" className="error">{errors.priority}</p>
      <label htmlFor="categoryId">Категория</label>
      <select id="categoryId" name="categoryId" value={draft.categoryId} onChange={change} aria-invalid={Boolean(errors.categoryId)} aria-describedby="category-error">
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select><p id="category-error" className="error">{errors.categoryId}</p>
      <button type="submit">Сохранить</button>
      {initialTask && <button type="button" onClick={onCancel}>Отмена</button>}
      {errors.submit && <p role="alert">{errors.submit}</p>}
    </form>
  </section>;
}
