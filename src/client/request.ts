import type { Config } from '../config';

type RequestOptions = {
  url: URL;
  method: 'GET' | 'POST';
  timeout?: number;
  body?: URLSearchParams;
  auth?: { username: string; password: string };
};

export function urlFor(config: Config, path: `/api/${string}`): URL {
  return new URL(path, config.url);
}

export function toSearchParams(values: Record<string, string | null | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.append(key, value ?? '');
    }
  });

  return params;
}

export async function request<T>(options: RequestOptions): Promise<{ data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 60_000);

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  });

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
    return { data: await response.json() };
  }
}
