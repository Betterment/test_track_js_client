import TestTrackConfig from './testTrackConfig';

type RequestOptions = {
  url: `/api/${string}`;
  method: 'GET' | 'POST';
  timeout?: number;
  body?: URLSearchParams;
  auth?: { username: string; password: string };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = { data: any };

export function toSearchParams(values: Record<string, string | null | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.append(key, value ?? '');
    }
  });

  return params;
}

export async function request(options: RequestOptions): Promise<Result> {
  const url = new URL(options.url, TestTrackConfig.getUrl());

  const controller = new AbortController();
  setTimeout(() => controller.abort(), options.timeout ?? 60_000);

  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded'
  });

  if (options.auth) {
    const { username, password } = options.auth;
    const credential = btoa(`${username}:${password}`);
    headers.append('authorization', `Basic ${credential}`);
  }

  const response = await fetch(url, {
    method: options.method,
    body: options.body,
    headers,
    signal: controller.signal
  });

  if (!response.ok) {
    throw new Error(`HTTP request failed with ${response.status} status`);
  }

  return { data: await response.json() };
}
