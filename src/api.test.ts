import { http, HttpResponse } from 'msw';
import { request, toSearchParams } from './api';
import { server } from './setupTests';

vi.mock('./testTrackConfig', () => ({
  default: {
    getUrl: vi.fn(() => 'http://testtrack.dev')
  }
}));

describe('toSearchParams', () => {
  it('constructs URLSearchParams without empty values', () => {
    expect(toSearchParams({ a: '1', b: '2', c: '3' }).toString()).toEqual('a=1&b=2&c=3');
    expect(toSearchParams({ a: '1', b: null, c: '3' }).toString()).toEqual('a=1&b=&c=3');
    expect(toSearchParams({ a: '1', b: undefined, c: '3' }).toString()).toEqual('a=1&c=3');
  });
});

describe('request', () => {
  it('sends a GET request', async () => {
    server.use(
      http.get('http://testtrack.dev/api/v1/data', () => {
        return HttpResponse.json({ foo: 'bar' });
      })
    );

    const result = await request({ method: 'GET', url: '/api/v1/data' });
    expect(result).toEqual({ data: { foo: 'bar' } });
  });

  it('sends a POST request', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/test', async ({ request }) => {
        const params = new URLSearchParams(await request.text());
        expect(params.get('foo')).toEqual('bar');
        return HttpResponse.text('', { status: 204 });
      })
    );

    const result = await request({
      method: 'POST',
      url: '/api/v1/test',
      body: new URLSearchParams({ foo: 'bar' })
    });

    expect(result).toEqual({ data: null });
  });

  it('performs basic authentication', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/test', ({ request }) => {
        const authorization = request.headers.get('authorization');
        expect(authorization).toEqual('Basic dXNlcjpwYXNz');
        return HttpResponse.json({ ok: true });
      })
    );

    const result = await request({
      method: 'POST',
      url: '/api/v1/test',
      auth: { username: 'user', password: 'pass' }
    });

    expect(result).toEqual({ data: { ok: true } });
  });

  it('throws when response is not ok', async () => {
    server.use(
      http.get('http://testtrack.dev/api/v1/test', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(request({ url: '/api/v1/test', method: 'GET' })).rejects.toThrow(
      'HTTP request failed with 500 status'
    );
  });

  it('aborts request after timeout', async () => {
    server.use(
      http.get('http://testtrack.dev/api/v1/slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      })
    );

    await expect(request({ url: '/api/v1/slow', method: 'GET', timeout: 5 })).rejects.toThrow(
      'This operation was aborted'
    );
  });
});
