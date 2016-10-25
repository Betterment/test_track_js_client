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
