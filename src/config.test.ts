import { loadConfig, type Config } from './config';

const rawConfig: Config = {
  cookieDomain: '.example.com',
  cookieName: 'custom_cookie_name'
};

describe('loadConfig', () => {
  it('loads and parses config from window.TT', () => {
    window.TT = btoa(JSON.stringify(rawConfig));
    expect(loadConfig()).toEqual(rawConfig);
  });

  it('throws error when window.TT is invalid', () => {
    window.TT = 'not-valid-base64-json';
    expect(() => loadConfig()).toThrow('Unable to parse configuration');

    window.TT = undefined;
    expect(() => loadConfig()).toThrow('Unable to parse configuration');
  });
});
