import Cookies from 'js-cookie';
import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';
import MixPanelAnalytics from './mixpanelAnalytics';

let loaded: null | ((value?: Visitor | PromiseLike<Visitor>) => void) = null;

export type Variants = {
  [key: string]: () => void;
};

export type VaryOptions = {
  variants: Variants;
  context: string;
  defaultVariant: boolean | string;
};

export type AbOptions = {
  callback: (assignment: boolean | string) => void;
  context: string;
  trueVariant: boolean | string;
  visitor: Visitor;
};

type SessionOptions = {
  analytics?: MixPanelAnalytics;
  errorLogger?: (errorMessage: string) => void;
  onVisitorLoaded?: Function;
};

export type Registry = {
  [key: string]: boolean | string | null;
};

class Session {
  private _visitorLoaded: PromiseLike<Visitor>;

  constructor() {
    this._visitorLoaded = new Promise(resolve => (loaded = resolve));
  }

  initialize(options: SessionOptions) {
    const visitorId = Cookies.get(TestTrackConfig.getCookieName());

    Visitor.loadVisitor(visitorId).then(visitor => {
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
    return this._visitorLoaded.then(function(visitor) {
      visitor.vary(splitName, options);
    });
  }

  ab(splitName: string, options: AbOptions) {
    return this._visitorLoaded.then(function(visitor) {
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
    return this._visitorLoaded.then(function(visitor) {
      Cookies.set(TestTrackConfig.getCookieName(), visitor.getId(), {
        expires: 365,
        path: '/',
        domain: TestTrackConfig.getCookieDomain()
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
          this._visitorLoaded.then(function(visitor) {
            const assignmentRegistry: Registry = {};
            for (var splitName in visitor.getAssignmentRegistry()) {
              assignmentRegistry[splitName] = visitor.getAssignmentRegistry()[splitName].getVariant();
            }

            return {
              visitorId: visitor.getId(),
              splitRegistry: TestTrackConfig.getSplitRegistry().asV1Hash(),
              assignmentRegistry: assignmentRegistry
            };
          }),

        persistAssignment: (splitName: string, variant: string, username: string, password: string) =>
          this._visitorLoaded.then(function(visitor) {
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
