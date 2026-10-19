export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
};

/** Appel JSON aux endpoints du plugin, avec cookies de session. */
export async function pluginApi<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`/api/auth${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { ok: response.ok, status: response.status, data: data as T };
}

export function post<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return pluginApi<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function patch<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return pluginApi<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function get<T = unknown>(path: string): Promise<ApiResult<T>> {
  return pluginApi<T>(path, { method: "GET" });
}

export function errorMessage(result: ApiResult<unknown>): string {
  const data = result.data as Record<string, unknown> | null;
  if (data && typeof data === "object") {
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }
  return `HTTP ${result.status}`;
}

export function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
