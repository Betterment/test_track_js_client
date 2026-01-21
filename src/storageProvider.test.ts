import { it, expect, vi } from 'vitest';
import { createCookieStorage } from './storageProvider';
import Cookies from 'js-cookie';

vi.mock('js-cookie');

describe('createCookieStorage', () => {
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
});
