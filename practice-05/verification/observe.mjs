import { writeFile } from "node:fs/promises";
import { createApiClient, buildUrl } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

const baseUrl = "http://127.0.0.1:5515/api";
const client = createApiClient({ baseUrl });
const api = createTaskApi(client);
const result = { baseUrl, http: [], errors: [], timings: { sequential: [], parallel: [] } };
for (const path of ["/health", "/tasks", "/tasks?completed=false&priority=high", "/tasks/25", "/tasks/999", "/categories"]) {
  const response = await fetch(baseUrl + path);
  result.http.push({path,status:response.status,ok:response.ok,contentType:response.headers.get("content-type"),payload:await response.json()});
}
for (const [path, options] of [
  ["/tasks/999"], ["/tasks", { query: { completed: "yes" } }], ["/debug/error"],
  ["/debug/invalid-json"], ["/debug/text"], ["/debug/delay", { query: { ms: 150 }, timeoutMs: 20 }],
]) {
  try { await client.requestJson(path, options); }
  catch (error) { result.errors.push({path,kind:error.kind,status:error.status,code:error.code,details:error.details,url:error.url}); }
}
const controller = new AbortController();
const pending = client.requestJson("/debug/delay", { query: { ms: 150 }, signal: controller.signal });
controller.abort();
try { await pending; }
catch (error) { result.errors.push({path:"explicit abort",kind:error.kind,status:error.status}); }
for (let i = 0; i < 3; i += 1) {
  let start = performance.now();
  await client.requestJson("/debug/delay", { query: { ms: 100 } });
  await client.requestJson("/debug/delay", { query: { ms: 100 } });
  result.timings.sequential.push(Number((performance.now()-start).toFixed(1)));
  start = performance.now();
  await Promise.all([
    client.requestJson("/debug/delay", { query: { ms: 100 } }),
    client.requestJson("/debug/delay", { query: { ms: 100 } }),
  ]);
  result.timings.parallel.push(Number((performance.now()-start).toFixed(1)));
}
const initial = await api.loadInitialData({ completed: false, priority: "high" });
result.general = { ids: initial.tasks.map((task) => task.id), categories: initial.categories, meta: initial.meta };
const variant = await api.getTasks(variantFilters);
result.variant = { url:buildUrl(baseUrl,"/tasks",variantFilters),ids:variant.tasks.map((task)=>task.id),meta:variant.meta };
await writeFile(new URL("./observations.json", import.meta.url), JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({timings:result.timings,general:result.general,variant:result.variant,errors:result.errors},null,2));
