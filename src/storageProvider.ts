import Cookies from 'js-cookie';
import type { Split } from './splitRegistry';
import type { Assignment } from './visitor';

export type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
  getAssignments(): ReadonlyArray<Assignment> | undefined;
  setAssignments(assignments: ReadonlyArray<Assignment>): void;
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
    getAssignments() {
      return undefined;
    },
    setAssignments() {},
    getSplitRegistry() {
      return undefined;
    },
    setSplitRegistry() {}
  };
}
