import Cookies from 'js-cookie';
import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';

let loaded = null;

const Session = function() {
  this._visitorLoaded = new Promise(resolve => {
    loaded = resolve;
  });
};

Session.prototype.initialize = function(options) {
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

    loaded(visitor);
  });

  this._setCookie();

  return this._visitorLoaded;
};

Session.prototype.vary = function(splitName, options) {
  return this._visitorLoaded.then(function(visitor) {
    visitor.vary(splitName, options);
  });
};

Session.prototype.ab = function(splitName, options) {
  return this._visitorLoaded.then(function(visitor) {
    visitor.ab(splitName, options);
  });
};

Session.prototype.logIn = function(identifierType, value) {
  return this._visitorLoaded.then(visitor =>
    visitor.linkIdentifier(identifierType, value).then(() => {
      this._setCookie();
      visitor.analytics.identify(visitor.getId());
    })
  );
};

Session.prototype.signUp = function(identifierType, value) {
  return this._visitorLoaded.then(visitor =>
    visitor.linkIdentifier(identifierType, value).then(() => {
      this._setCookie();
      visitor.analytics.alias(visitor.getId());
    })
  );
};

Session.prototype._setCookie = function() {
  return this._visitorLoaded.then(function(visitor) {
    Cookies.set(TestTrackConfig.getCookieName(), visitor.getId(), {
      expires: 365,
      path: '/',
      domain: TestTrackConfig.getCookieDomain()
    });
  });
};

Session.prototype.getPublicAPI = function() {
  return {
    vary: this.vary.bind(this),
    ab: this.ab.bind(this),
    logIn: this.logIn.bind(this),
    signUp: this.signUp.bind(this),
    initialize: this.initialize.bind(this),
    _crx: {
      loadInfo: () =>
        this._visitorLoaded.then(function(visitor) {
          let assignmentRegistry = {};
          for (var splitName in visitor.getAssignmentRegistry()) {
            assignmentRegistry[splitName] = visitor.getAssignmentRegistry()[splitName].getVariant();
          }

          return {
            visitorId: visitor.getId(),
            splitRegistry: TestTrackConfig.getSplitRegistry().asV1Hash(),
            assignmentRegistry: assignmentRegistry
          };
        }),

      persistAssignment: (splitName, variant, username, password) =>
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
};

export default Session;
