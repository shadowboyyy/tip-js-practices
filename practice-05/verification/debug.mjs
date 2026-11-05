import inspector from "node:inspector";
import { readFile, writeFile } from "node:fs/promises";
import { createApiClient } from "../src/api-client.js";

const session = new inspector.Session();
session.connect();
const post = (method, params = {}) => new Promise((resolve, reject) => {
  session.post(method, params, (error, result) => error ? reject(error) : resolve(result));
});
const url = new URL("../src/api-client.js", import.meta.url).href;
const source = await readFile(new URL(url), "utf8");
const lines = source.split("\n");
const points = ["response = await fetchFn", "if (!(response instanceof Response))", "return await response.json()", "throw new ApiError(typeof error?.message"];
const snapshots = [];
await post("Debugger.enable");
for (const point of points) {
  await post("Debugger.setBreakpointByUrl", { url, lineNumber: lines.findIndex((line) => line.includes(point)) });
}
session.on("Debugger.paused", ({ params }) => {
  const frame = params.callFrames.find((item) => item.functionName === "requestJson");
  if (!frame) { session.post("Debugger.resume"); return; }
  const line = lines[frame.location.lineNumber];
  const expression = line.includes("response = await fetchFn")
    ? "JSON.stringify({url})"
    : "JSON.stringify({url,status:response.status,ok:response.ok,contentType:response.headers.get('content-type')})";
  session.post("Debugger.evaluateOnCallFrame", { callFrameId:frame.callFrameId, expression, returnByValue:true }, (error, result) => {
    snapshots.push({line:frame.location.lineNumber+1,source:line.trim(),value:error ? error.message : result.result.value});
    session.post("Debugger.resume");
  });
});
const client = createApiClient({ baseUrl: "http://127.0.0.1:5515/api" });
snapshots.push({payload:await client.requestJson("/tasks/25")});
try { await client.requestJson("/tasks/999"); }
catch (error) { snapshots.push({error:{kind:error.kind,status:error.status,code:error.code,details:error.details,url:error.url}}); }
await post("Debugger.disable");
session.disconnect();
await writeFile(new URL("./debug.json",import.meta.url),JSON.stringify(snapshots,null,2)+"\n");
console.log(JSON.stringify(snapshots,null,2));
