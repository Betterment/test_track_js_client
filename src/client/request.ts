type RequestOptions = {
  url: URL;
  method: 'GET' | 'POST';
  timeout?: number;
  body?: string;
  auth?: { username: string; password: string };
};

export async function request<T>(options: RequestOptions): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 60_000);
  const headers = new Headers({ Accept: 'application/json' });

  if (options.body) {
    headers.append('Content-Type', 'application/json');
  }

  if (options.auth) {
    const { username, password } = options.auth;
    const credential = btoa(`${username}:${password}`);
    headers.append('Authorization', `Basic ${credential}`);
  }

  const response = await fetch(options.url, {
    method: options.method,
    body: options.body,
    headers,
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`HTTP request failed with ${response.status} status`);
  } else if (response.status === 204) {
    return { data: null as T };
  } else {
    return { data: (await response.json()) as T };
  }
}
