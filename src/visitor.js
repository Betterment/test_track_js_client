import $ from 'jquery';
import ABConfiguration from './abConfiguration';
import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Identifier from './identifier';
import MixpanelAnalytics from './mixpanelAnalytics';
import TestTrackConfig from './testTrackConfig';
import uuid from 'uuid/v4';
import VariantCalculator from './variantCalculator';
import VaryDSL from './varyDSL';

var Visitor = function(options) {
  options = options || {};
  this._id = options.id;
  this._assignments = options.assignments;
  this._ttOffline = options.ttOffline;

  if (!this._id) {
    throw new Error('must provide id');
  } else if (!this._assignments) {
    throw new Error('must provide assignments');
  }

  this._errorLogger = function(errorMessage) {
    window.console.error(errorMessage);
  };

  this.analytics = new MixpanelAnalytics();
};

Visitor.loadVisitor = function(visitorId) {
  var deferred = $.Deferred(),
    resolve = function(attrs) {
      deferred.resolve(new Visitor(attrs));
    };

  if (visitorId) {
    if (TestTrackConfig.getAssignments()) {
      resolve({
        id: visitorId,
        assignments: TestTrackConfig.getAssignments(),
        ttOffline: false
      });
    } else {
      $.ajax(TestTrackConfig.getUrl() + '/api/v1/visitors/' + visitorId, { method: 'GET', timeout: 5000 })
        .done(function(attrs) {
          resolve({
            id: attrs['id'],
            assignments: Assignment.fromJsonArray(attrs['assignments']),
            ttOffline: false
          });
        })
        .fail(function() {
          resolve({
            id: visitorId,
            assignments: [],
            ttOffline: true
          });
        });
    }
  } else {
    resolve({
      id: uuid(),
      assignments: [],
      ttOffline: false
    });
  }

  return deferred.promise();
};

Visitor.prototype.getId = function() {
  return this._id;
};

Visitor.prototype.getAssignmentRegistry = function() {
  if (!this._assignmentRegistry) {
    var obj = {};
    for (var i = 0; i < this._assignments.length; i++) {
      var assignment = this._assignments[i];
      obj[assignment.getSplitName()] = assignment;
    }
    this._assignmentRegistry = obj;
  }

  return this._assignmentRegistry;
};

Visitor.prototype.vary = function(splitName, options) {
  if (typeof options.variants !== 'object') {
    throw new Error('must provide variants object to `vary` for ' + splitName);
  } else if (!options.context) {
    throw new Error('must provide context to `vary` for ' + splitName);
  } else if (!options.defaultVariant && options.defaultVariant !== false) {
    throw new Error('must provide defaultVariant to `vary` for ' + splitName);
  }

  var defaultVariant = options.defaultVariant.toString(),
    variants = options.variants,
    context = options.context;

  if (!variants.hasOwnProperty(defaultVariant)) {
    throw new Error('defaultVariant: ' + defaultVariant + ' must be represented in variants object');
  }

  var assignment = this._getAssignmentFor(splitName, context),
    vary = new VaryDSL({
      assignment: assignment,
      visitor: this
    });

  for (var variant in variants) {
    if (variants.hasOwnProperty(variant)) {
      if (variant === defaultVariant) {
        vary.default(variant, variants[variant]);
      } else {
        vary.when(variant, variants[variant]);
      }
    }
  }

  vary.run();

  if (vary.isDefaulted()) {
    assignment.setVariant(vary.getDefaultVariant());
    assignment.setUnsynced(true);
    assignment.setContext(context);
  }

  this.notifyUnsyncedAssignments();
};

Visitor.prototype.ab = function(splitName, options) {
  var abConfiguration = new ABConfiguration({
      splitName: splitName,
      trueVariant: options.trueVariant,
      visitor: this
    }),
    variants = abConfiguration.getVariants(),
    variantConfiguration = {};

  variantConfiguration[variants.true] = function() {
    options.callback(true);
  };

  variantConfiguration[variants.false] = function() {
    options.callback(false);
  };

  this.vary(splitName, {
    context: options.context,
    variants: variantConfiguration,
    defaultVariant: variants.false
  });
};

Visitor.prototype.setErrorLogger = function(errorLogger) {
  if (typeof errorLogger !== 'function') {
    throw new Error('must provide function for errorLogger');
  }

  this._errorLogger = errorLogger;
};

Visitor.prototype.logError = function(errorMessage) {
  this._errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
};

Visitor.prototype.linkIdentifier = function(identifierType, value) {
  var deferred = $.Deferred(),
    identifier = new Identifier({
      visitorId: this.getId(),
      identifierType: identifierType,
      value: value
    });

  identifier.save().then(
    function(otherVisitor) {
      this._merge(otherVisitor);
      this.notifyUnsyncedAssignments();
      deferred.resolve();
    }.bind(this)
  );

  return deferred.promise();
};

Visitor.prototype.setAnalytics = function(analytics) {
  if (typeof analytics !== 'object') {
    throw new Error('must provide object for setAnalytics');
  } else {
    this.analytics = analytics;
  }
};

Visitor.prototype.notifyUnsyncedAssignments = function() {
  var unsyncedAssignments = this._getUnsyncedAssignments();

  for (var i = 0; i < unsyncedAssignments.length; i++) {
    this._notify(unsyncedAssignments[i]);
  }
};

// private

Visitor.prototype._getUnsyncedAssignments = function() {
  var arr = [],
    assignmentRegistry = this.getAssignmentRegistry();

  Object.keys(assignmentRegistry).forEach(function(assignmentName) {
    var assignment = assignmentRegistry[assignmentName];
    if (assignment.isUnsynced()) {
      arr.push(assignment);
    }
  });

  return arr;
};

Visitor.prototype._merge = function(otherVisitor) {
  var assignmentRegistry = this.getAssignmentRegistry(),
    otherAssignmentRegistry = otherVisitor.getAssignmentRegistry();

  this._id = otherVisitor.getId();

  for (var splitName in otherAssignmentRegistry) {
    if (otherAssignmentRegistry.hasOwnProperty(splitName)) {
      assignmentRegistry[splitName] = otherAssignmentRegistry[splitName];
    }
  }
};

Visitor.prototype._getAssignmentFor = function(splitName, context) {
  return this.getAssignmentRegistry()[splitName] || this._generateAssignmentFor(splitName, context);
};

Visitor.prototype._generateAssignmentFor = function(splitName, context) {
  var variant = new VariantCalculator({
    visitor: this,
    splitName: splitName
  }).getVariant();

  if (!variant) {
    this._ttOffline = true;
  }

  var assignment = new Assignment({
    splitName: splitName,
    variant: variant,
    context: context,
    isUnsynced: true
  });

  this._assignments.push(assignment);

  // reset derived datastores to trigger rebuilding
  this._assignmentRegistry = null;

  return assignment;
};

Visitor.prototype._notify = function(assignment) {
  try {
    if (this._ttOffline) {
      return;
    }

    var notification = new AssignmentNotification({
      visitor: this,
      assignment: assignment
    });

    notification.send();
    assignment.setUnsynced(false);
  } catch (e) {
    this.logError('test_track notify error: ' + e);
  }
};

export default Visitor;
