export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string") throw new TypeError("Нужен абсолютный адрес API.");
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new TypeError("Нужен абсолютный адрес API.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash) {
    throw new TypeError("Адрес API должен использовать HTTP(S) без query и hash.");
  }
  return url.href.replace(/\/+$/, "");
}

export function buildUrl(baseUrl, path, query = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (typeof path !== "string" || !path.trim() || /^[a-z][a-z\d+.-]*:/i.test(path)
    || /[?#]/.test(path)) {
    throw new TypeError("Нужен непустой относительный путь без query и hash.");
  }
  if (!query || Object.getPrototypeOf(query) !== Object.prototype) {
    throw new TypeError("Параметры query должны быть обычным объектом.");
  }
  const url = new URL(`${base}/${path.replace(/^\/+|\/+$/g, "")}`);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(name, value);
    }
  }
  return url.href;
}

function checkTimeout(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("Тайм-аут должен быть положительным целым числом.");
  }
}

export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") throw new TypeError("fetchFn должна быть функцией.");
  checkTimeout(timeoutMs);

  async function requestJson(path, {
    query = {},
    signal,
    timeoutMs: requestTimeout = timeoutMs,
    method = "GET",
    body,
  } = {}) {
    checkTimeout(requestTimeout);
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть AbortSignal.");
    }
    const url = buildUrl(base, path, query);
    const headers = { Accept: "application/json" };
    const options = { method: "GET", headers };
    if (typeof method !== "string" || !["GET", "POST", "PATCH", "DELETE"].includes(method.toUpperCase())) {
      throw new TypeError("Недопустимый HTTP-метод.");
    }
    options.method = method.toUpperCase();
    if (body !== undefined) {
      if (options.method === "GET") throw new TypeError("У GET не должно быть тела.");
      options.body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
    const timeoutSignal = AbortSignal.timeout(requestTimeout);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    options.signal = combinedSignal;

    function transportError(cause) {
      if (combinedSignal.aborted) {
        const timedOut = timeoutSignal.aborted && combinedSignal.reason === timeoutSignal.reason;
        return new ApiError(timedOut ? "Превышено время ожидания." : "Запрос отменён.", {
          kind: timedOut ? "timeout" : "aborted", url, cause,
        });
      }
      return new ApiError("Нет соединения с API.", { kind: "network", url, cause });
    }

    let response;
    try {
      combinedSignal.throwIfAborted();
      response = await fetchFn(url, options);
    } catch (cause) {
      throw transportError(cause);
    }
    if (!(response instanceof Response)) {
      throw new ApiError("Ожидался объект Response.", { kind: "invalid-response", url });
    }

    // Статус HTTP важнее формата тела ошибки.
    if (!response.ok) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const error = payload?.error;
      throw new ApiError(typeof error?.message === "string" ? error.message : `HTTP ${response.status}`, {
        kind: "http",
        status: response.status,
        code: typeof error?.code === "string" ? error.code : null,
        details: error?.details ?? null,
        url,
      });
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new ApiError("Ожидался ответ JSON.", { kind: "invalid-response", url });
    }
    try {
      return await response.json();
    } catch (cause) {
      if (combinedSignal.aborted) throw transportError(cause);
      throw new ApiError("Не удалось разобрать JSON.", { kind: "invalid-response", url, cause });
    }
  }

  return { requestJson };
}
