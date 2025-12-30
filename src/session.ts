import Cookies from 'js-cookie';
import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import { Config, loadConfig, type RawConfig } from './config';
import Visitor, { type VaryOptions, type AbOptions } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';

let loaded: null | ((value: Visitor | PromiseLike<Visitor>) => void) = null;

type SessionOptions = {
  config?: RawConfig;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
  onVisitorLoaded?: (visitor: Visitor) => void;
};

export type Registry = {
  [key: string]: boolean | string | null;
};

class Session {
  private _config!: Config;
  private _visitorLoaded: PromiseLike<Visitor>;

  constructor() {
    this._visitorLoaded = new Promise(resolve => (loaded = resolve));
  }

  initialize(options: SessionOptions) {
    this._config = loadConfig(options.config);

    const visitorId = Cookies.get(this._config.getCookieName());

    Visitor.loadVisitor(this._config, visitorId).then(visitor => {
      if (options && options.analytics) {
        visitor.setAnalytics(options.analytics);
      }

      if (options && options.errorLogger) {
        visitor.setErrorLogger(options.errorLogger);
      }

      if (options && typeof options.onVisitorLoaded === 'function') {
        options.onVisitorLoaded.call(null, visitor);
      }

      visitor.notifyUnsyncedAssignments();

      if (loaded) {
        loaded(visitor);
      }
    });

    this._setCookie();

    return this._visitorLoaded;
  }

  vary(splitName: string, options: VaryOptions) {
    return this._visitorLoaded.then(function (visitor) {
      visitor.vary(splitName, options);
    });
  }

  ab(splitName: string, options: AbOptions) {
    return this._visitorLoaded.then(function (visitor) {
      visitor.ab(splitName, options);
    });
  }

  logIn(identifierType: string, value: number) {
    return this._visitorLoaded.then(visitor =>
      visitor.linkIdentifier(identifierType, value).then(() => {
        this._setCookie();
        visitor.analytics.identify(visitor.getId());
      })
    );
  }

  signUp(identifierType: string, value: number) {
    return this._visitorLoaded.then(visitor =>
      visitor.linkIdentifier(identifierType, value).then(() => {
        this._setCookie();
        visitor.analytics.alias(visitor.getId());
      })
    );
  }

  _setCookie() {
    return this._visitorLoaded.then(visitor => {
      Cookies.set(this._config.getCookieName(), visitor.getId(), {
        expires: 365,
        path: '/',
        domain: this._config.getCookieDomain()
      });
    });
  }

  getPublicAPI() {
    return {
      vary: this.vary.bind(this),
      ab: this.ab.bind(this),
      logIn: this.logIn.bind(this),
      signUp: this.signUp.bind(this),
      initialize: this.initialize.bind(this),
      _crx: {
        loadInfo: () =>
          this._visitorLoaded.then(visitor => {
            const assignmentRegistry: Registry = {};
            for (const splitName in visitor.getAssignmentRegistry()) {
              assignmentRegistry[splitName] = visitor.getAssignmentRegistry()[splitName].getVariant();
            }

            return {
              visitorId: visitor.getId(),
              splitRegistry: this._config.getSplitRegistry().asV1Hash(),
              assignmentRegistry: assignmentRegistry
            };
          }),

        persistAssignment: (splitName: string, variant: string, username: string, password: string) =>
          this._visitorLoaded.then(function (visitor) {
            return new AssignmentOverride({
              visitor,
              username,
              password,
              assignment: new Assignment({
                splitName,
                variant,
                context: 'chrome_extension',
                isUnsynced: true
              })
            }).persistAssignment();
          })
      }
    };
  }
}

export default Session;
