import TaskItem from './TaskItem.jsx';
export default function TaskList({ tasks, categories, onToggle, onEdit, onDelete }) {
  return <section aria-label="Список задач">
    <h2>Список задач</h2><p>Найдено: {tasks.length}</p>
    {tasks.length === 0 ? <p>По выбранным условиям задач нет.</p> :
      <ul>{tasks.map(task => <TaskItem key={task.id} task={task}
        categoryName={categories.find(category => category.id === task.categoryId)?.name ?? 'Неизвестная категория'}
        onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}</ul>}
  </section>;
}
