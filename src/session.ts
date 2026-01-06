import Cookies from 'js-cookie';
import Assignment from './assignment';
import { persistAssignmentOverride } from './assignmentOverride';
import { loadConfig } from './config';
import Visitor, { type AbOptions, type VaryOptions } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { V1Hash } from './splitRegistry';

type SessionOptions = {
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  onVisitorLoaded?: (visitor: Visitor) => void;
};

type CrxInfo = {
  visitorId: string;
  splitRegistry: V1Hash;
  assignmentRegistry: Record<string, string | null>;
};

function setCookie(visitor: Visitor): void {
  Cookies.set(visitor.config.cookieName, visitor.getId(), {
    expires: 365,
    path: '/',
    domain: visitor.config.cookieDomain
  });
}

export function createSession() {
  let resolveVisitor: (visitor: Visitor) => void;
  const visitorLoaded = new Promise<Visitor>(resolve => (resolveVisitor = resolve));

  return {
    async initialize(options: SessionOptions): Promise<Visitor> {
      const config = loadConfig();
      const visitorId = Cookies.get(config.cookieName);
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

      resolveVisitor(visitor);
      setCookie(visitor);

      return visitor;
    },

    async vary(splitName: string, options: VaryOptions): Promise<void> {
      const visitor = await visitorLoaded;
      visitor.vary(splitName, options);
    },

    async ab(splitName: string, options: AbOptions): Promise<void> {
      const visitor = await visitorLoaded;
      visitor.ab(splitName, options);
    },

    async logIn(identifierType: string, value: number): Promise<void> {
      const visitor = await visitorLoaded;
      await visitor.linkIdentifier(identifierType, value);
      setCookie(visitor);
      visitor.analytics.identify(visitor.getId());
    },

    async signUp(identifierType: string, value: number): Promise<void> {
      const visitor = await visitorLoaded;
      await visitor.linkIdentifier(identifierType, value);
      setCookie(visitor);
      visitor.analytics.alias(visitor.getId());
    },

    _crx: {
      async loadInfo(): Promise<CrxInfo> {
        const visitor = await visitorLoaded;

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
        const visitor = await visitorLoaded;
        const assignment = new Assignment({ splitName, variant, context: 'chrome_extension', isUnsynced: true });
        await persistAssignmentOverride({ config: visitor.config, visitor, username, password, assignment });
      }
    }
  };
}

export type Session = ReturnType<typeof createSession>;
