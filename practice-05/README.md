# Практическая работа № 5. Асинхронные операции и получение данных с сервера

Автор: Захаров Артём. Группа: ЭФБО-14-25. Вариант: 4.

Проверено 5 ноября 2026 года. Окружение: Node.js v24.21.0, npm 11.19.0, macOS 26.6.2 (25G83), Chromium 156.0.0.0 в режиме headless.

Методичка: [ПР5](https://github.com/adyshkins/TIP-JS/tree/main/practices/practice-05). Использованы стартовые файлы из `TIP-JS-main` на рабочем столе. Внешние зависимости не требуются.

## Цель и результат

Реализованы общий GET/JSON-клиент, предметный API задач, проверка контрактов ответов, тайм-аут и внешняя отмена. Интерфейс ПР4 здесь не подключается к API; модуль используется из терминала.

## Запуск

Из папки `practice-05`:

```bash
npm test
npm start
```

Во втором терминале:

```bash
npm run example:order
npm run example:order:extra
npm run example:fetch
npm run client
```

Обычный адрес: <http://127.0.0.1:5505/api>. При совместной проверке с ПР6 использовался отдельный порт 5515:

```bash
node api/server.mjs 5515
API_URL=http://127.0.0.1:5515/api npm run client
API_URL=http://127.0.0.1:5515/api npm run example:fetch
node verification/observe.mjs
node verification/debug.mjs
```

## Эксперимент с очередями

| Эксперимент | Прогноз | Фактический порядок |
|---|---|---|
| Исходный | A B C D E F | A B C D E F |
| С дополнительным Promise | A B C D E G F | A B C D E G F |

A, B и C выполняются в текущем стеке. D зарегистрирована первой микрозадачей, E — продолжение после await, G добавлена позднее. Таймер F выполняется после микрозадач; задержка 0 не означает немедленный вызов. Удаление обработчика D уберёт D, сохранив относительный порядок остальных меток.

```text
> tip-js-practice-05@1.0.0 example:order
> node examples/event-loop.js

A: синхронный код
B: начало async-функции
C: конец синхронного кода
D: обработчик Promise
E: продолжение после await
F: задача таймера
```

```text
> tip-js-practice-05@1.0.0 example:order:extra
> node examples/event-loop-extra.js

A: синхронный код
B: начало async-функции
C: конец синхронного кода
D: обработчик Promise
E: продолжение после await
G: собственный обработчик Promise
F: задача таймера
```
## Наблюдение за HTTP

Запрос примера: GET `http://127.0.0.1:5515/api/tasks?completed=false&priority=high`. Accept: application/json.

```text
> tip-js-practice-05@1.0.0 example:fetch
> node examples/fetch-basics.js

status: 200
ok: true
content-type: application/json; charset=utf-8
ids: [ 4, 13, 34 ]
meta: {
  total: 3,
  filters: { completed: false, priority: 'high', categoryId: null, q: '' }
}
```

| Путь | Статус | ok | Content-Type | Форма тела |
|---|---|---|---|---|
| /health | 200 | true | application/json; charset=utf-8 | data{} |
| /tasks | 200 | true | application/json; charset=utf-8 | data[] + meta |
| /tasks?completed=false&priority=high | 200 | true | application/json; charset=utf-8 | data[] + meta |
| /tasks/25 | 200 | true | application/json; charset=utf-8 | data{} |
| /tasks/999 | 404 | false | application/json; charset=utf-8 | error с code/message/details |
| /categories | 200 | true | application/json; charset=utf-8 | data[] + meta |

Из /health получено data.status="ok". /tasks/25 возвращает задачу «Исправить обработку ошибок», completed=true, priority=high, categoryId=2. Полные ответы HTTP-клиента: [observations.json](verification/observations.json).

## Организация кода

| Файл | Ответственность |
|---|---|
| `api/server.mjs` | Готовая инфраструктура учебного HTTP API; не изменялась. |
| `src/api-client.js` | URL, fetch, Response, JSON, сигналы, ApiError. |
| `src/task-api.js` | Фильтры и маршруты задач/категорий, проверка предметной схемы, Promise.all. |
| `src/variant.js` | Только номер 4 и данные фильтра medium. |
| `src/main.js` | Загрузка, вывод таблицы задач и отдельная обработка 404. |

fetchFn передаётся параметром для подмены сети. HTTP-статус проверяется после fetch, чтобы не превращать 404 в network. JSON проверяется повторно по предметной схеме, поскольку корректный синтаксис не гарантирует модель.

## Общий клиент

| Требование | Реализация | Проверка |
|---|---|---|
| baseUrl | Абсолютный HTTP(S), без query/hash; конечные / удаляются | Модульная 04 |
| URL и query | URL + searchParams.set; undefined/null/пустая строка пропускаются, false и 0 сохраняются, query не меняется | Модульные 01–03 |
| Accept | application/json для каждого GET | Модульная 05 |
| response.ok | HTTP-ошибка до проверки успешного Content-Type; сохраняются status/code/details/url | Модульные 08–09 и 16 |
| 204 | Возврат null без json() | Модульная 07 |
| Content-Type и JSON | Проверка application/json; ошибка разбора становится invalid-response | Модульные 10–12 |
| Время и отмена | AbortSignal.timeout, AbortSignal.any, AbortController; сохраняется cause | Модульные 13–15; интеграционные 12–13 |
| Отмена до запроса | throwIfAborted до fetchFn | Собственная проверка 4 |

## Классификация ошибок

| Сценарий | Ожидаемый kind | Фактические поля | Итог |
|---|---|---|---|
| /tasks/999 | http | kind=http; status=404; code=TASK_NOT_FOUND; details={'id': 999} | OK |
| /tasks | http | kind=http; status=400; code=INVALID_QUERY; details=None | OK |
| /debug/error | http | kind=http; status=503; code=SERVICE_UNAVAILABLE; details=None | OK |
| /debug/invalid-json | invalid-response | kind=invalid-response; status=None; code=None; details=None | OK |
| /debug/text | invalid-response | kind=invalid-response; status=None; code=None; details=None | OK |
| /debug/delay | timeout | kind=timeout; status=None; code=None; details=None | OK |
| explicit abort | aborted | kind=aborted; status=None; code=None; details=None | OK |
| Остановлен API | network | kind=network, process.exitCode=1; response отсутствует | OK |

## Предметный API

| Вызов | Фактический результат |
|---|---|
| getTasks() | 12 задач: [1,4,7,10,13,16,19,22,25,28,31,34] |
| getTasks({completed:false,priority:"high"}) | 3 задачи: [4,13,34] |
| getTaskById(25) | id=25, title="Исправить обработку ошибок", completed=true, priority=high, categoryId=2 |
| getCategories() | 1 — Учёба, 2 — Проект, 3 — Организация |
| loadInitialData(...) | tasks, meta и categories получены через Promise.all |

До запроса допускаются только completed, priority, categoryId и q. completed должен быть boolean, categoryId — положительным безопасным целым, priority — low/medium/high, q — строкой до 100 после trim. После ответа проверяются поля задач и категорий, уникальность id, массив data, meta.total равный длине data и объект meta.filters списка задач.

## Последовательная и параллельная загрузка

В каждом запуске сделаны два GET /debug/delay?ms=100. Прогноз: около 200 мс при последовательном ожидании и около 100 мс при совместном.

| Сценарий | Запуск 1, мс | Запуск 2, мс | Запуск 3, мс |
|---|---|---|---|
| Два await | 208.8 | 211.1 | 211.2 |
| Promise.all | 106.9 | 109.7 | 107.6 |

При последовательном ожидании задержки складываются; при параллельном перекрываются. Накладные расходы и планирование влияют на измерения. Promise.all ожидает начатые операции и при отказе одной не отменяет остальные. Искусственных задержек в src нет.

## Общий сценарий и восстановление связи

| Действие | Ожидание | Факт |
|---|---|---|
| GET health | 200 и ok | 200, data.status=ok |
| Все задачи | 12 | 12 |
| completed=false,high | [4,13,34] | [4,13,34] |
| Параллельная загрузка | Задачи и 3 категории | Обе части получены |
| Задача 999 | http/404 | http/404/TASK_NOT_FOUND |
| Остановка API и client | network, код выхода 1 | network, код выхода 1 |
| Повторный запуск API и client | Успешное чтение | 4 задачи варианта; 404 отдельно обработана |

Остановка и запуск выполнены для отдельного сервера 5515. Протоколы: [offline.txt](verification/offline.txt), [restarted.txt](verification/restarted.txt).

## Индивидуальный вариант

Вариант 4: `{ priority: "medium" }`; URL `http://127.0.0.1:5515/api/tasks?priority=medium`. Фильтр выбирает только средний приоритет; статус и категория не ограничены. Ожидались и получены id `[1,10,19,28]`, meta.total=4. Собственная проверка повторяет именно эту комбинацию.

```text
> tip-js-practice-05@1.0.0 client
> node src/main.js

Индивидуальный вариант 4
Фильтры: { completed: null, priority: 'medium', categoryId: null, q: '' }
Получено задач: 4; время: 18.4 мс
┌─────────┬────┬─────────────────────────────┬───────────┬──────────┬───────────────┐
│ (index) │ id │ title                       │ completed │ priority │ category      │
├─────────┼────┼─────────────────────────────┼───────────┼──────────┼───────────────┤
│ 0       │ 1  │ 'Изучить функции'           │ true      │ 'medium' │ 'Учёба'       │
│ 1       │ 10 │ 'Оформить README'           │ true      │ 'medium' │ 'Организация' │
│ 2       │ 19 │ 'Описать контракт запросов' │ false     │ 'medium' │ 'Организация' │
│ 3       │ 28 │ 'Добавить фильтры API'      │ false     │ 'medium' │ 'Проект'      │
└─────────┴────┴─────────────────────────────┴───────────┴──────────┴───────────────┘
Контрольная ошибка 404: Тип: http · Задача с id 999 не найдена. · HTTP 404 · Код API: TASK_NOT_FOUND
```
## Протоколы автоматизированных проверок

Фактический `npm test`: API 18, клиент 26, интеграция 13 и собственные 5; всего 62, ошибок 0.

```text
> tip-js-practice-05@1.0.0 test
> npm run check:api && npm run check:client && npm run check:integration && npm run check:own


> tip-js-practice-05@1.0.0 check:api
> node checks/api-server.checks.js

OK: 01. health возвращает состояние API и обязательные заголовки
OK: 02. список задач сохраняет контрольный порядок
OK: 03. completed=false отбирает невыполненные задачи
OK: 04. несколько фильтров применяются совместно
OK: 05. q выполняет регистронезависимый поиск по названию
OK: 06. пустой q не отбирает задачи
OK: 07. неверное значение completed даёт JSON-ошибку 400
OK: 08. неизвестный и повторяющийся параметры отклоняются
OK: 09. задача запрашивается по положительному id
OK: 10. отсутствующая задача даёт структурированную ошибку 404
OK: 11. неверный формат id даёт ошибку 400
OK: 12. API возвращает категории
OK: 13. категория запрашивается по id, отсутствие даёт 404
OK: 14. HEAD возвращает заголовки без тела
OK: 15. OPTIONS сообщает правила CORS
OK: 16. неподдерживаемый метод даёт 405 и Allow
OK: 17. неизвестный маршрут даёт ошибку 404
OK: 18. отладочные маршруты воспроизводят 503, не-JSON и задержку

Итог API: успешно 18, ошибок 0.

> tip-js-practice-05@1.0.0 check:client
> node checks/api-client.checks.js

OK: 01. buildUrl соединяет baseUrl и путь без двойного слеша
OK: 02. buildUrl кодирует параметры и сохраняет false и 0
OK: 03. buildUrl не изменяет входной объект query
OK: 04. createApiClient проверяет конфигурацию
OK: 05. requestJson выполняет GET с Accept и signal
OK: 06. requestJson возвращает разобранный JSON успешного ответа
OK: 07. успешный ответ 204 преобразуется в null
OK: 08. JSON-ошибка 404 преобразуется в ApiError с полями контракта
OK: 09. HTTP-ошибка без JSON сохраняет приоритет статуса
OK: 10. успешный ответ с неверным Content-Type отклоняется
OK: 11. повреждённый JSON успешного ответа отклоняется
OK: 12. значение вместо Response отклоняется как неверный ответ
OK: 13. сетевая ошибка преобразуется и сохраняется как cause
OK: 14. превышение времени запроса имеет kind timeout
OK: 15. внешний AbortSignal отличает отмену от тайм-аута
OK: 16. ApiError от обработки ответа не маскируется как network
OK: 17. createTaskApi требует requestJson
OK: 18. getTasks нормализует допустимые фильтры
OK: 19. getTasks отклоняет неверные и неизвестные фильтры до запроса
OK: 20. getTaskById проверяет id и путь
OK: 21. getCategories возвращает проверенный массив
OK: 22. ответы задач проверяются по схеме
OK: 23. коллекция задач отклоняет повторяющиеся id и неверный meta.total
OK: 24. одиночная задача и категории проверяются по схеме
OK: 25. loadInitialData начинает два независимых запроса параллельно
OK: 26. loadInitialData передаёт отказ одного из запросов вызывающему коду

Итог клиента: успешно 26, ошибок 0.

> tip-js-practice-05@1.0.0 check:integration
> node checks/integration.checks.js

OK: 01. клиент получает полный список от реального API
OK: 02. логические false и несколько фильтров доходят до API
OK: 03. строка поиска кодируется и обрабатывается
OK: 04. клиент получает одну задачу
OK: 05. клиент получает категории
OK: 06. параллельная начальная загрузка собирает общий результат
OK: 07. ошибка 404 сохраняет код и детали API
OK: 08. ошибка запроса 400 не считается сетевой
OK: 09. ошибка сервера 503 сохраняет вид http
OK: 10. повреждённый JSON определяется как invalid-response
OK: 11. неожиданный Content-Type определяется как invalid-response
OK: 12. медленный ответ прерывается по тайм-ауту
OK: 13. внешний AbortController отменяет реальный запрос

Итог интеграции: успешно 13, ошибок 0.

> tip-js-practice-05@1.0.0 check:own
> node checks/own.checks.js

OK: Комбинация completed=false, priority=medium, categoryId=2 находит только 28
OK: Вариант 4: medium возвращает 1, 10, 19, 28
OK: Отсутствующая категория сохраняет код CATEGORY_NOT_FOUND и id
OK: Отменённый заранее сигнал не запускает fetch
OK: Повторяющиеся id категорий отклоняются после корректного JSON
Итог собственных проверок: успешно 5, ошибок 0.
```
## Собственные проверки

| Случай | Ожидание | Факт |
|---|---|---|
| completed=false, medium, categoryId=2 | Только 28 | [28] |
| Вариант medium | [1,10,19,28] | Совпало, total=4 |
| GET categories/999 | http/404/CATEGORY_NOT_FOUND, details.id=999 | Совпало |
| Сигнал отменён до запроса | aborted, fetch не вызывается | aborted, calls=0 |
| Повтор id категории | invalid-response | invalid-response |

Команда: `npm run check:own`. Код: [own.checks.js](checks/own.checks.js).

## Отладка

Node.js inspector установил точки до fetchFn, после получения Response, перед response.json и при создании HTTP-ошибки. Для /tasks/25: status=200, ok=true, application/json; получен payload.data задачи 25. Для /tasks/999: status=404, ok=false, application/json; payload.error преобразован в ApiError с kind=http, code=TASK_NOT_FOUND, details.id=999 и полным URL. Точные снимки: [debug.json](verification/debug.json); воспроизведение: `node verification/debug.mjs` при сервере 5515.

## Дополнительное задание

Необязательное расширение не выбиралось. Обязательные задания, собственные проверки и индивидуальный вариант выполнены.

## Контрольные вопросы
1. Promise представляет будущий результат, а не готовые данные.
2. Состояния: pending, fulfilled, rejected.
3. fetch запускает асинхронную операцию и сразу возвращает Promise.
4. В эксперименте микрозадачи выполняются после текущего стека до задачи таймера.
5. async-функция всегда возвращает Promise.
6. await отклонённого Promise выбрасывает причину отказа в окружающий try/catch.
7. 404 является полученным HTTP-ответом, а не срывом обмена.
8. Response.ok=true для статусов 200–299.
9. json() читает поток и возвращает Promise.
10. Content-Type помогает отвергнуть неожиданный текст до JSON.parse.
11. В корректном JSON могут отсутствовать поля модели или быть неверные типы.
12. URLSearchParams кодирует значения query, включая пробелы, & и кириллицу.
13. false — содержательное условие «невыполненные».
14. При HTTP-ошибке есть ответ и статус; при network ответа нет.
15. Тайм-аут вызывается истечением времени, aborted — внешним сигналом отмены.
16. AbortController сигнализирует отмену операции.
17. Promise.all подходит для независимых запросов.
18. Итоговый Promise отклонится с причиной одного отказа.
19. Остальные операции сами не отменяются.
20. Транспорт не должен знать модель задач; предметный API не дублирует fetch.
21. fetchFn позволяет детерминированно проверять клиент без сети.
22. Модульные проверки исследуют URL, заголовки, схемы и обработку ошибок с подменами.
23. Интеграция подтверждает совместимость с реальным учебным сервером.
24. CORS — политика браузера для запросов между origin; Node.js её не применяет.
25. В ПР6 переиспользуются клиент, ApiError, фильтры, проверка схемы и параллельная загрузка.

## Вывод

Ожидание Promise отделено от проверки HTTP и предметных данных. Клиент различает пять видов ошибок, поддерживает ограничение времени и отмену, а независимые ресурсы загружает совместно. Все проверки и вариант 4 проходят. Скриншоты и общий отчёт оформляются следующим этапом.
