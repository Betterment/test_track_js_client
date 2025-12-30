import TestTrackConfig from './testTrackConfig';

type BasicAuth = { username: string; password: string };

type GetOptions = { url: `/api/${string}`; timeout: number };
type PostOptions = { url: `/api/${string}`; body: URLSearchParams; auth?: BasicAuth };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HTTPResult = { data: any };

export function toSearchParams(values: Record<string, string | null | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.append(key, value ?? '');
    }
  });

  return params;
}

async function parseResponse(response: Response): Promise<HTTPResult> {
  if (!response.ok) {
    throw new Error(`HTTP request failed with ${response.status} status`);
  }

  return { data: await response.json() };
}

export async function get(options: GetOptions): Promise<HTTPResult> {
  const url = new URL(options.url, TestTrackConfig.getUrl());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: { accept: 'application/json' }
  }).finally(() => clearTimeout(timeout));

  return parseResponse(response);
}

export async function post(options: PostOptions): Promise<HTTPResult> {
  const url = new URL(options.url, TestTrackConfig.getUrl());

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
    method: 'POST',
    body: options.body,
    headers
  });

  return parseResponse(response);
}
