import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

// Вывод сводки. Расчёт выполняется в task-service.js, здесь только отображение.
function showStats(tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`Всего: ${total}; выполнено: ${completed}; осталось: ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
}

console.log("=== ОБЩИЙ СЦЕНАРИЙ ===");

let currentTasks = demoTasks;

console.log("Названия:", getTaskTitles(currentTasks));
console.log("Невыполненные:", getTaskTitles(getPendingTasks(currentTasks)));
console.log("--- Исходный набор ---");
showStats(currentTasks);

const addResult = addTask(currentTasks, 20, "Добавить проверку", "high");
if (addResult.ok) {
  currentTasks = addResult.tasks;
} else {
  console.error(`Ошибка: ${addResult.error}`);
}
console.log("--- После добавления id 20 ---");
showStats(currentTasks);

const completeResult = setTaskCompleted(currentTasks, 4, true);
if (completeResult.ok) {
  currentTasks = completeResult.tasks;
} else {
  console.error(`Ошибка: ${completeResult.error}`);
}
console.log("--- После выполнения id 4 ---");
showStats(currentTasks);

const renameResult = renameTask(currentTasks, 10, "Подготовить инструкцию запуска");
if (renameResult.ok) {
  currentTasks = renameResult.tasks;
} else {
  console.error(`Ошибка: ${renameResult.error}`);
}
console.log("--- После переименования id 10 ---");
showStats(currentTasks);

const removeResult = removeTask(currentTasks, 7);
if (removeResult.ok) {
  currentTasks = removeResult.tasks;
} else {
  console.error(`Ошибка: ${removeResult.error}`);
}
console.log("--- После удаления id 7 ---");
showStats(currentTasks);

// Обработанный отказ: такой id уже есть, состояние не заменяется.
const duplicateResult = addTask(currentTasks, 20, "Дубликат", "low");
if (duplicateResult.ok) {
  currentTasks = duplicateResult.tasks;
} else {
  console.error(`Ошибка: ${duplicateResult.error}`);
}
console.log("--- После отказа состояние прежнее ---");
showStats(currentTasks);

console.log("Итоговые идентификаторы:", currentTasks.map((task) => task.id));
console.log("Исходный demoTasks сохранён:", getTaskTitles(demoTasks));

console.log(`=== ИНДИВИДУАЛЬНЫЙ ВАРИАНТ № ${variantNumber} ===`);

let variantCurrent = variantTasks;

console.log("Названия варианта:", getTaskTitles(variantCurrent));
console.log("--- Исходный набор варианта ---");
showStats(variantCurrent);

const addVariant = addTask(variantCurrent, 80, "Подготовить отчёт о семинаре", "high");
if (addVariant.ok) {
  variantCurrent = addVariant.tasks;
} else {
  console.error(`Ошибка: ${addVariant.error}`);
}
console.log("--- После добавления id 80 ---");
showStats(variantCurrent);

const completeVariant = setTaskCompleted(variantCurrent, 11, true);
if (completeVariant.ok) {
  variantCurrent = completeVariant.tasks;
} else {
  console.error(`Ошибка: ${completeVariant.error}`);
}
console.log("--- После выполнения id 11 ---");
showStats(variantCurrent);

const renameVariant = renameTask(variantCurrent, 23, "Обновить раздаточные материалы");
if (renameVariant.ok) {
  variantCurrent = renameVariant.tasks;
} else {
  console.error(`Ошибка: ${renameVariant.error}`);
}
console.log("--- После переименования id 23 ---");
showStats(variantCurrent);

const removeVariant = removeTask(variantCurrent, 37);
if (removeVariant.ok) {
  variantCurrent = removeVariant.tasks;
} else {
  console.error(`Ошибка: ${removeVariant.error}`);
}
console.log("--- После удаления id 37 ---");
showStats(variantCurrent);

const duplicateVariant = addTask(variantCurrent, 80, "Дубликат", "low");
if (duplicateVariant.ok) {
  variantCurrent = duplicateVariant.tasks;
} else {
  console.error(`Ошибка: ${duplicateVariant.error}`);
}
console.log("--- После отказа состояние прежнее ---");
showStats(variantCurrent);

console.log("Итоговые идентификаторы варианта:", variantCurrent.map((task) => task.id));
console.log("Исходный variantTasks сохранён:", getTaskTitles(variantTasks));
