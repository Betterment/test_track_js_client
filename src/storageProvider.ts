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
  getLoginState?(): boolean | undefined;
  setLoginState?(isLoggedIn: boolean): void;
};

type CookieStorageConfig = {
  domain: string;
  name?: string;
};

export function createCookieStorage(config: CookieStorageConfig): Required<StorageProvider> {
  const name = config.name ?? 'tt_visitor_id';
  const loginStateKey = `${name}_login_state`;

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
    setSplitRegistry() {},
    getLoginState() {
      try {
        return sessionStorage.getItem(loginStateKey) === 'true';
      } catch {
        // The browser blocks site data, so the login state is unknowable.
        return undefined;
      }
    },
    setLoginState(isLoggedIn) {
      try {
        sessionStorage.setItem(loginStateKey, String(isLoggedIn));
      } catch {
        // The browser blocks site data, so there is nowhere to record this.
      }
    }
  };
}
