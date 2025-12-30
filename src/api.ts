import DefaultAxios from 'axios';
import TestTrackConfig from './testTrackConfig';

type GetOptions = {
  url: `/api/${string}`;
  timeout: number;
};

type PostOptions = {
  url: string;
  body: URLSearchParams;
  auth?: { username: string; password: string };
};

type HttpResult = {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

const defaultAxios = DefaultAxios.create({
  baseURL: TestTrackConfig.getUrl(),
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

export function toSearchParams(values: Record<string, string | null | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.append(key, value ?? '');
    }
  });

  return params;
}

export function get(options: GetOptions): Promise<HttpResult> {
  return defaultAxios.get(options.url, { timeout: options.timeout });
}

export function post(options: PostOptions): Promise<HttpResult> {
  return defaultAxios.post(options.url, options.body, { auth: options.auth });
}
