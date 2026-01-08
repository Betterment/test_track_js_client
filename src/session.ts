import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import TestTrack, { type AbOptions, type VaryOptions } from './testTrack';
import { type WebExtension } from './webExtension';
import { loadVisitor } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import { createCookieStorage } from './storageProvider';
import { createClient } from './client';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  /** @deprecated Await the result of `initialize` */
  onVisitorLoaded?: (visitor: TestTrack) => void;
};

export function createSession() {
  let ready: (testText: TestTrack) => void;
  const initialization = new Promise<TestTrack>(resolve => (ready = resolve));

  return {
    async initialize(options: SessionOptions): Promise<TestTrack> {
      const config = loadConfig();
      const client = createClient({ url: config.url });
      const storage = createCookieStorage({ domain: config.cookieDomain, name: config.cookieName });
      const splitRegistry = parseSplitRegistry(config.splits);
      const { visitor, isOffline } = await loadVisitor({
        client,
        splitRegistry,
        id: storage.getVisitorId(),
        assignments: parseAssignments(config.assignments)
      });

      const testTrack = new TestTrack({ client, storage, splitRegistry, visitor, isOffline });
      if (options.analytics) testTrack.setAnalytics(options.analytics);
      if (options.errorLogger) testTrack.setErrorLogger(options.errorLogger);
      if (options.onVisitorLoaded) options.onVisitorLoaded(testTrack);

      testTrack.notifyUnsyncedAssignments();

      ready(testTrack);
      storage.setVisitorId(testTrack.visitorId);

      return testTrack;
    },

    /** @deprecated `initialize()` returns `TestTrack` */
    async vary(splitName: string, options: VaryOptions): Promise<void> {
      const testTrack = await initialization;
      testTrack.vary(splitName, options);
    },

    /** @deprecated `initialize()` returns `TestTrack` */
    async ab(splitName: string, options: AbOptions): Promise<void> {
      const testTrack = await initialization;
      testTrack.ab(splitName, options);
    },

    /** @deprecated `initialize()` returns `TestTrack` */
    async logIn(identifierType: string, value: number): Promise<void> {
      const testTrack = await initialization;
      await testTrack.logIn(identifierType, value);
    },

    /** @deprecated `initialize()` returns `TestTrack` */
    async signUp(identifierType: string, value: number): Promise<void> {
      const testTrack = await initialization;
      await testTrack.signUp(identifierType, value);
    },

    /** @deprecated `initialize()` returns `TestTrack` */
    _crx: {
      async loadInfo() {
        const testTrack = await initialization;
        return testTrack._crx.loadInfo();
      },

      async persistAssignment(splitName, variant, username, password) {
        const testTrack = await initialization;
        return testTrack._crx.persistAssignment(splitName, variant, username, password);
      }
    } satisfies WebExtension
  };
}

export type Session = ReturnType<typeof createSession>;
