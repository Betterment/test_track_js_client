import $ from 'jquery';
import Cookies from 'js-cookie';
import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';

var Session = function() {
  this._visitorDeferred = $.Deferred();
};

Session.prototype.initialize = function(options) {
  var visitorId = Cookies.get(TestTrackConfig.getCookieName());

  this._visitorDeferred.then(function(visitor) {
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

      this._visitorDeferred.resolve(visitor);
    }.bind(this)
  );

  this._setCookie();

  return this._visitorDeferred.promise();
};

Session.prototype.vary = function(splitName, options) {
  this._visitorDeferred.then(function(visitor) {
    visitor.vary(splitName, options);
  });
};

Session.prototype.ab = function(splitName, options) {
  this._visitorDeferred.then(function(visitor) {
    visitor.ab(splitName, options);
  });
};

Session.prototype.logIn = function(identifierType, value) {
  var deferred = $.Deferred();

  this._visitorDeferred.then(
    function(visitor) {
      visitor.linkIdentifier(identifierType, value).then(
        function() {
          this._setCookie();
          visitor.analytics.identify(visitor.getId());
          deferred.resolve();
        }.bind(this)
      );
    }.bind(this)
  );

  return deferred.promise();
};

Session.prototype.signUp = function(identifierType, value) {
  var deferred = $.Deferred();

  this._visitorDeferred.then(
    function(visitor) {
      visitor.linkIdentifier(identifierType, value).then(
        function() {
          this._setCookie();
          visitor.analytics.alias(visitor.getId());
          deferred.resolve();
        }.bind(this)
      );
    }.bind(this)
  );

  return deferred.promise();
};

Session.prototype._setCookie = function() {
  this._visitorDeferred.then(function(visitor) {
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
        var deferred = $.Deferred();
        this._visitorDeferred.then(function(visitor) {
          var assignmentRegistry = {};
          for (var splitName in visitor.getAssignmentRegistry()) {
            assignmentRegistry[splitName] = visitor.getAssignmentRegistry()[splitName].getVariant();
          }

          deferred.resolve({
            visitorId: visitor.getId(),
            splitRegistry: TestTrackConfig.getSplitRegistry().asV1Hash(),
            assignmentRegistry: assignmentRegistry
          });
        });

        return deferred.promise();
      }.bind(this),

      persistAssignment: function(splitName, variant, username, password) {
        var deferred = $.Deferred();

        this._visitorDeferred.then(function(visitor) {
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

          override.persistAssignment().then(function() {
            deferred.resolve();
          });
        });

        return deferred.promise();
      }.bind(this)
    }
  };
};

export default Session;
