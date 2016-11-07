var Session = (function() { // jshint ignore:line
    var _Session = function() {
            this._visitorDeferred = $.Deferred();
        };

    _Session.prototype.initialize = function(options) {
        var visitorId = $.cookie(TestTrackConfig.getCookieName());

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
            $.cookie(TestTrackConfig.getCookieName(), visitor.getId(), {
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
