import { loadConfig, parseAssignments, parseSplitRegistry } from './config';
import Visitor, { type AbOptions, type VaryOptions } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { SplitRegistry, V1Hash } from './splitRegistry';
import { createCookieStorage, type Storage } from './storage';
import { createClient, type Client } from './client';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  onVisitorLoaded?: (visitor: Visitor) => void;
};

type SessionContext = {
  client: Client;
  storage: Storage;
  visitor: Visitor;
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
    async initialize(options: SessionOptions): Promise<Visitor> {
      const config = loadConfig();
      const client = createClient(config);
      const storage = createCookieStorage(config);
      const splitRegistry = parseSplitRegistry(config.splits);
      const visitor = await Visitor.loadVisitor({
        client,
        splitRegistry,
        id: storage.getVisitorId(),
        assignments: parseAssignments(config.assignments)
      });

      if (options.analytics) {
        visitor.setAnalytics(options.analytics);
      }

      if (options.errorLogger) {
        visitor.setErrorLogger(options.errorLogger);
      }

      if (options.onVisitorLoaded) {
        options.onVisitorLoaded(visitor);
      }

      visitor.notifyUnsyncedAssignments();

      resolveContext({ client, storage, visitor, splitRegistry });
      storage.setVisitorId(visitor.getId());

      return visitor;
    },

    async vary(splitName: string, options: VaryOptions): Promise<void> {
      const { visitor } = await sessionContext;
      visitor.vary(splitName, options);
    },

    async ab(splitName: string, options: AbOptions): Promise<void> {
      const { visitor } = await sessionContext;
      visitor.ab(splitName, options);
    },

    async logIn(identifierType: string, value: number): Promise<void> {
      const { visitor, storage } = await sessionContext;
      await visitor.linkIdentifier(identifierType, value);
      storage.setVisitorId(visitor.getId());
      visitor.analytics.identify(visitor.getId());
    },

    async signUp(identifierType: string, value: number): Promise<void> {
      const { visitor, storage } = await sessionContext;
      await visitor.linkIdentifier(identifierType, value);
      storage.setVisitorId(visitor.getId());
      visitor.analytics.alias(visitor.getId());
    },

    _crx: {
      async loadInfo(): Promise<CrxInfo> {
        const { visitor, splitRegistry } = await sessionContext;

        return {
          visitorId: visitor.getId(),
          splitRegistry: splitRegistry.asV1Hash(),
          assignmentRegistry: Object.fromEntries(
            Object.entries(visitor.getAssignmentRegistry()).map(([splitName, assignment]) => [
              splitName,
              assignment.getVariant()
            ])
          )
        };
      },

      async persistAssignment(splitName: string, variant: string, username: string, password: string): Promise<void> {
        const { visitor, client } = await sessionContext;
        await client
          .postAssignmentOverride({
            visitor_id: visitor.getId(),
            split_name: splitName,
            variant,
            context: 'chrome_extension',
            mixpanel_result: 'success',
            auth: { username, password }
          })
          .catch(error => {
            visitor.logError(`test_track persistAssignment error: ${error}`);
          });
      }
    }
  };
}

export type Session = ReturnType<typeof createSession>;
