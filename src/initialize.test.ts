import Cookies from 'js-cookie';
import { initialize } from './initialize';
import type { Config } from './config';
import { v4 as uuid } from 'uuid';

const rawConfig: Config = {
  url: 'http://testtrack.dev',
  cookieDomain: '.example.com',
  cookieName: 'custom_cookie_name',
  experienceSamplingWeight: 1,
  assignments: { jabba: 'puppet', wine: 'rose' },
  splits: {
    jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
    wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
  }
};

vi.mock('js-cookie');
vi.mock('uuid');

describe('initialize', () => {
  beforeAll(() => {
    window.TT = btoa(JSON.stringify(rawConfig));
  });

  beforeEach(() => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('existing_visitor_id');
  });

  it('reads the visitor id from a cookie and sets it back in the cookie', async () => {
    await initialize();
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

    await initialize();
    expect(Cookies.get).toHaveBeenCalledTimes(1);
    expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');
    expect(Cookies.set).toHaveBeenCalledTimes(1);
    expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'generated_visitor_id', {
      expires: 365,
      path: '/',
      domain: '.example.com'
    });
  });
});
