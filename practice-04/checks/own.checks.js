import assert from "node:assert/strict";
import { demoTasks } from "../src/data.js";
import { validateTaskDraft } from "../src/form-validation.js";
import { isValidTaskList, loadTasks, saveTasks } from "../src/task-storage.js";

const entries = new Map();
const storage = {
  getItem(key) { return entries.get(key) ?? null; },
  setItem(key, value) { entries.set(key, value); },
};

const draft = { id: "75", title: `  ${"Я".repeat(100)}  `, priority: "medium" };
const validated = validateTaskDraft(draft, demoTasks);
assert.equal(validated.ok, true);
assert.equal(validated.value.title.length, 100);
assert.equal(validateTaskDraft({ ...draft, title: "Я".repeat(101) }, demoTasks).ok, false);
console.log("OK: Граница 100 после trim допускается, 101 отклоняется.");

assert.equal(saveTasks(storage, "own", demoTasks).ok, true);
const first = loadTasks(storage, "own", []);
first.tasks[0].title = "Изменение только в памяти";
const reloaded = loadTasks(storage, "own", []);
assert.equal(reloaded.source, "storage");
assert.equal(reloaded.tasks[0].title, demoTasks[0].title);
console.log("OK: Повторная загрузка читает сохранённые данные, а не изменённый объект.");

assert.equal(isValidTaskList([null]), false);
storage.setItem("own", JSON.stringify({ version: 1, tasks: [null] }));
const fallback = loadTasks(storage, "own", demoTasks);
assert.equal(fallback.ok, false);
assert.deepEqual(fallback.tasks, demoTasks);
assert.notEqual(fallback.tasks[0], demoTasks[0]);
console.log("OK: null внутри JSON отклоняется, fallback не разделяет объекты с исходным набором.");
console.log("Итог собственных проверок: успешно 3, ошибок 0.");
