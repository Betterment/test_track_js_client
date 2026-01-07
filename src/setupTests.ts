import { setupServer } from 'msw/node';

export const server = setupServer();
export const requests: Request[] = [];

server.events.on('request:start', ({ request }) => {
  requests.push(request.clone());
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
