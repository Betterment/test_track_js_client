import { http, HttpResponse } from 'msw';
import { request } from './request';
import { server } from '../setupTests';

const url = 'https://testtrack.dev/api/v1/test';

describe('request', () => {
  it('sends a GET request', async () => {
    server.use(http.get(url, () => HttpResponse.json({ foo: 'bar' })));

    const result = await request({ method: 'GET', url: new URL(url) });
    expect(result).toEqual({ data: { foo: 'bar' } });
  });

  it('sends a POST request', async () => {
    server.use(
      http.post(url, async ({ request }) => {
        const params = (await request.json()) as { foo: string };
        expect(params.foo).toEqual('bar');
        return HttpResponse.text('', { status: 204 });
      })
    );

    const result = await request({
      method: 'POST',
      url: new URL(url),
      body: JSON.stringify({ foo: 'bar' })
    });

    expect(result).toEqual({ data: null });
  });

  it('performs basic authentication', async () => {
    server.use(
      http.post(url, ({ request }) => {
        const authorization = request.headers.get('authorization');
        expect(authorization).toEqual('Basic dXNlcjpwYXNz');
        return HttpResponse.json({ ok: true });
      })
    );

    const result = await request({
      method: 'POST',
      url: new URL(url),
      auth: { username: 'user', password: 'pass' }
    });

    expect(result).toEqual({ data: { ok: true } });
  });

  it('throws when response is not ok', async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));

    await expect(request({ url: new URL(url), method: 'GET' })).rejects.toThrow('HTTP request failed with 500 status');
  });

  it('aborts request after timeout', async () => {
    server.use(http.get(url, () => new Promise(resolve => setTimeout(resolve, 100))));

    await expect(request({ url: new URL(url), method: 'GET', timeout: 5 })).rejects.toThrow(
      'This operation was aborted'
    );
  });
});
