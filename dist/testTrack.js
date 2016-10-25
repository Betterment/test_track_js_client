// Test Track Version 1.3.5
;(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['node-uuid', 'blueimp-md5', 'jquery', 'base-64', 'jquery.cookie'], factory);
    } else if (typeof exports !== 'undefined') {
        var uuid = require('node-uuid'),
            md5 = require('blueimp-md5'),
            jquery = require('jquery'),
            base64 = require('base-64'),
            _jqCookie = require('jquery.cookie'); // jshint ignore:line
        // nodejs/commonjs
        module.exports = factory(uuid, md5, jquery, base64);
    } else {
        // Browser globals (root is window)
        root.TestTrack = factory(root.uuid, root.md5, root.jQuery, root.base64);
    }
})(this, function (uuid, md5, $, base64) {
    'use strict';

    if (typeof uuid === 'undefined') {
        throw new Error('TestTrack depends on node-uuid. Make sure you are including "bower_components/node-uuid/uuid.js"');
    } else if (typeof md5 === 'undefined') {
        throw new Error('TestTrack depends on blueimp-md5. Make sure you are including "bower_components/blueimp-md5/js/md5.js"');
    } else if (typeof $ === 'undefined') {
        throw new Error('TestTrack depends on jquery. You can use your own copy of jquery or the one in "bower_components/jquery/dist/jquery.js"');
    } else  if (typeof $.cookie !== 'function') {
        throw new Error('TestTrack depends on jquery.cookie. You can user your own copy of jquery.cooke or the one in bower_components/jquery.cookie/jquery.cookie.js');
    } else if (typeof base64 === 'undefined') {
        throw new Error('TestTrack depends on base-64. Make sure you are including "bower_components/base-64/base64.js"');
    }

    (function() {
      if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
          if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
          }
    
          var aArgs   = Array.prototype.slice.call(arguments, 1),
              fToBind = this,
              FnOP    = function() {},
              fBound  = function() {
                return fToBind.apply(this instanceof FnOP
                       ? this
                       : oThis,
                       aArgs.concat(Array.prototype.slice.call(arguments)));
              };
    
          if (this.prototype) {
            // Function.prototype doesn't have a prototype property
            FnOP.prototype = this.prototype; 
          }
          fBound.prototype = new FnOP();
    
          return fBound;
        };
      }
    })();
    
    var MixpanelAnalytics = (function() { // jshint ignore:line
        var _MixpanelAnalytics = function() {};
    
        _MixpanelAnalytics.prototype.trackAssignment = function(visitorId, assignment, callback) {
            var assignmentProperties = {
                TTVisitorID: visitorId,
                SplitName: assignment.getSplitName(),
                SplitVariant: assignment.getVariant(),
                SplitContext: assignment.getContext()
            };
            window.mixpanel && window.mixpanel.track('SplitAssigned', assignmentProperties, callback);
        };
    
        _MixpanelAnalytics.prototype.identify = function(visitorId) {
            window.mixpanel && window.mixpanel.identify(visitorId);
        };
    
        _MixpanelAnalytics.prototype.alias = function(visitorId) {
            window.mixpanel && window.mixpanel.alias(visitorId);
        };
    
        return _MixpanelAnalytics;
    })();
    
    var Assignment = (function() { // jshint ignore:line
        var _Assignment = function(options) {
            if (!options.splitName) {
                throw new Error('must provide splitName');
            } else if (!options.hasOwnProperty('variant')) {
                throw new Error('must provide variant');
            } else if (!options.hasOwnProperty('isUnsynced')) {
                throw new Error('must provide isUnsynced');
            }
    
            this._splitName = options.splitName;
            this._variant = options.variant;
            this._context = options.context;
            this._isUnsynced = options.isUnsynced;
        };
    
        _Assignment.fromJsonArray = function(assignmentsJson) {
            var assignments = [];
            for (var i = 0; i < assignmentsJson.length; i++) {
                assignments.push(new Assignment({
                    splitName: assignmentsJson[i].split_name,
                    variant: assignmentsJson[i].variant,
                    context: assignmentsJson[i].context,
                    isUnsynced: assignmentsJson[i].unsynced
                }));
            }
    
            return assignments;
        };
    
        _Assignment.prototype.getSplitName = function() {
            return this._splitName;
        };
    
        _Assignment.prototype.getVariant = function() {
            return this._variant;
        };
    
        _Assignment.prototype.setVariant = function(variant) {
            this._variant = variant;
        };
    
        _Assignment.prototype.getContext = function() {
            return this._context;
        };
    
        _Assignment.prototype.setContext = function(context) {
            this._context = context;
        };
    
        _Assignment.prototype.isUnsynced = function() {
            return this._isUnsynced;
        };
    
        _Assignment.prototype.setUnsynced = function(unsynced) {
            this._isUnsynced = unsynced;
        };
    
        return _Assignment;
    })();
    
    var ConfigParser = (function() { // jshint ignore:line
        var _ConfigParser = function() {
        };
    
        _ConfigParser.prototype.getConfig = function() {
            if (typeof window.atob === 'function') {
                return JSON.parse(window.atob(window.TT));
            } else {
                return JSON.parse(base64.decode(window.TT));
            }
        };
    
        return _ConfigParser;
    })();
    
    var TestTrackConfig = (function() { // jshint ignore:line
        var config,
            assignments,
            getConfig = function() {
                if (!config) {
                    var parser = new ConfigParser();
                    config = parser.getConfig();
                }
                return config;
            };
    
        return {
            getUrl: function() {
                return getConfig().url;
            },
    
            getCookieDomain: function() {
                return getConfig().cookieDomain;
            },
    
            getSplitRegistry: function() {
                return getConfig().registry;
            },
    
            getAssignments: function() {
                var rawAssignments = getConfig().assignments;
    
                if (!rawAssignments) {
                    return null;
                }
    
                if (!assignments) {
                    assignments = [];
                    for (var splitName in rawAssignments) {
                        assignments.push(new Assignment({
                            splitName: splitName,
                            variant: rawAssignments[splitName],
                            isUnsynced: false
                        }));
                    }
                }
    
                return assignments;
            }
        };
    })();
    
    var VariantCalculator = (function() { // jshint ignore:line
        var _VariantCalculator = function(options) {
            this.visitor = options.visitor;
            this.splitName = options.splitName;
    
            if (!this.visitor) {
                throw new Error('must provide visitor');
            } else if (!this.splitName) {
                throw new Error('must provide splitName');
            }
        };
    
        _VariantCalculator.prototype.getVariant = function() {
            if (!TestTrackConfig.getSplitRegistry()) {
                return null;
            }
    
            var bucketCeiling = 0,
                assignmentBucket = this.getAssignmentBucket(),
                weighting = this.getWeighting(),
                sortedVariants = this.getSortedVariants();
    
            for (var i = 0; i < sortedVariants.length; i++) {
                var variant = sortedVariants[i];
    
                bucketCeiling += weighting[variant];
                if (bucketCeiling > assignmentBucket) {
                    return variant;
                }
            }
    
            throw new Error('Assignment bucket out of range. ' + assignmentBucket + ' unmatched in ' + this.splitName + ': ' + JSON.stringify(weighting));
        };
    
        _VariantCalculator.prototype.getSplitVisitorHash = function() {
            return md5(this.splitName + this.visitor.getId());
        };
    
        _VariantCalculator.prototype.getHashFixnum = function() {
            return parseInt(this.getSplitVisitorHash().substr(0, 8), 16);
        };
    
        _VariantCalculator.prototype.getAssignmentBucket = function() {
            return this.getHashFixnum() % 100;
        };
    
        _VariantCalculator.prototype.getSortedVariants = function() {
            return this.getVariants().sort();
        };
    
        _VariantCalculator.prototype.getVariants = function() {
            return Object.getOwnPropertyNames(this.getWeighting());
        };
    
        _VariantCalculator.prototype.getWeighting = function() {
            var weighting = TestTrackConfig.getSplitRegistry()[this.splitName];
    
            if (!weighting) {
                var message = 'Unknown split: "' + this.splitName + '"';
                this.visitor.logError(message);
                throw new Error(message);
            }
    
            return weighting;
        };
    
        return _VariantCalculator;
    })();
    
    var AssignmentNotification = (function() { // jshint ignore:line
        var _AssignmentNotification = function(options) {
            options = options || {};
            this._visitor = options.visitor;
            this._assignment = options.assignment;
    
            if (!this._visitor) {
                throw new Error('must provide visitor');
            } else if (!this._assignment) {
                throw new Error('must provide assignment');
            }
        };
    
        _AssignmentNotification.prototype.send = function() {
            // FIXME: The current implementation of this requires 2 HTTP requests
            // to guarantee that the server is notified of the assignment. By decoupling
            // the assignment notification from the analytics write success we can
            // bring this down to 1 HTTP request
    
            this.persistAssignment();
    
            this._visitor.analytics.trackAssignment(
                this._visitor.getId(),
                this._assignment,
                function(success) {
                    this.persistAssignment(success ? 'success' : 'failure');
                }.bind(this));
        };
    
        _AssignmentNotification.prototype.persistAssignment = function(trackResult) {
            return $.ajax(TestTrackConfig.getUrl() + '/api/v1/assignment_event', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                data: {
                    visitor_id: this._visitor.getId(),
                    split_name: this._assignment.getSplitName(),
                    context: this._assignment.getContext(),
                    mixpanel_result: trackResult
                }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                var status = jqXHR && jqXHR.status,
                    responseText = jqXHR && jqXHR.responseText;
                this._visitor.logError('test_track persistAssignment error: ' + [jqXHR, status, responseText, textStatus, errorThrown].join(', '));
            }.bind(this));
        };
    
        return _AssignmentNotification;
    })();
    
    var AssignmentOverride = (function() { // jshint ignore:line
        var _AssignmentOverride = function(options) {
            options = options || {};
            this._visitor = options.visitor;
            this._assignment = options.assignment;
            this._username = options.username;
            this._password = options.password;
    
            if (!this._visitor) {
                throw new Error('must provide visitor');
            } else if (!this._assignment) {
                throw new Error('must provide assignment');
            } else if (!this._username) {
                throw new Error('must provide username');
            } else if (!this._password) {
                throw new Error('must provide password');
            }
        };
    
        _AssignmentOverride.prototype.send = function() {
            // FIXME: The current implementation of this requires 2 HTTP requests
            // to guarantee that the server is notified of the assignment. By decoupling
            // the assignment notification from the analytics write success we can
            // bring this down to 1 HTTP request
    
            this.persistAssignment();
    
            this._visitor.analytics.trackAssignment(
                this._visitor.getId(),
                this._assignment,
                function(success) {
                    this.persistAssignment(success ? 'success' : 'failure');
                }.bind(this));
        };
    
        _AssignmentOverride.prototype.persistAssignment = function(trackResult) {
            return $.ajax(TestTrackConfig.getUrl() + '/api/v1/assignment_override', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                headers: {
                    'Authorization': 'Basic ' + btoa(this._username + ':' + this._password)
                },
                data: {
                    visitor_id: this._visitor.getId(),
                    split_name: this._assignment.getSplitName(),
                    variant: this._assignment.getVariant(),
                    context: this._assignment.getContext(),
                    mixpanel_result: trackResult
                }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                var status = jqXHR && jqXHR.status,
                    responseText = jqXHR && jqXHR.responseText;
                this._visitor.logError('test_track persistAssignment error: ' + [jqXHR, status, responseText, textStatus, errorThrown].join(', '));
            }.bind(this));
        };
    
        return _AssignmentOverride;
    })();
    
    
    var Visitor = (function() { // jshint ignore:line
        var _Visitor = function(options) {
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
    
        _Visitor.loadVisitor = function(visitorId) {
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
                    id: uuid.v4(),
                    assignments: [],
                    ttOffline: false
                });
            }
    
            return deferred.promise();
        };
    
        _Visitor.prototype.getId = function() {
            return this._id;
        };
    
        _Visitor.prototype.getAssignmentRegistry = function() {
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
    
        _Visitor.prototype.vary = function(splitName, options) {
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
    
        _Visitor.prototype.ab = function(splitName, options) {
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
    
        _Visitor.prototype.setErrorLogger = function(errorLogger) {
            if (typeof errorLogger !== 'function') {
                throw new Error('must provide function for errorLogger');
            }
    
            this._errorLogger = errorLogger;
        };
    
        _Visitor.prototype.logError = function(errorMessage) {
            this._errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
        };
    
        _Visitor.prototype.linkIdentifier = function(identifierType, value) {
            var deferred = $.Deferred(),
                identifier = new Identifier({
                    visitorId: this.getId(),
                    identifierType: identifierType,
                    value: value
                });
    
            identifier.save().then(function(otherVisitor) {
                this._merge(otherVisitor);
                this.notifyUnsyncedAssignments();
                deferred.resolve();
            }.bind(this));
    
            return deferred.promise();
        };
    
        _Visitor.prototype.setAnalytics = function(analytics) {     
            if (typeof analytics !== 'object') {      
                throw new Error('must provide object for setAnalytics');      
            } else {      
                this.analytics = analytics;       
            }     
        };
    
        _Visitor.prototype.notifyUnsyncedAssignments = function() {
            var unsyncedAssignments = this._getUnsyncedAssignments();
    
            for (var i = 0; i < unsyncedAssignments.length; i++) {
                this._notify(unsyncedAssignments[i]);
            }
        };
    
        // private
    
        _Visitor.prototype._getUnsyncedAssignments = function() {
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
    
        _Visitor.prototype._merge = function(otherVisitor) {
            var assignmentRegistry = this.getAssignmentRegistry(),
                otherAssignmentRegistry = otherVisitor.getAssignmentRegistry();
    
            this._id = otherVisitor.getId();
    
            for (var splitName in otherAssignmentRegistry) {
                if (otherAssignmentRegistry.hasOwnProperty(splitName)) {
                    assignmentRegistry[splitName] = otherAssignmentRegistry[splitName];
                }
            }
        };
    
        _Visitor.prototype._getAssignmentFor = function(splitName, context) {
            return this.getAssignmentRegistry()[splitName] || this._generateAssignmentFor(splitName, context);
        };
    
        _Visitor.prototype._generateAssignmentFor = function(splitName, context) {
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
    
        _Visitor.prototype._notify = function(assignment) {
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
            } catch(e) {
                this.logError('test_track notify error: ' + e);
            }
        };
    
        return _Visitor;
    })();
    
    var Session = (function() { // jshint ignore:line
        var VISITOR_COOKIE_NAME = 'tt_visitor_id',
            _Session = function() {
                this._visitorDeferred = $.Deferred();
            };
    
        _Session.prototype.initialize = function(options) {
            var visitorId = $.cookie(VISITOR_COOKIE_NAME);
    
            this._visitorDeferred.then(function(visitor) {
                visitor.notifyUnsyncedAssignments();
            });
    
            Visitor.loadVisitor(visitorId).then(function(visitor) {
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
            }.bind(this));
    
            this._setCookie();
        };
    
        _Session.prototype.vary = function(splitName, options) {
            this._visitorDeferred.then(function(visitor) {
                visitor.vary(splitName, options);
            });
        };
    
        _Session.prototype.ab = function(splitName, options) {
            this._visitorDeferred.then(function(visitor) {
                visitor.ab(splitName, options);
            });
        };
    
        _Session.prototype.logIn = function(identifierType, value) {
            var deferred = $.Deferred();
    
            this._visitorDeferred.then(function(visitor) {
                visitor.linkIdentifier(identifierType, value).then(function() {
                    this._setCookie();
                    visitor.analytics.identify(visitor.getId());
                    deferred.resolve();
                }.bind(this));
            }.bind(this));
    
            return deferred.promise();
        };
    
        _Session.prototype.signUp = function(identifierType, value) {
            var deferred = $.Deferred();
    
            this._visitorDeferred.then(function(visitor) {
                visitor.linkIdentifier(identifierType, value).then(function() {
                    this._setCookie();
                    visitor.analytics.alias(visitor.getId());
                    deferred.resolve();
                }.bind(this));
            }.bind(this));
    
            return deferred.promise();
        };
    
        _Session.prototype._setCookie = function() {
            this._visitorDeferred.then(function(visitor) {
                $.cookie(VISITOR_COOKIE_NAME, visitor.getId(), {
                    expires: 365,
                    path: '/',
                    domain: TestTrackConfig.getCookieDomain()
                });
            });
        };
    
        _Session.prototype.getPublicAPI = function() {
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
                                splitRegistry: TestTrackConfig.getSplitRegistry(),
                                assignmentRegistry: assignmentRegistry
                            });
                        });
    
                        return deferred.promise();
                    }.bind(this),
    
                    persistAssignment: function(splitName, variant, username, password) {
                        var deferred = $.Deferred();
    
                        this._visitorDeferred.then(function(visitor) {
                            var notification = new AssignmentOverride({
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
    
                            notification.persistAssignment().then(function() {
                                deferred.resolve();
                            });
                        });
    
                        return deferred.promise();
                    }.bind(this)
                }
            };
        };
    
        return _Session;
    })();
    
    var Identifier = (function() { // jshint ignore:line
        var _Identifier = function(options) {
            this.visitorId = options.visitorId;
            this.identifierType = options.identifierType;
            this.value = options.value;
    
            if (!this.visitorId) {
                throw new Error('must provide visitorId');
            } else if (!this.identifierType) {
                throw new Error('must provide identifierType');
            } else if (!this.value) {
                throw new Error('must provide value');
            }
        };
    
        _Identifier.prototype.save = function(identifierType, value) {
            var deferred = $.Deferred();
    
            $.ajax(TestTrackConfig.getUrl() + '/api/v1/identifier', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                data: {
                    identifier_type: this.identifierType,
                    value: this.value,
                    visitor_id: this.visitorId
                }
            }).then(function(identifierJson) {
                var visitor = new Visitor({
                    id: identifierJson.visitor.id,
                    assignments: Assignment.fromJsonArray(identifierJson.visitor.assignments)
                });
                deferred.resolve(visitor);
            });
    
            return deferred.promise();
        };
    
        return _Identifier;
    })();
    
    var VaryDSL = (function() { // jshint ignore:line
        var _VaryDSL = function(options) {
            if (!options.assignment) {
                throw new Error('must provide assignment');
            } else if (!options.visitor) {
                throw new Error('must provide visitor');
            }
    
            this._assignment = options.assignment;
            this._visitor = options.visitor;
            this._splitRegistry = TestTrackConfig.getSplitRegistry();
    
            this._variantHandlers = {};
        };
    
        _VaryDSL.prototype.when = function() {
            // these 5 lines are messy because they ensure that we throw the most appropriate error message if when is called incorrectly.
            // the benefit of this complexity is exercised in the test suite.
            var argArray = Array.prototype.slice.call(arguments, 0),
                lastIndex = argArray.length - 1,
                firstArgIsVariant = typeof argArray[0] !== 'function' && argArray.length > 0,
                variants = firstArgIsVariant ? argArray.slice(0, Math.max(1, lastIndex)): [],
                handler = argArray[lastIndex];
    
            if (variants.length === 0) {
                throw new Error('must provide at least one variant');
            }
    
            for (var i = 0; i < variants.length; i++) {
                this._assignHandlerToVariant(variants[i], handler);
            }
        };
    
        _VaryDSL.prototype.default = function(variant, handler) {
            if (this._defaultVariant) {
                throw new Error('must provide exactly one `default`');
            }
    
            this._defaultVariant = this._assignHandlerToVariant(variant, handler);
        };
    
        _VaryDSL.prototype.run = function() {
            this._validate();
    
            var chosenHandler;
            if (this._variantHandlers[this._assignment.getVariant()]) {
                chosenHandler = this._variantHandlers[this._assignment.getVariant()];
            } else {
                chosenHandler = this._variantHandlers[this.getDefaultVariant()];
                this._defaulted = true;
            }
    
            chosenHandler();
        };
    
        _VaryDSL.prototype.isDefaulted = function() {
            return this._defaulted || false;
        };
    
        _VaryDSL.prototype.getDefaultVariant = function() {
            return this._defaultVariant;
        };
    
        // private
    
        _VaryDSL.prototype._assignHandlerToVariant = function(variant, handler) {
            if (typeof handler !== 'function') {
                throw new Error('must provide handler for ' + variant);
            }
    
            variant = variant.toString();
    
            if (this._getSplit() && !this._getSplit().hasOwnProperty(variant)) {
                this._visitor.logError('configures unknown variant ' + variant);
            }
    
            this._variantHandlers[variant] = handler;
    
            return variant;
        };
    
        _VaryDSL.prototype._validate = function() {
            if (!this.getDefaultVariant()) {
                throw new Error('must provide exactly one `default`');
            } else if (this._getVariants().length < 2) {
                throw new Error('must provide at least one `when`');
            } else if (!this._getSplit()) {
                return;
            }
    
            var missingVariants = this._getMissingVariants();
    
            if (missingVariants.length > 0) {
                var missingVariantSentence = missingVariants.join(', ').replace(/, (.+)$/, ' and $1');
                this._visitor.logError('does not configure variants ' + missingVariantSentence);
            }
        };
    
        _VaryDSL.prototype._getSplit = function() {
            if (this._splitRegistry) {
                return this._splitRegistry[this._assignment.getSplitName()];
            } else {
                return null;
            }
        };
    
        _VaryDSL.prototype._getVariants = function() {
            return Object.getOwnPropertyNames(this._variantHandlers);
        };
    
        _VaryDSL.prototype._getMissingVariants = function() {
            var variants = this._getVariants(),
                split = this._getSplit(),
                splitVariants = Object.getOwnPropertyNames(split),
                missingVariants = [];
    
            for (var i = 0; i < splitVariants.length; i++) {
                var splitVariant = splitVariants[i];
    
                if (variants.indexOf(splitVariant) === -1) {
                    missingVariants.push(splitVariant);
                }
            }
    
            return missingVariants;
        };
    
        return _VaryDSL;
    })();
    
    var ABConfiguration = (function() { // jshint ignore:line
        var _ABConfiguration = function(options) {
            if (!options.splitName) {
                throw new Error('must provide splitName');
            } else if (!options.hasOwnProperty('trueVariant')) {
                throw new Error('must provide trueVariant');
            } else if (!options.visitor) {
                throw new Error('must provide visitor');
            }
    
            this._splitName = options.splitName;
            this._trueVariant = options.trueVariant;
            this._visitor = options.visitor;
            this._splitRegistry = TestTrackConfig.getSplitRegistry();
        };
    
        _ABConfiguration.prototype.getVariants = function() {
            var splitVariants = this._getSplitVariants();
            if (splitVariants && splitVariants.length > 2) {
                this._visitor.logError('A/B for ' + this._splitName + ' configures split with more than 2 variants');
            }
    
            return {
                'true': this._getTrueVariant(),
                'false': this._getFalseVariant()
            };
        };
    
        // private
    
        _ABConfiguration.prototype._getTrueVariant = function() {
            return this._trueVariant || true;
        };
    
        _ABConfiguration.prototype._getFalseVariant = function() {
            var nonTrueVariants = this._getNonTrueVariants();
            return nonTrueVariants ? nonTrueVariants.sort()[0] : false;
        };
    
        _ABConfiguration.prototype._getNonTrueVariants = function() {
            var splitVariants = this._getSplitVariants();
    
            if (splitVariants) {
                var trueVariant = this._getTrueVariant(),
                    trueVariantIndex = splitVariants.indexOf(trueVariant);
    
                if (trueVariantIndex !== -1) {
                    splitVariants.splice(trueVariantIndex, 1); // remove the true variant
                }
    
                return splitVariants;
            } else {
                return null;
            }
        };
    
        _ABConfiguration.prototype._getSplit = function() {
            return this._splitRegistry ? this._splitRegistry[this._splitName] : null;
        };
    
        _ABConfiguration.prototype._getSplitVariants = function() {
            return this._getSplit() && Object.getOwnPropertyNames(this._getSplit());
        };
    
        return _ABConfiguration;
    })();
    

    var TestTrack = new Session().getPublicAPI(),
        notifyListener = function() {
            window.dispatchEvent(new CustomEvent('tt:lib:loaded', {
                detail: {
                    TestTrack: TestTrack
                }
            }));
        };

    try {
        // Add class to body of page after body is loaded to enable chrome extension support
        $(document).ready(function() {
            $(document.body).addClass('_tt');
            try {
                window.dispatchEvent(new CustomEvent('tt:class:added'));
            } catch(e) {}
        });
        // **** The order of these two lines is important, they support 2 different cases:
        // in the case where there is already code listening for 'tt:lib:loaded', trigger it immediately
        // in the case where there is not yet code listening for 'tt:lib:loaded', listen for 'tt:listener:ready' and then trigger 'tt:lib:loaded'
        notifyListener();
        window.addEventListener('tt:listener:ready', notifyListener);
    } catch(e) {}

    return TestTrack;
});
