import Cookies from 'js-cookie';
import type { Split } from './splitRegistry';

export type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
  getSplitRegistry(): ReadonlyArray<Split> | undefined;
  setSplitRegistry(splits: ReadonlyArray<Split>): void;
};

type CookieStorageConfig = {
  domain: string;
  name?: string;
};

export function createCookieStorage(config: CookieStorageConfig): StorageProvider {
  const name = config.name ?? 'tt_visitor_id';

  return {
    getVisitorId() {
      return Cookies.get(name);
    },
    setVisitorId(visitorId) {
      Cookies.set(name, visitorId, {
        expires: 365,
        path: '/',
        domain: config.domain
      });
    },
    getSplitRegistry() {
      return undefined;
    },
    setSplitRegistry() {}
  };
}
