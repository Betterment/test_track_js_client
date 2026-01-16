import { setupServer } from 'msw/node';

type CapturedRequest = {
  method: string;
  url: string;
  body: unknown;
};

export const server = setupServer();

const requests: Promise<CapturedRequest>[] = [];

async function captureRequest(request: Request): Promise<CapturedRequest> {
  return {
    method: request.method,
    url: request.url,
    body: await request.json().catch(() => null)
  };
}

export function getRequests(): Promise<CapturedRequest[]> {
  return Promise.all(requests);
}

server.events.on('request:start', ({ request }) => {
  requests.push(captureRequest(request.clone()));
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});

afterAll(() => {
  server.close();
});
