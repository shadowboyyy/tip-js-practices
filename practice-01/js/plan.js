"use strict";

const totalTask = 20;
const completedTask = 11;
const dailyLimit = 6;

const MAX_TASKS = 1000;
const MAX_LIMIT = 1000;

let errorMessage = "";

if (typeof totalTask !== "number" || typeof completedTask !== "number" || typeof dailyLimit !== "number") {
  errorMessage = "Ошибка: все значения должны быть числами, а не строками";
} else if (Number.isNaN(totalTask) || Number.isNaN(completedTask) || Number.isNaN(dailyLimit)) {
  errorMessage = "Ошибка: недопустимое числовое значение";
} else if (!Number.isInteger(totalTask) || !Number.isInteger(completedTask) || !Number.isInteger(dailyLimit)) {
  errorMessage = "Ошибка: все значения должны быть целыми числами";
} else if (totalTask < 0 || completedTask < 0) {
  errorMessage = "Ошибка: количество задач не может быть отрицательным";
} else if (totalTask > MAX_TASKS) {
  errorMessage = `Ошибка: превышена верхняя граница, максимум ${MAX_TASKS} задач`;
} else if (completedTask > totalTask) {
  errorMessage = "Ошибка: выполнено больше задач, чем существует";
} else if (dailyLimit < 1 || dailyLimit > MAX_LIMIT) {
  errorMessage = `Ошибка: дневная норма должна быть от 1 до ${MAX_LIMIT}`;
}

if (errorMessage !== "") {
  console.log(errorMessage);
} else {
  let remainingTasks = totalTask - completedTask;

  console.log("Осталось задач:", remainingTasks);

  let dayNumber = 0;

  if (remainingTasks === 0) {
    console.log("Все задачи уже выполнены");
  }

  while (remainingTasks > 0) {
    dayNumber += 1;
    const tasksToday = Math.min(dailyLimit, remainingTasks);
    remainingTasks -= tasksToday;
    console.log(`День ${dayNumber}: выполнено ${tasksToday}, осталось ${remainingTasks}`);
  }

  console.log("Потребуется дней:", dayNumber);
}