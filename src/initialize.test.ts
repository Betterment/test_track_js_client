import Cookies from 'js-cookie';
import { initialize } from './initialize';
import type { Config } from './config';
import type { ClientConfig, V4VisitorConfig } from './client';
import { v4 as uuid } from 'uuid';
import { getRequests, server } from './setupTests';
import { http, HttpResponse } from 'msw';

vi.mock('js-cookie');
vi.mock('uuid');

const rawConfig: Config = {
  cookieDomain: '.example.com',
  cookieName: 'custom_cookie_name',
  experienceSamplingWeight: 1,
  assignments: { jabba: 'puppet', wine: 'rose' },
  splits: {
    jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
    wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
  }
};

const clientConfig: ClientConfig = {
  url: 'http://testtrack.dev',
  appName: 'test_app',
  appVersion: '1.0.0',
  buildTimestamp: '2019-04-16T14:35:30Z'
};

const buildURL = 'http://testtrack.dev/api/v4/apps/test_app/versions/1.0.0/builds/2019-04-16T14:35:30Z';

const buildVisitorConfig = (visitorId: string): V4VisitorConfig => ({
  splits: [
    {
      name: 'jabba',
      variants: [
        { name: 'cgi', weight: 50 },
        { name: 'puppet', weight: 50 }
      ],
      feature_gate: true
    }
  ],
  visitor: {
    id: visitorId,
    assignments: [{ split_name: 'jabba', variant: 'puppet' }]
  },
  experience_sampling_weight: 1
});

describe('initialize', () => {
  beforeAll(() => {
    window.TT = btoa(JSON.stringify(rawConfig));
  });

  beforeEach(() => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('existing_visitor_id');

    server.use(
      http.get(`${buildURL}/visitors/:visitorId/config`, ({ params }) => {
        return HttpResponse.json(buildVisitorConfig(params.visitorId as string));
      })
    );
  });

  it('reads the visitor id from a cookie and sets it back in the cookie', async () => {
    await initialize({ client: clientConfig });
    expect(Cookies.get).toHaveBeenCalledTimes(1);
    expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');
    expect(Cookies.set).toHaveBeenCalledTimes(1);
    expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'existing_visitor_id', {
      expires: 365,
      path: '/',
      domain: '.example.com'
    });
  });

  it('saves the visitor id in a cookie', async () => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue(undefined);
    // @ts-expect-error uuid mock return type
    vi.mocked(uuid).mockReturnValue('generated_visitor_id');

    await initialize({ client: clientConfig });
    expect(Cookies.get).toHaveBeenCalledTimes(1);
    expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');
    expect(Cookies.set).toHaveBeenCalledTimes(1);
    expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'generated_visitor_id', {
      expires: 365,
      path: '/',
      domain: '.example.com'
    });
  });

  it('does not fetch visitor config when visitorConfig is provided', async () => {
    const visitorConfig = buildVisitorConfig('existing_visitor_id');
    await initialize({ client: clientConfig, visitorConfig });

    expect(await getRequests()).toEqual([]);
  });
});
