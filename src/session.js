import Cookies from 'js-cookie';
import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';

var Session = function() {
  this._loaded;
  this._visitorLoaded = new Promise(function(resolve) {
    this._loaded = resolve;
  }.bind(this));
};

Session.prototype.initialize = function(options) {
  var visitorId = Cookies.get(TestTrackConfig.getCookieName());

  this._visitorLoaded.then(function(visitor) {
    visitor.notifyUnsyncedAssignments();
  });

  Visitor.loadVisitor(visitorId).then(
    function(visitor) {
      if (options && options.analytics) {
        visitor.setAnalytics(options.analytics);
      }

      if (options && options.errorLogger) {
        visitor.setErrorLogger(options.errorLogger);
      }

      if (options && typeof options.onVisitorLoaded === 'function') {
        options.onVisitorLoaded.call(null, visitor);
      }

      this._loaded(visitor);
    }.bind(this)
  );

  this._setCookie();

  return this._visitorLoaded;
};

Session.prototype.vary = function(splitName, options) {
  this._visitorLoaded.then(function(visitor) {
    visitor.vary(splitName, options);
  });
};

Session.prototype.ab = function(splitName, options) {
  this._visitorLoaded.then(function(visitor) {
    visitor.ab(splitName, options);
  });
};

Session.prototype.logIn = function(identifierType, value) {
  return this._visitorLoaded.then(function(visitor) {
      return visitor.linkIdentifier(identifierType, value).then(function() {
          this._setCookie();
          visitor.analytics.identify(visitor.getId());
        }.bind(this)
      );
    }.bind(this)
  );
};

Session.prototype.signUp = function(identifierType, value) {
  return this._visitorLoaded.then(function(visitor) {
      return visitor.linkIdentifier(identifierType, value).then(
        function() {
          this._setCookie();
          visitor.analytics.alias(visitor.getId());
        }.bind(this)
      );
    }.bind(this)
  );
};

Session.prototype._setCookie = function() {
  this._visitorLoaded.then(function(visitor) {
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
      loadInfo: function() {
        return this._visitorLoaded.then(function(visitor) {
          var assignmentRegistry = {};
          for (var splitName in visitor.getAssignmentRegistry()) {
            assignmentRegistry[splitName] = visitor.getAssignmentRegistry()[splitName].getVariant();
          }

          return {
            visitorId: visitor.getId(),
            splitRegistry: TestTrackConfig.getSplitRegistry().asV1Hash(),
            assignmentRegistry: assignmentRegistry
          };
        });
      }.bind(this),

      persistAssignment: function(splitName, variant, username, password) {
        return this._visitorLoaded.then(function(visitor) {
          var override = new AssignmentOverride({
            visitor: visitor,
            username: username,
            password: password,
            assignment: new Assignment({
              splitName: splitName,
              variant: variant,
              context: 'chrome_extension',
              isUnsynced: true
            })
          });

          return override.persistAssignment();
        });
      }.bind(this)
    }
  };
};

export default Session;
