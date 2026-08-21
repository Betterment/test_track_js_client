import Cookies from 'js-cookie';
import type { Split } from './splitRegistry';
import type { Visitor } from './visitor';

export type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
  getVisitor(): Visitor | undefined;
  setVisitor(visitor: Visitor): void;
  getSplitRegistry(): ReadonlyArray<Split> | undefined;
  setSplitRegistry(splits: ReadonlyArray<Split>): void;
};

type CookieStorageConfig = {
  domain: string;
  name?: string;
};

export function createCookieStorage(config: CookieStorageConfig): StorageProvider {
  const name = config.name ?? 'tt_visitor_id';

  const getVisitorId = () => Cookies.get(name);
  const setVisitorId = (visitorId: string) => {
    Cookies.set(name, visitorId, {
      expires: 365,
      path: '/',
      domain: config.domain
    });
  };

  return {
    getVisitorId,
    setVisitorId,
    getVisitor() {
      const visitorId = getVisitorId();
      return visitorId === undefined ? undefined : { id: visitorId, assignments: [] };
    },
    setVisitor(visitor) {
      setVisitorId(visitor.id);
    },
    getSplitRegistry() {
      return undefined;
    },
    setSplitRegistry() {}
  };
}
