export default function TaskStats({ stats }) {
  return <section aria-label="Статистика"><h2>Статистика всего набора</h2>
    <p>Всего: {stats.total} · Выполнено: {stats.completed} · В работе: {stats.active}</p>
  </section>;
}
