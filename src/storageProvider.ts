import Cookies from 'js-cookie';

export type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
};

type CookieStorageConfig = {
  cookieDomain: string;
  cookieName?: string;
};

export function createCookieStorage(config: CookieStorageConfig): StorageProvider {
  const cookieName = config.cookieName || 'tt_visitor_id';

  return {
    getVisitorId() {
      return Cookies.get(cookieName);
    },
    setVisitorId(visitorId) {
      Cookies.set(cookieName, visitorId, {
        expires: 365,
        path: '/',
        domain: config.cookieDomain
      });
    }
  };
}
