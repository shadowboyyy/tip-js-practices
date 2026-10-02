"use strict";

const totalTask = 20;
const completedTask = 11;

const MAX_TASKS = 1000;

let errorMessage = "";

if (typeof totalTask !== "number" || typeof completedTask !== "number") {
  errorMessage = "Ошибка: количество задач должно быть числом, а не строкой";
} else if (Number.isNaN(totalTask) || Number.isNaN(completedTask)) {
  errorMessage = "Ошибка: недопустимое числовое значение";
} else if (!Number.isInteger(totalTask) || !Number.isInteger(completedTask)) {
  errorMessage = "Ошибка: количество задач должно быть целым числом";
} else if (totalTask < 0 || completedTask < 0) {
  errorMessage = "Ошибка: количество задач не может быть отрицательным";
} else if (totalTask > MAX_TASKS) {
  errorMessage = `Ошибка: превышена верхняя граница, максимум ${MAX_TASKS} задач`;
} else if (completedTask > totalTask) {
  errorMessage = "Ошибка: выполнено больше задач, чем существует";
}

if (errorMessage !== "") {
  console.log(errorMessage);
} else if (totalTask === 0 && completedTask === 0) {
  console.log("Задач пока нет");
} else {
  const remainingTasks = totalTask - completedTask;
  const progressPercent = completedTask / totalTask * 100;

  let taskStatus = "";
  if (completedTask === 0) {
    taskStatus = "Не начато";
  } else if (completedTask < totalTask) {
    taskStatus = "В работе";
  } else {
    taskStatus = "Завершено";
  }

  console.log("Всего задач:", totalTask);
  console.log("Выполнено:", completedTask);
  console.log("Осталось:", remainingTasks);
  console.log(`Прогресс: ${progressPercent.toFixed(1)}%`);
  console.log("Статус:", taskStatus);
}