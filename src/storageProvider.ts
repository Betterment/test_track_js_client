import Cookies from 'js-cookie';
import type { V4Split, V4Visitor } from './client';

export type StorageProvider = {
  getVisitorId(): string | undefined;
  setVisitorId(visitorId: string): void;
  /**
   * Called whenever the visitor's assignments change — after a config load, a
   * login/signup, an assignment override, or a locally generated assignment —
   * so hosts that persist the full visitor (e.g. the mobile apps' shared
   * preference store) can stay in sync. Optional: cookie-backed web hosts only
   * persist the visitor id.
   */
  storeVisitor?(visitor: V4Visitor): void;
  /**
   * Called whenever a freshly fetched split registry is adopted. Never called
   * with hydrated or empty state, so a stored registry is not clobbered when
   * the network is unavailable.
   */
  storeSplitRegistry?(splits: ReadonlyArray<V4Split>): void;
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
    }
  };
}
