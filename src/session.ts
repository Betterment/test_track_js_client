import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import TestTrack, { type AbOptions, type VaryOptions } from './testTrack';
import { loadVisitor } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { SplitRegistry, V1Hash } from './splitRegistry';
import { createCookieStorage, type StorageProvider } from './storageProvider';
import { createClient, type Client } from './client';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  /** @deprecated Await the result of `initialize` */
  onVisitorLoaded?: (visitor: TestTrack) => void;
};

type SessionContext = {
  client: Client;
  storage: StorageProvider;
  testTrack: TestTrack;
  splitRegistry: SplitRegistry;
};

type CrxInfo = {
  visitorId: string;
  splitRegistry: V1Hash;
  assignmentRegistry: Record<string, string | null>;
};

export function createSession() {
  let resolveContext: (context: SessionContext) => void;
  const sessionContext = new Promise<SessionContext>(resolve => (resolveContext = resolve));

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

      resolveContext({ client, storage, testTrack: testTrack, splitRegistry });
      storage.setVisitorId(testTrack.getId());

      return testTrack;
    },

    async vary(splitName: string, options: VaryOptions): Promise<void> {
      const { testTrack } = await sessionContext;
      testTrack.vary(splitName, options);
    },

    async ab(splitName: string, options: AbOptions): Promise<void> {
      const { testTrack } = await sessionContext;
      testTrack.ab(splitName, options);
    },

    async logIn(identifierType: string, value: number): Promise<void> {
      const { testTrack } = await sessionContext;
      await testTrack.logIn(identifierType, value);
    },

    async signUp(identifierType: string, value: number): Promise<void> {
      const { testTrack } = await sessionContext;
      await testTrack.signUp(identifierType, value);
    },

    _crx: {
      async loadInfo(): Promise<CrxInfo> {
        const { testTrack, splitRegistry } = await sessionContext;

        return {
          visitorId: testTrack.getId(),
          splitRegistry: splitRegistry.asV1Hash(),
          assignmentRegistry: Object.fromEntries(
            Object.entries(testTrack.getAssignmentRegistry()).map(([splitName, assignment]) => [
              splitName,
              assignment.getVariant()
            ])
          )
        };
      },

      async persistAssignment(splitName: string, variant: string, username: string, password: string): Promise<void> {
        const { testTrack, client } = await sessionContext;
        await client
          .postAssignmentOverride({
            visitor_id: testTrack.getId(),
            split_name: splitName,
            variant,
            context: 'chrome_extension',
            mixpanel_result: 'success',
            auth: { username, password }
          })
          .catch(error => {
            testTrack.logError(`test_track persistAssignment error: ${error}`);
          });
      }
    }
  };
}

export type Session = ReturnType<typeof createSession>;
