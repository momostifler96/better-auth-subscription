/** Petit client HTTP injectable, pour ne dépendre d'aucun SDK tiers précis dans les adaptateurs. */
export interface HttpClient {
  request<T>(input: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<T>;
}

/** Implémentation par défaut basée sur `fetch` (disponible nativement en Node >= 18). */
export function createFetchHttpClient(baseUrl: string, defaultHeaders: Record<string, string>): HttpClient {
  return {
    async request<T>({ method, path, body, headers }: {
      method: "GET" | "POST" | "PATCH" | "DELETE";
      path: string;
      body?: unknown;
      headers?: Record<string, string>;
    }): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "content-type": "application/json", ...defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Requête ${method} ${path} échouée (${res.status}): ${text}`);
      }
      return (await res.json()) as T;
    },
  };
}
