import { useState } from 'react';
import { tasks as initialTasks, categories } from './data.js';
import { createInitialFilters, variant } from './variant.js';
import { selectTasks, getTaskStats, addTask, updateTask, toggleTask, removeTask } from './domain/task-service.js';
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

export default function App() {
  const [tasks, setTasks] = useState(() => initialTasks.map(task => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = tasks.find(task => task.id === editingId) ?? null;
  function save(value) {
    if (editingId !== null && !editingTask) return false;
    if (editingId === null) {
      setTasks(previous => addTask(previous, value, Math.max(0, ...previous.map(task => task.id)) + 1));
      setNotice('Задача добавлена. Если она скрыта, проверьте фильтры.');
    } else {
      setTasks(previous => updateTask(previous, editingId, value));
      setEditingId(null);
      setNotice('Изменения сохранены.');
    }
    return true;
  }
  function toggle(id) {
    setTasks(previous => toggleTask(previous, id));
    setNotice('Статус задачи изменён.');
  }
  function remove(id) {
    const task = tasks.find(item => item.id === id);
    if (!task || !window.confirm(`Удалить «${task.title}»?`)) return;
    setTasks(previous => removeTask(previous, id));
    if (editingId === id) setEditingId(null);
    setNotice('Задача удалена.');
  }
  return <main>
    <h1>Задачи на React</h1>
    <p>Практика 7 · Захаров Артём · ЭФБО-14-25 · Вариант {variant}</p>
    <p>Данные в памяти страницы. Перезагрузка восстанавливает исходный набор.</p>
    <TaskStats stats={stats} />
    <TaskFilters filters={filters} categories={categories} onChange={setFilters} />
    <p role="status">{notice}</p>
    <TaskForm key={editingId ?? 'new'} categories={categories} initialTask={editingTask} onSave={save} onCancel={() => setEditingId(null)} />
    <TaskList tasks={visibleTasks} categories={categories} onToggle={toggle} onEdit={setEditingId} onDelete={remove} />
  </main>;
}
