import Assignment from './assignment';
import { persistAssignmentOverride } from './assignmentOverride';
import { loadConfig } from './config';
import Visitor, { type AbOptions, type VaryOptions } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { V1Hash } from './splitRegistry';
import { createCookieStorage, type Storage } from './storage';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  onVisitorLoaded?: (visitor: Visitor) => void;
};

type SessionContext = {
  visitor: Visitor;
  storage: Storage;
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
      const storage = createCookieStorage(config);
      const visitorId = storage.getVisitorId();
      const visitor = await Visitor.loadVisitor(config, visitorId);

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

      resolveContext({ visitor, storage });
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
        const { visitor } = await sessionContext;

        return {
          visitorId: visitor.getId(),
          splitRegistry: visitor.config.splitRegistry.asV1Hash(),
          assignmentRegistry: Object.fromEntries(
            Object.entries(visitor.getAssignmentRegistry()).map(([splitName, assignment]) => [
              splitName,
              assignment.getVariant()
            ])
          )
        };
      },

      async persistAssignment(splitName: string, variant: string, username: string, password: string): Promise<void> {
        const { visitor } = await sessionContext;
        const assignment = new Assignment({ splitName, variant, context: 'chrome_extension', isUnsynced: true });
        await persistAssignmentOverride({ config: visitor.config, visitor, username, password, assignment });
      }
    }
  };
}

export type Session = ReturnType<typeof createSession>;
