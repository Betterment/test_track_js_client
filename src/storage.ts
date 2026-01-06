import Cookies from 'js-cookie';

export type Storage = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
};

type CookieStorageConfig = {
  cookieDomain: string;
  cookieName: string;
};

export function createCookieStorage(config: CookieStorageConfig): Storage {
  return {
    getVisitorId() {
      return Cookies.get(config.cookieName);
    },
    setVisitorId(visitorId) {
      Cookies.set(config.cookieName, visitorId, {
        expires: 365,
        path: '/',
        domain: config.cookieDomain
      });
    }
  };
}
