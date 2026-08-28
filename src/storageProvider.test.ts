import { it, expect, vi } from 'vitest';
import { createCookieStorage } from './storageProvider';
import Cookies from 'js-cookie';

vi.mock('js-cookie');

describe('createCookieStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('retrieves visitor ID from cookie', () => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('visitor-123');

    const storage = createCookieStorage({ domain: '.example.com' });
    expect(storage.getVisitorId()).toBe('visitor-123');
    expect(Cookies.get).toHaveBeenCalledWith('tt_visitor_id');
  });

  it('gets visitor ID from custom cookie name', () => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('visitor-456');

    const storage = createCookieStorage({ domain: '.example.com', name: 'custom' });
    expect(storage.getVisitorId()).toBe('visitor-456');
    expect(Cookies.get).toHaveBeenCalledWith('custom');
  });

  it('sets visitor ID with cookie options', () => {
    const storage = createCookieStorage({ domain: '.example.com' });
    storage.setVisitorId('visitor-789');

    expect(Cookies.set).toHaveBeenCalledWith('tt_visitor_id', 'visitor-789', {
      expires: 365,
      path: '/',
      domain: '.example.com'
    });
  });

  it('reports no visitor ID when the cookie is unset', () => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue(undefined);

    const storage = createCookieStorage({ domain: '.example.com' });
    expect(storage.getVisitorId()).toBeUndefined();
  });

  it('reports no assignments, which a cookie cannot hold', () => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('visitor-123');

    const storage = createCookieStorage({ domain: '.example.com' });
    expect(storage.getAssignments()).toBeUndefined();
  });

  it('does not write a cookie when setting assignments', () => {
    const storage = createCookieStorage({ domain: '.example.com' });
    storage.setAssignments([{ splitName: 'wine', variant: 'red', context: null }]);

    expect(Cookies.set).not.toHaveBeenCalled();
  });

  it('stores login state in sessionStorage rather than a cookie', () => {
    const storage = createCookieStorage({ domain: '.example.com' });
    storage.setLoginState(true);

    expect(sessionStorage.getItem('tt_visitor_id_login_state')).toBe('true');
    expect(Cookies.set).not.toHaveBeenCalled();
  });

  it('reads back the stored login state', () => {
    const storage = createCookieStorage({ domain: '.example.com' });

    storage.setLoginState(true);
    expect(storage.getLoginState()).toBe(true);

    storage.setLoginState(false);
    expect(storage.getLoginState()).toBe(false);
  });

  it('reports logged out when no login state is stored', () => {
    const storage = createCookieStorage({ domain: '.example.com' });

    expect(storage.getLoginState()).toBe(false);
  });

  it('namespaces the login state key by the configured cookie name', () => {
    const storage = createCookieStorage({ domain: '.example.com', name: 'custom' });
    storage.setLoginState(true);

    expect(sessionStorage.getItem('custom_login_state')).toBe('true');
  });

  it('reports an unknown login state when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('site data blocked');
    });

    const storage = createCookieStorage({ domain: '.example.com' });

    expect(storage.getLoginState()).toBeUndefined();
  });

  it('does not throw when session storage rejects a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('site data blocked');
    });

    const storage = createCookieStorage({ domain: '.example.com' });

    expect(() => storage.setLoginState(true)).not.toThrow();
  });
});
