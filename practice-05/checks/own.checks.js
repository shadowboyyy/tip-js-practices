import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
let failed = 0;
async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack);
  }
}

const server = createApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
const client = createApiClient({ baseUrl });
const api = createTaskApi(client);
try {
  await check("Комбинация completed=false, priority=medium, categoryId=2 находит только 28", async () => {
    const result = await api.getTasks({ completed: false, priority: "medium", categoryId: 2 });
    assert.deepEqual(result.tasks.map((task) => task.id), [28]);
  });
  await check("Вариант 4: medium возвращает 1, 10, 19, 28", async () => {
    const result = await api.getTasks(variantFilters);
    assert.deepEqual(result.tasks.map((task) => task.id), [1, 10, 19, 28]);
    assert.equal(result.meta.total, 4);
  });
  await check("Отсутствующая категория сохраняет код CATEGORY_NOT_FOUND и id", async () => {
    await assert.rejects(() => client.requestJson("/categories/999"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 404);
      assert.equal(error.code, "CATEGORY_NOT_FOUND");
      assert.equal(error.details.id, 999);
      return true;
    });
  });
  await check("Отменённый заранее сигнал не запускает fetch", async () => {
    let calls = 0;
    const localClient = createApiClient({ baseUrl, fetchFn: async () => { calls += 1; } });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(() => localClient.requestJson("/tasks", { signal: controller.signal }),
      (error) => error instanceof ApiError && error.kind === "aborted");
    assert.equal(calls, 0);
  });
  await check("Повторяющиеся id категорий отклоняются после корректного JSON", async () => {
    const localApi = createTaskApi({ async requestJson() {
      return { data: [{ id: 1, name: "Учёба" }, { id: 1, name: "Проект" }], meta: { total: 2 } };
    } });
    await assert.rejects(() => localApi.getCategories(),
      (error) => error instanceof ApiError && error.kind === "invalid-response");
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Итог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
